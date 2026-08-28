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

export interface BacktestConfiguration {
  executionProfileId: "BACKTEST_EXECUTION_V1";
  initialCapital: number;
  feeRatePercent: number;
  slippageBps: number;
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
  exitReason: "STRATEGY_EXIT" | "RANGE_END";
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
  return { initialCapital, feeRatePercent, feeRate, slippageBps, slippageRate };
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

  let cash = configuration.initialCapital;
  let position: OpenPosition | undefined;
  let pending: ScheduledSignal | undefined;
  let sequence = 0;
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
    const tradeId = `${input.candidateId}-trade-${sequence + 1}`;
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
    const tradeId = `${input.candidateId}-trade-${sequence}`;
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
