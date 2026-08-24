"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("./index");
const service_1 = require("../application/service");
const bootstrap_1 = require("modules/evaluation/api/bootstrap");
const candle = (timestamp, open, close) => ({
    pair: "BTCUSDT",
    timeframe: "1h",
    timestamp,
    open,
    high: Math.max(open, close) + 1,
    low: Math.min(open, close) - 1,
    close,
    volume: 10,
    isClosed: true,
});
(0, vitest_1.describe)("backtesting runtime", () => {
    (0, vitest_1.it)("runs a no-look-ahead next-open simulation and closes at range end", () => {
        const result = (0, index_1.simulateBacktest)({
            candidateId: "c",
            attemptId: "a",
            pair: "BTCUSDT",
            settlementAsset: "USDT",
            timeframe: "1h",
            candles: [
                candle("2025-01-01T00:00:00.000Z", 100, 101),
                candle("2025-01-01T01:00:00.000Z", 102, 105),
                candle("2025-01-01T02:00:00.000Z", 106, 110),
            ],
            strategy: { name: "test", category: "TREND", analyze: (context) => context.candles.length === 1 ? "BUY" : "HOLD" },
            initialCapital: 1000,
            feeRatePercent: 0,
            slippageBps: 0,
            workerRuntimeVersion: "1",
            workerRuntimeSha256: "a".repeat(64),
            startedAt: "2025-01-01T00:00:00.000Z",
            completedAt: "2025-01-01T03:00:00.000Z",
        });
        (0, vitest_1.expect)(result.trades).toHaveLength(1);
        (0, vitest_1.expect)(result.trades[0]).toMatchObject({ entryTime: "2025-01-01T01:00:00.000Z", marketEntryPrice: 102, marketExitPrice: 110, exitReason: "RANGE_END", result: "WIN" });
    });
    (0, vitest_1.it)("applies stop loss before take profit when both occur", () => {
        const result = (0, index_1.simulateBacktest)({
            candidateId: "c",
            attemptId: "a",
            pair: "BTCUSDT",
            settlementAsset: "USDT",
            timeframe: "1h",
            candles: [
                candle("2025-01-01T00:00:00.000Z", 100, 101),
                candle("2025-01-01T01:00:00.000Z", 100, 100),
                { ...candle("2025-01-01T02:00:00.000Z", 100, 100), high: 110, low: 90 },
            ],
            strategy: { name: "test", category: "TREND", analyze: (context) => context.candles.length === 1 ? "BUY" : "HOLD" },
            initialCapital: 1000,
            feeRatePercent: 0,
            slippageBps: 0,
            stopLossPercent: 5,
            takeProfitPercent: 5,
            workerRuntimeVersion: "1",
            workerRuntimeSha256: "a".repeat(64),
            startedAt: "2025-01-01T00:00:00.000Z",
            completedAt: "2025-01-01T03:00:00.000Z",
        });
        (0, vitest_1.expect)(result.trades[0]).toMatchObject({
            exitReason: "STOP_LOSS",
            marketExitPrice: 95,
            exitTime: "2025-01-01T02:00:00.000Z",
        });
    });
    (0, vitest_1.it)("rounds entry and exit costs deterministically and persists equity audit fields", () => {
        const result = (0, index_1.simulateBacktest)({
            candidateId: "c",
            attemptId: "a",
            pair: "BTCUSDT",
            settlementAsset: "USDT",
            timeframe: "1h",
            candles: [
                candle("2025-01-01T00:00:00.000Z", 100, 100),
                candle("2025-01-01T01:00:00.000Z", 100, 100),
                candle("2025-01-01T02:00:00.000Z", 110, 110),
            ],
            strategy: { name: "test", category: "TREND", analyze: (context) => context.candles.length === 1 ? "BUY" : "HOLD" },
            initialCapital: 1000,
            feeRatePercent: 1,
            slippageBps: 100,
            workerRuntimeVersion: "1",
            workerRuntimeSha256: "a".repeat(64),
            startedAt: "2025-01-01T00:00:00.000Z",
            completedAt: "2025-01-01T03:00:00.000Z",
        });
        (0, vitest_1.expect)(result.trades[0]).toMatchObject({
            settlementAsset: "USDT",
            entryPrice: 101,
            exitPrice: 108.9,
            quantity: 9.80296049,
            notionalEntryValue: 990.1,
            grossProfit: 98.03,
            slippageBps: 100,
            slippageAmount: 20.58,
            feeAmount: 20.58,
            profit: 56.87,
            resultPercent: 5.687,
            equityBeforeTrade: 1000,
            equityAfterTrade: 1056.87,
        });
    });
    (0, vitest_1.it)("closes a scheduled reversal on the final candle without opening a synthetic new trade", () => {
        const result = (0, index_1.simulateBacktest)({
            candidateId: "c",
            attemptId: "a",
            pair: "BTCUSDT",
            settlementAsset: "USDT",
            timeframe: "1h",
            candles: [
                candle("2025-01-01T00:00:00.000Z", 100, 100),
                candle("2025-01-01T01:00:00.000Z", 102, 102),
                candle("2025-01-01T02:00:00.000Z", 105, 104),
            ],
            strategy: {
                name: "test",
                category: "TREND",
                analyze: (context) => context.candles.length === 1 ? "BUY" : context.candles.length === 2 ? "SELL" : "HOLD",
            },
            initialCapital: 1000,
            feeRatePercent: 0,
            slippageBps: 0,
            workerRuntimeVersion: "1",
            workerRuntimeSha256: "a".repeat(64),
            startedAt: "2025-01-01T00:00:00.000Z",
            completedAt: "2025-01-01T03:00:00.000Z",
        });
        (0, vitest_1.expect)(result.trades).toEqual([
            vitest_1.expect.objectContaining({
                signal: "LONG",
                exitReason: "STRATEGY_CLOSE",
                marketExitPrice: 105,
                exitTime: "2025-01-01T02:00:00.000Z",
            }),
        ]);
    });
    (0, vitest_1.it)("creates a sealed scope and persists a manual simulator result, trade audit, and evaluation", async () => {
        const snapshot = { id: "snapshot-1", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h", range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T03:00:00.000Z" }, candleCount: 3, sha256: "s".repeat(64), createdAt: "2025-01-01T00:00:00.000Z" };
        const candles = [candle("2025-01-01T00:00:00.000Z", 100, 101), candle("2025-01-01T01:00:00.000Z", 102, 105), candle("2025-01-01T02:00:00.000Z", 106, 110)];
        let sequence = 0;
        const service = (0, service_1.createBacktestingService)({
            ...(0, service_1.createInMemoryBacktestingDependencies)(),
            marketData: { readDatasetSnapshot: async () => ({ snapshot, candles }) },
            strategy: {
                resolveStrategy: async () => ({ name: "test", category: "TREND", analyze: (context) => context.candles.length === 1 ? "BUY" : "HOLD" }),
                combineSignals: (_definition, signals) => signals[0]?.signal ?? "HOLD",
            },
            evaluation: (0, bootstrap_1.createEvaluationModule)(),
            clock: { now: () => `2025-01-01T0${sequence++}:00:00.000Z` },
            idGenerator: () => `id-${sequence++}`,
        });
        const definition = { id: "definition-1", logicalFamilyKey: "strategy:test", strategyName: "TEST", implementationVersion: "1", implementationSha256: "a".repeat(64), version: 1, parameters: {}, createdAt: "2025-01-01T00:00:00.000Z" };
        const composite = { id: "composite-1", logicalFamilyKey: "composite:test", version: 1, method: "MAJORITY_VOTE", components: [{ strategyDefinitionId: definition.id, weight: 0 }], createdAt: "2025-01-01T00:00:00.000Z" };
        const scope = await service.createBenchmarkScope({ name: "BTC fixture", datasetSnapshot: snapshot, initialCapital: 1000, feeRatePercent: 0, slippageBps: 0, scoreFormulaId: "MVP_MANUAL_V1", workerRuntimeVersion: "1", workerRuntimeSha256: "b".repeat(64), evaluationRuntimeVersion: "1", evaluationRuntimeSha256: "c".repeat(64) }, { ownerUserId: "user-1", scopeIdempotencyKey: "scope-key" });
        const accepted = await service.startManual({ leaderboardScopeId: scope.id, strategyDefinitions: [definition], compositeDefinition: composite, maxAttempts: 1 }, { ownerUserId: "user-1", submissionIdempotencyKey: "submission-key" });
        (0, vitest_1.expect)(accepted.status).toBe("COMPLETED");
        await (0, vitest_1.expect)(service.startManual({ leaderboardScopeId: scope.id, strategyDefinitions: [definition], compositeDefinition: composite, maxAttempts: 1 }, { ownerUserId: "user-1", submissionIdempotencyKey: "submission-key" })).resolves.toEqual(accepted);
        const progress = await service.status(accepted.candidateId, { ownerUserId: "user-1" });
        (0, vitest_1.expect)(progress).toMatchObject({ status: "COMPLETED", attempts: [{ status: "COMPLETED" }] });
        const attempt = await service.readAttempt(progress.attempts[0].attemptId, { ownerUserId: "user-1" });
        const trades = await service.listAttemptTrades(attempt.attemptId, { limit: 10 }, { ownerUserId: "user-1" });
        (0, vitest_1.expect)(trades.items).toHaveLength(1);
        const experiment = await service.readExperimentSummary(progress.experimentResultId, { ownerUserId: "user-1" });
        (0, vitest_1.expect)(experiment.metrics).toMatchObject({ numberOfTrades: 1, candidateId: accepted.candidateId });
        await (0, vitest_1.expect)(service.verifyReplay(experiment.id, { ownerUserId: "user-1" })).resolves.toMatchObject({ status: "MATCH", comparedTradeCount: 1 });
        await (0, vitest_1.expect)(service.status(accepted.candidateId, { ownerUserId: "another-user" })).rejects.toThrow("BACKTEST_ACCESS_DENIED");
    });
});
