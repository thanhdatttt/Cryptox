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
  name: "BOLLINGER_BANDS";
  category: "VOLATILITY";
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
  name: "BOLLINGER_BANDS";
  displayName: string;
  description: string;
  category: "VOLATILITY";
  implementationVersion: string;
  behaviorProfileId: "TECHNICAL_PROFILES_V1";
  parameters: readonly StrategyParameterDescriptor[];
  visualization: readonly VisualizationDescriptor[];
}>;

type StrategyFactory = Readonly<{
  descriptor: StrategyPluginDescriptor;
  create(parameters: StrategyParameters): Strategy;
}>;

type BollingerBands = Readonly<{
  lower: number;
  middle: number;
  upper: number;
}>;

const DEFAULT_PERIOD = 20;
const DEFAULT_DEVIATION_MULTIPLIER = 2;
const POSITIVE_NUMBER_MINIMUM = Number.MIN_VALUE;

function invalidParameters(): never {
  throw new Error("INVALID_STRATEGY_PARAMETERS");
}

function readParameters(parameters: StrategyParameters | undefined): {
  period: number;
  deviationMultiplier: number;
} {
  const input = parameters;
  if (!input || typeof input !== "object" || Array.isArray(input)) invalidParameters();
  const allowedKeys = new Set(["period", "deviationMultiplier"]);

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) invalidParameters();
  }

  const period = input.period === undefined ? DEFAULT_PERIOD : input.period;
  const deviationMultiplier =
    input.deviationMultiplier === undefined
      ? DEFAULT_DEVIATION_MULTIPLIER
      : input.deviationMultiplier;

  if (
    typeof period !== "number" ||
    !Number.isFinite(period) ||
    !Number.isInteger(period) ||
    period <= 0
  ) {
    invalidParameters();
  }
  if (
    typeof deviationMultiplier !== "number" ||
    !Number.isFinite(deviationMultiplier) ||
    deviationMultiplier <= 0
  ) {
    invalidParameters();
  }

  return { period, deviationMultiplier };
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

function calculateBands(
  closes: readonly number[],
  endIndex: number,
  period: number,
  deviationMultiplier: number,
): BollingerBands | undefined {
  const startIndex = endIndex - period + 1;
  if (startIndex < 0) return undefined;

  let sum = 0;
  for (let index = startIndex; index <= endIndex; index += 1) {
    sum += closes[index]!;
  }
  const middle = sum / period;

  let squaredDistance = 0;
  for (let index = startIndex; index <= endIndex; index += 1) {
    squaredDistance += (closes[index]! - middle) ** 2;
  }
  const deviation = Math.sqrt(squaredDistance / period);
  const spread = deviation * deviationMultiplier;

  return {
    lower: middle - spread,
    middle,
    upper: middle + spread,
  };
}

function visualizationFor(
  context: StrategyContext,
  period: number,
  deviationMultiplier: number,
): readonly VisualizationPoint[] {
  const closes = context.candles.map((candle) => candle.close);
  const points: VisualizationPoint[] = [];

  for (let index = period - 1; index < context.candles.length; index += 1) {
    const bands = calculateBands(closes, index, period, deviationMultiplier);
    if (!bands) continue;
    points.push({
      descriptorId: "bollinger-band",
      timestamp: context.candles[index]!.timestamp,
      values: {
        lower: bands.lower,
        middle: bands.middle,
        upper: bands.upper,
      },
    });
  }

  return Object.freeze(points);
}

export const bollingerBandsVisualizationDescriptor: VisualizationDescriptor = Object.freeze({
  id: "bollinger-band",
  label: "Bollinger Bands",
  kind: "BAND",
  pane: "PRICE",
  series: Object.freeze([
    Object.freeze({ key: "lower", label: "Lower" }),
    Object.freeze({ key: "middle", label: "Middle" }),
    Object.freeze({ key: "upper", label: "Upper" }),
  ] as const),
});

export const bollingerBandsParameters: readonly StrategyParameterDescriptor[] = Object.freeze([
  Object.freeze({
    key: "period",
    label: "Period",
    type: "INTEGER",
    required: false,
    defaultValue: DEFAULT_PERIOD,
    minimum: 1,
    step: 1,
  }),
  Object.freeze({
    key: "deviationMultiplier",
    label: "Deviation multiplier",
    type: "NUMBER",
    required: false,
    defaultValue: DEFAULT_DEVIATION_MULTIPLIER,
    minimum: POSITIVE_NUMBER_MINIMUM,
  }),
] as const);

export const bollingerBandsDescriptor: StrategyPluginDescriptor = Object.freeze({
  name: "BOLLINGER_BANDS",
  displayName: "Bollinger Bands",
  description: "Mean-reversion signal from close-price volatility bands.",
  category: "VOLATILITY",
  implementationVersion: "1.0.0",
  behaviorProfileId: "TECHNICAL_PROFILES_V1",
  parameters: bollingerBandsParameters,
  visualization: Object.freeze([bollingerBandsVisualizationDescriptor]),
});

export function createBollingerBandsStrategy(parameters: StrategyParameters = {}): Strategy {
  const { period, deviationMultiplier } = readParameters(parameters);

  return {
    name: "BOLLINGER_BANDS",
    category: "VOLATILITY",
    analyze(context): StrategyAnalysis {
      assertValidContext(context);
      const closes = context.candles.map((candle) => candle.close);
      const latestIndex = closes.length - 1;
      const bands = calculateBands(closes, latestIndex, period, deviationMultiplier);
      const latestCandle = context.candles[latestIndex];

      let signal: Signal = "HOLD";
      if (latestCandle && bands) {
        if (latestCandle.close < bands.lower) signal = "BUY";
        else if (latestCandle.close > bands.upper) signal = "SELL";
      }

      return {
        signal,
        signalAt: latestCandle?.timestamp ?? "",
        visualization: visualizationFor(context, period, deviationMultiplier),
      };
    },
  };
}

export const bollingerBandsFactory: StrategyFactory = Object.freeze({
  descriptor: bollingerBandsDescriptor,
  create: createBollingerBandsStrategy,
});

export const bollingerFactory = bollingerBandsFactory;
export const BOLLINGER_FACTORY = bollingerBandsFactory;
export const BOLLINGER_BANDS_FACTORY = bollingerBandsFactory;
export const bollingerDescriptor = bollingerBandsDescriptor;
export const BOLLINGER_BANDS_DESCRIPTOR = bollingerBandsDescriptor;

export function createBollingerBandsFactory(): StrategyFactory {
  return bollingerBandsFactory;
}

export function createBollingerFactory(): StrategyFactory {
  return bollingerBandsFactory;
}

export default bollingerBandsFactory;
