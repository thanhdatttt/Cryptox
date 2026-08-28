type Signal = "BUY" | "SELL" | "HOLD";
type ParameterValue = number | string;
type Parameters = Readonly<Record<string, ParameterValue>>;

type Candle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: true;
};

type Context = {
  pair: string;
  timeframe: string;
  candles: readonly Candle[];
};

type VisualizationPoint = {
  descriptorId: string;
  timestamp: string;
  values: Readonly<Record<string, number>>;
};

type Analysis = {
  signal: Signal;
  signalAt: string;
  visualization: readonly VisualizationPoint[];
};

type RsiStrategy = {
  readonly name: "RSI";
  readonly category: "MOMENTUM";
  analyze(context: Context): Analysis;
};

type RsiFactory = {
  readonly descriptor: typeof rsiDescriptor;
  create(parameters?: Parameters): RsiStrategy;
};

const RSI_DESCRIPTOR_PARAMETERS = Object.freeze([
  Object.freeze({
    key: "period",
    label: "Period",
    type: "INTEGER",
    required: false,
    defaultValue: 14,
    minimum: 1,
  }),
  Object.freeze({
    key: "buyThreshold",
    label: "Buy threshold",
    type: "NUMBER",
    required: false,
    defaultValue: 30,
    minimum: 0,
    maximum: 100,
  }),
  Object.freeze({
    key: "sellThreshold",
    label: "Sell threshold",
    type: "NUMBER",
    required: false,
    defaultValue: 70,
    minimum: 0,
    maximum: 100,
  }),
] as const);

const RSI_VISUALIZATION = Object.freeze([
  Object.freeze({
    id: "rsi",
    label: "RSI",
    kind: "LINE",
    pane: "INDICATOR",
    series: Object.freeze([Object.freeze({ key: "value", label: "RSI" })]),
  }),
] as const);

export const rsiDescriptor = Object.freeze({
  name: "RSI",
  displayName: "RSI",
  description: "Momentum signal for Wilder relative-strength index thresholds.",
  category: "MOMENTUM",
  implementationVersion: "1.0.0",
  behaviorProfileId: "TECHNICAL_PROFILES_V1",
  parameters: RSI_DESCRIPTOR_PARAMETERS,
  visualization: RSI_VISUALIZATION,
});

function invalidParameters(): never {
  throw new Error("INVALID_STRATEGY_PARAMETERS");
}

function parseCanonicalTimestamp(value: unknown): number | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return new Date(timestamp).toISOString() === value ? timestamp : undefined;
}

function readParameters(parameters: Parameters): {
  period: number;
  buyThreshold: number;
  sellThreshold: number;
} {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    return invalidParameters();
  }

  const allowed = new Set(["period", "buyThreshold", "sellThreshold"]);
  if (Object.keys(parameters).some((key) => !allowed.has(key))) return invalidParameters();

  const readNumber = (
    key: "period" | "buyThreshold" | "sellThreshold",
    fallback: number,
  ): number => {
    const value = Object.prototype.hasOwnProperty.call(parameters, key)
      ? parameters[key]
      : fallback;
    if (typeof value !== "number" || !Number.isFinite(value)) return invalidParameters();
    return value;
  };

  const period = readNumber("period", 14);
  const buyThreshold = readNumber("buyThreshold", 30);
  const sellThreshold = readNumber("sellThreshold", 70);
  if (!Number.isInteger(period) || period <= 0) return invalidParameters();
  if (buyThreshold < 0 || buyThreshold > 100) return invalidParameters();
  if (sellThreshold < 0 || sellThreshold > 100) return invalidParameters();
  if (buyThreshold >= sellThreshold) return invalidParameters();
  return { period, buyThreshold, sellThreshold };
}

function assertValidContext(context: Context): void {
  if (!context || !Array.isArray(context.candles)) {
    throw new Error("INVALID_STRATEGY_CONTEXT");
  }

  let previousTimestamp: number | undefined;
  for (const candle of context.candles) {
    const timestamp = parseCanonicalTimestamp(candle?.timestamp);
    if (
      !candle ||
      candle.isClosed !== true ||
      typeof candle.timestamp !== "string" ||
      candle.timestamp.length === 0 ||
      timestamp === undefined ||
      (previousTimestamp !== undefined && timestamp <= previousTimestamp) ||
      !Number.isFinite(candle.open) ||
      !Number.isFinite(candle.high) ||
      !Number.isFinite(candle.low) ||
      !Number.isFinite(candle.close) ||
      !Number.isFinite(candle.volume)
    ) {
      throw new Error("INVALID_STRATEGY_CONTEXT");
    }
    previousTimestamp = timestamp;
  }
}

function relativeStrengthIndexAt(values: readonly number[], endIndex: number, period: number): number | undefined {
  if (endIndex < period) return undefined;

  let averageGain = 0;
  let averageLoss = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = values[index]! - values[index - 1]!;
    if (change > 0) averageGain += change;
    if (change < 0) averageLoss -= change;
  }
  averageGain /= period;
  averageLoss /= period;

  for (let index = period + 1; index <= endIndex; index += 1) {
    const change = values[index]! - values[index - 1]!;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
  }

  if (averageGain === 0 && averageLoss === 0) return 50;
  if (averageLoss === 0) return 100;
  if (averageGain === 0) return 0;
  return 100 - 100 / (1 + averageGain / averageLoss);
}

function buildVisualization(
  candles: readonly Candle[],
  values: readonly number[],
  period: number,
): readonly VisualizationPoint[] {
  const points: VisualizationPoint[] = [];
  for (let index = period; index < candles.length; index += 1) {
    const value = relativeStrengthIndexAt(values, index, period);
    if (value === undefined) continue;
    points.push({
      descriptorId: "rsi",
      timestamp: candles[index]!.timestamp,
      values: { value },
    });
  }
  return points;
}

function createRsiStrategy(parameters: Parameters = {}): RsiStrategy {
  const { period, buyThreshold, sellThreshold } = readParameters(parameters);

  return {
    name: "RSI",
    category: "MOMENTUM",
    analyze(context): Analysis {
      assertValidContext(context);
      const values = context.candles.map((candle) => candle.close);
      const signalAt = context.candles.at(-1)?.timestamp ?? "";
      const visualization = buildVisualization(context.candles, values, period);
      const value = relativeStrengthIndexAt(values, values.length - 1, period);

      if (value === undefined) return { signal: "HOLD", signalAt, visualization };
      const signal: Signal = value < buyThreshold ? "BUY" : value > sellThreshold ? "SELL" : "HOLD";
      return { signal, signalAt, visualization };
    },
  };
}

export const rsiFactory: RsiFactory = Object.freeze({
  descriptor: rsiDescriptor,
  create: createRsiStrategy,
});

export const RSI_FACTORY = rsiFactory;

export function createRsiFactory(): RsiFactory {
  return rsiFactory;
}

export default rsiFactory;
