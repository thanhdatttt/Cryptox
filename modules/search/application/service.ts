import type { CancellationUnitOfWork } from "modules/backtesting/api";
import type { SearchModuleDependencies } from "./ports";
import type { GeneratedCandidate, LoopStatus, SearchRun, SearchRunRankingEntry, StopCondition } from "../domain/contracts";

export interface SearchModuleRuntime {
  start(config: { searchSpace: SearchRun["searchSpace"]; stopCondition: StopCondition; generatorType: SearchRun["generatorType"]; leaderboardScopeId: string; maxInFlight: number }): Promise<{ searchRunId: string }>;
  pause(searchRunId: string): Promise<void>;
  resume(searchRunId: string): Promise<void>;
  cancel(searchRunId: string): Promise<void>;
  status(searchRunId: string): Promise<LoopStatus>;
  leaderboard(searchRunId: string): Promise<SearchRunRankingEntry[]>;
  onCandidateFinished(searchRunId: string): Promise<void>;
  fillAvailableSlots(searchRunId: string): Promise<void>;
}

const inFlight = (status: Pick<LoopStatus, "queuedCount" | "runningCount">): number => status.queuedCount + status.runningCount;
const validateStopCondition = (condition: StopCondition): void => {
  const values = [condition.maxCandidates, condition.maxDurationSeconds, condition.noImprovementAfterIterations].filter((value) => value !== undefined);
  if (values.length === 0 || values.some((value) => !Number.isInteger(value) || value! <= 0)) throw new Error("INVALID_STOP_CONDITION");
};

export function createInMemorySearchDependencies(): SearchModuleDependencies {
  const runs = new Map<string, SearchRun>();
  let sequence = 0;
  return {
    searchRunRepository: { get: async (id) => runs.get(id), insert: async (run) => { runs.set(run.searchRunId, run); return run; }, save: async (run) => { runs.set(run.searchRunId, run); return run; }, listRunning: async () => [...runs.values()].filter((run) => run.state === "RUNNING") },
    generators: {
      RANDOM: { type: "RANDOM", generate: () => { throw new Error("NO_GENERATOR_CONFIGURED"); } },
      DOMAIN_GUIDED: { type: "DOMAIN_GUIDED", generate: () => { throw new Error("NO_GENERATOR_CONFIGURED"); } },
      GENETIC: { type: "GENETIC", generate: () => { throw new Error("NO_GENERATOR_CONFIGURED"); } },
    },
    backtestCoordinator: {
      submitSearchCandidate: async () => { throw new Error("NO_BACKTEST_COORDINATOR_CONFIGURED"); },
      summarizeSearchCandidates: async (searchRunId) => ({ searchRunId, active: [], queuedCount: 0, runningCount: 0, candidatesTested: 0, failedCandidateCount: 0, retryExhaustedCandidateCount: 0, infrastructureFailureCandidateCount: 0, completionProcessingFailureCandidateCount: 0, failedAttemptCount: 0, averageBacktestDurationMs: null }),
      cancelSearchCandidates: async () => ({ candidateIds: [] }),
      removePendingJobs: async () => undefined,
    },
    leaderboardService: { rankSearchRun: async () => [] },
    clock: { now: () => new Date().toISOString() },
    idGenerator: () => `search-run-${++sequence}`,
  };
}

const createRun = (searchRunId: string, config: Parameters<SearchModuleRuntime["start"]>[0], now: string): SearchRun => ({
  searchRunId, state: "RUNNING", activeCandidates: [], queuedCount: 0, runningCount: 0, candidatesTested: 0, failedCandidateCount: 0, retryExhaustedCandidateCount: 0, infrastructureFailureCandidateCount: 0, completionProcessingFailureCandidateCount: 0, failedAttemptCount: 0, averageBacktestDurationMs: 0, createdAt: now, startedAt: now, updatedAt: now, stopCondition: config.stopCondition, searchSpace: config.searchSpace, generatorType: config.generatorType, leaderboardScopeId: config.leaderboardScopeId, maxInFlight: config.maxInFlight, nextIteration: 1, activeDurationMs: 0, activeSince: now,
});

