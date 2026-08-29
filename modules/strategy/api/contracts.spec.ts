import { describe, expect, it } from "vitest";
import {
  BUILT_IN_STRATEGY_NAMES,
  MAJORITY_VOTE_V1,
  STRATEGY_IDENTITY_V1,
  STRATEGY_SIGNALS,
  TECHNICAL_PROFILES_V1,
  LLM_AUTHORING_V1,
  WEIGHTED_VOTE_V1,
  type StrategyDefinition,
  type CompositeStrategyDefinition,
  type StrategyFactory,
  type StrategyPluginDescriptor,
} from "./contracts";
import type { AuthenticatedUserId } from "modules/auth/api";

describe("strategy public contracts", () => {
  it("freezes the four approved technical profiles and global execution rules", () => {
    expect(BUILT_IN_STRATEGY_NAMES).toEqual([
      "MA",
      "RSI",
      "BOLLINGER_BANDS",
      "SUPPORT_RESISTANCE",
    ]);
    expect(TECHNICAL_PROFILES_V1).toMatchObject({
      id: "TECHNICAL_PROFILES_V1",
      global: {
        lookahead: "PROHIBITED",
        signalExecution: "NEXT_CANDLE_OPEN_OR_LATER",
        visualization: "GENERIC_DESCRIPTOR_DRIVEN",
      },
      movingAverage: { defaults: { fastPeriod: 20, slowPeriod: 50 } },
      rsi: {
        defaults: { period: 14, buyThreshold: 30, sellThreshold: 70 },
        edgeCases: { flatSeries: 50, noLosses: 100, noGains: 0 },
      },
      bollingerBands: {
        defaults: { period: 20, deviationMultiplier: 2 },
        deviation: "POPULATION_STANDARD_DEVIATION",
      },
      supportResistance: {
        implementationProfile: "SUPPORT_RESISTANCE_V1",
        defaults: { window: 20, proximityPercent: 0.5 },
        levelDiscovery: {
          candleInput: "PREVIOUS_COMPLETED_CANDLES",
          lookback: 20,
          currentCandleIncluded: false,
          support: "MINIMUM_LOW",
          resistance: "MAXIMUM_HIGH",
        },
        proximityRate: 0.005,
        buy: {
          reachesZone:
            "CURRENT_LOW_LESS_THAN_OR_EQUAL_TO_SUPPORT_TIMES_ONE_PLUS_PROXIMITY_RATE",
          rejectsBreakout: "CURRENT_CLOSE_GREATER_THAN_SUPPORT",
          confirmsBounce: "CURRENT_CLOSE_GREATER_THAN_CURRENT_OPEN",
        },
        sell: {
          reachesZone:
            "CURRENT_HIGH_GREATER_THAN_OR_EQUAL_TO_RESISTANCE_TIMES_ONE_MINUS_PROXIMITY_RATE",
          rejectsBreakout: "CURRENT_CLOSE_LESS_THAN_RESISTANCE",
          confirmsBounce: "CURRENT_CLOSE_LESS_THAN_CURRENT_OPEN",
        },
        breakout: {
          closeBelowSupport: "HOLD",
          closeAboveResistance: "HOLD",
          tradedByProfile: false,
        },
      },
    });
  });

  it("freezes majority voting without weighted configuration", () => {
    expect(STRATEGY_SIGNALS).toEqual(["BUY", "SELL", "HOLD"]);
    expect(MAJORITY_VOTE_V1).toEqual({
      id: "MAJORITY_VOTE_V1",
      method: "MAJORITY_VOTE",
      minimumDistinctComponents: 2,
      componentWeighting: "EQUAL",
      countedSignals: ["BUY", "SELL", "HOLD"],
      winner: "UNIQUE_HIGHEST_COUNT",
      tieResult: "HOLD",
    });
    expect(MAJORITY_VOTE_V1).not.toHaveProperty("thresholds");
  });

  it("adds immutable weighted-vote and safe authoring representations without changing majority V1", () => {
    expect(WEIGHTED_VOTE_V1).toMatchObject({
      id: "WEIGHTED_VOTE_V1",
      signalMapping: { BUY: 1, HOLD: 0, SELL: -1 },
      thresholds: { buy: 0.3, sell: -0.3 },
    });
    expect(LLM_AUTHORING_V1).toMatchObject({
      maximumRequestsPerSubmission: 1,
      timeoutMs: 45_000,
      persistence: "EXPLICIT_SAVE_AND_APPROVE_ONLY",
    });
    expect(LLM_AUTHORING_V1.excluded).toContain("CREDENTIALS");
    expect(LLM_AUTHORING_V1.excluded).toContain("AUTOMATIC_APPROVAL");
  });

  it("freezes the approved Support/Resistance rejection-bounce profile exactly", () => {
    expect(TECHNICAL_PROFILES_V1.supportResistance).toEqual({
      strategyName: "SUPPORT_RESISTANCE",
      implementationProfile: "SUPPORT_RESISTANCE_V1",
      defaults: { window: 20, proximityPercent: 0.5 },
      validation: ["POSITIVE_INTEGER_WINDOW", "POSITIVE_FINITE_PROXIMITY_PERCENT"],
      levelDiscovery: {
        candleInput: "PREVIOUS_COMPLETED_CANDLES",
        lookback: 20,
        currentCandleIncluded: false,
        support: "MINIMUM_LOW",
        resistance: "MAXIMUM_HIGH",
      },
      proximityRate: 0.005,
      supportZoneUpperBound: "SUPPORT_TIMES_ONE_PLUS_PROXIMITY_RATE",
      resistanceZoneLowerBound: "RESISTANCE_TIMES_ONE_MINUS_PROXIMITY_RATE",
      buy: {
        reachesZone:
          "CURRENT_LOW_LESS_THAN_OR_EQUAL_TO_SUPPORT_TIMES_ONE_PLUS_PROXIMITY_RATE",
        rejectsBreakout: "CURRENT_CLOSE_GREATER_THAN_SUPPORT",
        confirmsBounce: "CURRENT_CLOSE_GREATER_THAN_CURRENT_OPEN",
      },
      sell: {
        reachesZone:
          "CURRENT_HIGH_GREATER_THAN_OR_EQUAL_TO_RESISTANCE_TIMES_ONE_MINUS_PROXIMITY_RATE",
        rejectsBreakout: "CURRENT_CLOSE_LESS_THAN_RESISTANCE",
        confirmsBounce: "CURRENT_CLOSE_LESS_THAN_CURRENT_OPEN",
      },
      ambiguousLevels: "SUPPORT_GREATER_THAN_OR_EQUAL_TO_RESISTANCE",
      overlappingZones:
        "SUPPORT_ZONE_UPPER_BOUND_GREATER_THAN_OR_EQUAL_TO_RESISTANCE_ZONE_LOWER_BOUND",
      overlap: "HOLD",
      bothConditions: "HOLD",
      breakout: {
        closeBelowSupport: "HOLD",
        closeAboveResistance: "HOLD",
        tradedByProfile: false,
      },
      neitherCondition: "HOLD",
      insufficientHistory: "HOLD",
      visualization: [
        {
          id: "support-resistance",
          label: "Support and resistance",
          kind: "ZONE",
          pane: "PRICE",
          series: [
            { key: "support", label: "Support" },
            { key: "resistance", label: "Resistance" },
          ],
        },
      ],
    });
  });

  it("keeps immutable definition provenance practical and normalized", () => {
    const definition: StrategyDefinition = {
      id: "strategy-1",
      ownerUserId: "user-1" as AuthenticatedUserId,
      logicalFamilyKey: "ma",
      strategyName: "MA",
      implementationVersion: "1",
      behaviorProfileId: "TECHNICAL_PROFILES_V1",
      version: 1,
      parameters: { fastPeriod: 20, slowPeriod: 50 },
      createdAt: "2026-08-27T00:00:00.000Z",
    };

    expect(definition).not.toHaveProperty("implementationSha256");
    expect(definition.parameters).toEqual({ fastPeriod: 20, slowPeriod: 50 });
    expect(STRATEGY_IDENTITY_V1).toMatchObject({
      logicalFamilyKey: "CALLER_DECLARED_NON_EMPTY_STABLE_KEY",
      parameterKeyOrder: "ECMASCRIPT_STRING_ASCENDING",
      duplicateCompositeComponents: "REJECT",
    });
  });

  it("models direct definition ownership without adding identity to client commands", () => {
    const definition = {
      id: "strategy-1",
      ownerUserId: "user-1" as AuthenticatedUserId,
      logicalFamilyKey: "ma",
      strategyName: "MA",
      implementationVersion: "1",
      behaviorProfileId: "TECHNICAL_PROFILES_V1",
      version: 1,
      parameters: { fastPeriod: 20, slowPeriod: 50 },
      createdAt: "2026-08-28T00:00:00.000Z",
    } satisfies StrategyDefinition;

    expect(definition.ownerUserId).toBe("user-1");
    expect({ logicalFamilyKey: "ma", strategyName: "MA", parameters: {} }).not.toHaveProperty(
      "ownerUserId",
    );
    const composite = {
      id: "composite-1",
      ownerUserId: "user-1" as AuthenticatedUserId,
      logicalFamilyKey: "composite",
      version: 1,
      method: "MAJORITY_VOTE" as const,
      combinationProfileId: "MAJORITY_VOTE_V1" as const,
      components: [
        { strategyDefinitionId: definition.id, strategyDefinitionVersion: definition.version },
      ],
      createdAt: "2026-08-28T00:00:00.000Z",
    } satisfies CompositeStrategyDefinition;
    expect(composite.ownerUserId).toBe(definition.ownerUserId);
    expect(composite.components[0]).not.toHaveProperty("ownerUserId");
  });

  it("accepts a new MACD descriptor and generic visualization without core branching", () => {
    const descriptor: StrategyPluginDescriptor = {
      name: "MACD",
      displayName: "MACD",
      description: "Test-only locality fixture",
      category: "TREND",
      implementationVersion: "test",
      behaviorProfileId: "MACD_TEST_V1",
      parameters: [],
      visualization: [
        {
          id: "macd",
          label: "MACD",
          kind: "LINE",
          pane: "INDICATOR",
          series: [{ key: "value", label: "MACD" }],
        },
      ],
    };
    const factory: StrategyFactory = {
      descriptor,
      create: () => ({
        name: "MACD",
        category: "TREND",
        analyze: () => ({
          signal: "HOLD",
          signalAt: "2026-08-27T00:00:00.000Z",
          visualization: [
            {
              descriptorId: "macd",
              timestamp: "2026-08-27T00:00:00.000Z",
              values: { value: 0 },
            },
          ],
        }),
      }),
    };

    expect(factory.descriptor.visualization[0]?.id).toBe("macd");
  });
});
