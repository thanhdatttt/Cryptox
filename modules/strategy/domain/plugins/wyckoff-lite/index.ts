type Signal = "BUY" | "SELL" | "HOLD";
type ParameterValue = number | string;
type StrategyParameters = Readonly<Record<string, ParameterValue>>;

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

type StrategyVisualizationPoint = Readonly<{
  descriptorId: string;
  timestamp: string;
  values: Readonly<Record<string, number>>;
}>;

type StrategyAnalysis = Readonly<{
  signal: Signal;
  signalAt: string;
  visualization: readonly StrategyVisualizationPoint[];
}>;

type WyckoffLiteStrategy = Readonly<{
  readonly name: "WYCKOFF_LITE_V1";
  readonly category: "STRUCTURE";
  analyze(context: StrategyContext): StrategyAnalysis;
}>;

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

type StrategyVisualizationDescriptor = Readonly<{
  id: string;
  label: string;
  kind: "LINE" | "BAND" | "ZONE";
  pane: "PRICE" | "INDICATOR";
  series: readonly Readonly<{ key: string; label: string }>[];
}>;

type StrategyPluginDescriptor = Readonly<{
  name: "WYCKOFF_LITE_V1";
  displayName: string;
  description: string;
  category: "STRUCTURE";
  implementationVersion: string;
  behaviorProfileId: "WYCKOFF_LITE_V1";
  extensionProfileId: "WYCKOFF_LITE_V1";
  parameters: readonly StrategyParameterDescriptor[];
  visualization: readonly StrategyVisualizationDescriptor[];
}>;

type WyckoffLiteFactory = Readonly<{
  readonly descriptor: StrategyPluginDescriptor;
  create(parameters?: StrategyParameters): WyckoffLiteStrategy;
}>;

type WyckoffLiteParameters = Readonly<{
  rangeWindow: number;
  volumeWindow: number;
  compressionRatio: number;
  volumeMultiplier: number;
  breakoutPercent: number;
}>;

export type WyckoffLitePhase =
  | "HOLD"
  | "ACCUMULATION"
  | "DISTRIBUTION"
  | "BREAKOUT_UP"
  | "BREAKOUT_DOWN";

type WyckoffLiteMetrics = Readonly<{
  rangeHigh: number;
  rangeLow: number;
  averageVolume: number;
  currentVolume: number;
  breakoutUpper: number;
  breakoutLower: number;
  phase: WyckoffLitePhase;
}>;

const DEFAULT_RANGE_WINDOW = 20;
const DEFAULT_VOLUME_WINDOW = 20;
const DEFAULT_COMPRESSION_RATIO = 0.7;
const DEFAULT_VOLUME_MULTIPLIER = 1.5;
const DEFAULT_BREAKOUT_PERCENT = 0.5;
const MAX_WINDOW = 200;
const MAX_VOLUME_MULTIPLIER = 10;
const MAX_BREAKOUT_PERCENT = 25;

export const WYCKOFF_LITE_PHASE_CODES = Object.freeze({
  HOLD: 0,
  ACCUMULATION: 1,
  DISTRIBUTION: -1,
  BREAKOUT_UP: 2,
  BREAKOUT_DOWN: -2,
} as const);

function invalidParameters(): never {
  throw new Error("INVALID_STRATEGY_PARAMETERS");
}

function invalidContext(): never {
  throw new Error("INVALID_STRATEGY_CONTEXT");
}

function readParameters(parameters: StrategyParameters | undefined): WyckoffLiteParameters {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    return invalidParameters();
  }

  const allowedKeys = new Set([
    "rangeWindow",
    "volumeWindow",
    "compressionRatio",
    "volumeMultiplier",
    "breakoutPercent",
  ]);
  if (Object.keys(parameters).some((key) => !allowedKeys.has(key))) return invalidParameters();

  const readInteger = (key: "rangeWindow" | "volumeWindow", fallback: number): number => {
    const value = Object.prototype.hasOwnProperty.call(parameters, key)
      ? parameters[key]
      : fallback;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      !Number.isInteger(value) ||
      value < 2 ||
      value > MAX_WINDOW
    ) {
      return invalidParameters();
    }
    return value;
  };

  const readFiniteNumber = (
    key: "compressionRatio" | "volumeMultiplier" | "breakoutPercent",
    fallback: number,
  ): number => {
    const value = Object.prototype.hasOwnProperty.call(parameters, key)
      ? parameters[key]
      : fallback;
    if (typeof value !== "number" || !Number.isFinite(value)) return invalidParameters();
    return value;
  };

  const rangeWindow = readInteger("rangeWindow", DEFAULT_RANGE_WINDOW);
  const volumeWindow = readInteger("volumeWindow", DEFAULT_VOLUME_WINDOW);
  const compressionRatio = readFiniteNumber("compressionRatio", DEFAULT_COMPRESSION_RATIO);
  const volumeMultiplier = readFiniteNumber("volumeMultiplier", DEFAULT_VOLUME_MULTIPLIER);
  const breakoutPercent = readFiniteNumber("breakoutPercent", DEFAULT_BREAKOUT_PERCENT);

  if (compressionRatio <= 0 || compressionRatio > 1) return invalidParameters();
  if (volumeMultiplier < 1 || volumeMultiplier > MAX_VOLUME_MULTIPLIER) return invalidParameters();
  if (breakoutPercent < 0 || breakoutPercent > MAX_BREAKOUT_PERCENT) return invalidParameters();

  return {
    rangeWindow,
    volumeWindow,
    compressionRatio,
    volumeMultiplier,
    breakoutPercent,
  };
}

