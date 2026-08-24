import { describe, expect, it } from "vitest";
import { createInMemorySearchDependencies, createSearchModule, start } from "./index";
import { createBacktestingService, createInMemoryBacktestingDependencies } from "modules/backtesting/api";
import { createEvaluationModule } from "modules/evaluation/api/bootstrap";
import { createBacktestingExperimentReader, createBacktestingScopeRepository, createInMemoryLeaderboardDependencies, createLeaderboardModule } from "modules/leaderboard/api/bootstrap";

const summary = (searchRunId: string, tested = 0) => ({ searchRunId, active: [], queuedCount: 0, runningCount: 0, candidatesTested: tested, failedCandidateCount: 0, retryExhaustedCandidateCount: 0, infrastructureFailureCandidateCount: 0, completionProcessingFailureCandidateCount: 0, failedAttemptCount: 0, averageBacktestDurationMs: null });

function dependencies(tested = 0) {
  const deps = createInMemorySearchDependencies();
  let submissions = 0;
  let cancellations = 0;
  deps.generators.RANDOM = { type: "RANDOM", generate: () => ({ generatedBy: "RANDOM", strategyDefinitions: [], compositeDefinition: {} } as never) };
  deps.backtestCoordinator = {
    submitSearchCandidate: async () => { submissions += 1; return { candidateId: `candidate-${submissions}`, jobId: `job-${submissions}`, status: "QUEUED" as const }; },
    summarizeSearchCandidates: async (searchRunId) => summary(searchRunId, tested),
    cancelSearchCandidates: async () => { cancellations += 1; return { candidateIds: ["candidate-1"] }; },
    removePendingJobs: async () => undefined,
    status: async () => ({ candidateId: "candidate-1", origin: "SEARCH" as const, selectionMode: "COMPOSITE" as const, leaderboardScopeId: "scope", status: "QUEUED" as const, attempts: [], maxAttempts: 1, completionAttemptCount: 0, completionMaxAttempts: 1, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" }),
    readExperimentSummary: async () => { throw new Error("unused"); },
    scoreExperiment: async () => { throw new Error("unused"); },
  };
  deps.leaderboardService = { score: async () => { throw new Error("unused"); }, submit: async () => { throw new Error("unused"); }, rankSearchRun: async () => [] };
  deps.clock = { now: () => "2025-01-01T00:00:00.000Z" };
  return { deps, submissions: () => submissions, cancellations: () => cancellations };
}

const config = { searchSpace: { availableStrategies: [{ id: "strategy-1" }] as never[] }, stopCondition: { maxCandidates: 3 }, generatorType: "RANDOM" as const, leaderboardScopeId: "scope", maxInFlight: 2 };
const owner = { ownerUserId: "user-1" };

describe("search runtime", () => {
  it("fills bounded slots and completes when a poll observes the final deterministic candidate", async () => {
    const fixture = dependencies();
    const runtime = createSearchModule(fixture.deps);
    const { searchRunId } = await runtime.start(config, owner);

    expect(fixture.submissions()).toBe(2);
    expect(await runtime.status(searchRunId)).toMatchObject({ state: "COMPLETED", maxInFlight: 2, nextIteration: 4, stopReason: "MAX_CANDIDATES" });
    expect(fixture.submissions()).toBe(3);
  });

  it("completes immediately when a stop boundary is drained and cancels idempotently", async () => {
    const stopped = dependencies(3);
    const stoppedRuntime = createSearchModule(stopped.deps);
    const stoppedRun = await stoppedRuntime.start(config, owner);
    await expect(stoppedRuntime.status(stoppedRun.searchRunId)).resolves.toMatchObject({ state: "COMPLETED", stopReason: "MAX_CANDIDATES" });

    const active = dependencies();
    const activeRuntime = createSearchModule(active.deps);
    const activeRun = await activeRuntime.start(config, owner);
    await activeRuntime.cancel(activeRun.searchRunId);
    await activeRuntime.cancel(activeRun.searchRunId);
    await expect(activeRuntime.status(activeRun.searchRunId)).resolves.toMatchObject({ state: "CANCELLED", stopReason: "USER_CANCELLED" });
    expect(active.cancellations()).toBe(1);
  });

  it("keeps the static lifecycle facade explicit while composed loops are stateful", async () => {
    await expect(start(config, owner)).rejects.toThrow("NO_BACKTEST_COORDINATOR_CONFIGURED");
  });

  it("runs deterministic generation through Backtesting, Evaluation, and Top-K Leaderboard projections", async () => {
    const snapshot = { id: "snapshot-1", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h" as const, range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T03:00:00.000Z" }, candleCount: 3, sha256: "a".repeat(64), createdAt: "2025-01-01T00:00:00.000Z" };
    const candles = [
      { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T00:00:00.000Z", open: 100, high: 102, low: 99, close: 101, volume: 1, isClosed: true },
      { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T01:00:00.000Z", open: 102, high: 106, low: 101, close: 105, volume: 1, isClosed: true },
      { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T02:00:00.000Z", open: 106, high: 111, low: 105, close: 110, volume: 1, isClosed: true },
    ];
    const definition = { id: "definition-1", logicalFamilyKey: "strategy:test", strategyName: "TEST", implementationVersion: "1", implementationSha256: "b".repeat(64), version: 1, parameters: {}, createdAt: snapshot.createdAt };
    let sequence = 0;
    const backtesting = createBacktestingService({ ...createInMemoryBacktestingDependencies(), marketData: { readDatasetSnapshot: async () => ({ snapshot, candles }) }, strategy: { resolveStrategy: async () => ({ name: "test", category: "TREND", analyze: (context) => context.candles.length === 1 ? "BUY" : "HOLD" }), combineSignals: (_composite, signals) => signals[0]?.signal ?? "HOLD" }, evaluation: createEvaluationModule(), clock: { now: () => "2025-01-01T03:00:00.000Z" }, idGenerator: () => `id-${sequence++}` });
    const scope = await backtesting.createBenchmarkScope({ name: "fixture", datasetSnapshot: snapshot, initialCapital: 1000, feeRatePercent: 0, slippageBps: 0, scoreFormulaId: "MVP_MANUAL_V1", workerRuntimeVersion: "1", workerRuntimeSha256: "c".repeat(64), evaluationRuntimeVersion: "1", evaluationRuntimeSha256: "d".repeat(64) }, { ownerUserId: "user-1", scopeIdempotencyKey: "scope-key" });
    const leaderboard = createLeaderboardModule({ ...createInMemoryLeaderboardDependencies(), scopeRepository: createBacktestingScopeRepository(backtesting), experimentReader: createBacktestingExperimentReader(backtesting), clock: { now: () => "2025-01-01T03:00:00.000Z" } });
    const search = createSearchModule({ ...createInMemorySearchDependencies(), backtestCoordinator: backtesting, leaderboardService: leaderboard, clock: { now: () => "2025-01-01T03:00:00.000Z" }, idGenerator: () => "search-run-1" });

    const started = await search.start({ searchSpace: { availableStrategies: [definition] }, stopCondition: { maxCandidates: 2 }, generatorType: "RANDOM", leaderboardScopeId: scope.id, maxInFlight: 1 }, owner);
    const status = await search.status(started.searchRunId, owner);
    const ranking = await search.leaderboard(started.searchRunId, owner);

    expect(status).toMatchObject({ state: "COMPLETED", stopReason: "MAX_CANDIDATES", candidatesTested: 2 });
    await expect(backtesting.listSearchCandidates(started.searchRunId, { limit: 10 })).resolves.toMatchObject({ items: [expect.anything(), expect.anything()] });
    expect(ranking).toHaveLength(2);
    await expect(leaderboard.topK(scope.id)).resolves.toHaveLength(2);
    const scoredExperiment = await backtesting.readExperimentSummary(ranking[0]!.experimentResultId, { ownerUserId: "user-1" });
    expect(scoredExperiment).toMatchObject({ rankEligible: true });
    expect(scoredExperiment.overallScore).toBeGreaterThan(0);
  });
});
