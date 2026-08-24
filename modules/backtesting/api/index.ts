import type {
  BacktestAttemptAudit,
  BacktestSubmissionAccepted,
  BenchmarkScopeSummary,
  CandidateProgress,
  CancellationUnitOfWork,
  CreateLeaderboardScopeCommand,
  ExperimentResultSummary,
  ReplayVerificationResult,
  StartManualBacktestCommand,
  SubmitSearchCandidateCommand,
  Trade,
} from "../domain/contracts";
export type {
  CandidateStatus,
  BacktestSubmissionAccepted,
  CancellationUnitOfWork,
  CompletionUnitOfWork,
  Trade,
  CompletedBacktestResult,
  GeneratorType,
  CreateLeaderboardScopeCommand,
  StartManualBacktestCommand,
  SubmitSearchCandidateCommand,
  BenchmarkScopeSummary,
  ReplayVerificationResult,
  CandidateProgress,
  BacktestAttemptProgress,
  BacktestAttemptAudit,
  ExperimentResult,
  ExperimentResultSummary,
} from "../domain/contracts";
export interface SearchCandidateSummary {
  searchRunId: string;
  active: CandidateProgress[];
  queuedCount: number;
  runningCount: number;
  candidatesTested: number;
  failedCandidateCount: number;
  retryExhaustedCandidateCount: number;
  infrastructureFailureCandidateCount: number;
  completionProcessingFailureCandidateCount: number;
  failedAttemptCount: number;
  averageBacktestDurationMs: number | null;
}
export interface SearchCandidatePageRequest {
  limit: number;
  cursor?: string;
}
export interface SearchCandidatePage {
  items: CandidateProgress[];
  nextCursor?: string;
}
export interface TradePageRequest {
  limit: number;
  cursor?: string;
}
export interface TradePage {
  items: Trade[];
  nextCursor?: string;
}
export interface BacktestLogApi {
  createBenchmarkScope(
    command: CreateLeaderboardScopeCommand,
    options: { scopeIdempotencyKey: string },
  ): Promise<BenchmarkScopeSummary>;
  startManual(
    command: StartManualBacktestCommand,
    options?: { submissionIdempotencyKey?: string },
  ): Promise<BacktestSubmissionAccepted>;
  submitSearchCandidate(command: SubmitSearchCandidateCommand): Promise<BacktestSubmissionAccepted>;
  status(candidateId: string): Promise<CandidateProgress>;
  summarizeSearchCandidates(searchRunId: string): Promise<SearchCandidateSummary>;
  listSearchCandidates(
    searchRunId: string,
    page: SearchCandidatePageRequest,
  ): Promise<SearchCandidatePage>;
  cancelSearchCandidates(
    searchRunId: string,
    unitOfWork: CancellationUnitOfWork,
  ): Promise<{ candidateIds: string[] }>;
  cancelManualCandidate(candidateId: string, unitOfWork: CancellationUnitOfWork): Promise<void>;
  removePendingJobs(candidateIds: string[]): Promise<void>;
  readAttempt(attemptId: string): Promise<BacktestAttemptAudit>;
  listAttemptTrades(attemptId: string, page: TradePageRequest): Promise<TradePage>;
  readExperimentSummary(experimentId: string): Promise<ExperimentResultSummary>;
  listExperimentTrades(experimentId: string, page: TradePageRequest): Promise<TradePage>;
  verifyReplay(experimentId: string): Promise<ReplayVerificationResult>;
}
const notImplemented = (): never => {
  throw new Error("NOT_IMPLEMENTED");
};
export const createBenchmarkScope: BacktestLogApi["createBenchmarkScope"] = async () =>
  notImplemented();
export const startManual: BacktestLogApi["startManual"] = async () => notImplemented();
export const submitSearchCandidate: BacktestLogApi["submitSearchCandidate"] = async () =>
  notImplemented();
export const status: BacktestLogApi["status"] = async () => notImplemented();
export const summarizeSearchCandidates: BacktestLogApi["summarizeSearchCandidates"] = async () =>
  notImplemented();
export const listSearchCandidates: BacktestLogApi["listSearchCandidates"] = async () =>
  notImplemented();
export const cancelSearchCandidates: BacktestLogApi["cancelSearchCandidates"] = async () =>
  notImplemented();
export const cancelManualCandidate: BacktestLogApi["cancelManualCandidate"] = async () =>
  notImplemented();
export const removePendingJobs: BacktestLogApi["removePendingJobs"] = async () => notImplemented();
export const readAttempt: BacktestLogApi["readAttempt"] = async () => notImplemented();
export const listAttemptTrades: BacktestLogApi["listAttemptTrades"] = async () => notImplemented();
export const readExperimentSummary: BacktestLogApi["readExperimentSummary"] = async () =>
  notImplemented();
export const listExperimentTrades: BacktestLogApi["listExperimentTrades"] = async () =>
  notImplemented();
export const verifyReplay: BacktestLogApi["verifyReplay"] = async () => notImplemented();
