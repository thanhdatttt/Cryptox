import { createHash } from "node:crypto";

export type Pair = string;
export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
export type Signal = "BUY" | "SELL" | "HOLD";

export interface Candle {
  pair: Pair;
  timeframe: Timeframe;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

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

export type StrategyCategory =
  | "TREND"
  | "MOMENTUM"
  | "VOLATILITY"
  | "STRUCTURE"
  | "INFORMATION";

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

export type StrategySelection =
  | { kind: "STRATEGY"; strategyDefinitionId: string }
  | { kind: "COMPOSITE"; compositeDefinitionId: string };

export interface SyntheticPaperExecutionConfiguration {
  executionProfileId: "SYNTHETIC_SHORT_PAPER_V1";
  positionMode: "LONG" | "SYNTHETIC_SHORT";
  exitPolicyId: "STOP_LOSS_WINS_V1";
  feeRatePercent: 0.08;
  adverseSlippageBps: 5;
  decimalScale: 8;
  roundingMode: "HALF_UP";
  stopLoss?: string;
  takeProfit?: string;
}

export interface BacktestConfiguration {
  executionProfileId: "BACKTEST_EXECUTION_V1";
  initialCapital: number;
  feeRatePercent: number;
  slippageBps: number;
  paperExecution?: SyntheticPaperExecutionConfiguration;
}

export interface SignalTracePoint {
  source: StrategySelection;
  timestamp: string;
  signal: Signal;
  executionNotBefore: string;
}

export interface TradeMarker {
  tradeId: string;
  kind: "ENTRY" | "EXIT";
  timestamp: string;
  price: number;
}

export interface OverlayTracePoint {
  strategyDefinitionId: string;
  point: StrategyVisualizationPoint;
}

export interface ExperimentVisualization {
  signals: readonly SignalTracePoint[];
  overlays: readonly OverlayTracePoint[];
  tradeMarkers: readonly TradeMarker[];
}

export interface Trade {
  id: string;
  experimentId: string;
  sequence: number;
  pair: Pair;
  entrySignalAt: string;
  entryTime: string;
  entryPrice: number;
  exitSignalAt?: string;
  exitTime: string;
  exitPrice: number;
  positionMode?: "LONG" | "SYNTHETIC_SHORT";
  exitReason: "STRATEGY_EXIT" | "RANGE_END" | "STOP_LOSS" | "TAKE_PROFIT";
  quantity: number;
  notionalEntryValue: number;
  grossProfit: number;
  feeAmount: number;
  slippageBps: number;
  profit: number;
  resultPercent: number;
  result: "WIN" | "LOSS" | "BREAKEVEN";
}

export interface CompletedBacktestResult {
  status: "SUCCEEDED";
  candidateId: string;
  startedAt: string;
  completedAt: string;
  initialCapital: number;
  endingCapital: number;
  equityCurve: ReadonlyArray<{ timestamp: string; value: number }>;
  trades: readonly Trade[];
  visualization: ExperimentVisualization;
}

export interface SimulationInput {
  candidateId: string;
  pair: Pair;
  timeframe: Timeframe;
  candles: readonly Candle[];
  strategy: Strategy;
  /** The immutable selection identity used to label signal traces. */
  strategySelection?: StrategySelection;
  /** Convenience identity for callers that only have one strategy definition. */
  strategyDefinitionId?: string;
  /** Optional command-shaped configuration accepted at the domain boundary. */
  configuration?: Partial<BacktestConfiguration>;
  /** Optional result identity used when a caller already has an Experiment id. */
  experimentId?: string;
  initialCapital?: number;
  feeRatePercent?: number;
  slippageBps?: number;
  startedAt?: string;
  completedAt?: string;
}

export type HistoricalSimulationInput = SimulationInput;

export type BacktestSimulationErrorCode =
  | "INVALID_INPUT"
  | "STRATEGY_FAILED"
  | "SIMULATION_FAILED";

export class BacktestSimulationError extends Error {
  readonly code: BacktestSimulationErrorCode;
  readonly cause?: unknown;

  constructor(code: BacktestSimulationErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "BacktestSimulationError";
    this.code = code;
    this.cause = cause;
  }
}

interface SimulationConfiguration {
  initialCapital: number;
  feeRatePercent: number;
  feeRate: number;
  slippageBps: number;
  slippageRate: number;
  paperExecution?: SyntheticPaperExecutionConfiguration;
}

interface ScheduledSignal {
  signal: "BUY" | "SELL";
  signalAt: string;
}

interface OpenPosition {
  entrySignalAt: string;
  entryTime: string;
  entryPrice: number;
  quantity: number;
  notionalEntryValue: number;
  entryFee: number;
  equityBeforeTrade: number;
}

const DEFAULTS = {
  initialCapital: 10_000,
  feeRatePercent: 0.1,
  slippageBps: 0,
} as const;

const TIMEFRAME_MILLISECONDS: Record<Timeframe, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
};

