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

type SmcLiteStrategy = Readonly<{
  readonly name: "SMC_LITE_V1";
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
  name: "SMC_LITE_V1";
  displayName: string;
  description: string;
  category: "STRUCTURE";
  implementationVersion: string;
  behaviorProfileId: "SMC_LITE_V1";
  extensionProfileId: "SMC_LITE_V1";
  parameters: readonly StrategyParameterDescriptor[];
  visualization: readonly StrategyVisualizationDescriptor[];
}>;

type SmcLiteFactory = Readonly<{
  readonly descriptor: StrategyPluginDescriptor;
  create(parameters?: StrategyParameters): SmcLiteStrategy;
}>;

type SmcLiteParameters = Readonly<{
  leftWindow: number;
  rightWindow: number;
}>;

type ConfirmedSwing = Readonly<{
  index: number;
  price: number;
}>;

type ConfirmedSwings = Readonly<{
  high?: ConfirmedSwing;
  low?: ConfirmedSwing;
}>;

const DEFAULT_LEFT_WINDOW = 2;
const DEFAULT_RIGHT_WINDOW = 2;
const MAX_PIVOT_WINDOW = 50;

function invalidParameters(): never {
  throw new Error("INVALID_STRATEGY_PARAMETERS");
}

function invalidContext(): never {
  throw new Error("INVALID_STRATEGY_CONTEXT");
}

