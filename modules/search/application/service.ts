import type { CancellationUnitOfWork } from "modules/backtesting/api";
import type { AuthContext } from "modules/auth/api";
import type { StrategyDefinition } from "modules/strategy/api";
import type { SearchModuleDependencies } from "./ports";
import type { GeneratedCandidate, LoopStatus, SearchRun, SearchRunRankingEntry, SearchRunSummary, StopCondition, StrategyCategory } from "../domain/contracts";

type OwnedStrategyDefinition = StrategyDefinition & { userId: string };

export interface SearchModuleRuntime {
  start(auth: AuthContext, config: { searchSpace: SearchRun["searchSpace"]; stopCondition: StopCondition; generatorType: SearchRun["generatorType"]; leaderboardScopeId: string; maxInFlight: number }): Promise<{ searchRunId: string }>;
  pause(auth: AuthContext, searchRunId: string): Promise<void>;
  resume(auth: AuthContext, searchRunId: string): Promise<void>;
  cancel(auth: AuthContext, searchRunId: string): Promise<void>;
  status(auth: AuthContext, searchRunId: string): Promise<LoopStatus>;
  list(auth: AuthContext, limit?: number): Promise<SearchRunSummary[]>;
  leaderboard(auth: AuthContext, searchRunId: string): Promise<SearchRunRankingEntry[]>;
  onCandidateFinished(searchRunId: string): Promise<void>;
  fillAvailableSlots(searchRunId: string): Promise<void>;
  reconcileRunningRuns(): Promise<number>;
}

const inFlight = (status: Pick<LoopStatus, "queuedCount" | "runningCount">): number => status.queuedCount + status.runningCount;
const validateStopCondition = (condition: StopCondition): void => {
  const values = [condition.maxCandidates, condition.maxDurationSeconds, condition.noImprovementAfterIterations].filter((value) => value !== undefined);
  if (values.length === 0 || values.some((value) => !Number.isInteger(value) || value! <= 0)) throw new Error("INVALID_STOP_CONDITION");
};

const ownerOf = (definition: StrategyDefinition): string | undefined => (definition as Partial<OwnedStrategyDefinition>).userId;
const validateSearchSpaceOwner = (ownerUserId: string, searchSpace: SearchRun["searchSpace"]): void => {
  if (searchSpace.availableStrategies.some((definition) => ownerOf(definition) !== ownerUserId)) throw new Error("INVALID_SEARCH_CONFIG");
};
const validateDomainRules = (generatorType: SearchRun["generatorType"], searchSpace: SearchRun["searchSpace"]): void => {
  const rules = searchSpace.domainRules;
  if (generatorType !== "DOMAIN_GUIDED" && rules !== undefined) throw new Error("INVALID_SEARCH_CONFIG");
  if (rules === undefined) return;
  const known = new Set<StrategyCategory>(["TREND", "MOMENTUM", "VOLATILITY", "STRUCTURE", "INFORMATION"]);
  const read = (value: unknown): StrategyCategory[] | undefined => {
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || value.some((category) => typeof category !== "string" || !known.has(category as StrategyCategory))) throw new Error("INVALID_SEARCH_CONFIG");
    const result = value as StrategyCategory[];
    if (new Set(result).size !== result.length) throw new Error("INVALID_SEARCH_CONFIG");
    return result;
  };
  const required = read(rules.requiredCategories); const allowed = read(rules.allowedCategories); const forbidden = read(rules.forbiddenCategories);
  if (required && forbidden && required.some((category) => forbidden.includes(category))) throw new Error("DOMAIN_RULE_UNSATISFIABLE");
  if (allowed && required && required.some((category) => !allowed.includes(category))) throw new Error("DOMAIN_RULE_UNSATISFIABLE");
  if (allowed && forbidden && forbidden.some((category) => allowed.includes(category))) throw new Error("DOMAIN_RULE_UNSATISFIABLE");
  const eligible = searchSpace.availableStrategies.filter((definition) => {
    const category = definition.category;
    return (!allowed || (category !== undefined && allowed.includes(category))) && (!category || !forbidden?.includes(category));
  });
  if (eligible.length === 0 || required?.some((category) => !eligible.some((definition) => definition.category === category))) throw new Error("DOMAIN_RULE_UNSATISFIABLE");
  if (searchSpace.maxComponents !== undefined && required && required.length > searchSpace.maxComponents) throw new Error("DOMAIN_RULE_UNSATISFIABLE");
};

