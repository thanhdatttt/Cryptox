"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("./index");
const api_1 = require("modules/backtesting/api");
const bootstrap_1 = require("modules/backtesting/api/bootstrap");
const bootstrap_2 = require("modules/evaluation/api/bootstrap");
const bootstrap_3 = require("modules/leaderboard/api/bootstrap");
const summary = (searchRunId, tested = 0) => ({ searchRunId, active: [], queuedCount: 0, runningCount: 0, candidatesTested: tested, failedCandidateCount: 0, retryExhaustedCandidateCount: 0, infrastructureFailureCandidateCount: 0, completionProcessingFailureCandidateCount: 0, failedAttemptCount: 0, averageBacktestDurationMs: null });
function dependencies(tested = 0) {
    const deps = (0, index_1.createInMemorySearchDependencies)();
    let submissions = 0;
    let cancellations = 0;
    deps.generators.RANDOM = { type: "RANDOM", generate: () => ({ generatedBy: "RANDOM", strategyDefinitions: [], compositeDefinition: {} }) };
    deps.backtestCoordinator = {
        readBenchmarkScope: async (_auth, scopeId) => ({ id: scopeId }),
        submitSearchCandidate: async (_auth, _command) => { submissions += 1; return { candidateId: `candidate-${submissions}`, jobId: `job-${submissions}`, status: "QUEUED" }; },
        summarizeSearchCandidates: async (_auth, searchRunId) => summary(searchRunId, tested),
        cancelSearchCandidates: async (_auth, _searchRunId, _unitOfWork) => { cancellations += 1; return { candidateIds: ["candidate-1"] }; },
        removePendingJobs: async () => undefined,
    };
    deps.leaderboardService = { rankSearchRun: async () => [] };
    deps.clock = { now: () => "2025-01-01T00:00:00.000Z" };
    return { deps, submissions: () => submissions, cancellations: () => cancellations };
}
const owner = { userId: "user-1" };
const config = { searchSpace: { availableStrategies: [{ id: "strategy-1", userId: owner.userId }] }, stopCondition: { maxCandidates: 3 }, generatorType: "RANDOM", leaderboardScopeId: "scope", maxInFlight: 2 };
(0, vitest_1.describe)("search runtime", () => {
    (0, vitest_1.it)("keeps strategy definitions and generated composites within the authenticated owner", async () => {
        const invalidFixture = dependencies();
        const invalidRuntime = (0, index_1.createSearchModule)(invalidFixture.deps);
        await (0, vitest_1.expect)(invalidRuntime.start(owner, { ...config, searchSpace: { availableStrategies: [{ id: "strategy-1", userId: "other-user" }] } })).rejects.toThrow("INVALID_SEARCH_CONFIG");
        const fixture = { deps: (0, index_1.createInMemorySearchDependencies)() };
        const runtime = (0, index_1.createSearchModule)(fixture.deps);
        let submitted;
        fixture.deps.backtestCoordinator = {
            ...fixture.deps.backtestCoordinator,
            submitSearchCandidate: async (_auth, command) => { submitted = command; return { candidateId: "candidate-owner", jobId: "job-owner", status: "QUEUED" }; },
        };
        const definition = { id: "owned-definition", userId: owner.userId, logicalFamilyKey: "strategy:owned", strategyName: "TEST", implementationVersion: "1", implementationSha256: "a".repeat(64), version: 1, parameters: {}, createdAt: "2025-01-01T00:00:00.000Z" };
        await runtime.start(owner, { ...config, searchSpace: { availableStrategies: [definition] }, stopCondition: { maxCandidates: 1 }, maxInFlight: 1 });
        (0, vitest_1.expect)(submitted?.compositeDefinition?.userId).toBe(owner.userId);
    });

    (0, vitest_1.it)("fills bounded slots and completes when a poll observes the final deterministic candidate", async () => {
        const fixture = dependencies();
        const runtime = (0, index_1.createSearchModule)(fixture.deps);
        const { searchRunId } = await runtime.start(owner, config);
        (0, vitest_1.expect)(fixture.submissions()).toBe(2);
        await runtime.onCandidateFinished(searchRunId);
        (0, vitest_1.expect)(await runtime.status(owner, searchRunId)).toMatchObject({ state: "COMPLETED", maxInFlight: 2, nextIteration: 4, stopReason: "MAX_CANDIDATES" });
        (0, vitest_1.expect)(fixture.submissions()).toBe(3);
    });
    (0, vitest_1.it)("completes immediately when a stop boundary is drained and cancels idempotently", async () => {
        const stopped = dependencies(3);
        const stoppedRuntime = (0, index_1.createSearchModule)(stopped.deps);
        const stoppedRun = await stoppedRuntime.start(owner, config);
        await (0, vitest_1.expect)(stoppedRuntime.status(owner, stoppedRun.searchRunId)).resolves.toMatchObject({ state: "COMPLETED", stopReason: "MAX_CANDIDATES" });
        const active = dependencies();
        const activeRuntime = (0, index_1.createSearchModule)(active.deps);
        const activeRun = await activeRuntime.start(owner, config);
        await activeRuntime.cancel(owner, activeRun.searchRunId);
        await activeRuntime.cancel(owner, activeRun.searchRunId);
        await (0, vitest_1.expect)(activeRuntime.status(owner, activeRun.searchRunId)).resolves.toMatchObject({ state: "CANCELLED", stopReason: "USER_CANCELLED" });
        (0, vitest_1.expect)(active.cancellations()).toBe(1);
    });
    (0, vitest_1.it)("provides a deterministic in-memory lifecycle facade when composition is not supplied", async () => {
        await (0, vitest_1.expect)((0, index_1.start)(owner, config)).resolves.toMatchObject({ searchRunId: vitest_1.expect.any(String) });
    });
    (0, vitest_1.it)("advances deterministic Search through queued worker completion, scoring, and ranking", async () => {
        const snapshot = { id: "snapshot-1", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h", range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T03:00:00.000Z" }, candleCount: 3, sha256: "a".repeat(64), createdAt: "2025-01-01T00:00:00.000Z" };
        const candles = [
            { pair: "BTCUSDT", timeframe: "1h", timestamp: "2025-01-01T00:00:00.000Z", open: 100, high: 102, low: 99, close: 101, volume: 1, isClosed: true },
            { pair: "BTCUSDT", timeframe: "1h", timestamp: "2025-01-01T01:00:00.000Z", open: 102, high: 106, low: 101, close: 105, volume: 1, isClosed: true },
            { pair: "BTCUSDT", timeframe: "1h", timestamp: "2025-01-01T02:00:00.000Z", open: 106, high: 111, low: 105, close: 110, volume: 1, isClosed: true },
        ];
        const definition = { id: "definition-1", userId: owner.userId, logicalFamilyKey: "strategy:test", strategyName: "TEST", implementationVersion: "1", implementationSha256: "b".repeat(64), version: 1, parameters: {}, createdAt: snapshot.createdAt };
        const compositeDefinition = { id: "generated", userId: owner.userId, logicalFamilyKey: "generated", version: 1, method: "MAJORITY_VOTE", components: [{ strategyDefinitionId: definition.id, weight: 1 }], createdAt: snapshot.createdAt };
        const strategy = { readDefinitions: async (_userId, ids) => ids.map((id) => ({ ...definition, id })), readComposite: async (_userId, id) => ({ ...compositeDefinition, id }), resolveStrategy: async () => ({ name: "test", category: "TREND", analyze: (context) => context.candles.length === 1 ? "BUY" : "HOLD" }), combineSignals: (_composite, signals) => signals[0]?.signal ?? "HOLD", buildVisualization: () => [] };
        let sequence = 0;
        const queue = new bootstrap_1.InMemoryBacktestQueue();
        let leaderboard;
        let search;
        const backtesting = (0, api_1.createBacktestingService)({ ...(0, api_1.createInMemoryBacktestingDependencies)(), queue, marketData: { readDatasetSnapshot: async () => ({ snapshot, candles }) }, strategy, evaluation: (0, bootstrap_2.createEvaluationModule)(), completion: { score: (scopeId, metrics) => leaderboard.score(scopeId, metrics), submit: async (experiment, unitOfWork) => { await leaderboard.submit(experiment, unitOfWork); }, notifySearchCandidateFinished: async (searchRunId) => { await search.onCandidateFinished(searchRunId); } }, clock: { now: () => "2025-01-01T03:00:00.000Z" }, idGenerator: () => `id-${sequence++}` });
        const scope = await backtesting.createBenchmarkScope({ userId: "user-1" }, { name: "fixture", datasetSnapshot: snapshot, initialCapital: 1000, feeRatePercent: 0, slippageBps: 0, scoreFormulaId: "MVP_MANUAL_V1", workerRuntimeVersion: "1", workerRuntimeSha256: "c".repeat(64), evaluationRuntimeVersion: "1", evaluationRuntimeSha256: "d".repeat(64) }, { scopeIdempotencyKey: "scope-key" });
        leaderboard = (0, bootstrap_3.createLeaderboardModule)({ ...(0, bootstrap_3.createInMemoryLeaderboardDependencies)(), scopeRepository: (0, bootstrap_3.createBacktestingScopeRepository)(backtesting), experimentReader: (0, bootstrap_3.createBacktestingExperimentReader)(backtesting), clock: { now: () => "2025-01-01T03:00:00.000Z" } });
        search = (0, index_1.createSearchModule)({ ...(0, index_1.createInMemorySearchDependencies)(), backtestCoordinator: backtesting, leaderboardService: leaderboard, clock: { now: () => "2025-01-01T03:00:00.000Z" }, idGenerator: () => "search-run-1" });
        const started = await search.start(owner, { searchSpace: { availableStrategies: [definition] }, stopCondition: { maxCandidates: 2 }, generatorType: "RANDOM", leaderboardScopeId: scope.id, maxInFlight: 1 });
        const first = (await backtesting.listSearchCandidates(owner, started.searchRunId, { limit: 10 })).items[0];
        await backtesting.processQueueJob(queue.jobs.get(first.candidateId), { attemptNumber: 1, fenceToken: "worker-1" });
        await backtesting.processCompletion(first.candidateId);
        const middle = await search.status(owner, started.searchRunId);
        (0, vitest_1.expect)(middle).toMatchObject({ state: "RUNNING", candidatesTested: 2, queuedCount: 1 });
        const second = (await backtesting.listSearchCandidates(owner, started.searchRunId, { limit: 10 })).items.find((candidate) => candidate.candidateId !== first.candidateId);
        await backtesting.processQueueJob(queue.jobs.get(second.candidateId), { attemptNumber: 1, fenceToken: "worker-2" });
        await backtesting.processCompletion(second.candidateId);
        await (0, vitest_1.expect)(search.status(owner, started.searchRunId)).resolves.toMatchObject({ state: "COMPLETED", stopReason: "MAX_CANDIDATES", candidatesTested: 2 });
        await (0, vitest_1.expect)(search.leaderboard(owner, started.searchRunId)).resolves.toHaveLength(2);
        await (0, vitest_1.expect)(leaderboard.topK(owner.userId, scope.id)).resolves.toHaveLength(2);
    });
});
