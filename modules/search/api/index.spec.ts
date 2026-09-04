import { describe, expect, it } from "vitest";
import { createInMemorySearchDependencies, createSearchModule, start } from "./index";
import { createBacktestingService, createInMemoryBacktestingDependencies } from "modules/backtesting/api";
import { InMemoryBacktestQueue } from "modules/backtesting/api/bootstrap";
import { createEvaluationModule } from "modules/evaluation/api/bootstrap";
import { createBacktestingExperimentReader, createBacktestingScopeRepository, createInMemoryLeaderboardDependencies, createLeaderboardModule } from "modules/leaderboard/api/bootstrap";
import type { CompositeStrategyDefinition, StrategyDefinition } from "modules/strategy/api";

const summary = (searchRunId: string, tested = 0) => ({ searchRunId, active: [], queuedCount: 0, runningCount: 0, candidatesTested: tested, failedCandidateCount: 0, retryExhaustedCandidateCount: 0, infrastructureFailureCandidateCount: 0, completionProcessingFailureCandidateCount: 0, failedAttemptCount: 0, averageBacktestDurationMs: null });

function dependencies(tested = 0) {
  const deps = createInMemorySearchDependencies();
  let submissions = 0;
  let cancellations = 0;
  let queued = 0;
  let completed = tested;
  deps.generators.RANDOM = { type: "RANDOM", generate: (_space, context) => ({ generatedBy: "RANDOM", strategyDefinitions: [], compositeDefinition: {}, executionPolicyIntent: { mode: "TWO_SIDED_ONE_X_V1" }, fingerprint: `fixture-${context?.iterationNumber ?? 0}` } as never) };
  deps.backtestCoordinator = {
    readBenchmarkScope: async (_auth, scopeId) => ({ id: scopeId } as never),
    submitSearchCandidate: async (_auth, _command) => { submissions += 1; queued += 1; return { candidateId: `candidate-${submissions}`, jobId: `job-${submissions}`, status: "QUEUED" as const }; },
    summarizeSearchCandidates: async (_auth, searchRunId) => ({ ...summary(searchRunId, completed), queuedCount: queued, active: Array.from({ length: queued }, (_unused, index) => ({ candidateId: `candidate-${index + 1}`, origin: "SEARCH" as const, selectionMode: "COMPOSITE" as const, searchRunId, leaderboardScopeId: "scope", status: "QUEUED", attempts: [], maxAttempts: 1, completionAttemptCount: 0, completionMaxAttempts: 5, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" })), }),
    cancelSearchCandidates: async (_auth, _searchRunId, _unitOfWork) => { cancellations += 1; return { candidateIds: ["candidate-1"] }; },
    removePendingJobs: async () => undefined,
  };
  deps.leaderboardService = { rankSearchRun: async () => [] };
  deps.clock = { now: () => "2025-01-01T00:00:00.000Z" };
  return { deps, submissions: () => submissions, cancellations: () => cancellations, finish: (count = 1) => { const finished = Math.min(count, queued); queued -= finished; completed += finished; } };
}

const owner = { userId: "user-1" };
const config = { searchSpace: { availableStrategies: [{ id: "strategy-1", userId: owner.userId }] as never[] }, stopCondition: { maxCandidates: 3 }, generatorType: "RANDOM" as const, leaderboardScopeId: "scope", maxInFlight: 2 };

describe("search runtime", () => {
  it("keeps strategy definitions and generated composites within the authenticated owner", async () => {
    const invalidFixture = dependencies();
    const invalidRuntime = createSearchModule(invalidFixture.deps);
    await expect(invalidRuntime.start(owner, { ...config, searchSpace: { availableStrategies: [{ id: "strategy-1", userId: "other-user" }] as never[] } })).rejects.toThrow("INVALID_SEARCH_CONFIG");

    const fixture = { deps: createInMemorySearchDependencies() };
    const runtime = createSearchModule(fixture.deps);
    let submitted: { compositeDefinitionId?: string } | undefined;
    const definition = { id: "owned-definition", userId: owner.userId, logicalFamilyKey: "strategy:owned", strategyName: "TEST", implementationVersion: "1", implementationSha256: "a".repeat(64), version: 1, parameters: {}, createdAt: "2025-01-01T00:00:00.000Z" };
    const persistedComposite = { id: "persisted-composite", userId: owner.userId, logicalFamilyKey: `composite:SINGLE:${definition.id}`, version: 1, method: "WEIGHTED_SCORE" as const, components: [{ strategyDefinitionId: definition.id, weight: 1 }], thresholds: { buy: 0.3, sell: -0.3 }, createdAt: "2025-01-01T00:00:00.000Z" };
    fixture.deps.strategyService = {
      readDefinitions: async (_userId, ids) => ids.map(() => definition),
      defineComposite: async () => persistedComposite,
      readComposite: async () => persistedComposite,
    };
    fixture.deps.backtestCoordinator = {
      ...fixture.deps.backtestCoordinator,
      submitSearchCandidate: async (_auth, command) => { submitted = command; return { candidateId: "candidate-owner", jobId: "job-owner", status: "QUEUED" as const }; },
    };
    await runtime.start(owner, { ...config, searchSpace: { availableStrategies: [definition] }, stopCondition: { maxCandidates: 1 }, maxInFlight: 1 });
    await runtime.fillAvailableSlots("search-run-1");
    expect(submitted?.compositeDefinitionId).toBe(persistedComposite.id);
  });

  it("fills bounded slots and completes when a poll observes the final deterministic candidate", async () => {
    const fixture = dependencies();
    const runtime = createSearchModule(fixture.deps);
    const { searchRunId } = await runtime.start(owner, config);
    await runtime.fillAvailableSlots(searchRunId);

    expect(fixture.submissions()).toBe(2);
    fixture.finish();
    await runtime.onCandidateFinished(searchRunId);
    expect(fixture.submissions()).toBe(3);
    fixture.finish(2);
    await runtime.onCandidateFinished(searchRunId);
    expect(await runtime.status(owner, searchRunId)).toMatchObject({ state: "COMPLETED", maxInFlight: 2, nextIteration: 4, stopReason: "MAX_CANDIDATES" });
    expect(fixture.submissions()).toBe(3);
  });

  it("completes immediately when a stop boundary is drained and cancels idempotently", async () => {
    const stopped = dependencies(3);
    const stoppedRuntime = createSearchModule(stopped.deps);
    const stoppedRun = await stoppedRuntime.start(owner, config);
    await stoppedRuntime.fillAvailableSlots(stoppedRun.searchRunId);
    await expect(stoppedRuntime.status(owner, stoppedRun.searchRunId)).resolves.toMatchObject({ state: "COMPLETED", stopReason: "MAX_CANDIDATES" });

    const active = dependencies();
    const activeRuntime = createSearchModule(active.deps);
    const activeRun = await activeRuntime.start(owner, config);
    await activeRuntime.fillAvailableSlots(activeRun.searchRunId);
    await activeRuntime.cancel(owner, activeRun.searchRunId);
    await activeRuntime.cancel(owner, activeRun.searchRunId);
    await expect(activeRuntime.status(owner, activeRun.searchRunId)).resolves.toMatchObject({ state: "CANCELLED", stopReason: "USER_CANCELLED" });
    expect(active.cancellations()).toBe(1);
  });

  it("provides a deterministic in-memory lifecycle facade when composition is not supplied", async () => {
    await expect(start(owner, config)).resolves.toMatchObject({ searchRunId: expect.any(String) });
  });

  it("advances deterministic Search through queued worker completion, scoring, and ranking", async () => {
    const snapshot = { id: "snapshot-1", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h" as const, range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T03:00:00.000Z" }, candleCount: 3, sha256: "a".repeat(64), createdAt: "2025-01-01T00:00:00.000Z" };
    const candles = [
      { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T00:00:00.000Z", open: 100, high: 102, low: 99, close: 101, volume: 1, isClosed: true },
      { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T01:00:00.000Z", open: 102, high: 106, low: 101, close: 105, volume: 1, isClosed: true },
      { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T02:00:00.000Z", open: 106, high: 111, low: 105, close: 110, volume: 1, isClosed: true },
    ];
    const definition: StrategyDefinition & { userId: string } = { id: "definition-1", userId: owner.userId, logicalFamilyKey: "strategy:test", strategyName: "TEST", implementationVersion: "1", implementationSha256: "b".repeat(64), version: 1, parameters: { period: 14 }, createdAt: snapshot.createdAt };
    let persistedCompositeRecord: CompositeStrategyDefinition & { userId: string } = { id: "persisted-composite", userId: owner.userId, logicalFamilyKey: `composite:SINGLE:${definition.id}`, version: 1, method: "WEIGHTED_SCORE", components: [{ strategyDefinitionId: definition.id, weight: 1 }], thresholds: { buy: 0.3, sell: -0.3 }, createdAt: snapshot.createdAt };
    const strategy = {
      readDefinitions: async (_userId: string, ids: string[]) => ids.map((id) => ({ ...definition, id })),
      defineStrategy: async (_userId: string, strategyName: string, parameters: Record<string, number | string>) => ({ ...definition, strategyName, parameters }),
      defineComposite: async (_userId: string, command: { method: "MAJORITY_VOTE" | "WEIGHTED_SCORE"; components: Array<{ strategyDefinitionId: string; weight: number }>; thresholds?: { buy: number; sell: number } }) => {
        persistedCompositeRecord = { id: "persisted-composite", userId: owner.userId, logicalFamilyKey: "generated", version: 1, method: command.method, components: command.components, thresholds: command.thresholds, createdAt: snapshot.createdAt };
        return persistedCompositeRecord;
      },
      readComposite: async (_userId: string, id: string) => ({ ...persistedCompositeRecord, id }),
      resolveStrategy: async () => ({ name: "test", category: "TREND" as const, analyze: (context: import("modules/strategy/api").StrategyContext) => context.candles.length === 1 ? "BUY" as const : "HOLD" as const }),
      combineSignals: (_composite: CompositeStrategyDefinition, signals: Array<{ strategyDefinitionId: string; signal: "BUY" | "SELL" | "HOLD" }>) => signals[0]?.signal ?? "HOLD" as const,
      buildVisualization: () => []
    };
    let sequence = 0;
    const queue = new InMemoryBacktestQueue();
    let leaderboard!: ReturnType<typeof createLeaderboardModule>;
    let search!: ReturnType<typeof createSearchModule>;
    const backtesting = createBacktestingService({ ...createInMemoryBacktestingDependencies(), queue, marketData: { readDatasetSnapshot: async () => ({ snapshot, candles }) }, strategy, evaluation: createEvaluationModule(), completion: { score: (scopeId, metrics) => leaderboard.score(scopeId, metrics), submit: async (experiment, unitOfWork) => { await leaderboard.submit(experiment, unitOfWork); }, notifySearchCandidateFinished: async (searchRunId) => { await search.onCandidateFinished(searchRunId); } }, clock: { now: () => "2025-01-01T03:00:00.000Z" }, idGenerator: () => `id-${sequence++}` });
    const scope = await backtesting.createBenchmarkScope({ userId: "user-1" }, { name: "fixture", datasetSnapshot: snapshot, initialCapital: 1000, feeRatePercent: 0, slippageBps: 0, scoreFormulaId: "MVP_MANUAL_V1", workerRuntimeVersion: "1", workerRuntimeSha256: "c".repeat(64), evaluationRuntimeVersion: "1", evaluationRuntimeSha256: "d".repeat(64) }, { scopeIdempotencyKey: "scope-key" });
    leaderboard = createLeaderboardModule({ ...createInMemoryLeaderboardDependencies(), scopeRepository: createBacktestingScopeRepository(backtesting), experimentReader: createBacktestingExperimentReader(backtesting), clock: { now: () => "2025-01-01T03:00:00.000Z" } });
    search = createSearchModule({ ...createInMemorySearchDependencies(), strategyService: strategy, backtestCoordinator: backtesting, leaderboardService: leaderboard, clock: { now: () => "2025-01-01T03:00:00.000Z" }, idGenerator: () => "search-run-1" });

    const started = await search.start(owner, { searchSpace: { availableStrategies: [definition] }, stopCondition: { maxCandidates: 2 }, generatorType: "RANDOM", leaderboardScopeId: scope.id, maxInFlight: 1 });
    await search.fillAvailableSlots(started.searchRunId);
    const first = (await backtesting.listSearchCandidates(owner, started.searchRunId, { limit: 10 })).items[0]!;
    await backtesting.processQueueJob(queue.jobs.get(first.candidateId)!, { attemptNumber: 1, fenceToken: "worker-1" });
    await backtesting.processCompletion(first.candidateId);
    const middle = await search.status(owner, started.searchRunId);
    expect(middle).toMatchObject({ state: "RUNNING", candidatesTested: 1, queuedCount: 1 });
    const second = (await backtesting.listSearchCandidates(owner, started.searchRunId, { limit: 10 })).items.find((candidate) => candidate.candidateId !== first.candidateId)!;
    await backtesting.processQueueJob(queue.jobs.get(second.candidateId)!, { attemptNumber: 1, fenceToken: "worker-2" });
    await backtesting.processCompletion(second.candidateId);
    await expect(search.status(owner, started.searchRunId)).resolves.toMatchObject({ state: "COMPLETED", stopReason: "MAX_CANDIDATES", candidatesTested: 2 });
    await expect(search.leaderboard(owner, started.searchRunId)).resolves.toHaveLength(2);
    await expect(leaderboard.topK(owner.userId, scope.id)).resolves.toHaveLength(2);
  });
});