import { createDefaultStrategyGenerators } from "../domain/generators";

export function createInMemorySearchDependencies(): SearchModuleDependencies {
  const runs = new Map<string, SearchRun>();
  const candidates = new Map<string, import("modules/backtesting/api").CandidateProgress>();
  let sequence = 0;
  const beginCancellation = async (): Promise<CancellationUnitOfWork> => {
    const rollbacks: Array<() => Promise<void>> = [];
    let closed = false;
    return {
      kind: "CANCELLATION",
      id: `cancellation-${++sequence}`,
      run: async <T>(operation: () => Promise<T>) => operation(),
      onRollback: (operation) => { if (closed) throw new Error("CANCELLATION_UNIT_OF_WORK_CLOSED"); rollbacks.push(operation); },
      commit: async () => { closed = true; rollbacks.length = 0; },
      rollback: async () => { if (closed) return; closed = true; for (const operation of rollbacks.reverse()) await operation(); rollbacks.length = 0; },
    };
  };
  return {
    searchRunRepository: {
      get: async (id) => runs.get(id),
      getByOwner: async (ownerUserId, id) => { const run = runs.get(id); return run?.ownerUserId === ownerUserId ? run : undefined; },
      getByOwnerForUpdate: async (ownerUserId, id) => { const run = runs.get(id); return run?.ownerUserId === ownerUserId ? run : undefined; },
      insert: async (run) => { runs.set(run.searchRunId, run); return run; },
      save: async (run, unitOfWork) => { const previous = runs.get(run.searchRunId); runs.set(run.searchRunId, run); unitOfWork?.onRollback(async () => { if (previous) runs.set(run.searchRunId, previous); else runs.delete(run.searchRunId); }); return run; },
      listRunning: async () => [...runs.values()].filter((run) => run.state === "RUNNING"),
      listByOwner: async (ownerUserId, limit = 50) => [...runs.values()].filter((run) => run.ownerUserId === ownerUserId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, limit),
      withRunLock: async <T>(
        ownerUserId: string,
        id: string,
        operation: (run: SearchRun | undefined, unitOfWork?: CancellationUnitOfWork) => Promise<T>,
      ): Promise<T> => operation(runs.get(id)?.ownerUserId === ownerUserId ? runs.get(id) : undefined),
    },
    generators: {
      ...createDefaultStrategyGenerators(),
    },
    backtestCoordinator: {
      readBenchmarkScope: async (_auth, scopeId) => ({ id: scopeId } as never),
      submitSearchCandidate: async (_auth, command) => {
        const candidateId = `search-candidate-${++sequence}`;
        candidates.set(candidateId, { candidateId, origin: "SEARCH", selectionMode: "COMPOSITE", searchRunId: command.searchRunId, iterationNumber: command.iterationNumber, generatedBy: command.generatedBy, fingerprint: command.fingerprint, lineage: command.lineage, leaderboardScopeId: command.leaderboardScopeId, status: "QUEUED", attempts: [], maxAttempts: command.maxAttempts, completionAttemptCount: 0, completionMaxAttempts: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        return { candidateId, jobId: candidateId, status: "QUEUED" };
      },
      summarizeSearchCandidates: async (_auth, searchRunId) => {
        const values = [...candidates.values()].filter((candidate) => candidate.searchRunId === searchRunId);
        return { searchRunId, active: values.filter((candidate) => !["COMPLETED", "FAILED", "CANCELLED"].includes(candidate.status)), queuedCount: values.filter((candidate) => candidate.status === "QUEUED").length, runningCount: values.filter((candidate) => ["BACKTESTING", "RETRY_WAIT", "PROCESSING_RESULT"].includes(candidate.status)).length, candidatesTested: values.filter((candidate) => candidate.status === "COMPLETED" || candidate.status === "FAILED").length, failedCandidateCount: values.filter((candidate) => candidate.status === "FAILED").length, retryExhaustedCandidateCount: 0, infrastructureFailureCandidateCount: 0, completionProcessingFailureCandidateCount: 0, failedAttemptCount: 0, averageBacktestDurationMs: null };
      },
      cancelSearchCandidates: async (_auth, searchRunId, _unitOfWork) => {
        const candidateIds = [...candidates.values()].filter((candidate) => candidate.searchRunId === searchRunId && !["COMPLETED", "FAILED", "CANCELLED"].includes(candidate.status)).map((candidate) => candidate.candidateId);
        for (const candidateId of candidateIds) { const candidate = candidates.get(candidateId)!; candidates.set(candidateId, { ...candidate, status: "CANCELLED", updatedAt: new Date().toISOString() }); }
        return { candidateIds };
      },
      removePendingJobs: async () => undefined,
    },
    leaderboardService: { rankSearchRun: async () => [] },
    beginCancellation,
    clock: { now: () => new Date().toISOString() },
    idGenerator: () => `search-run-${++sequence}`,
  };
}

const createRun = (searchRunId: string, config: Parameters<SearchModuleRuntime["start"]>[1], ownerUserId: string, now: string): SearchRun => ({
  searchRunId, ownerUserId, state: "RUNNING", activeCandidates: [], queuedCount: 0, runningCount: 0, candidatesTested: 0, failedCandidateCount: 0, retryExhaustedCandidateCount: 0, infrastructureFailureCandidateCount: 0, completionProcessingFailureCandidateCount: 0, failedAttemptCount: 0, averageBacktestDurationMs: 0, createdAt: now, startedAt: now, updatedAt: now, stopCondition: config.stopCondition, searchSpace: { ...config.searchSpace, generatedFingerprints: [...new Set(config.searchSpace.generatedFingerprints ?? [])] }, generatorType: config.generatorType, leaderboardScopeId: config.leaderboardScopeId, maxInFlight: config.maxInFlight, nextIteration: 1, activeDurationMs: 0, activeSince: now,
});

export function createSearchModule(dependencies: SearchModuleDependencies = createInMemorySearchDependencies()): SearchModuleRuntime {
  const idGenerator = dependencies.idGenerator ?? (() => `search-run-${crypto.randomUUID()}`);
  const fills = new Map<string, Promise<void>>();
  const assertAuth = (auth: AuthContext): void => { if (!auth?.userId?.trim()) throw new Error("INVALID_AUTH_CONTEXT"); };
  const load = async (id: string): Promise<SearchRun> => {
    const run = await dependencies.searchRunRepository.get(id);
    if (!run) throw new Error("SEARCH_RUN_NOT_FOUND");
    return run;
  };
  const loadOwned = async (auth: AuthContext, id: string): Promise<SearchRun> => { assertAuth(auth); const run = await dependencies.searchRunRepository.getByOwner(auth.userId, id); if (!run) throw new Error("SEARCH_RUN_NOT_FOUND"); return run; };
  const authFor = (run: SearchRun): AuthContext => ({ userId: run.ownerUserId });
  const project = async (run: SearchRun): Promise<LoopStatus> => {
    const auth = authFor(run);
    const summary = await dependencies.backtestCoordinator.summarizeSearchCandidates(auth, run.searchRunId);
    const ranking = await dependencies.leaderboardService.rankSearchRun(run.ownerUserId, run.searchRunId);
    return { ...run, ...summary, activeCandidates: summary.active, averageBacktestDurationMs: summary.averageBacktestDurationMs ?? 0, currentTopEntry: ranking[0] };
  };
  const refresh = async (run: SearchRun): Promise<void> => {
    const projection = await project(run);
    Object.assign(run, projection, { updatedAt: dependencies.clock.now() });
    if (projection.currentTopEntry && (run.bestScore === undefined || projection.currentTopEntry.score > run.bestScore)) Object.assign(run, { bestScore: projection.currentTopEntry.score, lastImprovementAtCandidates: projection.candidatesTested });
  };
  const stopReason = (run: SearchRun): SearchRun["stopReason"] | undefined => {
    const elapsedMilliseconds = run.activeDurationMs + (run.activeSince ? Date.parse(dependencies.clock.now()) - Date.parse(run.activeSince) : 0);
    const elapsedSeconds = elapsedMilliseconds / 1000;
    if (run.stopCondition.maxDurationSeconds !== undefined && elapsedSeconds >= run.stopCondition.maxDurationSeconds) return "MAX_DURATION";
    const reserved = Math.max(run.candidatesTested + inFlight(run), run.nextIteration - 1);
    if (run.stopCondition.maxCandidates !== undefined && reserved >= run.stopCondition.maxCandidates) return "MAX_CANDIDATES";
    if (run.stopCondition.noImprovementAfterIterations !== undefined && run.bestScore !== undefined && run.lastImprovementAtCandidates !== undefined && run.candidatesTested - run.lastImprovementAtCandidates >= run.stopCondition.noImprovementAfterIterations) return "NO_IMPROVEMENT";
    return undefined;
  };
  const submit = async (run: SearchRun, candidate: GeneratedCandidate): Promise<void> => {
    let strategyDefinitionIds = candidate.strategyDefinitions.map((definition) => definition.id);
    let compositeDefinitionId = candidate.compositeDefinition.id;
    if (dependencies.strategyService) {
      const definitions = await dependencies.strategyService.readDefinitions(run.ownerUserId, strategyDefinitionIds);
      if (definitions.length !== strategyDefinitionIds.length || definitions.some((definition) => definition.userId !== run.ownerUserId)) throw new Error("INVALID_SEARCH_CONFIG");
      const persistedById = new Map(definitions.map((definition) => [definition.id, definition]));
      const remapped = new Map<string, string>();
      for (const generated of candidate.strategyDefinitions) {
        const persisted = persistedById.get(generated.id);
        if (!persisted || persisted.strategyName !== generated.strategyName) throw new Error("INVALID_SEARCH_CONFIG");
        const sameParameters = JSON.stringify(persisted.parameters) === JSON.stringify(generated.parameters);
        if (sameParameters) remapped.set(generated.id, persisted.id);
        else {
          if (!dependencies.strategyService.defineStrategy) throw new Error("INVALID_SEARCH_CONFIG");
          const created = await dependencies.strategyService.defineStrategy(run.ownerUserId, generated.strategyName, generated.parameters);
          if (created.userId !== run.ownerUserId) throw new Error("INVALID_SEARCH_CONFIG");
          remapped.set(generated.id, created.id);
        }
      }
      strategyDefinitionIds = candidate.strategyDefinitions.map((definition) => remapped.get(definition.id)!).filter(Boolean);
      if (strategyDefinitionIds.length !== candidate.strategyDefinitions.length) throw new Error("INVALID_SEARCH_CONFIG");
      const persisted = await dependencies.strategyService.defineComposite(run.ownerUserId, {
        method: candidate.compositeDefinition.method,
        components: candidate.compositeDefinition.components.map((component) => ({ ...component, strategyDefinitionId: remapped.get(component.strategyDefinitionId) ?? component.strategyDefinitionId })),
        thresholds: candidate.compositeDefinition.thresholds,
      });
      const verified = await dependencies.strategyService.readComposite(run.ownerUserId, persisted.id);
      if (verified.userId !== run.ownerUserId || verified.components.length !== candidate.compositeDefinition.components.length || verified.components.some((component, index) => component.strategyDefinitionId !== (remapped.get(candidate.compositeDefinition.components[index]?.strategyDefinitionId ?? "") ?? candidate.compositeDefinition.components[index]?.strategyDefinitionId) || component.weight !== candidate.compositeDefinition.components[index]?.weight)) throw new Error("INVALID_SEARCH_CONFIG");
      compositeDefinitionId = verified.id;
    }
    await dependencies.backtestCoordinator.submitSearchCandidate(authFor(run), { leaderboardScopeId: run.leaderboardScopeId, strategyDefinitionIds, compositeDefinitionId, executionPolicy: { policyId: candidate.executionPolicyIntent?.mode ?? "TWO_SIDED_ONE_X_V1", stopLossPercent: candidate.executionPolicyIntent?.stopLossPercent, takeProfitPercent: candidate.executionPolicyIntent?.takeProfitPercent }, maxAttempts: 1, searchRunId: run.searchRunId, iterationNumber: run.nextIteration, generatedBy: candidate.generatedBy, fingerprint: candidate.fingerprint, ...(candidate.lineage ? { lineage: candidate.lineage } : {}) });
    run.searchSpace.generatedFingerprints = [...new Set([...(run.searchSpace.generatedFingerprints ?? []), candidate.fingerprint])];
    run.nextIteration += 1;
  };
  const fill = async (searchRunId: string): Promise<void> => {
    const previous = fills.get(searchRunId) ?? Promise.resolve();
    const current = previous.then(async () => {
      const initial = await load(searchRunId);
      const fillCore = async (run: SearchRun, unitOfWork?: CancellationUnitOfWork): Promise<void> => {
        if (run.state !== "RUNNING") return;
        await refresh(run);
        let met = stopReason(run);
        if (met) {
          if (inFlight(run) === 0) Object.assign(run, { state: "COMPLETED", stopReason: met, endedAt: dependencies.clock.now() });
          await dependencies.searchRunRepository.save(run, unitOfWork);
          return;
        }
        const reserved = Math.max(run.candidatesTested + inFlight(run), run.nextIteration - 1);
        const budget = run.stopCondition.maxCandidates === undefined ? run.maxInFlight : Math.max(0, run.stopCondition.maxCandidates - reserved);
        const slots = Math.min(Math.max(0, run.maxInFlight - inFlight(run)), budget);
        const generator = dependencies.generators[run.generatorType];
        if (!generator) throw new Error("UNSUPPORTED_GENERATOR");
        let submitted = 0;
        let attempts = 0;
        const maxAttempts = Math.max(slots * 4, slots + 1);
        while (submitted < slots && attempts < maxAttempts) {
          attempts += 1;
          let candidate: GeneratedCandidate;
          try {
            candidate = generator.generate(run.searchSpace, { searchRunId: run.searchRunId, iterationNumber: run.nextIteration + attempts - 1 });
          } catch (error) {
            if (attempts >= maxAttempts) throw error;
            continue;
          }
          if ((run.searchSpace.generatedFingerprints ?? []).includes(candidate.fingerprint)) continue;
          try {
            await submit(run, candidate);
            submitted += 1;
          } catch (error) {
            if (attempts >= maxAttempts) throw error;
          }
        }
        await refresh(run);
        met = stopReason(run);
        if (met && inFlight(run) === 0) Object.assign(run, { state: "COMPLETED", stopReason: met, endedAt: dependencies.clock.now() });
        run.updatedAt = dependencies.clock.now();
        await dependencies.searchRunRepository.save(run, unitOfWork);
      };
      if (dependencies.searchRunRepository.withRunLock) await dependencies.searchRunRepository.withRunLock(initial.ownerUserId, searchRunId, async (run, unitOfWork) => { if (run) await fillCore(run, unitOfWork); });
      else await fillCore(initial);
    }).catch(async (error: unknown) => {
      const run = await dependencies.searchRunRepository.get(searchRunId);
      if (run && (run.state === "RUNNING" || run.state === "PAUSED")) await dependencies.searchRunRepository.save({ ...run, state: "FAILED", stopReason: "ERROR", lastError: error instanceof Error ? error.message : "SEARCH_ERROR", endedAt: dependencies.clock.now(), updatedAt: dependencies.clock.now() });
      throw error;
    });
    void current.then(() => { if (fills.get(searchRunId) === current) fills.delete(searchRunId); }, () => { if (fills.get(searchRunId) === current) fills.delete(searchRunId); });
    fills.set(searchRunId, current);
    return current;
  };
  return {
    start: async (auth, config) => { assertAuth(auth); validateStopCondition(config.stopCondition); if (!Number.isInteger(config.maxInFlight) || config.maxInFlight <= 0 || !config.leaderboardScopeId || config.searchSpace.availableStrategies.length === 0) throw new Error("INVALID_SEARCH_CONFIG"); validateSearchSpaceOwner(auth.userId, config.searchSpace); validateDomainRules(config.generatorType, config.searchSpace); await dependencies.backtestCoordinator.readBenchmarkScope(auth, config.leaderboardScopeId); const run = createRun(idGenerator(), config, auth.userId, dependencies.clock.now()); await dependencies.searchRunRepository.insert(run); void fill(run.searchRunId).catch(() => undefined); return { searchRunId: run.searchRunId }; },
    pause: async (auth, id) => { const run = await loadOwned(auth, id); if (run.state === "RUNNING") { const now = dependencies.clock.now(); await dependencies.searchRunRepository.save({ ...run, state: "PAUSED", activeDurationMs: run.activeDurationMs + (run.activeSince ? Date.parse(now) - Date.parse(run.activeSince) : 0), activeSince: undefined, updatedAt: now }); } },
    resume: async (auth, id) => { const run = await loadOwned(auth, id); if (run.state === "FAILED") throw new Error("CANNOT_RESUME_FAILED_RUN"); if (run.state === "PAUSED") { const now = dependencies.clock.now(); await dependencies.searchRunRepository.save({ ...run, state: "RUNNING", activeSince: now, updatedAt: now }); } await fill(id); },
    cancel: async (auth, id) => {
      assertAuth(auth);
      const unitOfWork = await dependencies.beginCancellation();
      let candidateIds: string[] = [];
      try {
        const run = await dependencies.searchRunRepository.getByOwnerForUpdate(auth.userId, id, unitOfWork);
        if (!run) throw new Error("SEARCH_RUN_NOT_FOUND");
        if (run.state === "CANCELLED" || run.state === "FAILED") { await unitOfWork.commit(); return; }
        const result = await dependencies.backtestCoordinator.cancelSearchCandidates(auth, id, unitOfWork);
        candidateIds = result.candidateIds;
        const now = dependencies.clock.now();
        await dependencies.searchRunRepository.save({ ...run, state: "CANCELLED", stopReason: "USER_CANCELLED", endedAt: now, activeSince: undefined, updatedAt: now }, unitOfWork);
        await unitOfWork.commit();
      } catch (error) {
        await unitOfWork.rollback();
        throw error;
      }
      await dependencies.backtestCoordinator.removePendingJobs(candidateIds);
    },
    status: async (auth, id) => { const run = await loadOwned(auth, id); return project(run); },
    list: async (auth, limit = 50) => {
      assertAuth(auth);
      const runs = dependencies.searchRunRepository.listByOwner
        ? await dependencies.searchRunRepository.listByOwner(auth.userId, limit)
        : [];
      return runs.map((run) => ({
        searchRunId: run.searchRunId,
        state: run.state,
        generatorType: run.generatorType,
        leaderboardScopeId: run.leaderboardScopeId,
        maxInFlight: run.maxInFlight,
        nextIteration: run.nextIteration,
        bestScore: run.bestScore,
        stopReason: run.stopReason,
        createdAt: run.createdAt,
        startedAt: run.startedAt,
        endedAt: run.endedAt,
        updatedAt: run.updatedAt,
      }));
    },
    leaderboard: async (auth, id) => { const run = await loadOwned(auth, id); return dependencies.leaderboardService.rankSearchRun(run.ownerUserId, id); },
    onCandidateFinished: fill,
    fillAvailableSlots: fill,
    reconcileRunningRuns: async () => {
      const runs = await dependencies.searchRunRepository.listRunning?.() ?? [];
      for (const run of runs) await fill(run.searchRunId);
      return runs.length;
    },
  };
}