function parseTimestamp(value: unknown): number | undefined {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;

  // Date.parse normalizes impossible ISO calendar dates. Check the written date
  // components independently while still allowing valid timezone offsets.
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (dateParts) {
    const year = Number(dateParts[1]);
    const month = Number(dateParts[2]);
    const day = Number(dateParts[3]);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    if (
      calendarDate.getUTCFullYear() !== year ||
      calendarDate.getUTCMonth() !== month - 1 ||
      calendarDate.getUTCDate() !== day
    ) {
      return undefined;
    }
  }

  return timestamp;
}

function assertValidContext(context: StrategyContext): void {
  if (
    !context ||
    typeof context !== "object" ||
    Array.isArray(context) ||
    typeof context.pair !== "string" ||
    context.pair.trim().length === 0 ||
    typeof context.timeframe !== "string" ||
    context.timeframe.trim().length === 0 ||
    !Array.isArray(context.candles)
  ) {
    return invalidContext();
  }

  let previousTimestamp: number | undefined;
  for (const candle of context.candles) {
    const timestamp = parseTimestamp(candle?.timestamp);
    if (
      !candle ||
      typeof candle !== "object" ||
      candle.isClosed !== true ||
      timestamp === undefined ||
      (previousTimestamp !== undefined && timestamp <= previousTimestamp) ||
      !Number.isFinite(candle.open) ||
      !Number.isFinite(candle.high) ||
      !Number.isFinite(candle.low) ||
      !Number.isFinite(candle.close) ||
      !Number.isFinite(candle.volume) ||
      candle.low < 0 ||
      candle.high < candle.low ||
      candle.open < candle.low ||
      candle.open > candle.high ||
      candle.close < candle.low ||
      candle.close > candle.high ||
      candle.volume < 0
    ) {
      return invalidContext();
    }
    previousTimestamp = timestamp;
  }
}

function stableAverage(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  let average = 0;
  for (let index = 0; index < values.length; index += 1) {
    average += (values[index]! - average) / (index + 1);
    if (!Number.isFinite(average)) return undefined;
  }
  return average;
}

function phaseCode(phase: WyckoffLitePhase): number {
  return WYCKOFF_LITE_PHASE_CODES[phase];
}

function calculateMetricsAt(
  candles: readonly StrategyCandle[],
  currentIndex: number,
  parameters: WyckoffLiteParameters,
): WyckoffLiteMetrics | undefined {
  const rangeStart = currentIndex - parameters.rangeWindow;
  const volumeStart = currentIndex - parameters.volumeWindow;
  if (rangeStart < 0 || volumeStart < 0) return undefined;

  let rangeHigh = Number.NEGATIVE_INFINITY;
  let rangeLow = Number.POSITIVE_INFINITY;
  for (let index = rangeStart; index < currentIndex; index += 1) {
    const candle = candles[index]!;
    rangeHigh = Math.max(rangeHigh, candle.high);
    rangeLow = Math.min(rangeLow, candle.low);
  }

  const volumes: number[] = [];
  for (let index = volumeStart; index < currentIndex; index += 1) {
    volumes.push(candles[index]!.volume);
  }
  const averageVolume = stableAverage(volumes);
  const currentCandle = candles[currentIndex];
  if (!currentCandle || averageVolume === undefined) return undefined;

  const rangeWidth = rangeHigh - rangeLow;
  const currentRange = currentCandle.high - currentCandle.low;
  const compressionLimit = rangeWidth * parameters.compressionRatio;
  const volumeLimit = averageVolume * parameters.volumeMultiplier;
  const breakoutRate = parameters.breakoutPercent / 100;
  const breakoutUpper = rangeHigh * (1 + breakoutRate);
  const breakoutLower = rangeLow * (1 - breakoutRate);
  if (
    !Number.isFinite(rangeWidth) ||
    !Number.isFinite(currentRange) ||
    !Number.isFinite(compressionLimit) ||
    !Number.isFinite(volumeLimit) ||
    !Number.isFinite(breakoutUpper) ||
    !Number.isFinite(breakoutLower)
  ) {
    return undefined;
  }

  const volumeConfirmed = averageVolume > 0 && currentCandle.volume >= volumeLimit;
  let phase: WyckoffLitePhase = "HOLD";

  // Breakout is evaluated first so it cannot be mislabeled as accumulation or
  // distribution merely because the breakout candle is narrow.
  if (rangeWidth > 0 && volumeConfirmed && currentCandle.close > breakoutUpper) {
    phase = "BREAKOUT_UP";
  } else if (rangeWidth > 0 && volumeConfirmed && currentCandle.close < breakoutLower) {
    phase = "BREAKOUT_DOWN";
  } else if (
    rangeWidth > 0 &&
    currentRange <= compressionLimit &&
    volumeConfirmed
  ) {
    const rangeMid = rangeLow + rangeWidth / 2;
    if (!Number.isFinite(rangeMid)) return undefined;
    if (currentCandle.close < rangeMid) phase = "ACCUMULATION";
    else if (currentCandle.close > rangeMid) phase = "DISTRIBUTION";
  }

  return {
    rangeHigh,
    rangeLow,
    averageVolume,
    currentVolume: currentCandle.volume,
    breakoutUpper,
    breakoutLower,
    phase,
  };
}

