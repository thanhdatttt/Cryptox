import type {
  AuthenticatedRequestContext,
  AuthenticatedUserId,
} from "modules/auth/api";

export const STRATEGY_SIGNALS = ["BUY", "SELL", "HOLD"] as const;
export type Signal = (typeof STRATEGY_SIGNALS)[number];

export const BUILT_IN_STRATEGY_NAMES = [
  "MA",
  "RSI",
  "BOLLINGER_BANDS",
  "SUPPORT_RESISTANCE",
] as const;
export type BuiltInStrategyName = (typeof BUILT_IN_STRATEGY_NAMES)[number];

export const TECHNICAL_PROFILES_V1_ID = "TECHNICAL_PROFILES_V1" as const;
export const MAJORITY_VOTE_V1_ID = "MAJORITY_VOTE_V1" as const;
export const STRATEGY_IDENTITY_V1_ID = "STRATEGY_IDENTITY_V1" as const;
export type MajorityVoteProfileId = typeof MAJORITY_VOTE_V1_ID;

export type StrategyCategory =
  | "TREND"
  | "MOMENTUM"
  | "VOLATILITY"
  | "STRUCTURE"
  | "INFORMATION";
export type CombinationMethod = "MAJORITY_VOTE";
export type StrategyParameterValue = number | string;

export interface StrategyCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: true;
}

export interface StrategyContext {
  pair: string;
  timeframe: string;
  candles: readonly StrategyCandle[];
}

export type VisualizationKind = "LINE" | "BAND" | "ZONE";
export type VisualizationPane = "PRICE" | "INDICATOR";

export interface VisualizationSeriesDescriptor {
  key: string;
  label: string;
}

export interface StrategyVisualizationDescriptor {
  id: string;
  label: string;
  kind: VisualizationKind;
  pane: VisualizationPane;
  series: readonly VisualizationSeriesDescriptor[];
}

export interface StrategyVisualizationPoint {
  descriptorId: string;
  timestamp: string;
  values: Readonly<Record<string, number>>;
}

export interface StrategyAnalysis {
  signal: Signal;
  signalAt: string;
  visualization: readonly StrategyVisualizationPoint[];
}

export interface Strategy {
  readonly name: string;
  readonly category: StrategyCategory;
  analyze(context: StrategyContext): StrategyAnalysis;
}

export interface StrategyDefinition {
  id: string;
  ownerUserId: AuthenticatedUserId;
  logicalFamilyKey: string;
  strategyName: string;
  implementationVersion: string;
  behaviorProfileId: string;
  version: number;
  parameters: Readonly<Record<string, StrategyParameterValue>>;
  createdAt: string;
}

export interface CompositeComponentDefinition {
  strategyDefinitionId: string;
  strategyDefinitionVersion: number;
}

export interface CompositeStrategyDefinition {
  id: string;
  ownerUserId: AuthenticatedUserId;
  logicalFamilyKey: string;
  version: number;
  method: CombinationMethod;
  combinationProfileId: typeof MAJORITY_VOTE_V1_ID;
  components: readonly CompositeComponentDefinition[];
  createdAt: string;
}

export type StrategySelection =
  | { kind: "STRATEGY"; strategyDefinitionId: string }
  | { kind: "COMPOSITE"; compositeDefinitionId: string };

export type StrategySelectionProvenance =
  | { kind: "STRATEGY"; definition: StrategyDefinition }
  | {
      kind: "COMPOSITE";
      definition: CompositeStrategyDefinition;
      componentDefinitions: readonly StrategyDefinition[];
    };

export interface StrategyParameterDescriptor {
  key: string;
  label: string;
  type: "INTEGER" | "NUMBER" | "ENUM";
  required: boolean;
  defaultValue: StrategyParameterValue;
  minimum?: number;
  maximum?: number;
  step?: number;
  options?: readonly string[];
}

export interface StrategyPluginDescriptor {
  name: string;
  displayName: string;
  description: string;
  category: StrategyCategory;
  implementationVersion: string;
  behaviorProfileId: string;
  parameters: readonly StrategyParameterDescriptor[];
  visualization: readonly StrategyVisualizationDescriptor[];
}

export interface StrategyFactory {
  readonly descriptor: StrategyPluginDescriptor;
  create(parameters: Readonly<Record<string, StrategyParameterValue>>): Strategy;
}

export interface DefineStrategyCommand {
  logicalFamilyKey: string;
  strategyName: string;
  parameters: Readonly<Record<string, StrategyParameterValue>>;
}

export interface DefineCompositeCommand {
  logicalFamilyKey: string;
  combinationProfileId: typeof MAJORITY_VOTE_V1_ID;
  strategyDefinitionIds: readonly string[];
}

export interface StrategyDefinitionPageRequest {
  limit: number;
  cursor?: string;
}

export interface StrategyDefinitionPage<TDefinition> {
  items: readonly TDefinition[];
  nextCursor?: string;
}

export const MAJORITY_VOTE_V1 = {
  id: MAJORITY_VOTE_V1_ID,
  method: "MAJORITY_VOTE",
  minimumDistinctComponents: 2,
  componentWeighting: "EQUAL",
  countedSignals: STRATEGY_SIGNALS,
  winner: "UNIQUE_HIGHEST_COUNT",
  tieResult: "HOLD",
} as const;

