"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("./index");
(0, vitest_1.describe)("strategy runtime", () => {
    (0, vitest_1.it)("exposes descriptor-driven built-in plugins", () => {
        (0, vitest_1.expect)((0, index_1.listStrategies)().map((strategy) => strategy.name)).toEqual(["BOLLINGER", "MA", "RSI", "SENTIMENT", "SUPPORT_RESISTANCE"]);
        for (const strategy of (0, index_1.listStrategies)()) {
            (0, vitest_1.expect)(Number.isInteger(strategy.minimumHistoryCandles)).toBe(true);
            (0, vitest_1.expect)(strategy.minimumHistoryCandles).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(Object.isFrozen(strategy)).toBe(true);
            (0, vitest_1.expect)(strategy.implementationSha256).toMatch(/^[a-f0-9]{64}$/);
            (0, vitest_1.expect)(strategy.implementationSha256).not.toBe(`builtin:${strategy.name}:1.0.0`);
        }
        (0, vitest_1.expect)((0, index_1.listStrategies)().find((strategy) => strategy.category === "INFORMATION")).toMatchObject({ name: "SENTIMENT", requiresSentiment: true });
    });
    (0, vitest_1.it)("executes the retained INFORMATION plugin from supplied sentiment only", async () => {
        const descriptor = (0, index_1.listStrategies)().find((strategy) => strategy.name === "SENTIMENT");
        const strategy = await (0, index_1.resolveStrategy)({ id: "sentiment-definition", userId: "user-a", logicalFamilyKey: "strategy:SENTIMENT", strategyName: "SENTIMENT", implementationVersion: descriptor.implementationVersion, implementationSha256: descriptor.implementationSha256, version: 1, parameters: { buyThreshold: 0.2, sellThreshold: -0.2 }, createdAt: "2025-01-01T00:00:00.000Z" });
        const context = { pair: "BTCUSDT", timeframe: "1h", candles: [], currentPrice: 100, indicators: {} };
        (0, vitest_1.expect)(strategy.analyze(context)).toBe("HOLD");
        (0, vitest_1.expect)(strategy.analyze({ ...context, sentiment: { label: "POSITIVE", averageScore: 0.5 } })).toBe("BUY");
        (0, vitest_1.expect)(strategy.analyze({ ...context, sentiment: { label: "NEGATIVE", averageScore: -0.5 } })).toBe("SELL");
    });
    (0, vitest_1.it)("combines signals with majority and weighted voting", () => {
        const components = [{ strategyDefinitionId: "ma", weight: 0.4 }, { strategyDefinitionId: "rsi", weight: 0.6 }];
        (0, vitest_1.expect)((0, index_1.combineSignals)({ id: "c", userId: "user-a", logicalFamilyKey: "c", version: 1, method: "MAJORITY_VOTE", components, createdAt: "now" }, [{ strategyDefinitionId: "ma", signal: "BUY" }, { strategyDefinitionId: "rsi", signal: "SELL" }])).toBe("HOLD");
        (0, vitest_1.expect)((0, index_1.combineSignals)({ id: "c", userId: "user-a", logicalFamilyKey: "c", version: 1, method: "WEIGHTED_SCORE", components, thresholds: { buy: 0.3, sell: -0.3 }, createdAt: "now" }, [{ strategyDefinitionId: "ma", signal: "BUY" }, { strategyDefinitionId: "rsi", signal: "BUY" }])).toBe("BUY");
    });
    (0, vitest_1.it)("builds deterministic bounded generic MA lines from the plugin", () => {
        const contexts = Array.from({ length: 5_007 }, (_, index) => ({
            pair: "BTCUSDT",
            timeframe: "1h",
            candles: [
                { timestamp: `2025-01-01T${String(index % 24).padStart(2, "0")}:00:00.000Z`, open: index, high: index + 3, low: index - 1, close: index, volume: 1 },
                { timestamp: `2025-01-02T${String(index % 24).padStart(2, "0")}:00:00.000Z`, open: index + 1, high: index + 4, low: index, close: index + 1, volume: 1 },
                { timestamp: `2025-01-03T${String(index % 24).padStart(2, "0")}:00:00.000Z`, open: index + 2, high: index + 5, low: index + 1, close: index + 2, volume: 1 },
            ],
            currentPrice: index + 2,
            indicators: {},
        }));
        const definition = { id: "ma-definition", userId: "user-a", logicalFamilyKey: "strategy:MA", strategyName: "MA", implementationVersion: "1.0.0", implementationSha256: (0, index_1.listStrategies)().find((strategy) => strategy.name === "MA").implementationSha256, version: 1, parameters: { fastPeriod: 2, slowPeriod: 3 }, createdAt: "2025-01-01T00:00:00.000Z" };
        const first = (0, index_1.buildVisualization)(definition, contexts);
        const second = (0, index_1.buildVisualization)(definition, contexts);
        (0, vitest_1.expect)(first).toEqual(second);
        (0, vitest_1.expect)(first).toHaveLength(2);
        (0, vitest_1.expect)(first.every((overlay) => overlay.kind === "LINE" && overlay.points.length === 5_000)).toBe(true);
        (0, vitest_1.expect)(first[0]?.strategyDefinitionId).toBe("ma-definition");
    });
    (0, vitest_1.it)("builds generic support and resistance levels without strategy-specific API logic", () => {
        const definition = { id: "sr-definition", userId: "user-a", logicalFamilyKey: "strategy:SUPPORT_RESISTANCE", strategyName: "SUPPORT_RESISTANCE", implementationVersion: "1.0.0", implementationSha256: (0, index_1.listStrategies)().find((strategy) => strategy.name === "SUPPORT_RESISTANCE").implementationSha256, version: 1, parameters: { lookback: 3, proximityPercent: 1 }, createdAt: "2025-01-01T00:00:00.000Z" };
        const context = { pair: "BTCUSDT", timeframe: "1h", candles: [
                { timestamp: "2025-01-01T00:00:00.000Z", open: 12, high: 20, low: 10, close: 15, volume: 1 },
                { timestamp: "2025-01-01T01:00:00.000Z", open: 15, high: 22, low: 11, close: 17, volume: 1 },
                { timestamp: "2025-01-01T02:00:00.000Z", open: 17, high: 21, low: 12, close: 18, volume: 1 },
            ], currentPrice: 18, indicators: {} };
        (0, vitest_1.expect)((0, index_1.buildVisualization)(definition, [context])).toEqual([
            { id: "sr-definition:support", strategyDefinitionId: "sr-definition", kind: "ZONE", label: "Support", points: [{ time: "2025-01-01T02:00:00.000Z", low: 10, high: 10 }] },
            { id: "sr-definition:resistance", strategyDefinitionId: "sr-definition", kind: "ZONE", label: "Resistance", points: [{ time: "2025-01-01T02:00:00.000Z", low: 22, high: 22 }] },
        ]);
    });
});
