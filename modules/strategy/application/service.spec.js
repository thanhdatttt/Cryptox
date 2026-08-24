"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const service_1 = require("./service");
(0, vitest_1.describe)("strategy definition runtime", () => {
    (0, vitest_1.it)("validates, versions, idempotently persists, and isolates strategy definitions", async () => {
        const runtime = (0, service_1.createStrategyModule)((0, service_1.createInMemoryStrategyDependencies)());
        const first = await runtime.defineStrategy("user-a", "MA", { fastPeriod: 20, slowPeriod: 50 });
        const same = await runtime.defineStrategy("user-a", "MA", { slowPeriod: 50, fastPeriod: 20 });
        const changed = await runtime.defineStrategy("user-a", "MA", { fastPeriod: 10, slowPeriod: 50 });
        (0, vitest_1.expect)(same.id).toBe(first.id);
        (0, vitest_1.expect)(changed.logicalFamilyKey).toBe(first.logicalFamilyKey);
        (0, vitest_1.expect)(changed.version).toBe(2);
        await (0, vitest_1.expect)(runtime.readDefinitions("user-b", [first.id])).rejects.toThrow("STRATEGY_DEFINITION_NOT_FOUND");
        await (0, vitest_1.expect)(runtime.defineStrategy("user-a", "MA", { fastPeriod: 50, slowPeriod: 20 })).rejects.toThrow("INVALID_STRATEGY_PARAMETERS");
    });
    (0, vitest_1.it)("creates only valid, reviewable composite definitions from owned components", async () => {
        const runtime = (0, service_1.createStrategyModule)((0, service_1.createInMemoryStrategyDependencies)());
        const ma = await runtime.defineStrategy("user-a", "MA", { fastPeriod: 20, slowPeriod: 50 });
        const rsi = await runtime.defineStrategy("user-a", "RSI", { period: 14, buyThreshold: 30, sellThreshold: 70 });
        const majority = await runtime.defineComposite("user-a", { method: "MAJORITY_VOTE", components: [{ strategyDefinitionId: ma.id, weight: 0.8 }, { strategyDefinitionId: rsi.id, weight: 0.2 }] });
        const weighted = await runtime.defineComposite("user-a", { method: "WEIGHTED_SCORE", components: [{ strategyDefinitionId: ma.id, weight: 0.4 }, { strategyDefinitionId: rsi.id, weight: 0.6 }], thresholds: { buy: 0.2, sell: -0.2 } });
        (0, vitest_1.expect)(majority.components.map((component) => component.weight)).toEqual([0, 0]);
        (0, vitest_1.expect)(majority.thresholds).toEqual({ buy: 0.3, sell: -0.3 });
        (0, vitest_1.expect)(weighted.version).toBe(1);
        await (0, vitest_1.expect)(runtime.defineComposite("user-b", { method: "MAJORITY_VOTE", components: [{ strategyDefinitionId: ma.id, weight: 1 }] })).rejects.toThrow("STRATEGY_DEFINITION_NOT_FOUND");
        await (0, vitest_1.expect)(runtime.defineComposite("user-a", { method: "WEIGHTED_SCORE", components: [{ strategyDefinitionId: ma.id, weight: 0.4 }], thresholds: { buy: 0.3, sell: -0.3 } })).rejects.toThrow("INVALID_COMPOSITE_STRATEGY");
    });
});
