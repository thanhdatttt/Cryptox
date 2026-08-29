"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const service_1 = require("../application/service");
const times = (count, start = "2025-01-01T00:00:00.000Z") => Array.from({ length: count }, (_, index) => new Date(Date.parse(start) + index * 3_600_000).toISOString());
const makeCandles = (timestamps) => timestamps.map((timestamp, index) => ({ pair: "BTCUSDT", timeframe: "1h", timestamp, open: 100 + index, high: 102 + index, low: 98 + index, close: 101 + index, volume: 10, isClosed: true }));
async function completedFixture(signalAt, warmupCapacityCandles = 3) {
    const timestamps = times(8);
    const candles = makeCandles(timestamps);
    const snapshot = { id: "snapshot-fixture", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h", range: { from: timestamps[0], to: new Date(Date.parse(timestamps[0]) + 10 * 3_600_000).toISOString() }, candleCount: candles.length, sha256: "s".repeat(64), createdAt: timestamps[0] };
    const definition = { id: "definition-fixture", userId: "user-1", logicalFamilyKey: "strategy:fixture", strategyName: "FIXTURE", implementationVersion: "1", implementationSha256: "a".repeat(64), version: 1, parameters: {}, createdAt: timestamps[0] };
    const composite = { id: "composite-fixture", userId: "user-1", logicalFamilyKey: "composite:fixture", version: 1, method: "WEIGHTED_SCORE", components: [{ strategyDefinitionId: definition.id, weight: 1 }], thresholds: { buy: 0.3, sell: -0.3 }, createdAt: timestamps[0] };
    const queue = new service_1.InMemoryBacktestQueue();
    let resolveCalls = 0;
    let visualizationCalls = 0;
    const visualizationContexts = [];
    const dependencies = (0, service_1.createInMemoryBacktestingDependencies)();
    const service = (0, service_1.createBacktestingService)({
        ...dependencies,
        queue,
        marketData: { readDatasetSnapshot: async () => ({ snapshot, candles }) },
        strategy: {
            listStrategies: () => [{ name: "FIXTURE", implementationVersion: "1", implementationSha256: "a".repeat(64), minimumHistoryCandles: 2 }],
            readDefinitions: async (_userId, ids) => ids.map(() => definition),
            readComposite: async () => composite,
            resolveStrategy: async () => {
                resolveCalls += 1;
                return { name: "FIXTURE", category: "TREND", analyze: (context) => signalAt(context.candles.length) };
            },
            combineSignals: (_definition, signals) => signals[0]?.signal ?? "HOLD",
            buildVisualization: (retainedDefinition, contexts) => {
                visualizationCalls += 1;
                (0, vitest_1.expect)(retainedDefinition.id).toBe(definition.id);
                visualizationContexts.push(...contexts.map((context) => context.candles.length));
                return [{ id: "fixture-line", strategyDefinitionId: definition.id, kind: "LINE", label: "Retained fixture line", points: contexts.map((context, index) => ({ time: context.candles[context.candles.length - 1].timestamp, value: index + 1 })) }];
            },
        },
    });
    const scope = await service.createBenchmarkScope({ userId: "user-1" }, { name: "Fixture", datasetSnapshot: snapshot, initialCapital: 1000, feeRatePercent: 0, slippageBps: 0, warmupCapacityCandles, scoreFormulaId: "MVP_MANUAL_V1", riskPolicy: { stopLossPercent: 5, takeProfitPercent: 5 }, workerRuntimeVersion: "1", workerRuntimeSha256: "b".repeat(64), evaluationRuntimeVersion: "1", evaluationRuntimeSha256: "c".repeat(64) }, { scopeIdempotencyKey: "scope-fixture" });
    const accepted = await service.startManual({ userId: "user-1" }, { leaderboardScopeId: scope.id, strategyDefinitions: [definition], compositeDefinition: composite, maxAttempts: 1 }, { submissionIdempotencyKey: "submission-fixture" });
    const job = queue.jobs.get(accepted.jobId);
    const workerResult = await service.processQueueJob(job, { attemptNumber: 1, fenceToken: "fixture-fence" });
    await service.processCompletion(accepted.candidateId);
    const progress = await service.status({ userId: "user-1" }, accepted.candidateId);
    const experiment = await service.readExperimentSummary({ userId: "user-1" }, progress.experimentResultId);
    return { service, experiment, progress, timestamps, visualizationContexts, get resolveCalls() { return resolveCalls; }, get visualizationCalls() { return visualizationCalls; }, workerResult };
}
(0, vitest_1.describe)("Backtesting canonical warm-up and visualization", () => {
    (0, vitest_1.it)("uses descriptor warm-up, accepts a one-component weighted manual run, and projects retained overlays and ordered highlighted markers", async () => {
        const fixture = await completedFixture((contextLength) => contextLength === 3 ? "BUY" : "HOLD");
        (0, vitest_1.expect)(fixture.progress).toMatchObject({ selectionMode: "SINGLE", warmupCandles: 2 });
        (0, vitest_1.expect)(fixture.progress.attempts[0]).toMatchObject({ status: "COMPLETED" });
        (0, vitest_1.expect)(fixture.experiment.trades).toHaveLength(1);
        (0, vitest_1.expect)(fixture.resolveCalls).toBe(1);
        const trade = fixture.experiment.trades[0];
        const from = fixture.timestamps[1];
        const to = new Date(Date.parse(fixture.timestamps[0]) + 9 * 3_600_000).toISOString();
        const visualization = await fixture.service.readExperimentVisualization({ userId: "user-1" }, fixture.experiment.id, { from, to, limit: 2, highlightTradeId: trade.id });
        (0, vitest_1.expect)(visualization.candles.map((candle) => candle.timestamp)).toEqual(fixture.timestamps.slice(1, 3));
        (0, vitest_1.expect)(visualization.nextCursor).toBe("2");
        (0, vitest_1.expect)(visualization.overlays).toHaveLength(1);
        (0, vitest_1.expect)(visualization.overlays[0]).toMatchObject({ kind: "LINE", strategyDefinitionId: "definition-fixture" });
        (0, vitest_1.expect)(visualization.overlays[0].points.every((point) => point.time >= from && point.time < to)).toBe(true);
        (0, vitest_1.expect)(fixture.visualizationCalls).toBe(1);
        (0, vitest_1.expect)(fixture.resolveCalls).toBe(2);
        (0, vitest_1.expect)(fixture.visualizationContexts).toEqual(fixture.timestamps.map((_, index) => index + 1));
        (0, vitest_1.expect)(visualization.markers.map((marker) => marker.kind)).toEqual(["ENTRY", "STOP_LOSS", "TAKE_PROFIT", "EXIT"]);
        (0, vitest_1.expect)(visualization.markers.every((marker) => marker.tradeId === trade.id && marker.highlighted && marker.side === trade.signal)).toBe(true);
        (0, vitest_1.expect)(visualization.markers.every((marker) => marker.time >= from && marker.time < to)).toBe(true);
        await (0, vitest_1.expect)(fixture.service.readExperimentVisualization({ userId: "another-user" }, fixture.experiment.id, { limit: 2 })).rejects.toThrow("EXPERIMENT_NOT_FOUND");
    });
    (0, vitest_1.it)("rejects a descriptor requirement above the sealed warm-up capacity before allocating work", async () => {
        await (0, vitest_1.expect)(completedFixture((contextLength) => contextLength === 3 ? "BUY" : "HOLD", 1)).rejects.toThrow("SNAPSHOT_INCOMPLETE");
    });
    (0, vitest_1.it)("returns deterministic bounded TradePage continuations and totalCount", async () => {
        const fixture = await completedFixture((contextLength) => ({ 3: "BUY", 4: "SELL", 5: "BUY", 6: "SELL" }[contextLength] ?? "HOLD"));
        (0, vitest_1.expect)(fixture.experiment.trades).toHaveLength(4);
        const first = await fixture.service.listExperimentTrades({ userId: "user-1" }, fixture.experiment.id, { limit: 2 });
        (0, vitest_1.expect)(first).toMatchObject({ totalCount: 4, items: [{ sequence: 1 }, { sequence: 2 }] });
        (0, vitest_1.expect)(first.nextCursor).toBeTruthy();
        const second = await fixture.service.listExperimentTrades({ userId: "user-1" }, fixture.experiment.id, { limit: 2, cursor: first.nextCursor });
        (0, vitest_1.expect)(second).toMatchObject({ totalCount: 4, items: [{ sequence: 3 }, { sequence: 4 }] });
        (0, vitest_1.expect)(second.nextCursor).toBeUndefined();
        await (0, vitest_1.expect)(fixture.service.listExperimentTrades({ userId: "user-1" }, fixture.experiment.id, { limit: 101 })).rejects.toThrow("INVALID_PAGE");
        await (0, vitest_1.expect)(fixture.service.listExperimentTrades({ userId: "user-1" }, fixture.experiment.id, { limit: 2, cursor: first.nextCursor, })).resolves.toMatchObject({ totalCount: 4 });
        await (0, vitest_1.expect)(fixture.service.listExperimentTrades({ userId: "another-user" }, fixture.experiment.id, { limit: 2 })).rejects.toThrow("EXPERIMENT_NOT_FOUND");
    });
});
