import { describe, expect, it } from "vitest";
import { combineSignals, listStrategies } from "./index";
describe("strategy runtime", () => {
  it("exposes descriptor-driven built-in plugins", () => {
    expect(listStrategies().map((strategy) => strategy.name)).toEqual(["MA", "RSI", "BOLLINGER", "SUPPORT_RESISTANCE"]);
  });
  it("combines signals with majority and weighted voting", () => {
    const components = [{ strategyDefinitionId: "ma", weight: 0.4 }, { strategyDefinitionId: "rsi", weight: 0.6 }];
    expect(combineSignals({ id: "c", logicalFamilyKey: "c", version: 1, method: "MAJORITY_VOTE", components, createdAt: "now" }, [{ strategyDefinitionId: "ma", signal: "BUY" }, { strategyDefinitionId: "rsi", signal: "SELL" }])).toBe("HOLD");
    expect(combineSignals({ id: "c", logicalFamilyKey: "c", version: 1, method: "WEIGHTED_SCORE", components, thresholds: { buy: 0.3, sell: -0.3 }, createdAt: "now" }, [{ strategyDefinitionId: "ma", signal: "BUY" }, { strategyDefinitionId: "rsi", signal: "BUY" }])).toBe("BUY");
  });
});
