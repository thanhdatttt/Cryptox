"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("./index");
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
    (0, vitest_1.it)("keeps the public lifecycle facade explicit while simulation is pure", async () => {
        await (0, vitest_1.expect)((0, index_1.status)("candidate")).rejects.toThrow("NOT_IMPLEMENTED");
    });
});