export function createSearchModule(dependencies: SearchModuleDependencies = createInMemorySearchDependencies()): SearchModuleRuntime {
  const idGenerator = dependencies.idGenerator ?? (() => `search-run-${crypto.randomUUID()}`);
  const fills = new Map<string, Promise<void>>();
  const load = async (id: string): Promise<SearchRun> => {
    const run = await dependencies.searchRunRepository.get(id);
    if (!run) throw new Error("SEARCH_RUN_NOT_FOUND");
    return run;
  };
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
    const reserved = run.candidatesTested + inFlight(run);
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
      const met = stopReason(run);
      if (met) {
        if (inFlight(run) === 0) Object.assign(run, { state: "COMPLETED", stopReason: met, endedAt: dependencies.clock.now() });
        await dependencies.searchRunRepository.save(run);
        return;
      }
      const budget = run.stopCondition.maxCandidates === undefined ? run.maxInFlight : Math.max(0, run.stopCondition.maxCandidates - run.candidatesTested - inFlight(run));
      const slots = Math.min(Math.max(0, run.maxInFlight - inFlight(run)), budget);
      const generator = dependencies.generators[run.generatorType];
      for (let index = 0; index < slots; index += 1) await submit(run, generator.generate(run.searchSpace));
      run.updatedAt = dependencies.clock.now();
      await dependencies.searchRunRepository.save(run);
    }).catch(async (error: unknown) => {
      const run = await dependencies.searchRunRepository.get(searchRunId);
      if (run && (run.state === "RUNNING" || run.state === "PAUSED")) await dependencies.searchRunRepository.save({ ...run, state: "FAILED", stopReason: "ERROR", lastError: error instanceof Error ? error.message : "SEARCH_ERROR", endedAt: dependencies.clock.now(), updatedAt: dependencies.clock.now() });
      throw error;
    });
    fills.set(searchRunId, current.finally(() => { if (fills.get(searchRunId) === current) fills.delete(searchRunId); }));
    return current;
  };
  return {
    start: async (config) => { validateStopCondition(config.stopCondition); if (!Number.isInteger(config.maxInFlight) || config.maxInFlight <= 0 || !config.leaderboardScopeId) throw new Error("INVALID_SEARCH_CONFIG"); const run = createRun(idGenerator(), config, dependencies.clock.now()); await dependencies.searchRunRepository.insert(run); await fill(run.searchRunId); return { searchRunId: run.searchRunId }; },
    pause: async (id) => { const run = await load(id); if (run.state === "RUNNING") { const now = dependencies.clock.now(); await dependencies.searchRunRepository.save({ ...run, state: "PAUSED", activeDurationMs: run.activeDurationMs + (run.activeSince ? Date.parse(now) - Date.parse(run.activeSince) : 0), activeSince: undefined, updatedAt: now }); } },
    resume: async (id) => { const run = await load(id); if (run.state === "FAILED") throw new Error("CANNOT_RESUME_FAILED_RUN"); if (run.state === "PAUSED") { const now = dependencies.clock.now(); await dependencies.searchRunRepository.save({ ...run, state: "RUNNING", activeSince: now, updatedAt: now }); } await fill(id); },
    cancel: async (id) => { const run = await load(id); if (run.state === "CANCELLED" || run.state === "FAILED") return; const unitOfWork: CancellationUnitOfWork = { kind: "CANCELLATION", id: `cancel-${id}` }; const result = await dependencies.backtestCoordinator.cancelSearchCandidates(id, unitOfWork); await dependencies.searchRunRepository.save({ ...run, state: "CANCELLED", stopReason: "USER_CANCELLED", endedAt: dependencies.clock.now(), updatedAt: dependencies.clock.now() }); await dependencies.backtestCoordinator.removePendingJobs(result.candidateIds); },
    status: async (id) => load(id),
    leaderboard: async (id) => { await load(id); return dependencies.leaderboardService.rankSearchRun(id); },
    onCandidateFinished: fill,
    fillAvailableSlots: fill,
  };
}