function signalForPhase(phase: WyckoffLitePhase): Signal {
  if (phase === "ACCUMULATION" || phase === "BREAKOUT_UP") return "BUY";
  if (phase === "DISTRIBUTION" || phase === "BREAKOUT_DOWN") return "SELL";
  return "HOLD";
}

function buildVisualization(
  candles: readonly StrategyCandle[],
  parameters: WyckoffLiteParameters,
): readonly StrategyVisualizationPoint[] {
  const points: StrategyVisualizationPoint[] = [];
  const firstReadyIndex = Math.max(parameters.rangeWindow, parameters.volumeWindow);

  for (let index = firstReadyIndex; index < candles.length; index += 1) {
    const metrics = calculateMetricsAt(candles, index, parameters);
    if (!metrics) continue;
    const timestamp = candles[index]!.timestamp;
    points.push(
      Object.freeze({
        descriptorId: "wyckoff-lite-range",
        timestamp,
        values: Object.freeze({
          rangeHigh: metrics.rangeHigh,
          rangeLow: metrics.rangeLow,
          breakoutUpper: metrics.breakoutUpper,
          breakoutLower: metrics.breakoutLower,
        }),
      }),
      Object.freeze({
        descriptorId: "wyckoff-lite-volume-phase",
        timestamp,
        values: Object.freeze({
          averageVolume: metrics.averageVolume,
          currentVolume: metrics.currentVolume,
          phaseCode: phaseCode(metrics.phase),
        }),
      }),
    );
  }

  return Object.freeze(points);
}

export function createWyckoffLiteStrategy(parameters: StrategyParameters = {}): WyckoffLiteStrategy {
  const parsedParameters = readParameters(parameters);

  return Object.freeze({
    name: "WYCKOFF_LITE_V1",
    category: "STRUCTURE",
    analyze(context: StrategyContext): StrategyAnalysis {
      assertValidContext(context);
      const latestIndex = context.candles.length - 1;
      const latestCandle = context.candles[latestIndex];
      const metrics = latestCandle
        ? calculateMetricsAt(context.candles, latestIndex, parsedParameters)
        : undefined;
      if (latestCandle && latestIndex >= Math.max(parsedParameters.rangeWindow, parsedParameters.volumeWindow) && !metrics) {
        return invalidContext();
      }

      const signal = metrics ? signalForPhase(metrics.phase) : "HOLD";
      return Object.freeze({
        signal,
        signalAt: latestCandle?.timestamp ?? "",
        visualization: buildVisualization(context.candles, parsedParameters),
      });
    },
  });
}

