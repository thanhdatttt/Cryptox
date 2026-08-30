import type { EvaluationMetrics, EvaluatorModulePublicApi } from "@cryptox/evaluation";
import type {
  MarketDataModulePublicApi,
  MarketDataProvenance,
  Pair,
  Timeframe,
  TimeRange,
} from "@cryptox/market-data";
import type {
  LeaderboardModulePublicApi,
  LeaderboardSubmission,
  LeaderboardSubmissionResult,
} from "@cryptox/leaderboard";
import type {
  Signal,
  StrategyModulePublicApi,
  StrategySelection,
  StrategySelectionProvenance,
  StrategyVisualizationPoint,
} from "@cryptox/strategy";
import type {
  AuthenticatedRequestContext,
  AuthenticatedUserId,
} from "modules/auth/api";

export type CandidateStatus = "ACCEPTED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

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
  executionProfileId: "BACKTEST_EXECUTION_V1";
  initialCapital: number;
  feeRatePercent: number;
  slippageBps: number;
  /** Optional to preserve the original long-only V1 request shape. */
  paperExecution?: SyntheticPaperExecutionConfiguration;
}

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

export interface BacktestingApplicationApi {
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

export interface Clock {
  now(): string;
}

export interface BacktestExecutionRequest {
  candidateId: string;
}

export type BacktestExecutionState =
  | "ACCEPTED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export interface BacktestExecutionCapacity {
  maximum: number;
  active: number;
  available: number;
}

export interface BacktestExecutionStatus {
  candidateId: string;
  state: BacktestExecutionState;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  failure?: { code: "RUNNER_FAILED"; message: string };
}

export type BacktestTerminalOutcome<TResult> =
  | {
      candidateId: string;
      state: "SUCCEEDED";
      result: TResult;
      startedAt?: string;
      completedAt: string;
      durationMs?: number;
    }
  | {
      candidateId: string;
      state: "FAILED";
      failure: { code: "RUNNER_FAILED"; message: string };
      startedAt?: string;
      completedAt: string;
      durationMs?: number;
    }
  | {
      candidateId: string;
      state: "CANCELLED";
      startedAt?: string;
      completedAt: string;
      durationMs?: number;
    };

export type BacktestSubmission<TResult> =
  | {
      accepted: true;
      candidateId: string;
      status: "ACCEPTED";
      outcome: Promise<BacktestTerminalOutcome<TResult>>;
    }
  | {
      accepted: false;
      candidateId: string;
      status: "SATURATED";
      capacity: BacktestExecutionCapacity;
    };

export interface BacktestExecutionPort<
  TRequest extends BacktestExecutionRequest = BacktestExecutionRequest,
  TResult = unknown,
> {
  submit(request: TRequest): Promise<BacktestSubmission<TResult>>;
  capacity(): Promise<BacktestExecutionCapacity>;
  status(candidateId: string): Promise<BacktestExecutionStatus | undefined>;
  cancel(candidateId: string): Promise<boolean>;
}

export interface BacktestRunner<
  TRequest extends BacktestExecutionRequest = BacktestExecutionRequest,
  TResult = unknown,
> {
  run(request: TRequest, signal: AbortSignal): Promise<TResult>;
}

export interface CandidateRepository<TCandidate, TCreateCommand> {
  insert(ownerUserId: AuthenticatedUserId, command: TCreateCommand): Promise<TCandidate>;
  getByOwnerAndId(
    ownerUserId: AuthenticatedUserId,
    candidateId: string,
  ): Promise<TCandidate | undefined>;
  save(ownerUserId: AuthenticatedUserId, candidate: TCandidate): Promise<TCandidate>;
  listByOwnerAndSearchRun(
    ownerUserId: AuthenticatedUserId,
    searchRunId: string,
  ): Promise<readonly TCandidate[]>;
}

export interface ExperimentRepository<TExperiment, TTrade> {
  insertForCandidateOwner(
    ownerUserId: AuthenticatedUserId,
    experiment: TExperiment,
    trades: readonly TTrade[],
  ): Promise<TExperiment>;
  getByCandidateOwnerAndId(
    ownerUserId: AuthenticatedUserId,
    experimentId: string,
  ): Promise<TExperiment | undefined>;
  listByCandidateOwnerAndSearchRun(
    ownerUserId: AuthenticatedUserId,
    searchRunId: string,
  ): Promise<readonly TExperiment[]>;
  listTradesByCandidateOwner(
    ownerUserId: AuthenticatedUserId,
    experimentId: string,
    page: { limit: number; cursor?: string },
  ): Promise<{ items: readonly TTrade[]; nextCursor?: string }>;
}

export interface BacktestingUnitOfWork {
  run<T>(operation: () => Promise<T>): Promise<T>;
}

export interface BacktestingCompletionUnitOfWork<TExperiment, TTrade> {
  commit(
    input: {
      ownerUserId: AuthenticatedUserId;
      experiment: TExperiment;
      trades: readonly TTrade[];
      leaderboardSubmission: LeaderboardSubmission;
    },
    participants: {
      insertExperiment(
        ownerUserId: AuthenticatedUserId,
        experiment: TExperiment,
        trades: readonly TTrade[],
      ): Promise<TExperiment>;
      submitLeaderboard(
        ownerUserId: AuthenticatedUserId,
        submission: LeaderboardSubmission,
      ): Promise<LeaderboardSubmissionResult>;
    },
  ): Promise<{
    experiment: TExperiment;
    leaderboard: LeaderboardSubmissionResult;
  }>;
}

/** Persistence shape for immutable synthetic-paper provenance; no order/exchange port is introduced. */
export interface PaperExecutionProvenancePort {
  readonly executionProfileId: "SYNTHETIC_SHORT_PAPER_V1";
  readonly positionMode: "LONG" | "SYNTHETIC_SHORT";
  readonly exitPolicyId: "STOP_LOSS_WINS_V1";
  readonly decimalScale: 8;
  readonly roundingMode: "HALF_UP";
  readonly feeRatePercent: 0.08;
  readonly adverseSlippageBps: 5;
  readonly stopLoss?: string;
  readonly takeProfit?: string;
}

export interface BacktestingApplicationDependencies<TCandidate, TCreateCommand, TExperiment, TTrade> {
  execution: BacktestExecutionPort;
  marketData: Pick<
    MarketDataModulePublicApi,
    "createDatasetSnapshot" | "readDatasetSnapshot"
  >;
  strategy: Pick<
    StrategyModulePublicApi,
    | "readStrategyDefinition"
    | "readCompositeDefinition"
    | "resolveStrategy"
    | "combineSignals"
  >;
  evaluation: Pick<EvaluatorModulePublicApi, "evaluator" | "runtimeVersion">;
  leaderboard: Pick<
    LeaderboardModulePublicApi,
    "getLeaderboardScope" | "score" | "submit"
  >;
  candidateRepository: CandidateRepository<TCandidate, TCreateCommand>;
  experimentRepository: ExperimentRepository<TExperiment, TTrade>;
  unitOfWork: BacktestingUnitOfWork;
  completionUnitOfWork: BacktestingCompletionUnitOfWork<TExperiment, TTrade>;
  clock: Clock;
}
