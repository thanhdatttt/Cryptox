import { describe, expect, it } from "vitest";
import type { AuthenticatedUserId } from "modules/auth/api";
import { createInMemoryStrategyDependencies } from "./memory";
import { createStrategyApplication, StrategyApplicationError } from "./service";
import type { StrategyFactoryPort } from "./ports";

const userA = "user-a" as AuthenticatedUserId;
const userB = "user-b" as AuthenticatedUserId;

function makeFactory(): StrategyFactoryPort {
  return {
    descriptor: {
      name: "MACD_TEST",
      displayName: "Test MACD",
      description: "A deterministic test-only plugin.",
      category: "MOMENTUM",
      implementationVersion: "1.0.0",
      behaviorProfileId: "MACD_TEST_V1",
      parameters: [
        { key: "period", label: "Period", type: "INTEGER", required: false, defaultValue: 12, minimum: 1 },
        { key: "mode", label: "Mode", type: "ENUM", required: true, defaultValue: "FAST", options: ["FAST", "SLOW"] },
      ],
      visualization: [],
    },
    create: (parameters) => ({
      name: "MACD_TEST",
      category: "MOMENTUM",
      analyze: () => ({ signal: parameters.mode === "FAST" ? "BUY" : "SELL", signalAt: "now", visualization: [] }),
    }),
  };
}

async function makeApp() {
  const dependencies = createInMemoryStrategyDependencies([makeFactory()]);
  const application = createStrategyApplication(dependencies);
  const contextA = { authenticatedUserId: userA };
  const contextB = { authenticatedUserId: userB };
  const first = await application.defineStrategy(contextA, {
    logicalFamilyKey: "momentum-family",
    strategyName: "MACD_TEST",
    parameters: { mode: "FAST" },
  });
  const second = await application.defineStrategy(contextA, {
    logicalFamilyKey: "momentum-family",
    strategyName: "MACD_TEST",
    parameters: { mode: "SLOW", period: 20 },
  });
  const other = await application.defineStrategy(contextB, {
    logicalFamilyKey: "momentum-family",
    strategyName: "MACD_TEST",
    parameters: { mode: "FAST" },
  });
  return { application, contextA, contextB, first, second, other };
}

describe("Strategy application", () => {
  it("registers fake plugins, validates parameters, and versions definitions per owner family", async () => {
    const { application, contextA, first, second } = await makeApp();
    expect(application.listStrategies().map((descriptor) => descriptor.name)).toEqual(["MACD_TEST"]);
    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect(first.parameters).toEqual({ mode: "FAST", period: 12 });
    await expect(application.defineStrategy(contextA, {
      logicalFamilyKey: "bad",
      strategyName: "MACD_TEST",
      parameters: { mode: "FAST", period: Number.NaN },
    })).rejects.toBeInstanceOf(StrategyApplicationError);
    await expect(application.defineStrategy(contextA, {
      logicalFamilyKey: "bad",
      strategyName: "MACD_TEST",
      parameters: { mode: "FAST", unknown: 1 },
    })).rejects.toMatchObject({ code: "INVALID_STRATEGY_PARAMETERS" });
  });

  it("filters reads and collections before pagination, including composite ownership", async () => {
    const { application, contextA, contextB, first, second, other } = await makeApp();
    expect(await application.listStrategyDefinitions(contextA, { limit: 10 })).toMatchObject({
      items: [first, second].sort(
        (left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
      ),
    });
    await expect(application.readStrategyDefinition(contextB, first.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const composite = await application.defineComposite(contextA, {
      logicalFamilyKey: "combined",
      combinationProfileId: "MAJORITY_VOTE_V1",
      strategyDefinitionIds: [second.id, first.id],
    });
    expect(composite.components).toEqual([
      { strategyDefinitionId: first.id, strategyDefinitionVersion: first.version },
      { strategyDefinitionId: second.id, strategyDefinitionVersion: second.version },
    ].sort((left, right) => left.strategyDefinitionId.localeCompare(right.strategyDefinitionId)));
    await expect(application.defineComposite(contextA, {
      logicalFamilyKey: "bad",
      combinationProfileId: "MAJORITY_VOTE_V1",
      strategyDefinitionIds: [first.id, other.id],
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("resolves exact implementation provenance and applies deterministic majority ties", async () => {
    const { application, first, second } = await makeApp();
    const strategy = await application.resolveStrategy(first);
    expect(strategy.analyze({ pair: "BTCUSDT", timeframe: "1h", candles: [] }).signal).toBe("BUY");
    const composite = {
      id: "composite",
      ownerUserId: userA,
      logicalFamilyKey: "combined",
      version: 1,
      method: "MAJORITY_VOTE" as const,
      combinationProfileId: "MAJORITY_VOTE_V1" as const,
      components: [
        { strategyDefinitionId: first.id, strategyDefinitionVersion: first.version },
        { strategyDefinitionId: second.id, strategyDefinitionVersion: second.version },
      ],
      createdAt: "2026-08-28T00:00:00.000Z",
    };
    expect(application.combineSignals(composite, [
      { strategyDefinitionId: first.id, signal: "BUY" },
      { strategyDefinitionId: second.id, signal: "SELL" },
    ])).toBe("HOLD");
    expect(application.combineSignals(composite, [
      { strategyDefinitionId: first.id, signal: "HOLD" },
      { strategyDefinitionId: second.id, signal: "HOLD" },
    ])).toBe("HOLD");
    const unavailable = { ...first, implementationVersion: "missing" };
    await expect(application.resolveStrategy(unavailable)).rejects.toMatchObject({
      code: "STRATEGY_IMPLEMENTATION_UNAVAILABLE",
    });
  });
});
