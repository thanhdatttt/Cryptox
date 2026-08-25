import type { BacktestAttemptAudit, BacktestSubmissionAccepted, BenchmarkScopeSummary, CandidateProgress, CancellationUnitOfWork, CreateLeaderboardScopeCommand, ExperimentResultSummary, ReplayVerificationResult, StartManualBacktestCommand, SubmitSearchCandidateCommand, Trade } from "../domain/contracts";
import type { BacktestQueueJob, BacktestQueueReturn } from "@cryptox/contracts/queue";
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
export interface BacktestReadOptions {
    ownerUserId?: string;
}
export interface BacktestLogApi {
    createBenchmarkScope(command: CreateLeaderboardScopeCommand, options: {
        scopeIdempotencyKey: string;
        ownerUserId: string;
    }): Promise<BenchmarkScopeSummary>;
    readBenchmarkScope(scopeId: string, options?: BacktestReadOptions): Promise<BenchmarkScopeSummary>;
    startManual(command: StartManualBacktestCommand, options: {
        ownerUserId: string;
        submissionIdempotencyKey?: string;
    }): Promise<BacktestSubmissionAccepted>;
    submitSearchCandidate(command: SubmitSearchCandidateCommand): Promise<BacktestSubmissionAccepted>;
    reconcileQueue(limit?: number): Promise<{
        dispatched: number;
        pending: number;
    }>;
    processQueueJob(job: BacktestQueueJob, delivery: {
        attemptNumber: number;
        fenceToken?: string;
    }): Promise<BacktestQueueReturn>;
    status(candidateId: string, options?: BacktestReadOptions): Promise<CandidateProgress>;
    summarizeSearchCandidates(searchRunId: string): Promise<SearchCandidateSummary>;
    listSearchCandidates(searchRunId: string, page: SearchCandidatePageRequest): Promise<SearchCandidatePage>;
    cancelSearchCandidates(searchRunId: string, unitOfWork: CancellationUnitOfWork): Promise<{
        candidateIds: string[];
    }>;
    cancelManualCandidate(candidateId: string, unitOfWork: CancellationUnitOfWork): Promise<void>;
    removePendingJobs(candidateIds: string[]): Promise<void>;
    readAttempt(attemptId: string, options?: BacktestReadOptions): Promise<BacktestAttemptAudit>;
    listAttemptTrades(attemptId: string, page: TradePageRequest, options?: BacktestReadOptions): Promise<TradePage>;
    readExperimentSummary(experimentId: string, options?: BacktestReadOptions): Promise<ExperimentResultSummary>;
    listSearchExperimentSummaries(searchRunId: string, options?: BacktestReadOptions): Promise<ExperimentResultSummary[]>;
    scoreExperiment(experimentId: string, input: {
        overallScore: number;
        rankEligible: boolean;
    }, options?: BacktestReadOptions): Promise<ExperimentResultSummary>;
    listExperimentTrades(experimentId: string, page: TradePageRequest, options?: BacktestReadOptions): Promise<TradePage>;
    verifyReplay(experimentId: string, options?: BacktestReadOptions): Promise<ReplayVerificationResult>;
}
export declare const createBenchmarkScope: BacktestLogApi["createBenchmarkScope"];
export declare const readBenchmarkScope: BacktestLogApi["readBenchmarkScope"];
export declare const startManual: BacktestLogApi["startManual"];
export declare const submitSearchCandidate: BacktestLogApi["submitSearchCandidate"];
export declare const reconcileQueue: BacktestLogApi["reconcileQueue"];
export declare const processQueueJob: BacktestLogApi["processQueueJob"];
export declare const status: BacktestLogApi["status"];
export declare const summarizeSearchCandidates: BacktestLogApi["summarizeSearchCandidates"];
export declare const listSearchCandidates: BacktestLogApi["listSearchCandidates"];
export declare const cancelSearchCandidates: BacktestLogApi["cancelSearchCandidates"];
export declare const cancelManualCandidate: BacktestLogApi["cancelManualCandidate"];
export declare const removePendingJobs: BacktestLogApi["removePendingJobs"];
export declare const readAttempt: BacktestLogApi["readAttempt"];
export declare const listAttemptTrades: BacktestLogApi["listAttemptTrades"];
export declare const readExperimentSummary: BacktestLogApi["readExperimentSummary"];
export declare const listSearchExperimentSummaries: BacktestLogApi["listSearchExperimentSummaries"];
export declare const scoreExperiment: BacktestLogApi["scoreExperiment"];
export declare const listExperimentTrades: BacktestLogApi["listExperimentTrades"];
export declare const verifyReplay: BacktestLogApi["verifyReplay"];
export { createBacktestingService, createInMemoryBacktestingDependencies } from "../application/service";