const wyckoffLiteParameters: readonly StrategyParameterDescriptor[] = Object.freeze([
  Object.freeze({
    key: "rangeWindow",
    label: "Prior range window",
    type: "INTEGER",
    required: false,
    defaultValue: DEFAULT_RANGE_WINDOW,
    minimum: 2,
    maximum: MAX_WINDOW,
    step: 1,
  }),
  Object.freeze({
    key: "volumeWindow",
    label: "Prior volume window",
    type: "INTEGER",
    required: false,
    defaultValue: DEFAULT_VOLUME_WINDOW,
    minimum: 2,
    maximum: MAX_WINDOW,
    step: 1,
  }),
  Object.freeze({
    key: "compressionRatio",
    label: "Range compression ratio",
    type: "NUMBER",
    required: false,
    defaultValue: DEFAULT_COMPRESSION_RATIO,
    minimum: Number.MIN_VALUE,
    maximum: 1,
  }),
  Object.freeze({
    key: "volumeMultiplier",
    label: "Confirmation volume multiplier",
    type: "NUMBER",
    required: false,
    defaultValue: DEFAULT_VOLUME_MULTIPLIER,
    minimum: 1,
    maximum: MAX_VOLUME_MULTIPLIER,
  }),
  Object.freeze({
    key: "breakoutPercent",
    label: "Breakout threshold percent",
    type: "NUMBER",
    required: false,
    defaultValue: DEFAULT_BREAKOUT_PERCENT,
    minimum: 0,
    maximum: MAX_BREAKOUT_PERCENT,
  }),
] as const);

const wyckoffLiteVisualization: readonly StrategyVisualizationDescriptor[] = Object.freeze([
  Object.freeze({
    id: "wyckoff-lite-range",
    label: "Wyckoff Lite fixed range and breakout levels",
    kind: "ZONE",
    pane: "PRICE",
    series: Object.freeze([
      Object.freeze({ key: "rangeHigh", label: "Prior range high" }),
      Object.freeze({ key: "rangeLow", label: "Prior range low" }),
      Object.freeze({ key: "breakoutUpper", label: "Upper breakout threshold" }),
      Object.freeze({ key: "breakoutLower", label: "Lower breakout threshold" }),
    ]),
  }),
  Object.freeze({
    id: "wyckoff-lite-volume-phase",
    label: "Wyckoff Lite volume and phase code",
    kind: "LINE",
    pane: "INDICATOR",
    series: Object.freeze([
      Object.freeze({ key: "averageVolume", label: "Prior average volume" }),
      Object.freeze({ key: "currentVolume", label: "Current volume" }),
      Object.freeze({ key: "phaseCode", label: "Phase code (1/-1/2/-2)" }),
    ]),
  }),
] as const);

export const WYCKOFF_LITE_PROFILE = Object.freeze({
  id: "WYCKOFF_LITE_V1",
  rangeRule: "FIXED_PRIOR_HIGH_LOW_WINDOW_EXCLUDING_CURRENT_CANDLE",
  volumeRule: "FIXED_PRIOR_AVERAGE_VOLUME_WINDOW_EXCLUDING_CURRENT_CANDLE",
  accumulationRule: "COMPRESSED_RANGE_LOWER_HALF_WITH_ABOVE_BASELINE_VOLUME",
  distributionRule: "COMPRESSED_RANGE_UPPER_HALF_WITH_ABOVE_BASELINE_VOLUME",
  breakoutRule: "CLOSE_OUTSIDE_FIXED_RANGE_THRESHOLD_WITH_VOLUME_CONFIRMATION",
  phaseCodes: WYCKOFF_LITE_PHASE_CODES,
  insufficientData: "HOLD_WITHOUT_PADDED_HISTORY",
  limitation: "BOUNDED_DETERMINISTIC_LITE_HEURISTIC_NOT_FULL_DISCRETIONARY_WYCKOFF",
} as const);

export const wyckoffLiteDescriptor: StrategyPluginDescriptor = Object.freeze({
  name: "WYCKOFF_LITE_V1",
  displayName: "Wyckoff Lite (fixed range / volume)",
  description:
    "Bounded deterministic Lite Wyckoff heuristic using fixed prior range and volume windows for accumulation, distribution, and breakout; it does not claim full discretionary or professional Wyckoff behavior.",
  category: "STRUCTURE",
  implementationVersion: "1.0.0",
  behaviorProfileId: "WYCKOFF_LITE_V1",
  extensionProfileId: "WYCKOFF_LITE_V1",
  parameters: wyckoffLiteParameters,
  visualization: wyckoffLiteVisualization,
});

export const wyckoffLiteFactory: WyckoffLiteFactory = Object.freeze({
  descriptor: wyckoffLiteDescriptor,
  create: createWyckoffLiteStrategy,
});

export const WYCKOFF_LITE_FACTORY = wyckoffLiteFactory;
export const WYCKOFF_LITE_DESCRIPTOR = wyckoffLiteDescriptor;

export function createWyckoffLiteFactory(): WyckoffLiteFactory {
  return wyckoffLiteFactory;
}

export function createWYCKOFFLiteStrategy(parameters: StrategyParameters = {}): WyckoffLiteStrategy {
  return createWyckoffLiteStrategy(parameters);
}

export default wyckoffLiteFactory;