const SIGNALS = new Set<Signal>(["BUY", "SELL", "HOLD"]);

const invalidInput = (message: string): never => {
  throw new BacktestSimulationError("INVALID_INPUT", message);
};

const simulationFailed = (message: string): never => {
  throw new BacktestSimulationError("SIMULATION_FAILED", message);
};

const FIXED_SCALE = 100_000_000n;
const DECIMAL_PATTERN = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i;

function tradeIdFor(namespace: string, sequence: number): string {
  const digest = createHash("sha256").update(`${namespace}\0${sequence}`).digest("hex");
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

function roundQuotient(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError("fixed-point denominator must be positive");
  if (numerator === 0n) return 0n;
  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  let quotient = absolute / denominator;
  if ((absolute % denominator) * 2n >= denominator) quotient += 1n;
  return negative ? -quotient : quotient;
}

function fixedFromDecimal(value: unknown, label: string): bigint {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  const match = DECIMAL_PATTERN.exec(text);
  if (!match) return invalidInput(`${label} must be a finite decimal`);

  const integerDigits = match[2] ?? "";
  const fractionDigits = match[3] ?? match[4] ?? "";
  const exponent = Number(match[5] ?? 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1_000) {
    invalidInput(`${label} has an unsupported decimal exponent`);
  }

  let digits = `${integerDigits}${fractionDigits}`.replace(/^0+(?=\d)/, "");
  if (!digits) digits = "0";
  let decimalPlaces = fractionDigits.length - exponent;
  let coefficient = 0n;
  try {
    coefficient = BigInt(digits);
    if (decimalPlaces <= 8) {
      coefficient *= 10n ** BigInt(8 - decimalPlaces);
    } else {
      coefficient = roundQuotient(coefficient, 10n ** BigInt(decimalPlaces - 8));
    }
  } catch (error) {
    invalidInput(`${label} is outside the fixed-point range`);
  }
  return match[1] === "-" ? -coefficient : coefficient;
}

function fixedToNumber(value: bigint, label: string): number {
  const result = Number(value) / Number(FIXED_SCALE);
  if (!Number.isFinite(result)) simulationFailed(`${label} became non-finite`);
  return result;
}

const fixedAdd = (left: bigint, right: bigint): bigint => left + right;
const fixedSubtract = (left: bigint, right: bigint): bigint => left - right;
const fixedMultiply = (left: bigint, right: bigint): bigint => roundQuotient(left * right, FIXED_SCALE);

function fixedDivide(left: bigint, right: bigint, label: string): bigint {
  if (right === 0n) simulationFailed(`${label} has a zero denominator`);
  return roundQuotient(left * FIXED_SCALE, right);
}

function fixedPercent(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) simulationFailed("result percent has a zero denominator");
  return roundQuotient(numerator * 100n * FIXED_SCALE, denominator);
}

function validatePaperExecutionConfiguration(value: unknown): SyntheticPaperExecutionConfiguration {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalidInput("paperExecution must be an object");
  }
  const configuration = value as Record<string, unknown>;
  if (configuration.executionProfileId !== "SYNTHETIC_SHORT_PAPER_V1") {
    invalidInput("unsupported paper execution profile");
  }
  const positionMode = configuration.positionMode as "LONG" | "SYNTHETIC_SHORT";
  if (positionMode !== "LONG" && positionMode !== "SYNTHETIC_SHORT") {
    invalidInput("paperExecution.positionMode is invalid");
  }
  if (configuration.exitPolicyId !== "STOP_LOSS_WINS_V1") {
    invalidInput("unsupported paper exit policy");
  }
  if (configuration.feeRatePercent !== 0.08 || configuration.adverseSlippageBps !== 5) {
    invalidInput("paper execution fee and slippage are fixed at the approved defaults");
  }
  if (configuration.decimalScale !== 8 || configuration.roundingMode !== "HALF_UP") {
    invalidInput("paper execution requires eight-place HALF_UP accounting");
  }

  const stopLoss = configuration.stopLoss === undefined
    ? undefined
    : assertNonEmptyString(configuration.stopLoss, "paperExecution.stopLoss");
  const takeProfit = configuration.takeProfit === undefined
    ? undefined
    : assertNonEmptyString(configuration.takeProfit, "paperExecution.takeProfit");
  if (stopLoss !== undefined && fixedFromDecimal(stopLoss, "paperExecution.stopLoss") <= 0n) {
    invalidInput("paperExecution.stopLoss must be positive");
  }
  if (takeProfit !== undefined && fixedFromDecimal(takeProfit, "paperExecution.takeProfit") <= 0n) {
    invalidInput("paperExecution.takeProfit must be positive");
  }

  return {
    executionProfileId: "SYNTHETIC_SHORT_PAPER_V1",
    positionMode,
    exitPolicyId: "STOP_LOSS_WINS_V1",
    feeRatePercent: 0.08,
    adverseSlippageBps: 5,
    decimalScale: 8,
    roundingMode: "HALF_UP",
    ...(stopLoss === undefined ? {} : { stopLoss }),
    ...(takeProfit === undefined ? {} : { takeProfit }),
  };
}

