import type { BacktestingApplicationApi } from "../application/ports";

export const BACKTEST_EXECUTION_V1_ID = "BACKTEST_EXECUTION_V1" as const;
export const SYNTHETIC_SHORT_PAPER_V1_ID = "SYNTHETIC_SHORT_PAPER_V1" as const;
export const STOP_LOSS_WINS_V1_ID = "STOP_LOSS_WINS_V1" as const;
export const PAPER_DECIMAL_SCALE = 8 as const;
export const BACKTEST_EXECUTION_V1 = {
  id: BACKTEST_EXECUTION_V1_ID,
  positionPolicy: {
    side: "LONG_ONLY",
    maximumOpenPositions: 1,
    allocation: "ALL_AVAILABLE_CASH_INCLUDING_ENTRY_FEE",
    partialPositions: "PROHIBITED",
    pyramiding: "PROHIBITED",
    leverage: "PROHIBITED",
  },
  signalExecution: {
    timing: "COMPLETED_CANDLE_SIGNAL_EXECUTES_AT_NEXT_CANDLE_OPEN",
    finalCandleSignal: "NOT_EXECUTABLE",
    buyWhileFlat: "OPEN_LONG",
    buyWhileLong: "IGNORE",
    sellWhileLong: "CLOSE_LONG",
    sellWhileFlat: "IGNORE",
    hold: "NO_EXECUTION",
  },
  feePolicy: {
    configuredUnit: "PERCENT_PER_EXECUTION_SIDE",
    rate: "FEE_RATE_PERCENT_DIVIDED_BY_100",
    entryFee: "ENTRY_NOTIONAL_TIMES_FEE_RATE",
    exitFee: "EXIT_NOTIONAL_TIMES_FEE_RATE",
    tradeFeeAmount: "ENTRY_FEE_PLUS_EXIT_FEE",
  },
  slippagePolicy: {
    configuredUnit: "BASIS_POINTS",
    rate: "SLIPPAGE_BPS_DIVIDED_BY_10000",
    buyPrice: "NEXT_OPEN_TIMES_ONE_PLUS_SLIPPAGE_RATE",
    sellPrice: "NEXT_OPEN_TIMES_ONE_MINUS_SLIPPAGE_RATE",
    rangeEndSellPrice: "FINAL_CANDLE_CLOSE_TIMES_ONE_MINUS_SLIPPAGE_RATE",
  },
  entryAccounting: {
    quantity: "AVAILABLE_CASH_DIVIDED_BY_(BUY_PRICE_TIMES_(ONE_PLUS_FEE_RATE))",
    entryNotional: "QUANTITY_TIMES_BUY_PRICE",
    exchangeRounding: "NONE",
  },
  exitAccounting: {
    exitNotional: "QUANTITY_TIMES_SELL_PRICE",
    cashReceived: "EXIT_NOTIONAL_MINUS_EXIT_FEE",
    grossProfit: "EXIT_NOTIONAL_MINUS_ENTRY_NOTIONAL",
    profit: "CASH_RECEIVED_MINUS_ENTRY_NOTIONAL_MINUS_ENTRY_FEE",
    resultPercent: "PROFIT_DIVIDED_BY_(ENTRY_NOTIONAL_PLUS_ENTRY_FEE)_TIMES_100",
  },
  rangeEndPolicy: {
    openPosition: "FORCE_CLOSE_AT_FINAL_CANDLE_CLOSE",
    exitReason: "RANGE_END",
    configuredExitFeeApplies: true,
    configuredExitSlippageApplies: true,
    independentOfFinalCandleSignal: true,
  },
  defaults: {
    initialCapital: 10_000,
    feeRatePercent: 0.1,
    slippageBps: 0,
  },
  excluded: [
    "SHORT_POSITIONS",
    "STOP_LOSS",
    "TAKE_PROFIT",
    "TRAILING_STOP",
    "PARTIAL_FILL",
    "SCALE_IN",
    "SCALE_OUT",
    "STRATEGY_POSITION_SIZING",
    "LEVERAGE",
    "EXCHANGE_LOT_SIZE_RULES",
    "GENERALIZED_RISK_MANAGEMENT",
  ],
} as const;

export const CANDIDATE_STATUSES = [
  "ACCEPTED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;

export const SYNTHETIC_SHORT_PAPER_V1 = {
  id: SYNTHETIC_SHORT_PAPER_V1_ID,
  marketInput: "BINANCE_CANDLES_ONLY",
  modes: ["LONG", "SYNTHETIC_SHORT"],
  feeRatePercent: 0.08,
  adverseSlippageBps: 5,
  decimalScale: PAPER_DECIMAL_SCALE,
  executionClass: "ACADEMIC_CANDLE_SIMULATION_ONLY",
} as const;

export type {
  BacktestConfiguration,
  BacktestSubmissionAccepted,
  CandidateFailure,
  CandidateFailureCode,
  CandidateOrigin,
  CandidatePage,
  CandidatePageRequest,
  CandidateProgress,
  CandidateStatus,
  CodeProvenance,
  CompletedBacktestResult,
  Experiment,
  ExperimentVisualization,
  MarketInputSelection,
  MarketInputSelectionIdentity,
  OverlayTracePoint,
  ReplayAvailability,
  ReplayUnavailableInput,
  SearchCandidateSummary,
  SignalTracePoint,
  StartManualBacktestCommand,
  SubmitSearchCandidateCommand,
  SyntheticPaperExecutionConfiguration,
  Trade,
  TradeMarker,
  TradePage,
  TradePageRequest,
} from "../application/ports";

export interface BacktestingModulePublicApi extends BacktestingApplicationApi {}
