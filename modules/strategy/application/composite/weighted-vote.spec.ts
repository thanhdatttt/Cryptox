import { describe, expect, it } from "vitest";
import {
  WEIGHTED_VOTE_COMPOSITE_FACTORY,
  createWeightedVoteCompositeAdapter,
  createWeightedVoteCompositeFactory,
  type WeightedVoteDefinitionRecord,
  type WeightedVoteStrategyDefinitionVersion,
} from ".";

const ownerUserId = "user-a";

function definition(
  overrides: Partial<WeightedVoteDefinitionRecord> = {},
): WeightedVoteDefinitionRecord {
  return {
    ownerUserId,
    method: "WEIGHTED_VOTE",
    combinationProfileId: "WEIGHTED_VOTE_V1",
    components: [
      { strategyDefinitionId: "strategy-a", strategyDefinitionVersion: 2, enabled: true, weight: 2 },
      { strategyDefinitionId: "strategy-b", strategyDefinitionVersion: 5, enabled: true, weight: 1 },
      { strategyDefinitionId: "strategy-off", strategyDefinitionVersion: 8, enabled: false, weight: 99 },
    ],
    ...overrides,
  };
}

const componentDefinitions: readonly WeightedVoteStrategyDefinitionVersion[] = [
  { id: "strategy-a", ownerUserId, version: 2 },
  { id: "strategy-b", ownerUserId, version: 5 },
  { id: "strategy-off", ownerUserId, version: 8 },
];

function signals() {
  return [
    { strategyDefinitionId: "strategy-a", signal: "BUY" as const },
    { strategyDefinitionId: "strategy-b", signal: "SELL" as const },
  ];
}

