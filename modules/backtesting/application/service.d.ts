import type { BacktestQueueJob, BacktestQueueReturn } from "@cryptox/contracts/queue";
import type { CompositeStrategyDefinition, StrategyDefinition } from "modules/strategy/api";
import type { BacktestLogApi, BacktestReadOptions, SearchCandidatePage, SearchCandidatePageRequest, SearchCandidateSummary, TradePage, TradePageRequest } from "../api";
import type { BacktestAttemptAudit, BacktestSubmissionAccepted, BenchmarkScopeSummary, CandidateProgress, CompletedBacktestResult, CreateLeaderboardScopeCommand, ExperimentResultSummary, ReplayVerificationResult, StartManualBacktestCommand, SubmitSearchCandidateCommand, Trade } from "../domain/contracts";
import type { BacktestDispatch, BacktestQueuePort, BacktestingModuleDependencies, BacktestingRepository, StoredBenchmarkScope, StoredCandidate, StoredExperiment, WorkerAttemptClaim } from "./ports";
export declare const BACKTEST_RUNTIME_VERSION = "1.0.0";
export declare const BACKTEST_RUNTIME_SHA256 = "c7d208d3db06e01df73733b91ed928fbd78d06f0d6d978f5821547c8ee6af75b";
export declare class InMemoryBacktestQueue implements BacktestQueuePort {
    readonly jobs: Map<string, BacktestQueueJob>;
    enqueue(job: BacktestQueueJob): Promise<void>;
    remove(jobId: string): Promise<void>;
}
export declare class InMemoryBacktestingRepository implements BacktestingRepository {
    private readonly snapshots;
    private readonly scopes;
    private readonly scopeIdempotency;
    private readonly candidates;
    private readonly candidateIdempotency;
    private readonly attempts;
    private readonly trades;
    private readonly experiments;
    private readonly dispatches;
    createInputSnapshot(snapshot: import("modules/market-data/api").DatasetSnapshotRef, candles: import("modules/market-data/api").Candle[]): Promise<void>;
    readInputSnapshot(snapshotId: string): Promise<{
        snapshot: import("modules/market-data/api").DatasetSnapshotRef;
        candles: import("modules/market-data/api").Candle[];
    } | undefined>;
    createScope(scope: StoredBenchmarkScope, idempotencyKey: string): Promise<StoredBenchmarkScope>;
    findScopeByIdempotency(ownerUserId: string, idempotencyKey: string): Promise<StoredBenchmarkScope | undefined>;
    readScope(scopeId: string): Promise<StoredBenchmarkScope | undefined>;
    createCandidate(candidate: StoredCandidate, key?: string): Promise<StoredCandidate>;
    createQueuedSubmission(input: {
        candidate: StoredCandidate;
        dispatch: BacktestDispatch;
        submissionIdempotencyKey?: string;
    }): Promise<StoredCandidate>;
    findCandidateBySubmission(ownerUserId: string, key: string): Promise<StoredCandidate | undefined>;
    readCandidate(candidateId: string): Promise<StoredCandidate | undefined>;
    updateCandidate(candidate: StoredCandidate): Promise<void>;
    readDispatch(jobId: string): Promise<BacktestDispatch | undefined>;
    listPendingDispatches(limit: number): Promise<BacktestDispatch[]>;
    markDispatchDispatched(jobId: string, dispatchedAt: string): Promise<void>;
    markDispatchFailed(jobId: string, error: string, at: string): Promise<void>;
    markDispatchCancelled(jobId: string, at: string): Promise<void>;
    listCandidatesBySearchRun(searchRunId: string): Promise<StoredCandidate[]>;
    createAttempt(attempt: BacktestAttemptAudit): Promise<void>;
    updateAttempt(attempt: BacktestAttemptAudit): Promise<void>;
    readAttempt(attemptId: string): Promise<BacktestAttemptAudit | undefined>;
    listAttempts(candidateId: string): Promise<{
        attemptId: string;
        attemptNumber: number;
        status: "QUEUED" | "RETRY_WAIT" | "COMPLETED" | "FAILED" | "CANCELLED" | "RUNNING";
        startedAt: string;
        completedAt: string | undefined;
        deliveryAttemptCount: number | undefined;
        failureCategory: "INFRASTRUCTURE" | "RETRYABLE" | "CANCELLED_AUDIT" | undefined;
        failureCode: string | undefined;
        errorMessage: string | undefined;
    }[]>;
    claimWorkerAttempt(input: {
        candidateId: string;
        queueJobId: string;
        deliveryAttempt: number;
        attemptId: string;
        fenceToken: string;
        now: string;
        leaseExpiresAt: string;
        workerRuntimeVersion: string;
        workerRuntimeSha256: string;
    }): Promise<WorkerAttemptClaim | undefined>;
    failWorkerAttempt(input: {
        candidate: StoredCandidate;
        attempt: BacktestAttemptAudit;
        fenceToken: string;
        retrying: boolean;
        now: string;
        error: string;
    }): Promise<void>;
    completeAttempt(input: {
        candidate: StoredCandidate;
        attempt: BacktestAttemptAudit;
        result: CompletedBacktestResult;
        metrics: import("modules/evaluation/api").EvaluationMetrics;
        experiment: StoredExperiment;
        fenceToken?: string;
    }): Promise<void>;
    listTrades(attemptId: string): Promise<Trade[]>;
    readExperiment(experimentId: string): Promise<StoredExperiment | undefined>;
    findExperimentByCandidate(candidateId: string): Promise<StoredExperiment | undefined>;
    listExperimentsBySearchRun(searchRunId: string): Promise<StoredExperiment[]>;
    updateExperimentScore(experimentId: string, input: {
        overallScore: number;
        rankEligible: boolean;
    }): Promise<{
        overallScore: number;
        rankEligible: boolean;
        ownerUserId: string;
        backtestAttemptId: string;
        compositeDefinitionId: string;
        compositeDefinition: CompositeStrategyDefinition;
        datasetSnapshot: import("modules/market-data/api").DatasetSnapshotRef;
        sentimentDatasetSnapshot?: import("modules/sentiment/api").SentimentDatasetSnapshotRef;
        strategyDefinitions: StrategyDefinition[];
        metrics: import("modules/evaluation/api").EvaluationMetrics;
        trades: Trade[];
        createdAt: string;
        id: string;
        candidateId: string;
        searchRunId?: string;
        leaderboardScopeId: string;
        scoreFormulaId: string;
    } | undefined>;
}
export declare function createInMemoryBacktestingDependencies(): BacktestingModuleDependencies;
export declare class BacktestingService implements BacktestLogApi {
    private readonly deps;
    constructor(deps: BacktestingModuleDependencies);
    private id;
    private now;
    private assertOwner;
    private scope;
    private candidate;
    private snapshot;
    private captureSnapshot;
    private validateScope;
    createBenchmarkScope(command: CreateLeaderboardScopeCommand, options: {
        scopeIdempotencyKey: string;
        ownerUserId: string;
    }): Promise<BenchmarkScopeSummary>;
    readBenchmarkScope(scopeId: string, options?: BacktestReadOptions): Promise<BenchmarkScopeSummary>;
    private compositeStrategy;
    private candidateRecord;
    private dispatchRecord;
    private dispatchOne;
    reconcileQueue(limit?: number): Promise<{
        dispatched: number;
        pending: number;
    }>;
    private submit;
    startManual(command: StartManualBacktestCommand, options: {
        ownerUserId: string;
        submissionIdempotencyKey?: string;
    }): Promise<BacktestSubmissionAccepted>;
    submitSearchCandidate(command: SubmitSearchCandidateCommand): Promise<BacktestSubmissionAccepted>;
    processQueueJob(job: BacktestQueueJob, delivery: {
        attemptNumber: number;
        fenceToken?: string;
    }): Promise<BacktestQueueReturn>;
    private runClaimedAttempt;
    status(candidateId: string, options?: BacktestReadOptions): Promise<CandidateProgress>;
    summarizeSearchCandidates(searchRunId: string): Promise<SearchCandidateSummary>;
    listSearchCandidates(searchRunId: string, page: SearchCandidatePageRequest): Promise<SearchCandidatePage>;
    cancelSearchCandidates(searchRunId: string): Promise<{
        candidateIds: string[];
    }>;
    cancelManualCandidate(candidateId: string): Promise<void>;
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
    private pageTrades;
    verifyReplay(experimentId: string, options?: BacktestReadOptions): Promise<ReplayVerificationResult>;
}
export declare function createBacktestingService(dependencies?: BacktestingModuleDependencies): BacktestLogApi;
