type Signal = "BUY" | "SELL" | "HOLD";
type ParameterValue = number | string;

type StrategyCandle = Readonly<{
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: true;
}>;

type StrategyContext = Readonly<{
  pair: string;
  timeframe: string;
  candles: readonly StrategyCandle[];
}>;

type VisualizationPoint = Readonly<{
  descriptorId: string;
  timestamp: string;
  values: Readonly<Record<string, number>>;
}>;

type StrategyAnalysis = Readonly<{
  signal: Signal;
  signalAt: string;
  visualization: readonly VisualizationPoint[];
}>;

type Strategy = Readonly<{
  name: "SUPPORT_RESISTANCE";
  category: "STRUCTURE";
  analyze(context: StrategyContext): StrategyAnalysis;
}>;

type StrategyParameters = Readonly<Record<string, ParameterValue>>;

type StrategyParameterDescriptor = Readonly<{
  key: string;
  label: string;
  type: "INTEGER" | "NUMBER" | "ENUM";
  required: boolean;
  defaultValue: ParameterValue;
  minimum?: number;
  maximum?: number;
  step?: number;
  options?: readonly string[];
}>;

type VisualizationDescriptor = Readonly<{
  id: string;
  label: string;
  kind: "LINE" | "BAND" | "ZONE";
  pane: "PRICE" | "INDICATOR";
  series: readonly Readonly<{ key: string; label: string }>[];
}>;

type StrategyPluginDescriptor = Readonly<{
  name: "SUPPORT_RESISTANCE";
  displayName: string;
  description: string;
  category: "STRUCTURE";
  implementationVersion: string;
  behaviorProfileId: "TECHNICAL_PROFILES_V1";
  parameters: readonly StrategyParameterDescriptor[];
  visualization: readonly VisualizationDescriptor[];
}>;

type StrategyFactory = Readonly<{
  descriptor: StrategyPluginDescriptor;
  create(parameters: StrategyParameters): Strategy;
}>;

type Levels = Readonly<{
  support: number;
  resistance: number;
}>;

const DEFAULT_WINDOW = 20;
const DEFAULT_PROXIMITY_PERCENT = 0.5;
const POSITIVE_NUMBER_MINIMUM = Number.MIN_VALUE;

function invalidParameters(): never {
  throw new Error("INVALID_STRATEGY_PARAMETERS");
}

function readParameters(parameters: StrategyParameters | undefined): {
  window: number;
  proximityPercent: number;
} {
  const input = parameters;
  if (!input || typeof input !== "object" || Array.isArray(input)) invalidParameters();
  const allowedKeys = new Set(["window", "proximityPercent"]);

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) invalidParameters();
  }

  const window = input.window === undefined ? DEFAULT_WINDOW : input.window;
  const proximityPercent =
    input.proximityPercent === undefined
      ? DEFAULT_PROXIMITY_PERCENT
      : input.proximityPercent;

  if (
    typeof window !== "number" ||
    !Number.isFinite(window) ||
    !Number.isInteger(window) ||
    window <= 0
  ) {
    invalidParameters();
  }
  if (
    typeof proximityPercent !== "number" ||
    !Number.isFinite(proximityPercent) ||
    proximityPercent <= 0
  ) {
    invalidParameters();
  }

  return { window, proximityPercent };
}

function assertValidContext(context: StrategyContext): void {
  if (!context || !Array.isArray(context.candles)) {
    throw new Error("INVALID_STRATEGY_CONTEXT");
  }

  let previousTimestamp: number | undefined;
  for (const candle of context.candles) {
    if (
      !candle ||
      candle.isClosed !== true ||
      !Number.isFinite(candle.open) ||
      !Number.isFinite(candle.high) ||
      !Number.isFinite(candle.low) ||
      !Number.isFinite(candle.close) ||
      !Number.isFinite(candle.volume)
    ) {
      throw new Error("INVALID_STRATEGY_CONTEXT");
    }

    if (typeof candle.timestamp !== "string" || candle.timestamp.trim().length === 0) {
      throw new Error("INVALID_STRATEGY_CONTEXT");
    }
    const timestamp = Date.parse(candle.timestamp);
    if (!Number.isFinite(timestamp) || (previousTimestamp !== undefined && timestamp <= previousTimestamp)) {
      throw new Error("INVALID_STRATEGY_CONTEXT");
    }
    previousTimestamp = timestamp;
  }
}

function rollingLevelsBefore(
  candles: readonly StrategyCandle[],
  currentIndex: number,
  window: number,
): Levels | undefined {
  const startIndex = currentIndex - window;
  if (startIndex < 0) return undefined;

  let support = Number.POSITIVE_INFINITY;
  let resistance = Number.NEGATIVE_INFINITY;
  for (let index = startIndex; index < currentIndex; index += 1) {
    const candle = candles[index]!;
    support = Math.min(support, candle.low);
    resistance = Math.max(resistance, candle.high);
  }

  return { support, resistance };
}