const assertFinite = (value: number, label: string): void => {
  if (!Number.isFinite(value)) {
    simulationFailed(`${label} became non-finite`);
  }
};

const assertNonEmptyString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    invalidInput(`${label} must be a non-empty string`);
  }
  return value as string;
};

const parseTimestamp = (value: unknown, label: string): number => {
  const timestamp = assertNonEmptyString(value, label);
  const milliseconds = Date.parse(timestamp);
  if (!Number.isFinite(milliseconds)) {
    invalidInput(`${label} must be a valid timestamp`);
  }
  return milliseconds;
};

const validateConfiguration = (input: SimulationInput): SimulationConfiguration => {
  const initialCapital =
    input.initialCapital ?? input.configuration?.initialCapital ?? DEFAULTS.initialCapital;
  const feeRatePercent =
    input.feeRatePercent ?? input.configuration?.feeRatePercent ?? DEFAULTS.feeRatePercent;
  const slippageBps =
    input.slippageBps ?? input.configuration?.slippageBps ?? DEFAULTS.slippageBps;

  if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
    invalidInput("initialCapital must be a finite positive number");
  }
  if (!Number.isFinite(feeRatePercent) || feeRatePercent < 0) {
    invalidInput("feeRatePercent must be a finite non-negative number");
  }
  if (!Number.isFinite(slippageBps) || slippageBps < 0 || slippageBps >= 10_000) {
    invalidInput("slippageBps must be finite, non-negative, and below 10000");
  }

  const feeRate = feeRatePercent / 100;
  const slippageRate = slippageBps / 10_000;
  assertFinite(feeRate, "fee rate");
  assertFinite(slippageRate, "slippage rate");
  const paperExecution = input.configuration?.paperExecution === undefined
    ? undefined
    : validatePaperExecutionConfiguration(input.configuration.paperExecution);
  return {
    initialCapital,
    feeRatePercent,
    feeRate,
    slippageBps,
    slippageRate,
    ...(paperExecution === undefined ? {} : { paperExecution }),
  };
};

const validateCandle = (
  candle: Candle,
  input: SimulationInput,
  previousTimestamp: number | undefined,
): number => {
  if (candle.pair !== input.pair) {
    invalidInput("every candle must match the requested pair");
  }
  if (candle.timeframe !== input.timeframe) {
    invalidInput("every candle must match the requested timeframe");
  }
  if (candle.isClosed !== true) {
    invalidInput("historical simulation requires closed candles");
  }

  const timestamp = parseTimestamp(candle.timestamp, "candle timestamp");
  if (previousTimestamp !== undefined && timestamp <= previousTimestamp) {
    invalidInput("candles must be strictly ordered by timestamp");
  }

  if (
    !Number.isFinite(candle.open) ||
    !Number.isFinite(candle.high) ||
    !Number.isFinite(candle.low) ||
    !Number.isFinite(candle.close) ||
    candle.open <= 0 ||
    candle.high <= 0 ||
    candle.low <= 0 ||
    candle.close <= 0
  ) {
    invalidInput("candle prices must be finite and positive");
  }
  if (
    candle.high < Math.max(candle.open, candle.close) ||
    candle.low > Math.min(candle.open, candle.close) ||
    candle.high < candle.low
  ) {
    invalidInput("candle high/low must contain open and close");
  }
  if (!Number.isFinite(candle.volume) || candle.volume < 0) {
    invalidInput("candle volume must be finite and non-negative");
  }
  return timestamp;
};

const toStrategyCandle = (candle: Candle): StrategyCandle => ({
  timestamp: candle.timestamp,
  open: candle.open,
  high: candle.high,
  low: candle.low,
  close: candle.close,
  volume: candle.volume,
  isClosed: true,
});

const cloneSelection = (selection: StrategySelection): StrategySelection => {
  if (selection.kind === "STRATEGY") {
    return {
      kind: "STRATEGY",
      strategyDefinitionId: assertNonEmptyString(
        selection.strategyDefinitionId,
        "strategySelection.strategyDefinitionId",
      ),
    };
  }
  if (selection.kind === "COMPOSITE") {
    return {
      kind: "COMPOSITE",
      compositeDefinitionId: assertNonEmptyString(
        selection.compositeDefinitionId,
        "strategySelection.compositeDefinitionId",
      ),
    };
  }
  return invalidInput("strategySelection.kind is invalid");
};

