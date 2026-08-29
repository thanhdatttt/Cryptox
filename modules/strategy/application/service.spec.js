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
        (0, vitest_1.expect)(first.userId).toBe("user-a");
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
        (0, vitest_1.expect)(majority.userId).toBe("user-a");
        (0, vitest_1.expect)(weighted.version).toBe(1);
        await (0, vitest_1.expect)(runtime.defineComposite("user-b", { method: "MAJORITY_VOTE", components: [{ strategyDefinitionId: ma.id, weight: 1 }] })).rejects.toThrow("OWNERSHIP_MISMATCH");
        await (0, vitest_1.expect)(runtime.defineComposite("user-a", { method: "WEIGHTED_SCORE", components: [{ strategyDefinitionId: ma.id, weight: 0.4 }], thresholds: { buy: 0.3, sell: -0.3 } })).rejects.toThrow("INVALID_COMPOSITE_STRATEGY");
    });
    (0, vitest_1.it)("delegates text generation to the constrained adapter and persists provenance", async () => {
        const dependencies = (0, service_1.createInMemoryStrategyDependencies)();
        let received;
        dependencies.generationAdapter = {
            modelName: "test-model",
            modelVersion: "2025-01",
            generate: async (input) => {
                received = input;
                return { kind: "SINGLE", strategyName: "RSI", parameters: { period: 14, buyThreshold: 30, sellThreshold: 70 } };
            },
        };
        const runtime = (0, service_1.createStrategyModule)(dependencies);
        const result = await runtime.generateStrategy("user-a", { sourceType: "TEXT", text: "Use RSI with a 14 period and 30/70 thresholds." });
        (0, vitest_1.expect)(result).toMatchObject({ kind: "SINGLE", modelName: "test-model", modelVersion: "2025-01", strategyDefinition: { strategyName: "RSI" } });
        (0, vitest_1.expect)(received?.sourceText).toContain("14 period");
        (0, vitest_1.expect)(received?.strategies.map((strategy) => strategy.name)).toEqual(["MA", "RSI", "BOLLINGER", "SUPPORT_RESISTANCE"]);
        (0, vitest_1.expect)(received?.promptVersion).toBe("1");
        (0, vitest_1.expect)(await runtime.listDefinitions("user-a")).toHaveLength(1);
    });
    (0, vitest_1.it)("loads URL content before model invocation and audits only the original URL", async () => {
        const dependencies = (0, service_1.createInMemoryStrategyDependencies)();
        const commits = [];
        let loadedUrl = "";
        let modelInput = "";
        dependencies.sourceLoader = {
            load: async (url) => { loadedUrl = url; return { sourceText: "A public strategy article describing RSI parameters and thresholds.", canonicalUrl: "https://example.com/canonical" }; },
        };
        dependencies.generationAdapter = {
            modelName: "test-model",
            modelVersion: "2025-02",
            generate: async (input) => { modelInput = input.sourceText; return { kind: "SINGLE", strategyName: "RSI", parameters: { period: 14, buyThreshold: 30, sellThreshold: 70 } }; },
        };
        dependencies.generationUnitOfWork = {
            commit: async (input) => { commits.push({ audit: input.audit, definitions: input.definitions }); },
        };
        const runtime = (0, service_1.createStrategyModule)(dependencies);
        await runtime.generateStrategy("user-a", { sourceType: "URL", url: "https://example.com/article" });
        (0, vitest_1.expect)(loadedUrl).toBe("https://example.com/article");
        (0, vitest_1.expect)(modelInput).toContain("public strategy article");
        (0, vitest_1.expect)(modelInput).not.toContain("https://example.com/article");
        (0, vitest_1.expect)(commits[0]).toMatchObject({ audit: { sourceType: "URL", sourceUrl: "https://example.com/article" } });
        (0, vitest_1.expect)(commits[0]?.audit).not.toHaveProperty("sourceText");
    });
    (0, vitest_1.it)("rejects ambiguous sources, malformed proposals, invalid parameters, and invalid weights before persistence", async () => {
        const dependencies = (0, service_1.createInMemoryStrategyDependencies)();
        let modelCalls = 0;
        let modelProposal = { kind: "SINGLE", strategyName: "RSI", parameters: { period: 14, buyThreshold: 30, sellThreshold: 70 } };
        dependencies.generationAdapter = { generate: async () => { modelCalls += 1; return modelProposal; } };
        const runtime = (0, service_1.createStrategyModule)(dependencies);
        await (0, vitest_1.expect)(runtime.generateStrategy("user-a", { sourceType: "TEXT", text: "source", url: "https://example.com" })).rejects.toThrow("VALIDATION_ERROR");
        await (0, vitest_1.expect)(runtime.generateStrategy("user-a", { sourceType: "URL", url: "ftp://example.com" })).rejects.toThrow("VALIDATION_ERROR");
        (0, vitest_1.expect)(modelCalls).toBe(0);
        modelProposal = { kind: "SINGLE", strategyName: "RSI", parameters: { period: 14, buyThreshold: 30, sellThreshold: 70 }, executable: "return BUY" };
        await (0, vitest_1.expect)(runtime.generateStrategy("user-a", { sourceType: "TEXT", text: "malformed output" })).rejects.toThrow("STRATEGY_MODEL_SCHEMA_INVALID");
        (0, vitest_1.expect)(await runtime.listDefinitions("user-a")).toHaveLength(0);
        modelProposal = { kind: "SINGLE", strategyName: "RSI", parameters: { period: 1, buyThreshold: 30, sellThreshold: 70 } };
        await (0, vitest_1.expect)(runtime.generateStrategy("user-a", { sourceType: "TEXT", text: "invalid parameter" })).rejects.toThrow("INVALID_STRATEGY_PARAMETERS");
        (0, vitest_1.expect)(await runtime.listDefinitions("user-a")).toHaveLength(0);
        modelProposal = { kind: "COMPOSITE", method: "WEIGHTED_SCORE", components: [{ strategyName: "RSI", parameters: { period: 14, buyThreshold: 30, sellThreshold: 70 }, weight: -1 }], thresholds: { buy: 0.3, sell: -0.3 } };
        await (0, vitest_1.expect)(runtime.generateStrategy("user-a", { sourceType: "TEXT", text: "invalid weight" })).rejects.toThrow("INVALID_COMPOSITE_STRATEGY");
        (0, vitest_1.expect)(await runtime.listDefinitions("user-a")).toHaveLength(0);
        (0, vitest_1.expect)(await runtime.listComposites("user-a")).toHaveLength(0);
    });
    (0, vitest_1.it)("keeps manual definition creation available when no generation adapter is configured", async () => {
        const runtime = (0, service_1.createStrategyModule)((0, service_1.createInMemoryStrategyDependencies)());
        await (0, vitest_1.expect)(runtime.defineStrategy("user-a", "MA", { fastPeriod: 20, slowPeriod: 50 })).resolves.toMatchObject({ strategyName: "MA" });
        await (0, vitest_1.expect)(runtime.generateStrategy("user-a", { sourceType: "TEXT", text: "generate a strategy" })).rejects.toThrow("STRATEGY_MODEL_UNAVAILABLE");
    });
    (0, vitest_1.it)("supports weighted composite proposals and commits components, composite, and audit together", async () => {
        const dependencies = (0, service_1.createInMemoryStrategyDependencies)();
        dependencies.generationAdapter = {
            generate: async () => ({
                kind: "COMPOSITE",
                method: "WEIGHTED_SCORE",
                components: [
                    { strategyName: "MA", parameters: { fastPeriod: 20, slowPeriod: 50 }, weight: 0.4 },
                    { strategyName: "RSI", parameters: { period: 14, buyThreshold: 30, sellThreshold: 70 }, weight: 0.6 },
                ],
                thresholds: { buy: 0.2, sell: -0.2 },
            }),
        };
        const runtime = (0, service_1.createStrategyModule)(dependencies);
        const result = await runtime.generateStrategy("user-a", { sourceType: "TEXT", text: "Combine trend and momentum signals." });
        (0, vitest_1.expect)(result.kind).toBe("COMPOSITE");
        (0, vitest_1.expect)(result.compositeStrategyDefinition).toMatchObject({ method: "WEIGHTED_SCORE", thresholds: { buy: 0.2, sell: -0.2 } });
        (0, vitest_1.expect)(await runtime.listDefinitions("user-a")).toHaveLength(2);
        (0, vitest_1.expect)(await runtime.listComposites("user-a")).toHaveLength(1);
    });
    (0, vitest_1.it)("rejects model output and timeouts without writing definitions", async () => {
        const unknownDependencies = (0, service_1.createInMemoryStrategyDependencies)();
        unknownDependencies.generationAdapter = { generate: async () => ({ kind: "SINGLE", strategyName: "NOT_REGISTERED", parameters: {} }) };
        const unknownRuntime = (0, service_1.createStrategyModule)(unknownDependencies);
        await (0, vitest_1.expect)(unknownRuntime.generateStrategy("user-a", { sourceType: "TEXT", text: "unknown" })).rejects.toThrow("STRATEGY_NOT_REGISTERED");
        (0, vitest_1.expect)(await unknownRuntime.listDefinitions("user-a")).toHaveLength(0);
        const timeoutDependencies = (0, service_1.createInMemoryStrategyDependencies)();
        timeoutDependencies.generationAdapter = { generate: async () => new Promise(() => undefined) };
        const timeoutRuntime = (0, service_1.createStrategyModule)({ ...timeoutDependencies, modelTimeoutMs: 1 });
        await (0, vitest_1.expect)(timeoutRuntime.generateStrategy("user-a", { sourceType: "TEXT", text: "a valid source" })).rejects.toThrow("STRATEGY_MODEL_TIMEOUT");
        (0, vitest_1.expect)(await timeoutRuntime.listDefinitions("user-a")).toHaveLength(0);
    });
    (0, vitest_1.it)("resolves and visualizes the exact retained artifact rather than the current built-in", async () => {
        const dependencies = (0, service_1.createInMemoryStrategyDependencies)();
        const calls = [];
        const retainedFactory = {
            descriptor: { name: "MA", displayName: "Retained MA", description: "retained", category: "TREND", implementationVersion: "0.9.0", implementationSha256: "retained-ma-sha", minimumHistoryCandles: 2, parameters: [] },
            create: () => ({
                name: "MA",
                category: "TREND",
                analyze: () => "SELL",
                buildVisualization: (contexts) => [{ id: "retained", kind: "SIGNAL", label: "Retained", points: contexts.map((context) => ({ time: context.candles.at(-1).timestamp, value: 1, signal: "SELL" })) }],
            }),
        };
        dependencies.artifactResolver = {
            resolve: async (name, sha) => { calls.push([name, sha]); return retainedFactory; },
        };
        const runtime = (0, service_1.createStrategyModule)(dependencies);
        const definition = { id: "retained-definition", userId: "user-a", logicalFamilyKey: "strategy:MA", strategyName: "MA", implementationVersion: "0.9.0", implementationSha256: "retained-ma-sha", version: 1, parameters: {}, createdAt: "2025-01-01T00:00:00.000Z" };
        const context = { pair: "BTCUSDT", timeframe: "1h", candles: [{ timestamp: "2025-01-01T00:00:00.000Z", open: 1, high: 2, low: 0, close: 1, volume: 1 }], currentPrice: 1, indicators: {} };
        await (0, vitest_1.expect)((await runtime.resolveStrategy(definition)).analyze(context)).toBe("SELL");
        (0, vitest_1.expect)(runtime.buildVisualization(definition, [context])).toEqual([{ id: "retained-definition:retained", strategyDefinitionId: "retained-definition", kind: "SIGNAL", label: "Retained", points: [{ time: context.candles[0].timestamp, value: 1, signal: "SELL" }] }]);
        (0, vitest_1.expect)(calls).toEqual([["MA", "retained-ma-sha"]]);
    });
    (0, vitest_1.it)("fails explicitly when the retained artifact is unavailable", async () => {
        const dependencies = (0, service_1.createInMemoryStrategyDependencies)();
        dependencies.artifactResolver = { resolve: async () => { throw new Error("missing retained build"); } };
        const runtime = (0, service_1.createStrategyModule)(dependencies);
        const definition = { id: "missing-definition", userId: "user-a", logicalFamilyKey: "strategy:MA", strategyName: "MA", implementationVersion: "0.1.0", implementationSha256: "missing-sha", version: 1, parameters: {}, createdAt: "2025-01-01T00:00:00.000Z" };
        await (0, vitest_1.expect)(runtime.resolveStrategy(definition)).rejects.toThrow("IMPLEMENTATION_ARTIFACT_UNAVAILABLE");
    });
});
