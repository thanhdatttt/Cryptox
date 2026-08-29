import type { BacktestAttemptAudit, BacktestSubmissionAccepted, BenchmarkScopeSummary, CandidateProgress, CancellationUnitOfWork, CreateLeaderboardScopeCommand, ExperimentResultSummary, ExperimentVisualization, ReplayVerificationResult, StartManualBacktestCommand, SubmitSearchCandidateCommand, Trade } from "../domain/contracts";
import type { BacktestQueueJob, BacktestQueueReturn, BacktestQueueTerminalSignal } from "@cryptox/contracts/queue";
import type { AuthContext } from "modules/auth/api";
export { simulateBacktest } from "../domain/simulator";
export type { SimulationInput } from "../domain/simulator";
export type { CandidateStatus, BacktestSubmissionAccepted, CancellationUnitOfWork, CompletionUnitOfWork, Trade, CompletedBacktestResult, GeneratorType, CreateLeaderboardScopeCommand, StartManualBacktestCommand, SubmitSearchCandidateCommand, BenchmarkScopeSummary, ReplayVerificationResult, CandidateProgress, BacktestAttemptProgress, BacktestAttemptAudit, ExperimentResult, ExperimentResultSummary, ExperimentVisualization, ExperimentVisualizationMarker, StrategyVisualizationOverlay } from "../domain/contracts";
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
    limit?: number;
    cursor?: string;
}
export interface TradePage {
    items: Trade[];
    nextCursor?: string;
    totalCount: number;
}
export interface ExperimentVisualizationPageRequest {
    limit?: number;
    cursor?: string;
    from?: string;
    to?: string;
    highlightTradeId?: string;
}
export type { AuthContext } from "modules/auth/api";
export interface BacktestLogApi {
    createBenchmarkScope(auth: AuthContext, command: CreateLeaderboardScopeCommand, options: {
        scopeIdempotencyKey: string;
    }): Promise<BenchmarkScopeSummary>;
    readBenchmarkScope(auth: AuthContext, scopeId: string): Promise<BenchmarkScopeSummary>;
    listBenchmarkScopes(auth: AuthContext): Promise<BenchmarkScopeSummary[]>;
    startManual(auth: AuthContext, command: StartManualBacktestCommand, options?: {
        submissionIdempotencyKey?: string;
    }): Promise<BacktestSubmissionAccepted>;
    submitSearchCandidate(auth: AuthContext, command: SubmitSearchCandidateCommand): Promise<BacktestSubmissionAccepted>;
    reconcileQueue(limit?: number): Promise<{
        dispatched: number;
        pending: number;
    }>;
    listQueueRecoveryCandidates(limit?: number): Promise<string[]>;
    reconcileCompletions(limit?: number): Promise<{
        processed: number;
        pending: number;
    }>;
    processQueueJob(job: BacktestQueueJob, delivery: {
        attemptNumber: number;
        fenceToken?: string;
    }): Promise<BacktestQueueReturn>;
    processCompletion(candidateId: string): Promise<{
        candidateId: string;
        status: "COMPLETED" | "FAILED" | "IGNORED";
    }>;
    processQueueTerminalSignal(signal: BacktestQueueTerminalSignal): Promise<{
        candidateId: string;
        status: "COMPLETED" | "FAILED" | "IGNORED";
    }>;
    status(auth: AuthContext, candidateId: string): Promise<CandidateProgress>;
    summarizeSearchCandidates(auth: AuthContext, searchRunId: string): Promise<SearchCandidateSummary>;
    listSearchCandidates(auth: AuthContext, searchRunId: string, page: SearchCandidatePageRequest): Promise<SearchCandidatePage>;
    cancelSearchCandidates(auth: AuthContext, searchRunId: string, unitOfWork: CancellationUnitOfWork): Promise<{
        candidateIds: string[];
    }>;
    cancelManualCandidate(auth: AuthContext, candidateId: string): Promise<void>;
    removePendingJobs(candidateIds: string[]): Promise<void>;
    readAttempt(auth: AuthContext, attemptId: string): Promise<BacktestAttemptAudit>;
    listAttemptTrades(auth: AuthContext, attemptId: string, page: TradePageRequest): Promise<TradePage>;
    readExperimentSummary(auth: AuthContext, experimentId: string): Promise<ExperimentResultSummary>;
    listSearchExperimentSummaries(auth: AuthContext, searchRunId: string): Promise<ExperimentResultSummary[]>;
    scoreExperiment(auth: AuthContext, experimentId: string, input: {
        overallScore: number;
        rankEligible: boolean;
    }): Promise<ExperimentResultSummary>;
    listExperimentTrades(auth: AuthContext, experimentId: string, page: TradePageRequest): Promise<TradePage>;
    readExperimentVisualization(auth: AuthContext, experimentId: string, page: ExperimentVisualizationPageRequest): Promise<ExperimentVisualization>;
    verifyReplay(auth: AuthContext, experimentId: string): Promise<ReplayVerificationResult>;
}
export declare const createBenchmarkScope: BacktestLogApi["createBenchmarkScope"];
export declare const readBenchmarkScope: BacktestLogApi["readBenchmarkScope"];
export declare const listBenchmarkScopes: BacktestLogApi["listBenchmarkScopes"];
export declare const startManual: BacktestLogApi["startManual"];
export declare const submitSearchCandidate: BacktestLogApi["submitSearchCandidate"];
export declare const reconcileQueue: BacktestLogApi["reconcileQueue"];
export declare const listQueueRecoveryCandidates: BacktestLogApi["listQueueRecoveryCandidates"];
export declare const reconcileCompletions: BacktestLogApi["reconcileCompletions"];
export declare const processQueueJob: BacktestLogApi["processQueueJob"];
export declare const processCompletion: BacktestLogApi["processCompletion"];
export declare const processQueueTerminalSignal: BacktestLogApi["processQueueTerminalSignal"];
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
export declare const readExperimentVisualization: BacktestLogApi["readExperimentVisualization"];
export declare const verifyReplay: BacktestLogApi["verifyReplay"];
export { createBacktestingService, createInMemoryBacktestingDependencies } from "../application/service";