const resolveSelection = (input: SimulationInput): StrategySelection => {
  if (input.strategySelection !== undefined) {
    return cloneSelection(input.strategySelection);
  }

  const strategyDefinitionId =
    input.strategyDefinitionId?.trim() || input.strategy.name.trim();
  return {
    kind: "STRATEGY",
    strategyDefinitionId: assertNonEmptyString(
      strategyDefinitionId,
      "strategyDefinitionId or strategy.name",
    ),
  };
};

const cloneVisualizationPoint = (
  point: unknown,
  index: number,
): StrategyVisualizationPoint => {
  if (typeof point !== "object" || point === null || Array.isArray(point)) {
    invalidInput(`strategy visualization point ${index} must be an object`);
  }
  const candidate = point as {
    descriptorId?: unknown;
    timestamp?: unknown;
    values?: unknown;
  };
  assertNonEmptyString(candidate.descriptorId, `visualization[${index}].descriptorId`);
  assertNonEmptyString(candidate.timestamp, `visualization[${index}].timestamp`);
  if (
    typeof candidate.values !== "object" ||
    candidate.values === null ||
    Array.isArray(candidate.values)
  ) {
    invalidInput(`visualization[${index}].values must be an object`);
  }

  const values: Record<string, number> = {};
  for (const key of Object.keys(candidate.values as object).sort()) {
    const value = (candidate.values as Record<string, unknown>)[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      invalidInput(`visualization[${index}].values.${key} must be finite`);
    }
    values[key] = value as number;
  }
  return {
    descriptorId: candidate.descriptorId as string,
    timestamp: candidate.timestamp as string,
    values,
  };
};