export const STRATEGY_IDENTITY_V1 = {
  id: STRATEGY_IDENTITY_V1_ID,
  parameterValidation: "FINITE_NUMBERS_OR_NON_EMPTY_STRINGS",
  parameterKeyOrder: "ECMASCRIPT_STRING_ASCENDING",
  canonicalParameterEncoding: "JSON_ARRAY_OF_KEY_VALUE_TUPLES",
  logicalFamilyKey: "CALLER_DECLARED_NON_EMPTY_STABLE_KEY",
  versionIdentityFields: [
    "LOGICAL_FAMILY_KEY",
    "STRATEGY_NAME",
    "IMPLEMENTATION_VERSION",
    "BEHAVIOR_PROFILE_ID",
    "CANONICAL_PARAMETERS",
  ],
  definitionVersioning: "MONOTONIC_INTEGER_WITHIN_LOGICAL_FAMILY",
  compositeComponentOrder: "STRATEGY_DEFINITION_ID_ASCENDING_THEN_VERSION_ASCENDING",
  duplicateCompositeComponents: "REJECT",
  compositeVersionIdentityFields: [
    "LOGICAL_FAMILY_KEY",
    "COMBINATION_PROFILE_ID",
    "ORDERED_COMPONENT_IDENTITIES",
  ],
  persistedIds: "OPAQUE_IMMUTABLE",
} as const;

export const TECHNICAL_PROFILES_V1 = {
  id: TECHNICAL_PROFILES_V1_ID,
  global: {
    priceInput: "CLOSE",
    candleInput: "CLOSED_ORDERED_FINITE",
    latestPriceSource: "LATEST_CLOSED_CANDLE_CLOSE",
    invalidParameters: "REJECT_BEFORE_EXECUTION",
    lookahead: "PROHIBITED",
    signalExecution: "NEXT_CANDLE_OPEN_OR_LATER",
    visualization: "GENERIC_DESCRIPTOR_DRIVEN",
  },
  movingAverage: {
    strategyName: "MA",
    implementationProfile: "CLOSE_SMA_CROSSOVER",
    defaults: { fastPeriod: 20, slowPeriod: 50 },
    validation: ["POSITIVE_INTEGER_PERIODS", "FAST_PERIOD_LESS_THAN_SLOW_PERIOD"],
    buy: "FAST_CROSSES_ABOVE_SLOW",
    sell: "FAST_CROSSES_BELOW_SLOW",
    equality: "HOLD",
    insufficientHistory: "HOLD",
    visualization: [
      {
        id: "ma-lines",
        label: "Moving averages",
        kind: "LINE",
        pane: "PRICE",
        series: [
          { key: "fast", label: "Fast SMA" },
          { key: "slow", label: "Slow SMA" },
        ],
      },
    ],
  },
  rsi: {
    strategyName: "RSI",
    implementationProfile: "WILDER_RSI",
    defaults: { period: 14, buyThreshold: 30, sellThreshold: 70 },
    validation: [
      "POSITIVE_INTEGER_PERIOD",
      "THRESHOLDS_WITHIN_ZERO_TO_ONE_HUNDRED",
      "BUY_THRESHOLD_LESS_THAN_SELL_THRESHOLD",
    ],
    buy: "RSI_BELOW_BUY_THRESHOLD",
    sell: "RSI_ABOVE_SELL_THRESHOLD",
    equality: "HOLD",
    insufficientHistory: "HOLD",
    edgeCases: { flatSeries: 50, noLosses: 100, noGains: 0 },
    visualization: [
      {
        id: "rsi",
        label: "RSI",
        kind: "LINE",
        pane: "INDICATOR",
        series: [{ key: "value", label: "RSI" }],
      },
    ],
  },
  bollingerBands: {
    strategyName: "BOLLINGER_BANDS",
    implementationProfile: "CLOSE_MEAN_REVERSION",
    defaults: { period: 20, deviationMultiplier: 2 },
    validation: ["POSITIVE_INTEGER_PERIOD", "POSITIVE_FINITE_MULTIPLIER"],
    center: "SMA",
    deviation: "POPULATION_STANDARD_DEVIATION",
    buy: "CLOSE_BELOW_LOWER_BAND",
    sell: "CLOSE_ABOVE_UPPER_BAND",
    equality: "HOLD",
    insufficientHistory: "HOLD",
    visualization: [
      {
        id: "bollinger-band",
        label: "Bollinger Bands",
        kind: "BAND",
        pane: "PRICE",
        series: [
          { key: "lower", label: "Lower" },
          { key: "middle", label: "Middle" },
          { key: "upper", label: "Upper" },
        ],
      },
    ],
  },
  supportResistance: {
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
  },
} as const;

export interface StrategyModulePublicApi {
  listStrategies(): readonly StrategyPluginDescriptor[];
  defineStrategy(
    context: AuthenticatedRequestContext,
    command: DefineStrategyCommand,
  ): Promise<StrategyDefinition>;
  defineComposite(
    context: AuthenticatedRequestContext,
    command: DefineCompositeCommand,
  ): Promise<CompositeStrategyDefinition>;
  readStrategyDefinition(
    context: AuthenticatedRequestContext,
    id: string,
  ): Promise<StrategyDefinition>;
  readCompositeDefinition(
    context: AuthenticatedRequestContext,
    id: string,
  ): Promise<CompositeStrategyDefinition>;
  listStrategyDefinitions(
    context: AuthenticatedRequestContext,
    page: StrategyDefinitionPageRequest,
  ): Promise<StrategyDefinitionPage<StrategyDefinition>>;
  listCompositeDefinitions(
    context: AuthenticatedRequestContext,
    page: StrategyDefinitionPageRequest,
  ): Promise<StrategyDefinitionPage<CompositeStrategyDefinition>>;
  resolveStrategy(definition: StrategyDefinition): Promise<Strategy>;
  combineSignals(
    definition: CompositeStrategyDefinition,
    signals: ReadonlyArray<{ strategyDefinitionId: string; signal: Signal }>,
  ): Signal;
}
