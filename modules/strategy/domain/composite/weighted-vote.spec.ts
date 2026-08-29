import { describe, expect, it } from "vitest";
import {
  WEIGHTED_VOTE_DEFAULT_THRESHOLDS,
  WEIGHTED_VOTE_V1,
  createWeightedVoteComposite,
  type WeightedVoteCompositeInput,
} from ".";

const ownerUserId = "user-a";

function component(
  strategyDefinitionId: string,
  strategyDefinitionVersion: number,
  enabled: boolean,
  weight: number,
  componentOwnerUserId = ownerUserId,
) {
  return {
    strategyDefinitionId,
    strategyDefinitionVersion,
    ownerUserId: componentOwnerUserId,
    enabled,
    weight,
  };
}

function input(
  components: WeightedVoteCompositeInput["components"],
  thresholds?: WeightedVoteCompositeInput["thresholds"],
): WeightedVoteCompositeInput {
  return { ownerUserId, components, ...(thresholds === undefined ? {} : { thresholds }) };
}

function signals(
  entries: ReadonlyArray<[string, "BUY" | "HOLD" | "SELL"]>,
) {
  return entries.map(([strategyDefinitionId, signal]) => ({ strategyDefinitionId, signal }));
}

describe("WEIGHTED_VOTE_V1 domain policy", () => {
  it("exposes a deeply immutable weighted profile distinct from majority voting", () => {
    expect(WEIGHTED_VOTE_V1).toMatchObject({
      id: "WEIGHTED_VOTE_V1",
      method: "WEIGHTED_VOTE",
      signalMapping: { BUY: 1, HOLD: 0, SELL: -1 },
      thresholds: { buy: 0.3, sell: -0.3 },
      normalization: "ENABLED_FINITE_NON_NEGATIVE_WEIGHTS_SUM_TO_ONE",
    });
    expect(Object.isFrozen(WEIGHTED_VOTE_V1)).toBe(true);
    expect(Object.isFrozen(WEIGHTED_VOTE_V1.signalMapping)).toBe(true);
    expect(Object.isFrozen(WEIGHTED_VOTE_V1.thresholds)).toBe(true);
    expect(Object.isFrozen(WEIGHTED_VOTE_V1.immutableFields)).toBe(true);
    expect(WEIGHTED_VOTE_V1.immutableFields).toEqual([
      "COMPONENT_VERSION",
      "ENABLED",
      "WEIGHT",
      "THRESHOLDS",
    ]);
  });

  it("maps enabled signals, normalizes enabled weights only, and preserves exact versions", () => {
    const composite = createWeightedVoteComposite(input([
      component("strategy-a", 4, true, 2),
      component("strategy-b", 9, true, 1),
      component("strategy-disabled", 12, false, 100),
    ]));

    expect(composite.provenance.components).toEqual([
      { strategyDefinitionId: "strategy-a", strategyDefinitionVersion: 4, enabled: true, weight: 2 / 3 },
      { strategyDefinitionId: "strategy-b", strategyDefinitionVersion: 9, enabled: true, weight: 1 / 3 },
      { strategyDefinitionId: "strategy-disabled", strategyDefinitionVersion: 12, enabled: false, weight: 0 },
    ]);
    const normalizedTotal = composite.provenance.components.reduce(
      (total, current) => total + current.weight,
      0,
    );
    expect(normalizedTotal).toBe(1);
    expect(composite.provenance.thresholds).toEqual(WEIGHTED_VOTE_DEFAULT_THRESHOLDS);

    expect(composite.combine(signals([
      ["strategy-a", "BUY"],
      ["strategy-b", "SELL"],
      ["strategy-disabled", "SELL"],
    ]))).toEqual({ signal: "BUY", score: 1 / 3 });
    expect(composite.signalFor(signals([
      ["strategy-a", "BUY"],
      ["strategy-b", "SELL"],
    ]))).toBe("BUY");
  });

  it("uses inclusive threshold boundaries and HOLD for near-threshold scores and ties", () => {
    const atBuy = createWeightedVoteComposite(input([
      component("buy", 1, true, 0.3),
      component("neutral", 1, true, 0.7),
    ]));
    expect(atBuy.combine(signals([["buy", "BUY"], ["neutral", "HOLD"]]))).toEqual({
      signal: "BUY",
      score: 0.3,
    });

    const belowBuy = createWeightedVoteComposite(input([
      component("buy", 1, true, 0.299999),
      component("neutral", 1, true, 0.700001),
    ]));
    expect(belowBuy.combine(signals([["buy", "BUY"], ["neutral", "HOLD"]]))).toEqual({
      signal: "HOLD",
      score: 0.299999,
    });

    const atSell = createWeightedVoteComposite(input([
      component("sell", 1, true, 0.3),
      component("neutral", 1, true, 0.7),
    ]));
    expect(atSell.combine(signals([["sell", "SELL"], ["neutral", "HOLD"]]))).toEqual({
      signal: "SELL",
      score: -0.3,
    });

    const aboveSell = createWeightedVoteComposite(input([
      component("sell", 1, true, 0.299999),
      component("neutral", 1, true, 0.700001),
    ]));
    expect(aboveSell.combine(signals([["sell", "SELL"], ["neutral", "HOLD"]]))).toEqual({
      signal: "HOLD",
      score: -0.299999,
    });

    const tie = createWeightedVoteComposite(input([
      component("buy", 1, true, 1),
      component("sell", 1, true, 1),
    ]));
    expect(tie.combine(signals([["buy", "BUY"], ["sell", "SELL"]]))).toEqual({
      signal: "HOLD",
      score: 0,
    });
  });

  it("rejects malformed, duplicate, cross-owner, disabled, and zero-total definitions before execution", () => {
    const invalidInputs: Array<[string, unknown]> = [
      ["empty components", input([])],
      ["missing owner", { ownerUserId: "", components: [component("a", 1, true, 1)] }],
      ["missing version", input([{ ...component("a", 1, true, 1), strategyDefinitionVersion: 0 }])],
      ["duplicate component", input([component("a", 1, true, 1), component("a", 2, true, 1)])],
      ["cross-owner component", input([component("a", 1, true, 1, "user-b")])],
      ["negative weight", input([component("a", 1, true, -1)])],
      ["NaN weight", input([component("a", 1, true, Number.NaN)])],
      ["infinite weight", input([component("a", 1, true, Number.POSITIVE_INFINITY)])],
      ["all disabled", input([component("a", 1, false, 1)])],
      ["zero enabled total", input([component("a", 1, true, 0)])],
      ["non-finite threshold", input([component("a", 1, true, 1)], { buy: Number.NaN, sell: -0.3 })],
      ["negative buy threshold", input([component("a", 1, true, 1)], { buy: -0.1, sell: -0.3 })],
      ["positive sell threshold", input([component("a", 1, true, 1)], { buy: 0.3, sell: 0.1 })],
      ["unordered thresholds", input([component("a", 1, true, 1)], { buy: 0.3, sell: 0.3 })],
    ];

    for (const [label, value] of invalidInputs) {
      expect(() => createWeightedVoteComposite(value as WeightedVoteCompositeInput), label).toThrow();
    }
  });

  it("rejects incomplete, duplicate, unknown, and invalid signal inputs before scoring", () => {
    const composite = createWeightedVoteComposite(input([
      component("enabled", 1, true, 1),
      component("disabled", 1, false, 10),
    ]));

    expect(() => composite.combine([])).toThrow("INVALID_WEIGHTED_VOTE_SIGNALS");
    expect(() => composite.combine(signals([["unknown", "BUY"]]))).toThrow("INVALID_WEIGHTED_VOTE_SIGNALS");
    expect(() => composite.combine(signals([["enabled", "BUY"], ["enabled", "SELL"]]))).toThrow(
      "INVALID_WEIGHTED_VOTE_SIGNALS",
    );
    expect(() => composite.combine(signals([["enabled", "BUY"], ["disabled", "BUY"]]))).not.toThrow();
    expect(() => composite.combine([
      { strategyDefinitionId: "enabled", signal: "INVALID" as "BUY" },
    ])).toThrow("INVALID_WEIGHTED_VOTE_SIGNALS");
  });

  it("copies immutable behavior, remains deterministic, and differs from equal-count majority ties", () => {
    const original = input([
      component("strong", 7, true, 9),
      component("weak", 2, true, 1),
    ], { buy: 0.3, sell: -0.3 });
    const composite = createWeightedVoteComposite(original);
    const before = structuredClone(original);
    const first = composite.combine(signals([["strong", "BUY"], ["weak", "SELL"]]));

    original.components[0]!.weight = 0;
    original.components[0]!.enabled = false;
    original.thresholds!.buy = 0.9;
    expect(original).not.toEqual(before);
    expect(composite.combine(signals([["strong", "BUY"], ["weak", "SELL"]]))).toEqual(first);
    const weightedResult = composite.combine(signals([["strong", "BUY"], ["weak", "SELL"]]));
    expect(weightedResult.signal).toBe("BUY");
    expect(weightedResult.score).toBeCloseTo(0.8, 12);
    expect(composite.provenance.components.every((item) => Object.isFrozen(item))).toBe(true);
    expect(Object.isFrozen(composite.provenance)).toBe(true);
    expect(Object.isFrozen(composite.provenance.components)).toBe(true);
    expect(Object.isFrozen(composite.provenance.thresholds)).toBe(true);
    expect(() => {
      (composite.provenance.components[0] as { weight: number }).weight = 0;
    }).toThrow(TypeError);

    // MAJORITY_VOTE_V1 has equal-count unique-winner/tie-HOLD semantics. The
    // weighted policy intentionally produces BUY for this same 1-BUY/1-SELL
    // input because its weights are behavior-bearing evidence.
    expect(first.signal).toBe("BUY");
    expect(first.signal).not.toBe("HOLD");
  });
});
