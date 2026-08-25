import type { CancellationUnitOfWork } from "modules/backtesting/api";
import type { SearchReadOptions } from "../api";
import type { SearchModuleDependencies } from "./ports";
import type { GeneratedCandidate, LoopStatus, SearchRun, SearchRunRankingEntry, StopCondition } from "../domain/contracts";

export interface SearchModuleRuntime {
  start(config: { searchSpace: SearchRun["searchSpace"]; stopCondition: StopCondition; generatorType: SearchRun["generatorType"]; leaderboardScopeId: string; maxInFlight: number }, options: { ownerUserId: string }): Promise<{ searchRunId: string }>;
  pause(searchRunId: string, options?: SearchReadOptions): Promise<void>;
  resume(searchRunId: string, options?: SearchReadOptions): Promise<void>;
  cancel(searchRunId: string, options?: SearchReadOptions): Promise<void>;
  status(searchRunId: string, options?: SearchReadOptions): Promise<LoopStatus>;
  leaderboard(searchRunId: string, options?: SearchReadOptions): Promise<SearchRunRankingEntry[]>;
  onCandidateFinished(searchRunId: string): Promise<void>;
  fillAvailableSlots(searchRunId: string): Promise<void>;
  reconcileRunningRuns(): Promise<number>;
}

const inFlight = (status: Pick<LoopStatus, "queuedCount" | "runningCount">): number => status.queuedCount + status.runningCount;
const validateStopCondition = (condition: StopCondition): void => {
  const values = [condition.maxCandidates, condition.maxDurationSeconds, condition.noImprovementAfterIterations].filter((value) => value !== undefined);
  if (values.length === 0 || values.some((value) => !Number.isInteger(value) || value! <= 0)) throw new Error("INVALID_STOP_CONDITION");
};

const deterministicGenerator = (type: SearchRun["generatorType"]): import("../domain/contracts").StrategyGenerator => {
  let sequence = 0;
  return {
    type,
    generate: (searchSpace) => {
      const available = [...searchSpace.availableStrategies].sort((left, right) => left.id.localeCompare(right.id));
      if (available.length === 0) throw new Error("EMPTY_SEARCH_SPACE");
      const maxComponents = Math.max(1, Math.min(searchSpace.maxComponents ?? available.length, available.length));
      const count = 1 + sequence % maxComponents;
      const start = Math.floor(sequence / maxComponents) % available.length;
      const selected = Array.from({ length: count }, (_unused, index) => available[(start + index) % available.length]!);
      const candidateNumber = sequence++;
      return {
        generatedBy: type,
        strategyDefinitions: selected,
        compositeDefinition: {
          id: `generated-${type.toLowerCase()}-${candidateNumber}-${selected.map((definition) => definition.id).join("-")}`,
          logicalFamilyKey: `generated:${type.toLowerCase()}`,
          version: 1,
          method: "MAJORITY_VOTE",
          components: selected.map((definition) => ({ strategyDefinitionId: definition.id, weight: 1 })),
          createdAt: "1970-01-01T00:00:00.000Z",
        },
      };
    },
  };
};

