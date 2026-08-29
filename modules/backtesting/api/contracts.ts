import type { EvaluationMetrics } from "@cryptox/evaluation";
import type {
  MarketDataProvenance,
  Pair,
  Timeframe,
  TimeRange,
} from "@cryptox/market-data";
import type {
  Signal,
  StrategySelection,
  StrategySelectionProvenance,
  StrategyVisualizationPoint,
} from "@cryptox/strategy";
import type {
  AuthenticatedRequestContext,
  AuthenticatedUserId,
} from "modules/auth/api";

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
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export type CandidateOrigin =
  | { kind: "MANUAL"; leaderboardScopeId: string }
  | {
      kind: "SEARCH";
      searchRunId: string;
      leaderboardScopeId: string;
      iterationNumber: number;
    };

export interface MarketInputSelectionIdentity {
  pair: Pair;
  timeframe: Timeframe;
  range: TimeRange;
}

export type MarketInputSelection = MarketInputSelectionIdentity &
  (
    | { datasetId: string; datasetVersion?: string }
    | { datasetId?: never; datasetVersion?: never }
  );

export interface BacktestConfiguration {
  executionProfileId: typeof BACKTEST_EXECUTION_V1_ID;
  initialCapital: number;
  feeRatePercent: number;
  slippageBps: number;
  /** Optional to preserve the original long-only V1 request shape. */
  paperExecution?: SyntheticPaperExecutionConfiguration;
}

export interface SyntheticPaperExecutionConfiguration {
  executionProfileId: typeof SYNTHETIC_SHORT_PAPER_V1_ID;
  positionMode: "LONG" | "SYNTHETIC_SHORT";
  exitPolicyId: typeof STOP_LOSS_WINS_V1_ID;
  feeRatePercent: 0.08;
  adverseSlippageBps: 5;
  decimalScale: typeof PAPER_DECIMAL_SCALE;
  roundingMode: "HALF_UP";
  stopLoss?: string;
  takeProfit?: string;
}

export const SYNTHETIC_SHORT_PAPER_V1 = {
  id: SYNTHETIC_SHORT_PAPER_V1_ID,
  marketInput: "BINANCE_CANDLES_ONLY",
  modes: ["LONG", "SYNTHETIC_SHORT"],
  feeRatePercent: 0.08,
  adverseSlippageBps: 5,
  decimalScale: PAPER_DECIMAL_SCALE,
  executionClass: "ACADEMIC_CANDLE_SIMULATION_ONLY",
} as const;

export interface StartManualBacktestCommand {
  leaderboardScopeId: string;
  strategySelection: StrategySelection;
  marketInput: MarketInputSelection;
  configuration: BacktestConfiguration;
}

export interface SubmitSearchCandidateCommand extends StartManualBacktestCommand {
  searchRunId: string;
  leaderboardScopeId: string;
  iterationNumber: number;
}

export interface BacktestSubmissionAccepted {
  candidateId: string;
  status: "ACCEPTED";
}

export type CandidateFailureCode =
  | "INVALID_REQUEST"
  | "SATURATED"
  | "STRATEGY_FAILED"
  | "SIMULATION_FAILED"
  | "EVALUATION_FAILED"
  | "RANKING_FAILED"
  | "CANCELLED";

export interface CandidateFailure {
  code: CandidateFailureCode;
  message: string;
}

export interface CandidateProgress {
  candidateId: string;
  ownerUserId: AuthenticatedUserId;
  origin: CandidateOrigin;
  strategySelection: StrategySelection;
  marketInput: MarketInputSelection;
  status: CandidateStatus;
  experimentId?: string;
  failure?: CandidateFailure;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  updatedAt: string;
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

export interface CodeProvenance {
  applicationVersion?: string;
  gitCommit?: string;
}

export type ReplayUnavailableInput = "HISTORICAL_DATA" | "EXECUTABLE_CODE";
export type ReplayAvailability =
  | {
      guarantee: "EXACT_REPLAY_AVAILABLE";
      unavailableInputs: readonly [];
      limitation?: never;
    }
  | {
      guarantee: "TRACEABLE";
      unavailableInputs: readonly [ReplayUnavailableInput, ...ReplayUnavailableInput[]];
      limitation: string;
    };

export interface Experiment {
  id: string;
  candidateId: string;
  searchRunId?: string;
  strategy: StrategySelectionProvenance;
  marketData: MarketDataProvenance;
  configuration: BacktestConfiguration;
  metrics: EvaluationMetrics;
  rankingConfigurationId: string;
  code: CodeProvenance;
  replay: ReplayAvailability;
  visualization: ExperimentVisualization;
  createdAt: string;
  paperExecutionProvenance?: SyntheticPaperExecutionConfiguration;
}

export interface SearchCandidateSummary {
  searchRunId: string;
  activeCandidateIds: readonly string[];
  submittedCandidateCount: number;
  completedCandidateCount: number;
  failedCandidateCount: number;
  averageBacktestDurationMs: number | null;
}

export interface CandidatePageRequest {
  limit: number;
  cursor?: string;
}

export interface CandidatePage {
  items: readonly CandidateProgress[];
  nextCursor?: string;
}

export interface TradePageRequest {
  limit: number;
  cursor?: string;
}

export interface TradePage {
  items: readonly Trade[];
  nextCursor?: string;
}

export interface BacktestingModulePublicApi {
  startManual(
    context: AuthenticatedRequestContext,
    command: StartManualBacktestCommand,
  ): Promise<BacktestSubmissionAccepted>;
  submitSearchCandidate(
    context: AuthenticatedRequestContext,
    command: SubmitSearchCandidateCommand,
  ): Promise<BacktestSubmissionAccepted>;
  status(context: AuthenticatedRequestContext, candidateId: string): Promise<CandidateProgress>;
  summarizeSearchCandidates(
    context: AuthenticatedRequestContext,
    searchRunId: string,
  ): Promise<SearchCandidateSummary>;
  listSearchCandidates(
    context: AuthenticatedRequestContext,
    searchRunId: string,
    page: CandidatePageRequest,
  ): Promise<CandidatePage>;
  cancelSearchCandidates(
    context: AuthenticatedRequestContext,
    searchRunId: string,
  ): Promise<{ candidateIds: readonly string[] }>;
  cancelCandidate(context: AuthenticatedRequestContext, candidateId: string): Promise<void>;
  readExperiment(
    context: AuthenticatedRequestContext,
    experimentId: string,
  ): Promise<Experiment>;
  listSearchExperiments(
    context: AuthenticatedRequestContext,
    searchRunId: string,
  ): Promise<readonly Experiment[]>;
  listExperimentTrades(
    context: AuthenticatedRequestContext,
    experimentId: string,
    page: TradePageRequest,
  ): Promise<TradePage>;
}
