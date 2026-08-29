import { describe, expect, it } from "vitest";
import { createInMemoryStrategyDependencies, createStrategyModule } from "./service";
import type { GeneratedStrategyProposal } from "./ports";

describe("strategy definition runtime", () => {
  it("validates, versions, idempotently persists, and isolates strategy definitions", async () => {
    const runtime = createStrategyModule(createInMemoryStrategyDependencies());
    const first = await runtime.defineStrategy("user-a", "MA", { fastPeriod: 20, slowPeriod: 50 });
    const same = await runtime.defineStrategy("user-a", "MA", { slowPeriod: 50, fastPeriod: 20 });
    const changed = await runtime.defineStrategy("user-a", "MA", { fastPeriod: 10, slowPeriod: 50 });

    expect(same.id).toBe(first.id);
    expect(changed.logicalFamilyKey).toBe(first.logicalFamilyKey);
    expect(changed.version).toBe(2);
    await expect(runtime.readDefinitions("user-b", [first.id])).rejects.toThrow("STRATEGY_DEFINITION_NOT_FOUND");
    await expect(runtime.defineStrategy("user-a", "MA", { fastPeriod: 50, slowPeriod: 20 })).rejects.toThrow("INVALID_STRATEGY_PARAMETERS");
  });

  it("creates only valid, reviewable composite definitions from owned components", async () => {
    const runtime = createStrategyModule(createInMemoryStrategyDependencies());
    const ma = await runtime.defineStrategy("user-a", "MA", { fastPeriod: 20, slowPeriod: 50 });
    const rsi = await runtime.defineStrategy("user-a", "RSI", { period: 14, buyThreshold: 30, sellThreshold: 70 });
    const majority = await runtime.defineComposite("user-a", { method: "MAJORITY_VOTE", components: [{ strategyDefinitionId: ma.id, weight: 0.8 }, { strategyDefinitionId: rsi.id, weight: 0.2 }] });
    const weighted = await runtime.defineComposite("user-a", { method: "WEIGHTED_SCORE", components: [{ strategyDefinitionId: ma.id, weight: 0.4 }, { strategyDefinitionId: rsi.id, weight: 0.6 }], thresholds: { buy: 0.2, sell: -0.2 } });

    expect(majority.components.map((component) => component.weight)).toEqual([0, 0]);
    expect(majority.thresholds).toEqual({ buy: 0.3, sell: -0.3 });
    expect(weighted.version).toBe(1);
    await expect(runtime.defineComposite("user-b", { method: "MAJORITY_VOTE", components: [{ strategyDefinitionId: ma.id, weight: 1 }] })).rejects.toThrow("OWNERSHIP_MISMATCH");
    await expect(runtime.defineComposite("user-a", { method: "WEIGHTED_SCORE", components: [{ strategyDefinitionId: ma.id, weight: 0.4 }], thresholds: { buy: 0.3, sell: -0.3 } })).rejects.toThrow("INVALID_COMPOSITE_STRATEGY");
  });

  it("delegates text generation to the constrained adapter and persists provenance", async () => {
    const dependencies = createInMemoryStrategyDependencies();
    let received: { sourceText: string; strategies: readonly unknown[]; promptVersion: string } | undefined;
    dependencies.generationAdapter = {
      modelName: "test-model",
      modelVersion: "2025-01",
      generate: async (input) => {
        received = input;
        return { kind: "SINGLE", strategyName: "RSI", parameters: { period: 14, buyThreshold: 30, sellThreshold: 70 } };
      },
    };
    const runtime = createStrategyModule(dependencies);

    const result = await runtime.generateStrategy("user-a", { sourceType: "TEXT", text: "Use RSI with a 14 period and 30/70 thresholds." });

    expect(result).toMatchObject({ kind: "SINGLE", modelName: "test-model", modelVersion: "2025-01", strategyDefinition: { strategyName: "RSI" } });
    expect(received?.sourceText).toContain("14 period");
    expect(received?.strategies.map((strategy) => (strategy as { name: string }).name)).toEqual(["MA", "RSI", "BOLLINGER", "SUPPORT_RESISTANCE"]);
    expect(received?.promptVersion).toBe("1");
    expect(await runtime.listDefinitions("user-a")).toHaveLength(1);
  });

  it("loads URL content before model invocation and audits only the original URL", async () => {
    const dependencies = createInMemoryStrategyDependencies();
    const commits: Array<{ audit: { sourceType: string; sourceUrl?: string }; definitions: unknown[] }> = [];
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
    const runtime = createStrategyModule(dependencies);

    await runtime.generateStrategy("user-a", { sourceType: "URL", url: "https://example.com/article" });

    expect(loadedUrl).toBe("https://example.com/article");
    expect(modelInput).toContain("public strategy article");
    expect(modelInput).not.toContain("https://example.com/article");
    expect(commits[0]).toMatchObject({ audit: { sourceType: "URL", sourceUrl: "https://example.com/article" } });
    expect(commits[0]?.audit).not.toHaveProperty("sourceText");
  });

  it("rejects ambiguous sources, malformed proposals, invalid parameters, and invalid weights before persistence", async () => {
    const dependencies = createInMemoryStrategyDependencies();
    let modelCalls = 0;
    let modelProposal: GeneratedStrategyProposal = { kind: "SINGLE", strategyName: "RSI", parameters: { period: 14, buyThreshold: 30, sellThreshold: 70 } };
    dependencies.generationAdapter = { generate: async () => { modelCalls += 1; return modelProposal; } };
    const runtime = createStrategyModule(dependencies);

    await expect(runtime.generateStrategy("user-a", { sourceType: "TEXT", text: "source", url: "https://example.com" } as never)).rejects.toThrow("VALIDATION_ERROR");
    await expect(runtime.generateStrategy("user-a", { sourceType: "URL", url: "ftp://example.com" })).rejects.toThrow("VALIDATION_ERROR");
    expect(modelCalls).toBe(0);

    modelProposal = { kind: "SINGLE", strategyName: "RSI", parameters: { period: 14, buyThreshold: 30, sellThreshold: 70 }, executable: "return BUY" } as never;
    await expect(runtime.generateStrategy("user-a", { sourceType: "TEXT", text: "malformed output" })).rejects.toThrow("STRATEGY_MODEL_SCHEMA_INVALID");
    expect(await runtime.listDefinitions("user-a")).toHaveLength(0);

    modelProposal = { kind: "SINGLE", strategyName: "RSI", parameters: { period: 1, buyThreshold: 30, sellThreshold: 70 } };
    await expect(runtime.generateStrategy("user-a", { sourceType: "TEXT", text: "invalid parameter" })).rejects.toThrow("INVALID_STRATEGY_PARAMETERS");
    expect(await runtime.listDefinitions("user-a")).toHaveLength(0);

    modelProposal = { kind: "COMPOSITE", method: "WEIGHTED_SCORE", components: [{ strategyName: "RSI", parameters: { period: 14, buyThreshold: 30, sellThreshold: 70 }, weight: -1 }], thresholds: { buy: 0.3, sell: -0.3 } };
    await expect(runtime.generateStrategy("user-a", { sourceType: "TEXT", text: "invalid weight" })).rejects.toThrow("INVALID_COMPOSITE_STRATEGY");
    expect(await runtime.listDefinitions("user-a")).toHaveLength(0);
    expect(await runtime.listComposites("user-a")).toHaveLength(0);
  });

  it("keeps manual definition creation available when no generation adapter is configured", async () => {
    const runtime = createStrategyModule(createInMemoryStrategyDependencies());
    await expect(runtime.defineStrategy("user-a", "MA", { fastPeriod: 20, slowPeriod: 50 })).resolves.toMatchObject({ strategyName: "MA" });
    await expect(runtime.generateStrategy("user-a", { sourceType: "TEXT", text: "generate a strategy" })).rejects.toThrow("STRATEGY_MODEL_UNAVAILABLE");
  });

  it("supports weighted composite proposals and commits components, composite, and audit together", async () => {
    const dependencies = createInMemoryStrategyDependencies();
    dependencies.generationAdapter = {
      generate: async (): Promise<GeneratedStrategyProposal> => ({
        kind: "COMPOSITE",
        method: "WEIGHTED_SCORE",
        components: [
          { strategyName: "MA", parameters: { fastPeriod: 20, slowPeriod: 50 }, weight: 0.4 },
          { strategyName: "RSI", parameters: { period: 14, buyThreshold: 30, sellThreshold: 70 }, weight: 0.6 },
        ],
        thresholds: { buy: 0.2, sell: -0.2 },
      }),
    };
    const runtime = createStrategyModule(dependencies);

    const result = await runtime.generateStrategy("user-a", { sourceType: "TEXT", text: "Combine trend and momentum signals." });

    expect(result.kind).toBe("COMPOSITE");
    expect(result.compositeStrategyDefinition).toMatchObject({ method: "WEIGHTED_SCORE", thresholds: { buy: 0.2, sell: -0.2 } });
    expect(await runtime.listDefinitions("user-a")).toHaveLength(2);
    expect(await runtime.listComposites("user-a")).toHaveLength(1);
  });

  it("rejects model output and timeouts without writing definitions", async () => {
    const unknownDependencies = createInMemoryStrategyDependencies();
    unknownDependencies.generationAdapter = { generate: async () => ({ kind: "SINGLE", strategyName: "NOT_REGISTERED", parameters: {} }) };
    const unknownRuntime = createStrategyModule(unknownDependencies);
    await expect(unknownRuntime.generateStrategy("user-a", { sourceType: "TEXT", text: "unknown" })).rejects.toThrow("STRATEGY_NOT_REGISTERED");
    expect(await unknownRuntime.listDefinitions("user-a")).toHaveLength(0);

    const timeoutDependencies = createInMemoryStrategyDependencies();
    timeoutDependencies.generationAdapter = { generate: async () => new Promise<never>(() => undefined) };
    const timeoutRuntime = createStrategyModule({ ...timeoutDependencies, modelTimeoutMs: 1 });
    await expect(timeoutRuntime.generateStrategy("user-a", { sourceType: "TEXT", text: "a valid source" })).rejects.toThrow("STRATEGY_MODEL_TIMEOUT");
    expect(await timeoutRuntime.listDefinitions("user-a")).toHaveLength(0);
  });
});
