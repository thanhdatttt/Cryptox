import type { BacktestAttemptAudit, BacktestSubmissionAccepted, BenchmarkScopeSummary, CandidateProgress, CancellationUnitOfWork, CreateLeaderboardScopeCommand, ExperimentResultSummary, ReplayVerificationResult, StartManualBacktestCommand, SubmitSearchCandidateCommand, Trade } from "../domain/contracts";
export { simulateBacktest } from "../domain/simulator";
export type { SimulationInput } from "../domain/simulator";
export type { CandidateStatus, BacktestSubmissionAccepted, CancellationUnitOfWork, CompletionUnitOfWork, Trade, CompletedBacktestResult, GeneratorType, CreateLeaderboardScopeCommand, StartManualBacktestCommand, SubmitSearchCandidateCommand, BenchmarkScopeSummary, ReplayVerificationResult, CandidateProgress, BacktestAttemptProgress, BacktestAttemptAudit, ExperimentResult, ExperimentResultSummary } from "../domain/contracts";
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
    createBenchmarkScope(command: CreateLeaderboardScopeCommand, options: {
        scopeIdempotencyKey: string;
    }): Promise<BenchmarkScopeSummary>;
    startManual(command: StartManualBacktestCommand, options?: {
        submissionIdempotencyKey?: string;
    }): Promise<BacktestSubmissionAccepted>;
    submitSearchCandidate(command: SubmitSearchCandidateCommand): Promise<BacktestSubmissionAccepted>;
    status(candidateId: string): Promise<CandidateProgress>;
    summarizeSearchCandidates(searchRunId: string): Promise<SearchCandidateSummary>;
    listSearchCandidates(searchRunId: string, page: SearchCandidatePageRequest): Promise<SearchCandidatePage>;
    cancelSearchCandidates(searchRunId: string, unitOfWork: CancellationUnitOfWork): Promise<{
        candidateIds: string[];
    }>;
    cancelManualCandidate(candidateId: string, unitOfWork: CancellationUnitOfWork): Promise<void>;
    removePendingJobs(candidateIds: string[]): Promise<void>;
    readAttempt(attemptId: string): Promise<BacktestAttemptAudit>;
    listAttemptTrades(attemptId: string, page: TradePageRequest): Promise<TradePage>;
    readExperimentSummary(experimentId: string): Promise<ExperimentResultSummary>;
    listExperimentTrades(experimentId: string, page: TradePageRequest): Promise<TradePage>;
    verifyReplay(experimentId: string): Promise<ReplayVerificationResult>;
}
export declare const createBenchmarkScope: BacktestLogApi["createBenchmarkScope"];
export declare const startManual: BacktestLogApi["startManual"];
export declare const submitSearchCandidate: BacktestLogApi["submitSearchCandidate"];
export declare const status: BacktestLogApi["status"];
export declare const summarizeSearchCandidates: BacktestLogApi["summarizeSearchCandidates"];
export declare const listSearchCandidates: BacktestLogApi["listSearchCandidates"];
export declare const cancelSearchCandidates: BacktestLogApi["cancelSearchCandidates"];
export declare const cancelManualCandidate: BacktestLogApi["cancelManualCandidate"];
export declare const removePendingJobs: BacktestLogApi["removePendingJobs"];
export declare const readAttempt: BacktestLogApi["readAttempt"];
export declare const listAttemptTrades: BacktestLogApi["listAttemptTrades"];
export declare const readExperimentSummary: BacktestLogApi["readExperimentSummary"];
export declare const listExperimentTrades: BacktestLogApi["listExperimentTrades"];
export declare const verifyReplay: BacktestLogApi["verifyReplay"];
