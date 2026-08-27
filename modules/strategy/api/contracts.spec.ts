import { describe, expect, it } from "vitest";
import { STRATEGY_SIGNALS, type StrategyDefinition } from "./contracts";

describe("strategy public contracts", () => {
  it("exposes normalized signals without strict artifact hashes", () => {
    const definition: StrategyDefinition = {
      id: "strategy-1",
      logicalFamilyKey: "ma",
      strategyName: "MA",
      implementationVersion: "1",
      version: 1,
      parameters: { fastPeriod: 20, slowPeriod: 50 },
      createdAt: "2026-08-27T00:00:00.000Z",
    };

    expect(STRATEGY_SIGNALS).toEqual(["BUY", "SELL", "HOLD"]);
    expect(definition).not.toHaveProperty("implementationSha256");
  });
});