function readParameters(parameters: StrategyParameters | undefined): SmcLiteParameters {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    return invalidParameters();
  }

  const allowedKeys = new Set(["leftWindow", "rightWindow"]);
  if (Object.keys(parameters).some((key) => !allowedKeys.has(key))) return invalidParameters();

  const readWindow = (key: "leftWindow" | "rightWindow", fallback: number): number => {
    const value = Object.prototype.hasOwnProperty.call(parameters, key)
      ? parameters[key]
      : fallback;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > MAX_PIVOT_WINDOW
    ) {
      return invalidParameters();
    }
    return value;
  };

  return {
    leftWindow: readWindow("leftWindow", DEFAULT_LEFT_WINDOW),
    rightWindow: readWindow("rightWindow", DEFAULT_RIGHT_WINDOW),
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

function isConfirmedSwingHigh(
  candles: readonly StrategyCandle[],
  index: number,
  leftWindow: number,
  rightWindow: number,
): boolean {
  if (index < leftWindow || index + rightWindow >= candles.length) return false;
  const pivotHigh = candles[index]!.high;

  for (let offset = 1; offset <= leftWindow; offset += 1) {
    if (pivotHigh <= candles[index - offset]!.high) return false;
  }
  for (let offset = 1; offset <= rightWindow; offset += 1) {
    if (pivotHigh <= candles[index + offset]!.high) return false;
  }
  return true;
}

function isConfirmedSwingLow(
  candles: readonly StrategyCandle[],
  index: number,
  leftWindow: number,
  rightWindow: number,
): boolean {
  if (index < leftWindow || index + rightWindow >= candles.length) return false;
  const pivotLow = candles[index]!.low;

  for (let offset = 1; offset <= leftWindow; offset += 1) {
    if (pivotLow >= candles[index - offset]!.low) return false;
  }
  for (let offset = 1; offset <= rightWindow; offset += 1) {
    if (pivotLow >= candles[index + offset]!.low) return false;
  }
  return true;
}

function findLatestConfirmedSwings(
  candles: readonly StrategyCandle[],
  parameters: SmcLiteParameters,
): ConfirmedSwings {
  let high: ConfirmedSwing | undefined;
  let low: ConfirmedSwing | undefined;

  const lastConfirmableIndex = candles.length - parameters.rightWindow - 1;
  for (let index = parameters.leftWindow; index <= lastConfirmableIndex; index += 1) {
    if (isConfirmedSwingHigh(candles, index, parameters.leftWindow, parameters.rightWindow)) {
      high = { index, price: candles[index]!.high };
    }
    if (isConfirmedSwingLow(candles, index, parameters.leftWindow, parameters.rightWindow)) {
      low = { index, price: candles[index]!.low };
    }
  }

  return { high, low };
}

function buildPivotVisualization(
  candles: readonly StrategyCandle[],
  parameters: SmcLiteParameters,
): readonly StrategyVisualizationPoint[] {
  const points: StrategyVisualizationPoint[] = [];
  const lastConfirmableIndex = candles.length - parameters.rightWindow - 1;

  for (let index = parameters.leftWindow; index <= lastConfirmableIndex; index += 1) {
    const values: Record<string, number> = {};
    if (isConfirmedSwingHigh(candles, index, parameters.leftWindow, parameters.rightWindow)) {
      values.swingHigh = candles[index]!.high;
    }
    if (isConfirmedSwingLow(candles, index, parameters.leftWindow, parameters.rightWindow)) {
      values.swingLow = candles[index]!.low;
    }
    if (Object.keys(values).length > 0) {
      points.push(
        Object.freeze({
          descriptorId: "smc-lite-pivots",
          timestamp: candles[index]!.timestamp,
          values: Object.freeze(values),
        }),
      );
    }
  }

  return Object.freeze(points);
}

export function createSmcLiteStrategy(parameters: StrategyParameters = {}): SmcLiteStrategy {
  const parsedParameters = readParameters(parameters);

  return Object.freeze({
    name: "SMC_LITE_V1",
    category: "STRUCTURE",
    analyze(context: StrategyContext): StrategyAnalysis {
      assertValidContext(context);
      const latestCandle = context.candles.at(-1);
      const previousCandle = context.candles.at(-2);
      const confirmedSwings = findLatestConfirmedSwings(context.candles, parsedParameters);
      const visualization = [...buildPivotVisualization(context.candles, parsedParameters)];

      let signal: Signal = "HOLD";
      let breakLevel: number | undefined;
      if (latestCandle && previousCandle) {
        const brokeHigh =
          confirmedSwings.high !== undefined &&
          previousCandle.close <= confirmedSwings.high.price &&
          latestCandle.close > confirmedSwings.high.price;
        const brokeLow =
          confirmedSwings.low !== undefined &&
          previousCandle.close >= confirmedSwings.low.price &&
          latestCandle.close < confirmedSwings.low.price;

        if (brokeHigh && !brokeLow) {
          signal = "BUY";
          breakLevel = confirmedSwings.high!.price;
        } else if (brokeLow && !brokeHigh) {
          signal = "SELL";
          breakLevel = confirmedSwings.low!.price;
        }
      }

      if (signal !== "HOLD" && latestCandle && breakLevel !== undefined) {
        visualization.push(
          Object.freeze({
            descriptorId: "smc-lite-bos",
            timestamp: latestCandle.timestamp,
            values: Object.freeze({
              level: breakLevel,
              direction: signal === "BUY" ? 1 : -1,
            }),
          }),
        );
      }

      return Object.freeze({
        signal,
        signalAt: latestCandle?.timestamp ?? "",
        visualization: Object.freeze(visualization),
      });
    },
  });
}

const smcLiteParameters: readonly StrategyParameterDescriptor[] = Object.freeze([
  Object.freeze({
    key: "leftWindow",
    label: "Pivot left window",
    type: "INTEGER",
    required: false,
    defaultValue: DEFAULT_LEFT_WINDOW,
    minimum: 1,
    maximum: MAX_PIVOT_WINDOW,
    step: 1,
  }),
  Object.freeze({
    key: "rightWindow",
    label: "Pivot right confirmation window",
    type: "INTEGER",
    required: false,
    defaultValue: DEFAULT_RIGHT_WINDOW,
    minimum: 1,
    maximum: MAX_PIVOT_WINDOW,
    step: 1,
  }),
] as const);

const smcLiteVisualization: readonly StrategyVisualizationDescriptor[] = Object.freeze([
  Object.freeze({
    id: "smc-lite-pivots",
    label: "SMC Lite confirmed swing pivots",
    kind: "ZONE",
    pane: "PRICE",
    series: Object.freeze([
      Object.freeze({ key: "swingHigh", label: "Confirmed swing high" }),
      Object.freeze({ key: "swingLow", label: "Confirmed swing low" }),
    ]),
  }),
  Object.freeze({
    id: "smc-lite-bos",
    label: "SMC Lite close-based BOS",
    kind: "LINE",
    pane: "PRICE",
    series: Object.freeze([
      Object.freeze({ key: "level", label: "Broken swing level" }),
      Object.freeze({ key: "direction", label: "BOS direction" }),
    ]),
  }),
] as const);

export const SMC_LITE_PROFILE = Object.freeze({
  id: "SMC_LITE_V1",
  pivotRule: "STRICT_HIGH_OR_LOW_AGAINST_LEFT_AND_RIGHT_WINDOWS",
  confirmationRule: "PIVOT_IS_USABLE_ONLY_AFTER_RIGHT_WINDOW_EXISTS",
  bosRule: "LATEST_CLOSED_CLOSE_CROSSES_LATEST_CONFIRMED_SWING_LEVEL",
  signals: Object.freeze({
    buy: "CLOSE_CROSSES_SWING_HIGH",
    sell: "CLOSE_CROSSES_SWING_LOW",
    otherwise: "HOLD",
  }),
  insufficientData: "HOLD_WITH_NO_UNCONFIRMED_PIVOTS",
  limitation: "BOUNDED_DETERMINISTIC_LITE_PROFILE_NOT_FULL_DISCRETIONARY_SMC",
} as const);

export const smcLiteDescriptor: StrategyPluginDescriptor = Object.freeze({
  name: "SMC_LITE_V1",
  displayName: "SMC Lite (confirmed pivots / BOS)",
  description:
    "Bounded deterministic Lite SMC profile using confirmed pivot-window swings and close-based Break of Structure; it does not claim full discretionary or professional SMC behavior.",
  category: "STRUCTURE",
  implementationVersion: "1.0.0",
  behaviorProfileId: "SMC_LITE_V1",
  extensionProfileId: "SMC_LITE_V1",
  parameters: smcLiteParameters,
  visualization: smcLiteVisualization,
});

export const smcLiteFactory: SmcLiteFactory = Object.freeze({
  descriptor: smcLiteDescriptor,
  create: createSmcLiteStrategy,
});

export const SMC_LITE_FACTORY = smcLiteFactory;
export const SMC_LITE_DESCRIPTOR = smcLiteDescriptor;

export function createSmcLiteFactory(): SmcLiteFactory {
  return smcLiteFactory;
}

export function createSMCLiteStrategy(parameters: StrategyParameters = {}): SmcLiteStrategy {
  return createSmcLiteStrategy(parameters);
}

export default smcLiteFactory;
