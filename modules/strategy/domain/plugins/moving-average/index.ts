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

type MovingAverageStrategy = {
  readonly name: "MA";
  readonly category: "TREND";
  analyze(context: Context): Analysis;
};

type MovingAverageFactory = {
  readonly descriptor: typeof movingAverageDescriptor;
  create(parameters?: Parameters): MovingAverageStrategy;
};

const MA_DESCRIPTOR_PARAMETERS = Object.freeze([
  Object.freeze({
    key: "fastPeriod",
    label: "Fast period",
    type: "INTEGER",
    required: false,
    defaultValue: 20,
    minimum: 1,
  }),
  Object.freeze({
    key: "slowPeriod",
    label: "Slow period",
    type: "INTEGER",
    required: false,
    defaultValue: 50,
    minimum: 1,
  }),
] as const);

const MA_VISUALIZATION = Object.freeze([
  Object.freeze({
    id: "ma-lines",
    label: "Moving averages",
    kind: "LINE",
    pane: "PRICE",
    series: Object.freeze([
      Object.freeze({ key: "fast", label: "Fast SMA" }),
      Object.freeze({ key: "slow", label: "Slow SMA" }),
    ]),
  }),
] as const);

export const movingAverageDescriptor = Object.freeze({
  name: "MA",
  displayName: "Moving Average",
  description: "Trend direction from a fast/slow close-price SMA crossover.",
  category: "TREND",
  implementationVersion: "1.0.0",
  behaviorProfileId: "TECHNICAL_PROFILES_V1",
  parameters: MA_DESCRIPTOR_PARAMETERS,
  visualization: MA_VISUALIZATION,
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

function readParameters(parameters: Parameters): { fastPeriod: number; slowPeriod: number } {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    return invalidParameters();
  }

  const allowed = new Set(["fastPeriod", "slowPeriod"]);
  if (Object.keys(parameters).some((key) => !allowed.has(key))) return invalidParameters();

  const readPositiveInteger = (key: "fastPeriod" | "slowPeriod", fallback: number): number => {
    const value = Object.prototype.hasOwnProperty.call(parameters, key)
      ? parameters[key]
      : fallback;
    if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
      return invalidParameters();
    }
    return value;
  };

  const fastPeriod = readPositiveInteger("fastPeriod", 20);
  const slowPeriod = readPositiveInteger("slowPeriod", 50);
  if (fastPeriod >= slowPeriod) return invalidParameters();
  return { fastPeriod, slowPeriod };
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

function simpleMovingAverageAt(values: readonly number[], endIndex: number, period: number): number | undefined {
  if (endIndex + 1 < period) return undefined;
  let sum = 0;
  for (let index = endIndex - period + 1; index <= endIndex; index += 1) {
    sum += values[index]!;
  }
  return sum / period;
}

function buildVisualization(
  candles: readonly Candle[],
  values: readonly number[],
  fastPeriod: number,
  slowPeriod: number,
): readonly VisualizationPoint[] {
  const points: VisualizationPoint[] = [];
  for (let index = 0; index < candles.length; index += 1) {
    const fast = simpleMovingAverageAt(values, index, fastPeriod);
    const slow = simpleMovingAverageAt(values, index, slowPeriod);
    if (fast === undefined || slow === undefined) continue;
    points.push({
      descriptorId: "ma-lines",
      timestamp: candles[index]!.timestamp,
      values: { fast, slow },
    });
  }
  return points;
}

function createMovingAverageStrategy(parameters: Parameters = {}): MovingAverageStrategy {
  const { fastPeriod, slowPeriod } = readParameters(parameters);

  return {
    name: "MA",
    category: "TREND",
    analyze(context): Analysis {
      assertValidContext(context);
      const values = context.candles.map((candle) => candle.close);
      const signalAt = context.candles.at(-1)?.timestamp ?? "";
      const visualization = buildVisualization(context.candles, values, fastPeriod, slowPeriod);

      if (values.length < slowPeriod + 1) {
        return { signal: "HOLD", signalAt, visualization };
      }

      const currentFast = simpleMovingAverageAt(values, values.length - 1, fastPeriod)!;
      const currentSlow = simpleMovingAverageAt(values, values.length - 1, slowPeriod)!;
      const previousFast = simpleMovingAverageAt(values, values.length - 2, fastPeriod)!;
      const previousSlow = simpleMovingAverageAt(values, values.length - 2, slowPeriod)!;

      let signal: Signal = "HOLD";
      if (previousFast <= previousSlow && currentFast > currentSlow) signal = "BUY";
      if (previousFast >= previousSlow && currentFast < currentSlow) signal = "SELL";
      return { signal, signalAt, visualization };
    },
  };
}

export const movingAverageFactory: MovingAverageFactory = Object.freeze({
  descriptor: movingAverageDescriptor,
  create: createMovingAverageStrategy,
});

export const maFactory = movingAverageFactory;
export const MA_FACTORY = movingAverageFactory;

export function createMovingAverageFactory(): MovingAverageFactory {
  return movingAverageFactory;
}

export default movingAverageFactory;