const analyze = (
  strategy: Strategy,
  context: StrategyContext,
): {
  signal: Signal;
  signalAt: string;
  visualization: ReturnType<typeof cloneVisualizationPoint>[];
} => {
  let analysis: ReturnType<Strategy["analyze"]>;
  try {
    analysis = strategy.analyze(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BacktestSimulationError(
      "STRATEGY_FAILED",
      `strategy analysis failed: ${message}`,
      error,
    );
  }

  if (typeof analysis !== "object" || analysis === null) {
    invalidInput("strategy analysis must be an object");
  }
  if (!SIGNALS.has(analysis.signal)) {
    invalidInput("strategy analysis returned an invalid signal");
  }
  const signalAt = assertNonEmptyString(analysis.signalAt, "strategy signalAt");
  if (!Array.isArray(analysis.visualization)) {
    invalidInput("strategy visualization must be an array");
  }
  return {
    signal: analysis.signal,
    signalAt,
    visualization: analysis.visualization.map(cloneVisualizationPoint),
  };
};

const executionNotBefore = (
  candles: readonly Candle[],
  index: number,
  timeframe: Timeframe,
): string => {
  const nextCandle = candles[index + 1];
  if (nextCandle !== undefined) {
    return nextCandle.timestamp;
  }
  const finalTimestamp = Date.parse(candles[index]!.timestamp);
  return new Date(finalTimestamp + TIMEFRAME_MILLISECONDS[timeframe]).toISOString();
};

const pushSignalTrace = (
  signals: SignalTracePoint[],
  selection: StrategySelection,
  timestamp: string,
  signal: Signal,
  notBefore: string,
): void => {
  signals.push({
    source: cloneSelection(selection),
    timestamp,
    signal,
    executionNotBefore: notBefore,
  });
};

const pushOverlayTraces = (
  overlays: OverlayTracePoint[],
  selection: StrategySelection,
  visualization: ReturnType<typeof cloneVisualizationPoint>[],
): void => {
  const strategyDefinitionId =
    selection.kind === "STRATEGY"
      ? selection.strategyDefinitionId
      : selection.compositeDefinitionId;
  for (const point of visualization) {
    overlays.push({ strategyDefinitionId, point });
  }
};

interface FixedCandle {
  readonly open: bigint;
  readonly high: bigint;
  readonly low: bigint;
  readonly close: bigint;
}

interface PaperPosition {
  readonly entrySignalAt: string;
  readonly entryTime: string;
  readonly entryPrice: bigint;
  readonly quantity: bigint;
  readonly notionalEntryValue: bigint;
  readonly entryFee: bigint;
  readonly equityBeforeTrade: bigint;
}

interface PaperSimulationConfiguration {
  readonly initialCapital: bigint;
  readonly feeRate: bigint;
  readonly slippageRate: bigint;
  readonly paperExecution: SyntheticPaperExecutionConfiguration;
  readonly stopLoss?: bigint;
  readonly takeProfit?: bigint;
}

function simulateSyntheticPaperBacktest(
  input: SimulationInput,
  configuration: SimulationConfiguration,
  selection: StrategySelection,
  candles: readonly Candle[],
  startedAt: string,
  completedAt: string,
): CompletedBacktestResult {
  const paperExecution = configuration.paperExecution!;
  const paperConfiguration: PaperSimulationConfiguration = {
    initialCapital: fixedFromDecimal(configuration.initialCapital, "initialCapital"),
    feeRate: roundQuotient(fixedFromDecimal(paperExecution.feeRatePercent, "paper fee rate"), 100n),
    slippageRate: roundQuotient(fixedFromDecimal(paperExecution.adverseSlippageBps, "paper slippage"), 10_000n),
    paperExecution,
    ...(paperExecution.stopLoss === undefined ? {} : { stopLoss: fixedFromDecimal(paperExecution.stopLoss, "paperExecution.stopLoss") }),
    ...(paperExecution.takeProfit === undefined ? {} : { takeProfit: fixedFromDecimal(paperExecution.takeProfit, "paperExecution.takeProfit") }),
  };
  if (paperConfiguration.initialCapital <= 0n) invalidInput("initialCapital must be positive at paper scale");

  const fixedCandles = candles.map((candle) => ({
    open: fixedFromDecimal(candle.open, "candle open"),
    high: fixedFromDecimal(candle.high, "candle high"),
    low: fixedFromDecimal(candle.low, "candle low"),
    close: fixedFromDecimal(candle.close, "candle close"),
  } satisfies FixedCandle));
  const one = FIXED_SCALE;
  const long = paperExecution.positionMode === "LONG";
  const tradeIdNamespace = `${input.experimentId ?? input.candidateId}\0SYNTHETIC_SHORT_PAPER_V1:${paperExecution.positionMode}`;
  let cash = paperConfiguration.initialCapital;
  let position: PaperPosition | undefined;
  let pending: ScheduledSignal | undefined;
  let sequence = 0;
  const signals: SignalTracePoint[] = [];
  const overlays: OverlayTracePoint[] = [];
  const tradeMarkers: TradeMarker[] = [];
  const trades: Trade[] = [];
  const equityCurve: Array<{ timestamp: string; value: number }> = [];

  const openPosition = (signal: ScheduledSignal, candle: Candle, fixedCandle: FixedCandle): void => {
    if (position !== undefined) return;

    const marketEntryPrice = fixedCandle.open;
    const entryPrice = fixedMultiply(
      marketEntryPrice,
      long ? fixedAdd(one, paperConfiguration.slippageRate) : fixedSubtract(one, paperConfiguration.slippageRate),
    );
    const entryDenominator = fixedMultiply(
      entryPrice,
      fixedAdd(one, paperConfiguration.feeRate),
    );
    let quantity = fixedDivide(cash, entryDenominator, "paper quantity");
    if (quantity <= 0n) simulationFailed("paper entry could not be funded");

    let notionalEntryValue = fixedMultiply(quantity, entryPrice);
    let entryFee = fixedMultiply(notionalEntryValue, paperConfiguration.feeRate);
    // HALF_UP quantity rounding can be one unit above the all-cash boundary.
    // Keep the approved all-available-cash policy without allowing a rounded
    // paper fill to create negative capital.
    while (long && fixedAdd(notionalEntryValue, entryFee) > cash && quantity > 0n) {
      quantity -= 1n;
      notionalEntryValue = fixedMultiply(quantity, entryPrice);
      entryFee = fixedMultiply(notionalEntryValue, paperConfiguration.feeRate);
    }
    if (quantity <= 0n) simulationFailed("paper entry could not be funded");

    const equityBeforeTrade = cash;
    cash = fixedSubtract(cash, entryFee);
    if (long) cash = fixedSubtract(cash, notionalEntryValue);
    if (cash < 0n) simulationFailed("paper entry accounting produced negative capital");
    position = {
      entrySignalAt: signal.signalAt,
      entryTime: candle.timestamp,
      entryPrice,
      quantity,
      notionalEntryValue,
      entryFee,
      equityBeforeTrade,
    };
    const tradeId = tradeIdFor(tradeIdNamespace, sequence + 1);
    tradeMarkers.push({
      tradeId,
      kind: "ENTRY",
      timestamp: candle.timestamp,
      price: fixedToNumber(entryPrice, "paper entry price"),
    });
  };

  const closePosition = (
    marketExitPrice: bigint,
    exitTime: string,
    exitReason: Trade["exitReason"],
    exitSignalAt?: string,
  ): void => {
    if (position === undefined) return;
    const current = position;
    const exitPrice = fixedMultiply(
      marketExitPrice,
      long ? fixedSubtract(one, paperConfiguration.slippageRate) : fixedAdd(one, paperConfiguration.slippageRate),
    );
    const exitNotional = fixedMultiply(current.quantity, exitPrice);
    const exitFee = fixedMultiply(exitNotional, paperConfiguration.feeRate);
    const grossProfit = long
      ? fixedSubtract(exitNotional, current.notionalEntryValue)
      : fixedSubtract(current.notionalEntryValue, exitNotional);
    const feeAmount = fixedAdd(current.entryFee, exitFee);
    const profit = fixedSubtract(grossProfit, feeAmount);
    const resultPercent = fixedPercent(profit, fixedAdd(current.notionalEntryValue, current.entryFee));
    cash = fixedAdd(current.equityBeforeTrade, profit);
    if (cash < 0n) simulationFailed("paper exit accounting produced negative capital");

    sequence += 1;
    const tradeId = tradeIdFor(tradeIdNamespace, sequence);
    const trade: Trade = {
      id: tradeId,
      experimentId: input.experimentId ?? input.candidateId,
      sequence,
      pair: input.pair,
      entrySignalAt: current.entrySignalAt,
      entryTime: current.entryTime,
      entryPrice: fixedToNumber(current.entryPrice, "paper entry price"),
      exitTime,
      exitPrice: fixedToNumber(exitPrice, "paper exit price"),
      positionMode: paperExecution.positionMode,
      exitReason,
      quantity: fixedToNumber(current.quantity, "paper quantity"),
      notionalEntryValue: fixedToNumber(current.notionalEntryValue, "paper entry notional"),
      grossProfit: fixedToNumber(grossProfit, "paper gross profit"),
      feeAmount: fixedToNumber(feeAmount, "paper fee amount"),
      slippageBps: paperExecution.adverseSlippageBps,
      profit: fixedToNumber(profit, "paper profit"),
      resultPercent: fixedToNumber(resultPercent, "paper result percent"),
      result: profit > 0n ? "WIN" : profit < 0n ? "LOSS" : "BREAKEVEN",
    };
    if (exitSignalAt !== undefined) trade.exitSignalAt = exitSignalAt;
    trades.push(trade);
    tradeMarkers.push({
      tradeId,
      kind: "EXIT",
      timestamp: exitTime,
      price: fixedToNumber(exitPrice, "paper exit price"),
    });
    position = undefined;
  };

  const triggeredExit = (fixedCandle: FixedCandle): { marketPrice: bigint; reason: "STOP_LOSS" | "TAKE_PROFIT" } | undefined => {
    const stopTriggered = paperConfiguration.stopLoss !== undefined && (
      long ? fixedCandle.low <= paperConfiguration.stopLoss : fixedCandle.high >= paperConfiguration.stopLoss
    );
    const takeProfitTriggered = paperConfiguration.takeProfit !== undefined && (
      long ? fixedCandle.high >= paperConfiguration.takeProfit : fixedCandle.low <= paperConfiguration.takeProfit
    );
    // STOP_LOSS_WINS_V1 is deliberately checked first. This makes a dual-hit
    // OHLC candle a single conservative exit for either direction.
    if (stopTriggered) return { marketPrice: paperConfiguration.stopLoss!, reason: "STOP_LOSS" };
    if (takeProfitTriggered) return { marketPrice: paperConfiguration.takeProfit!, reason: "TAKE_PROFIT" };
    return undefined;
  };

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index]!;
    const fixedCandle = fixedCandles[index]!;
    if (pending !== undefined) {
      const opensPosition = long ? pending.signal === "BUY" : pending.signal === "SELL";
      const closesPosition = long ? pending.signal === "SELL" : pending.signal === "BUY";
      if (opensPosition) {
        openPosition(pending, candle, fixedCandle);
      } else if (closesPosition && position !== undefined) {
        closePosition(fixedCandle.open, candle.timestamp, "STRATEGY_EXIT", pending.signalAt);
      }
      pending = undefined;
    }

    if (position !== undefined) {
      const exit = triggeredExit(fixedCandle);
      if (exit !== undefined) closePosition(exit.marketPrice, candle.timestamp, exit.reason);
    }

    const context: StrategyContext = {
      pair: input.pair,
      timeframe: input.timeframe,
      candles: candles.slice(0, index + 1).map(toStrategyCandle),
    };
    const analysis = analyze(input.strategy, context);
    pushSignalTrace(
      signals,
      selection,
      analysis.signalAt,
      analysis.signal,
      executionNotBefore(candles, index, input.timeframe),
    );
    pushOverlayTraces(overlays, selection, analysis.visualization);

    if (index < candles.length - 1) {
      const opensPosition = long ? analysis.signal === "BUY" : analysis.signal === "SELL";
      const closesPosition = long ? analysis.signal === "SELL" : analysis.signal === "BUY";
      if (opensPosition && position === undefined) {
        pending = { signal: analysis.signal as "BUY" | "SELL", signalAt: analysis.signalAt };
      } else if (closesPosition && position !== undefined) {
        pending = { signal: analysis.signal as "BUY" | "SELL", signalAt: analysis.signalAt };
      }
    }

    if (index === candles.length - 1 && position !== undefined) {
      closePosition(fixedCandle.close, candle.timestamp, "RANGE_END");
    }

    const equity = position === undefined
      ? cash
      : long
        ? fixedAdd(cash, fixedMultiply(position.quantity, fixedCandle.close))
        : fixedAdd(cash, fixedSubtract(position.notionalEntryValue, fixedMultiply(position.quantity, fixedCandle.close)));
    if (equity < 0n) simulationFailed("paper equity became negative");
    equityCurve.push({ timestamp: candle.timestamp, value: fixedToNumber(equity, "paper equity") });
  }

  return {
    status: "SUCCEEDED",
    candidateId: input.candidateId,
    startedAt,
    completedAt,
    initialCapital: fixedToNumber(paperConfiguration.initialCapital, "paper initial capital"),
    endingCapital: fixedToNumber(cash, "paper ending capital"),
    equityCurve,
    trades,
    visualization: { signals, overlays, tradeMarkers },
  };
}

