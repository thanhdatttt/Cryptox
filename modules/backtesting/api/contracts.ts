import type { EvaluationMetrics } from "@cryptox/evaluation";
import type { Pair, Timeframe } from "@cryptox/market-data";

export const CANDIDATE_STATUSES = [
  "ACCEPTED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export type CandidateOrigin =
  | { kind: "MANUAL" }
  | { kind: "SEARCH"; searchRunId: string; iterationNumber: number };

export interface StrategySelection {
  strategyDefinitionIds: readonly string[];
  compositeDefinitionId?: string;
}

export interface MarketInputSelection {
  pair: Pair;
  timeframe: Timeframe;
  range: { from: string; to: string };
  datasetId?: string;
  datasetVersion?: string;
  source?: string;
}

export interface BacktestConfiguration {
  initialCapital: number;
  feeRatePercent: number;
  slippageBps: number;
}

export interface StartManualBacktestCommand {
  strategySelection: StrategySelection;
  marketInput: MarketInputSelection;
  configuration: BacktestConfiguration;
}

export interface SubmitSearchCandidateCommand extends StartManualBacktestCommand {
  searchRunId: string;
  iterationNumber: number;
}

export interface BacktestSubmissionAccepted {
  candidateId: string;
  status: "ACCEPTED";
}

export interface CandidateFailure {
  code: string;
  message: string;
}

export interface CandidateProgress {
  candidateId: string;
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

export interface Trade {
  id: string;
  experimentId: string;
  sequence: number;
  pair: Pair;
  entryTime: string;
  entryPrice: number;
  exitTime: string;
  exitPrice: number;
  exitReason: "STRATEGY_EXIT" | "RANGE_END";
  quantity: number;
  notionalEntryValue: number;
  grossProfit: number;
  feeAmount: number;
  slippageBps: number;
  slippageAmount: number;
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
}

export interface Experiment {
  id: string;
  candidateId: string;
  searchRunId?: string;
  strategySelection: StrategySelection;
  marketInput: MarketInputSelection;
  configuration: BacktestConfiguration;
  metrics: EvaluationMetrics;
  rankingConfigurationId?: string;
  codeVersion?: string;
  createdAt: string;
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
  startManual(command: StartManualBacktestCommand): Promise<BacktestSubmissionAccepted>;
  submitSearchCandidate(command: SubmitSearchCandidateCommand): Promise<BacktestSubmissionAccepted>;
  status(candidateId: string): Promise<CandidateProgress>;
  summarizeSearchCandidates(searchRunId: string): Promise<SearchCandidateSummary>;
  listSearchCandidates(searchRunId: string, page: CandidatePageRequest): Promise<CandidatePage>;
  cancelSearchCandidates(searchRunId: string): Promise<{ candidateIds: readonly string[] }>;
  cancelCandidate(candidateId: string): Promise<void>;
  readExperiment(experimentId: string): Promise<Experiment>;
  listSearchExperiments(searchRunId: string): Promise<readonly Experiment[]>;
  listExperimentTrades(experimentId: string, page: TradePageRequest): Promise<TradePage>;
}
