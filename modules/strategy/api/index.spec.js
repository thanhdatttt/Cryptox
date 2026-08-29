"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("./index");
(0, vitest_1.describe)("strategy runtime", () => {
    (0, vitest_1.it)("exposes descriptor-driven built-in plugins", () => {
        (0, vitest_1.expect)((0, index_1.listStrategies)().map((strategy) => strategy.name)).toEqual(["MA", "RSI", "BOLLINGER", "SUPPORT_RESISTANCE"]);
    });
    (0, vitest_1.it)("combines signals with majority and weighted voting", () => {
        const components = [{ strategyDefinitionId: "ma", weight: 0.4 }, { strategyDefinitionId: "rsi", weight: 0.6 }];
        (0, vitest_1.expect)((0, index_1.combineSignals)({ id: "c", logicalFamilyKey: "c", version: 1, method: "MAJORITY_VOTE", components, createdAt: "now" }, [{ strategyDefinitionId: "ma", signal: "BUY" }, { strategyDefinitionId: "rsi", signal: "SELL" }])).toBe("HOLD");
        (0, vitest_1.expect)((0, index_1.combineSignals)({ id: "c", logicalFamilyKey: "c", version: 1, method: "WEIGHTED_SCORE", components, thresholds: { buy: 0.3, sell: -0.3 }, createdAt: "now" }, [{ strategyDefinitionId: "ma", signal: "BUY" }, { strategyDefinitionId: "rsi", signal: "BUY" }])).toBe("BUY");
    });
});