export function simulateBacktest(input: SimulationInput): CompletedBacktestResult {
  if (typeof input !== "object" || input === null) {
    invalidInput("simulation input must be an object");
  }
  assertNonEmptyString(input.candidateId, "candidateId");
  assertNonEmptyString(input.pair, "pair");
  if (!Object.prototype.hasOwnProperty.call(TIMEFRAME_MILLISECONDS, input.timeframe)) {
    invalidInput("timeframe is invalid");
  }
  if (
    typeof input.strategy !== "object" ||
    input.strategy === null ||
    typeof input.strategy.analyze !== "function"
  ) {
    invalidInput("strategy must provide an analyze function");
  }
  assertNonEmptyString(input.strategy.name, "strategy.name");
  if (!Array.isArray(input.candles) || input.candles.length === 0) {
    invalidInput("candles must contain at least one historical candle");
  }

  const configuration = validateConfiguration(input);
  const selection = resolveSelection(input);
  const candles = input.candles.map((candle, index) => {
    if (typeof candle !== "object" || candle === null) {
      invalidInput(`candles[${index}] must be an object`);
    }
    return candle;
  });
  let previousTimestamp: number | undefined;
  candles.forEach((candle) => {
    previousTimestamp = validateCandle(candle, input, previousTimestamp);
  });

  const startedAt = input.startedAt ?? candles[0]!.timestamp;
  const completedAt = input.completedAt ?? candles[candles.length - 1]!.timestamp;
  assertNonEmptyString(startedAt, "startedAt");
  assertNonEmptyString(completedAt, "completedAt");

  if (configuration.paperExecution !== undefined) {
    return simulateSyntheticPaperBacktest(
      input,
      configuration,
      selection,
      candles,
      startedAt,
      completedAt,
    );
  }

  let cash = configuration.initialCapital;
  let position: OpenPosition | undefined;
  let pending: ScheduledSignal | undefined;
  let sequence = 0;
  const tradeIdNamespace = `${input.experimentId ?? input.candidateId}\0BACKTEST_EXECUTION_V1`;
  const signals: SignalTracePoint[] = [];
  const overlays: OverlayTracePoint[] = [];
  const tradeMarkers: TradeMarker[] = [];
  const trades: Trade[] = [];
  const equityCurve: Array<{ timestamp: string; value: number }> = [];

  const openLong = (signal: ScheduledSignal, candle: Candle): void => {
    if (position !== undefined) {
      return;
    }
    const entryPrice = candle.open * (1 + configuration.slippageRate);
    const quantity = cash / (entryPrice * (1 + configuration.feeRate));
    assertFinite(entryPrice, "entry price");
    assertFinite(quantity, "quantity");
    if (entryPrice <= 0 || quantity <= 0) {
      simulationFailed("long entry could not be funded");
    }
    const notionalEntryValue = quantity * entryPrice;
    const entryFee = notionalEntryValue * configuration.feeRate;
    assertFinite(notionalEntryValue, "entry notional");
    assertFinite(entryFee, "entry fee");
    const equityBeforeTrade = cash;
    cash -= notionalEntryValue + entryFee;
    if (Math.abs(cash) <= Number.EPSILON * Math.max(1, equityBeforeTrade)) {
      cash = 0;
    }
    if (cash < 0) {
      simulationFailed("entry accounting exceeded available capital");
    }
    position = {
      entrySignalAt: signal.signalAt,
      entryTime: candle.timestamp,
      entryPrice,
      quantity,
      notionalEntryValue,
      entryFee,
      equityBeforeTrade,
    };
    const tradeId = tradeIdFor(tradeIdNamespace, sequence + 1);
    tradeMarkers.push({
      tradeId,
      kind: "ENTRY",
      timestamp: candle.timestamp,
      price: entryPrice,
    });
  };

  const closeLong = (
    marketExitPrice: number,
    exitTime: string,
    exitReason: Trade["exitReason"],
    exitSignalAt?: string,
  ): void => {
    if (position === undefined) {
      return;
    }
    const current = position;
    const exitPrice = marketExitPrice * (1 - configuration.slippageRate);
    const exitNotional = current.quantity * exitPrice;
    const exitFee = exitNotional * configuration.feeRate;
    const grossProfit = exitNotional - current.notionalEntryValue;
    const feeAmount = current.entryFee + exitFee;
    const cashReceived = exitNotional - exitFee;
    const profit = cashReceived - current.notionalEntryValue - current.entryFee;
    const resultPercent =
      (profit / (current.notionalEntryValue + current.entryFee)) * 100;
    assertFinite(exitPrice, "exit price");
    assertFinite(exitNotional, "exit notional");
    assertFinite(exitFee, "exit fee");
    assertFinite(grossProfit, "gross profit");
    assertFinite(feeAmount, "fee amount");
    assertFinite(profit, "profit");
    assertFinite(resultPercent, "result percent");

    cash = current.equityBeforeTrade + profit;
    assertFinite(cash, "ending capital");
    if (cash < 0) {
      simulationFailed("exit accounting produced negative capital");
    }

    sequence += 1;
    const tradeId = tradeIdFor(tradeIdNamespace, sequence);
    const trade: Trade = {
      id: tradeId,
      experimentId: input.experimentId ?? input.candidateId,
      sequence,
      pair: input.pair,
      entrySignalAt: current.entrySignalAt,
      entryTime: current.entryTime,
      entryPrice: current.entryPrice,
      exitTime,
      exitPrice,
      exitReason,
      quantity: current.quantity,
      notionalEntryValue: current.notionalEntryValue,
      grossProfit,
      feeAmount,
      slippageBps: configuration.slippageBps,
      profit,
      resultPercent,
      result: profit > 0 ? "WIN" : profit < 0 ? "LOSS" : "BREAKEVEN",
    };
    if (exitSignalAt !== undefined) {
      trade.exitSignalAt = exitSignalAt;
    }
    trades.push(trade);
    tradeMarkers.push({ tradeId, kind: "EXIT", timestamp: exitTime, price: exitPrice });
    position = undefined;
  };

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index]!;
    if (pending !== undefined) {
      if (pending.signal === "BUY") {
        openLong(pending, candle);
      } else if (position !== undefined) {
        closeLong(candle.open, candle.timestamp, "STRATEGY_EXIT", pending.signalAt);
      }
      pending = undefined;
    }

    const context: StrategyContext = {
      pair: input.pair,
      timeframe: input.timeframe,
      candles: candles.slice(0, index + 1).map(toStrategyCandle),
    };
    const analysis = analyze(input.strategy, context);
    pushSignalTrace(
      signals,
      selection,
      analysis.signalAt,
      analysis.signal,
      executionNotBefore(candles, index, input.timeframe),
    );
    pushOverlayTraces(overlays, selection, analysis.visualization);

    if (index < candles.length - 1) {
      if (analysis.signal === "BUY" && position === undefined) {
        pending = { signal: "BUY", signalAt: analysis.signalAt };
      } else if (analysis.signal === "SELL" && position !== undefined) {
        pending = { signal: "SELL", signalAt: analysis.signalAt };
      }
    }

    if (index === candles.length - 1 && position !== undefined) {
      closeLong(candle.close, candle.timestamp, "RANGE_END");
    }

    const equity = position === undefined ? cash : cash + position.quantity * candle.close;
    assertFinite(equity, "equity");
    if (equity < 0) {
      simulationFailed("equity became negative");
    }
    equityCurve.push({ timestamp: candle.timestamp, value: equity });
  }

  const visualization: ExperimentVisualization = {
    signals,
    overlays,
    tradeMarkers,
  };
  return {
    status: "SUCCEEDED",
    candidateId: input.candidateId,
    startedAt,
    completedAt,
    initialCapital: configuration.initialCapital,
    endingCapital: cash,
    equityCurve,
    trades,
    visualization,
  };
}

export const runHistoricalSimulation = simulateBacktest;