export function createInMemorySearchDependencies(): SearchModuleDependencies {
  const runs = new Map<string, SearchRun>();
  const candidates = new Map<string, import("modules/backtesting/api").CandidateProgress>();
  let sequence = 0;
  return {
    searchRunRepository: { get: async (id) => runs.get(id), insert: async (run) => { runs.set(run.searchRunId, run); return run; }, save: async (run) => { runs.set(run.searchRunId, run); return run; }, listRunning: async () => [...runs.values()].filter((run) => run.state === "RUNNING") },
    generators: {
      RANDOM: deterministicGenerator("RANDOM"),
      DOMAIN_GUIDED: deterministicGenerator("DOMAIN_GUIDED"),
      GENETIC: deterministicGenerator("GENETIC"),
    },
    backtestCoordinator: {
      submitSearchCandidate: async (command) => {
        const candidateId = `in-memory-search-candidate-${++sequence}`;
        candidates.set(candidateId, { candidateId, origin: "SEARCH", selectionMode: "COMPOSITE", searchRunId: command.searchRunId, iterationNumber: command.iterationNumber, leaderboardScopeId: command.leaderboardScopeId, status: "QUEUED", attempts: [], maxAttempts: command.maxAttempts, completionAttemptCount: 0, completionMaxAttempts: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        return { candidateId, jobId: candidateId, status: "QUEUED" };
      },
      summarizeSearchCandidates: async (searchRunId) => {
        const values = [...candidates.values()].filter((candidate) => candidate.searchRunId === searchRunId);
        return { searchRunId, active: values.filter((candidate) => !["COMPLETED", "FAILED", "CANCELLED"].includes(candidate.status)), queuedCount: values.filter((candidate) => candidate.status === "QUEUED").length, runningCount: values.filter((candidate) => ["BACKTESTING", "RETRY_WAIT", "PROCESSING_RESULT"].includes(candidate.status)).length, candidatesTested: values.length, failedCandidateCount: values.filter((candidate) => candidate.status === "FAILED").length, retryExhaustedCandidateCount: 0, infrastructureFailureCandidateCount: 0, completionProcessingFailureCandidateCount: 0, failedAttemptCount: 0, averageBacktestDurationMs: null };
      },
      cancelSearchCandidates: async (searchRunId) => {
        const candidateIds = [...candidates.values()].filter((candidate) => candidate.searchRunId === searchRunId && !["COMPLETED", "FAILED", "CANCELLED"].includes(candidate.status)).map((candidate) => candidate.candidateId);
        for (const candidateId of candidateIds) { const candidate = candidates.get(candidateId)!; candidates.set(candidateId, { ...candidate, status: "CANCELLED", updatedAt: new Date().toISOString() }); }
        return { candidateIds };
      },
      removePendingJobs: async () => undefined,
    },
    leaderboardService: { rankSearchRun: async () => [] },
    clock: { now: () => new Date().toISOString() },
    idGenerator: () => `search-run-${++sequence}`,
  };
}

const createRun = (searchRunId: string, config: Parameters<SearchModuleRuntime["start"]>[0], ownerUserId: string, now: string): SearchRun => ({
  searchRunId, ownerUserId, state: "RUNNING", activeCandidates: [], queuedCount: 0, runningCount: 0, candidatesTested: 0, failedCandidateCount: 0, retryExhaustedCandidateCount: 0, infrastructureFailureCandidateCount: 0, completionProcessingFailureCandidateCount: 0, failedAttemptCount: 0, averageBacktestDurationMs: 0, createdAt: now, startedAt: now, updatedAt: now, stopCondition: config.stopCondition, searchSpace: config.searchSpace, generatorType: config.generatorType, leaderboardScopeId: config.leaderboardScopeId, maxInFlight: config.maxInFlight, nextIteration: 1, activeDurationMs: 0, activeSince: now,
});

export function createSearchModule(dependencies: SearchModuleDependencies = createInMemorySearchDependencies()): SearchModuleRuntime {
  const idGenerator = dependencies.idGenerator ?? (() => `search-run-${crypto.randomUUID()}`);
  const fills = new Map<string, Promise<void>>();
  const load = async (id: string): Promise<SearchRun> => {
    const run = await dependencies.searchRunRepository.get(id);
    if (!run) throw new Error("SEARCH_RUN_NOT_FOUND");
    return run;
  };
  const assertOwner = (run: SearchRun, options?: SearchReadOptions): void => { if (options?.ownerUserId && options.ownerUserId !== run.ownerUserId) throw new Error("SEARCH_ACCESS_DENIED"); };
  const refresh = async (run: SearchRun): Promise<void> => {
    const summary = await dependencies.backtestCoordinator.summarizeSearchCandidates(run.searchRunId);
    const ranking = await dependencies.leaderboardService.rankSearchRun(run.searchRunId);
    Object.assign(run, summary, { activeCandidates: summary.active, averageBacktestDurationMs: summary.averageBacktestDurationMs ?? 0, currentTopEntry: ranking[0], updatedAt: dependencies.clock.now() });
    if (ranking[0] && (run.bestScore === undefined || ranking[0].score > run.bestScore)) Object.assign(run, { bestScore: ranking[0].score, lastImprovementAtCandidates: summary.candidatesTested });
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
    await dependencies.backtestCoordinator.submitSearchCandidate({ leaderboardScopeId: run.leaderboardScopeId, strategyDefinitions: candidate.strategyDefinitions, compositeDefinition: candidate.compositeDefinition, maxAttempts: 1, searchRunId: run.searchRunId, iterationNumber: run.nextIteration, generatedBy: candidate.generatedBy });
    run.nextIteration += 1;
  };
  const fill = async (searchRunId: string): Promise<void> => {
    const previous = fills.get(searchRunId) ?? Promise.resolve();
    const current = previous.then(async () => {
      const run = await load(searchRunId);
      if (run.state !== "RUNNING") return;
      await refresh(run);
      let met = stopReason(run);
      if (met) {
        if (inFlight(run) === 0) Object.assign(run, { state: "COMPLETED", stopReason: met, endedAt: dependencies.clock.now() });
        await dependencies.searchRunRepository.save(run);
        return;
      }
      const reserved = Math.max(run.candidatesTested + inFlight(run), run.nextIteration - 1);
      const budget = run.stopCondition.maxCandidates === undefined ? run.maxInFlight : Math.max(0, run.stopCondition.maxCandidates - reserved);
      const slots = Math.min(Math.max(0, run.maxInFlight - inFlight(run)), budget);
      const generator = dependencies.generators[run.generatorType];
      for (let index = 0; index < slots; index += 1) await submit(run, generator.generate(run.searchSpace));
      await refresh(run);
      met = stopReason(run);
      if (met && inFlight(run) === 0) Object.assign(run, { state: "COMPLETED", stopReason: met, endedAt: dependencies.clock.now() });
      run.updatedAt = dependencies.clock.now();
      await dependencies.searchRunRepository.save(run);
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
    start: async (config, options) => { validateStopCondition(config.stopCondition); if (!options.ownerUserId.trim() || !Number.isInteger(config.maxInFlight) || config.maxInFlight <= 0 || !config.leaderboardScopeId || config.searchSpace.availableStrategies.length === 0) throw new Error("INVALID_SEARCH_CONFIG"); const run = createRun(idGenerator(), config, options.ownerUserId, dependencies.clock.now()); await dependencies.searchRunRepository.insert(run); await fill(run.searchRunId); return { searchRunId: run.searchRunId }; },
    pause: async (id, options) => { const run = await load(id); assertOwner(run, options); if (run.state === "RUNNING") { const now = dependencies.clock.now(); await dependencies.searchRunRepository.save({ ...run, state: "PAUSED", activeDurationMs: run.activeDurationMs + (run.activeSince ? Date.parse(now) - Date.parse(run.activeSince) : 0), activeSince: undefined, updatedAt: now }); } },
    resume: async (id, options) => { const run = await load(id); assertOwner(run, options); if (run.state === "FAILED") throw new Error("CANNOT_RESUME_FAILED_RUN"); if (run.state === "PAUSED") { const now = dependencies.clock.now(); await dependencies.searchRunRepository.save({ ...run, state: "RUNNING", activeSince: now, updatedAt: now }); } await fill(id); },
    cancel: async (id, options) => { const run = await load(id); assertOwner(run, options); if (run.state === "CANCELLED" || run.state === "FAILED") return; const unitOfWork: CancellationUnitOfWork = { kind: "CANCELLATION", id: `cancel-${id}` }; const result = await dependencies.backtestCoordinator.cancelSearchCandidates(id, unitOfWork); await dependencies.searchRunRepository.save({ ...run, state: "CANCELLED", stopReason: "USER_CANCELLED", endedAt: dependencies.clock.now(), updatedAt: dependencies.clock.now() }); await dependencies.backtestCoordinator.removePendingJobs(result.candidateIds); },
    status: async (id, options) => { const run = await load(id); assertOwner(run, options); if (run.state === "RUNNING") await fill(id); const refreshed = await load(id); assertOwner(refreshed, options); return refreshed; },
    leaderboard: async (id, options) => { const run = await load(id); assertOwner(run, options); return dependencies.leaderboardService.rankSearchRun(id); },
    onCandidateFinished: fill,
    fillAvailableSlots: fill,
    reconcileRunningRuns: async () => {
      const runs = await dependencies.searchRunRepository.listRunning?.() ?? [];
      for (const run of runs) await fill(run.searchRunId);
      return runs.length;
    },
  };
}