describe("WEIGHTED_VOTE_V1 application adapter", () => {
  it("resolves exact same-owner versions and exposes score and signal adapters", () => {
    const adapter = createWeightedVoteCompositeAdapter(definition(), componentDefinitions);

    expect(adapter.provenance).toMatchObject({
      profileId: "WEIGHTED_VOTE_V1",
      method: "WEIGHTED_VOTE",
      ownerUserId,
      thresholds: { buy: 0.3, sell: -0.3 },
      components: [
        { strategyDefinitionId: "strategy-a", strategyDefinitionVersion: 2, enabled: true, weight: 2 / 3 },
        { strategyDefinitionId: "strategy-b", strategyDefinitionVersion: 5, enabled: true, weight: 1 / 3 },
        { strategyDefinitionId: "strategy-off", strategyDefinitionVersion: 8, enabled: false, weight: 0 },
      ],
    });
    expect(adapter.evaluate(signals())).toEqual({ signal: "BUY", score: 1 / 3 });
    expect(adapter.combine(signals())).toEqual({ signal: "BUY", score: 1 / 3 });
    expect(adapter.combineSignals(signals())).toBe("BUY");
  });

  it("honors immutable configured thresholds while retaining only enabled weights in normalization", () => {
    const adapter = createWeightedVoteCompositeAdapter(definition({
      components: [
        { strategyDefinitionId: "strategy-a", strategyDefinitionVersion: 2, enabled: true, weight: 1 },
        { strategyDefinitionId: "strategy-b", strategyDefinitionVersion: 5, enabled: true, weight: 1 },
        { strategyDefinitionId: "strategy-off", strategyDefinitionVersion: 8, enabled: false, weight: 1000 },
      ],
      weightedVote: {
        profileId: "WEIGHTED_VOTE_V1",
        buyThreshold: 0.5,
        sellThreshold: -0.5,
        normalization: "ENABLED_FINITE_NON_NEGATIVE_WEIGHTS_SUM_TO_ONE",
      },
    }), componentDefinitions);

    expect(adapter.provenance.thresholds).toEqual({ buy: 0.5, sell: -0.5 });
    expect(adapter.evaluate(signals())).toEqual({ signal: "HOLD", score: 0 });
    expect(adapter.provenance.components[2]).toEqual({
      strategyDefinitionId: "strategy-off",
      strategyDefinitionVersion: 8,
      enabled: false,
      weight: 0,
    });
  });

  it.each([
    ["majority profile", definition({ method: "MAJORITY_VOTE" as "WEIGHTED_VOTE" }), componentDefinitions],
    ["wrong profile", definition({ combinationProfileId: "MAJORITY_VOTE_V1" as "WEIGHTED_VOTE_V1" }), componentDefinitions],
    ["missing component", definition(), componentDefinitions.slice(0, 2)],
    ["wrong component version", definition(), [{ id: "strategy-a", ownerUserId, version: 3 }, ...componentDefinitions.slice(1)]],
    ["cross-owner component", definition(), [{ id: "strategy-a", ownerUserId: "user-b", version: 2 }, ...componentDefinitions.slice(1)]],
    ["duplicate component reference", definition({
      components: [
        { strategyDefinitionId: "strategy-a", strategyDefinitionVersion: 2, enabled: true, weight: 1 },
        { strategyDefinitionId: "strategy-a", strategyDefinitionVersion: 2, enabled: true, weight: 1 },
      ],
    }), componentDefinitions],
  ] as const)("rejects %s before the domain can execute", (_label, composite, definitions) => {
    expect(() => createWeightedVoteCompositeAdapter(composite, definitions)).toThrow();
  });

  it("rejects non-finite and invalid weighted configuration at the application boundary", () => {
    expect(() => createWeightedVoteCompositeAdapter(definition({
      components: [{ strategyDefinitionId: "strategy-a", strategyDefinitionVersion: 2, enabled: true, weight: Number.NaN }],
    }), componentDefinitions)).toThrow("INVALID_WEIGHTED_VOTE_APPLICATION_COMPONENT");
    expect(() => createWeightedVoteCompositeAdapter(definition({
      weightedVote: {
        profileId: "WEIGHTED_VOTE_V1",
        buyThreshold: Number.POSITIVE_INFINITY,
        sellThreshold: -0.3,
        normalization: "ENABLED_FINITE_NON_NEGATIVE_WEIGHTS_SUM_TO_ONE",
      },
    }), componentDefinitions)).toThrow("INVALID_WEIGHTED_VOTE_THRESHOLDS");
    expect(() => createWeightedVoteCompositeAdapter(definition({
      components: [],
    }), componentDefinitions)).toThrow("INVALID_WEIGHTED_VOTE_PROFILE");
  });

  it("copies caller records into immutable provenance and keeps the factory itself immutable", () => {
    const compositeDefinition = definition();
    const definitions = componentDefinitions.map((item) => ({ ...item }));
    const adapter = createWeightedVoteCompositeAdapter(compositeDefinition, definitions);
    (compositeDefinition.components as unknown as Array<{ weight?: number }>)[0]!.weight = 0;
    definitions[0]!.version = 99;

    expect(adapter.combine(signals())).toEqual({ signal: "BUY", score: 1 / 3 });
    expect(Object.isFrozen(adapter)).toBe(true);
    expect(Object.isFrozen(adapter.provenance)).toBe(true);
    expect(Object.isFrozen(adapter.provenance.components)).toBe(true);
    expect(Object.isFrozen(adapter.provenance.thresholds)).toBe(true);
    expect(createWeightedVoteCompositeFactory()).toBe(WEIGHTED_VOTE_COMPOSITE_FACTORY);
    expect(Object.isFrozen(WEIGHTED_VOTE_COMPOSITE_FACTORY)).toBe(true);
    expect(() => {
      (adapter.provenance.thresholds as { buy: number }).buy = 0.9;
    }).toThrow(TypeError);
  });

  it("does not accept the historical majority method through the weighted adapter", () => {
    expect(() => createWeightedVoteCompositeAdapter(
      definition({ method: "MAJORITY_VOTE" as "WEIGHTED_VOTE" }),
      componentDefinitions,
    )).toThrow("INVALID_WEIGHTED_VOTE_PROFILE");
  });
});