function visualizationFor(
  context: StrategyContext,
  window: number,
): readonly VisualizationPoint[] {
  const points: VisualizationPoint[] = [];
  for (let index = window; index < context.candles.length; index += 1) {
    const levels = rollingLevelsBefore(context.candles, index, window);
    if (!levels) continue;
    points.push({
      descriptorId: "support-resistance",
      timestamp: context.candles[index]!.timestamp,
      values: {
        support: levels.support,
        resistance: levels.resistance,
      },
    });
  }
  return Object.freeze(points);
}

export const supportResistanceVisualizationDescriptor: VisualizationDescriptor = Object.freeze({
  id: "support-resistance",
  label: "Support and resistance",
  kind: "ZONE",
  pane: "PRICE",
  series: Object.freeze([
    Object.freeze({ key: "support", label: "Support" }),
    Object.freeze({ key: "resistance", label: "Resistance" }),
  ] as const),
});

export const supportResistanceParameters: readonly StrategyParameterDescriptor[] = Object.freeze([
  Object.freeze({
    key: "window",
    label: "Window",
    type: "INTEGER",
    required: false,
    defaultValue: DEFAULT_WINDOW,
    minimum: 1,
    step: 1,
  }),
  Object.freeze({
    key: "proximityPercent",
    label: "Proximity percent",
    type: "NUMBER",
    required: false,
    defaultValue: DEFAULT_PROXIMITY_PERCENT,
    minimum: POSITIVE_NUMBER_MINIMUM,
  }),
] as const);

export const supportResistanceDescriptor: StrategyPluginDescriptor = Object.freeze({
  name: "SUPPORT_RESISTANCE",
  displayName: "Support / Resistance",
  description: "Bounce-oriented signal from previous rolling support and resistance.",
  category: "STRUCTURE",
  implementationVersion: "1.0.0",
  behaviorProfileId: "TECHNICAL_PROFILES_V1",
  parameters: supportResistanceParameters,
  visualization: Object.freeze([supportResistanceVisualizationDescriptor]),
});

function signalForLatestCandle(
  current: StrategyCandle,
  levels: Levels,
  proximityPercent: number,
): Signal {
  const { support, resistance } = levels;
  if (support >= resistance) return "HOLD";

  const proximityRate = proximityPercent / 100;
  const supportZoneUpperBound = support * (1 + proximityRate);
  const resistanceZoneLowerBound = resistance * (1 - proximityRate);
  if (supportZoneUpperBound >= resistanceZoneLowerBound) return "HOLD";

  // A close outside either discovered level is a breakout, not a bounce.
  if (current.close < support || current.close > resistance) return "HOLD";

  const reachesSupport = current.low <= supportZoneUpperBound;
  const reachesResistance = current.high >= resistanceZoneLowerBound;
  if (reachesSupport && reachesResistance) return "HOLD";

  const buy =
    reachesSupport &&
    current.close > support &&
    current.close > current.open;
  const sell =
    reachesResistance &&
    current.close < resistance &&
    current.close < current.open;

  if (buy && sell) return "HOLD";
  if (buy) return "BUY";
  if (sell) return "SELL";
  return "HOLD";
}

export function createSupportResistanceStrategy(parameters: StrategyParameters = {}): Strategy {
  const { window, proximityPercent } = readParameters(parameters);

  return {
    name: "SUPPORT_RESISTANCE",
    category: "STRUCTURE",
    analyze(context): StrategyAnalysis {
      assertValidContext(context);
      const latestIndex = context.candles.length - 1;
      const latestCandle = context.candles[latestIndex];
      const levels = rollingLevelsBefore(context.candles, latestIndex, window);
      const signal = latestCandle && levels
        ? signalForLatestCandle(latestCandle, levels, proximityPercent)
        : "HOLD";

      return {
        signal,
        signalAt: latestCandle?.timestamp ?? "",
        visualization: visualizationFor(context, window),
      };
    },
  };
}

export const supportResistanceFactory: StrategyFactory = Object.freeze({
  descriptor: supportResistanceDescriptor,
  create: createSupportResistanceStrategy,
});

export const srFactory = supportResistanceFactory;
export const SR_FACTORY = supportResistanceFactory;
export const SUPPORT_RESISTANCE_FACTORY = supportResistanceFactory;
export const SUPPORT_RESISTANCE_DESCRIPTOR = supportResistanceDescriptor;

export function createSupportResistanceFactory(): StrategyFactory {
  return supportResistanceFactory;
}

export default supportResistanceFactory;
