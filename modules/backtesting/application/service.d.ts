import type { BacktestQueueJob, BacktestQueueReturn, BacktestQueueTerminalSignal } from "@cryptox/contracts/queue";
import type { CompositeStrategyDefinition, StrategyDefinition } from "modules/strategy/api";
import type { BacktestLogApi, ExperimentVisualizationPageRequest, SearchCandidatePage, SearchCandidatePageRequest, SearchCandidateSummary, TradePage, TradePageRequest } from "../api";
import type { BacktestAttemptAudit, BacktestSubmissionAccepted, BenchmarkScopeSummary, CandidateProgress, CompletedBacktestResult, CreateLeaderboardScopeCommand, ExecutionPolicySnapshot, ExperimentResultSummary, ExperimentVisualization, ReplayVerificationResult, StartManualBacktestCommand, SubmitSearchCandidateCommand, Trade } from "../domain/contracts";
import type { AuthContext } from "modules/auth/api";
import type { BacktestDispatch, BacktestQueuePort, BacktestingModuleDependencies, BacktestingRepository, StoredBenchmarkScope, StoredCandidate, StoredExperiment, WorkerAttemptClaim } from "./ports";
export declare const BACKTEST_RUNTIME_VERSION = "1.0.0";
export declare const BACKTEST_RUNTIME_SHA256 = "c7d208d3db06e01df73733b91ed928fbd78d06f0d6d978f5821547c8ee6af75b";
export declare const SIMULATOR_VERSION = "1.0.0";
export declare const SIMULATOR_SHA256 = "2ed4a4326ba78169d9432c10f05272b01c53a5518ead8ab873be35bd2f1305bf";
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
    createInputSnapshot(snapshot: import("modules/market-data/api").DatasetSnapshotRef, candles: import("modules/market-data/api").Candle[]): Promise<import("modules/market-data/api").DatasetSnapshotRef>;
    readInputSnapshot(snapshotId: string): Promise<{
        snapshot: import("modules/market-data/api").DatasetSnapshotRef;
        candles: import("modules/market-data/api").Candle[];
    } | undefined>;
    createScope(scope: StoredBenchmarkScope, idempotencyKey: string): Promise<StoredBenchmarkScope>;
    findScopeByIdempotency(ownerUserId: string, idempotencyKey: string): Promise<StoredBenchmarkScope | undefined>;
    readScope(scopeId: string, ownerUserId?: string): Promise<StoredBenchmarkScope | undefined>;
    listScopesByOwner(ownerUserId: string): Promise<StoredBenchmarkScope[]>;
    createCandidate(candidate: StoredCandidate, key?: string): Promise<StoredCandidate>;
    createQueuedSubmission(input: {
        candidate: StoredCandidate;
        dispatch: BacktestDispatch;
        submissionIdempotencyKey?: string;
    }): Promise<StoredCandidate>;
    findCandidateBySubmission(ownerUserId: string, key: string): Promise<StoredCandidate | undefined>;
    readCandidate(candidateId: string, ownerUserId?: string): Promise<StoredCandidate | undefined>;
    updateCandidate(candidate: StoredCandidate, unitOfWork?: import("../domain/contracts").CancellationUnitOfWork): Promise<void>;
    readDispatch(jobId: string): Promise<BacktestDispatch | undefined>;
    listPendingDispatches(limit: number): Promise<BacktestDispatch[]>;
    listQueueRecoveryCandidates(limit: number): Promise<string[]>;
    recoverAbandonedAttempt(input: {
        candidateId: string;
        now: string;
        error: string;
    }): Promise<boolean>;
    markDispatchDispatched(jobId: string, dispatchedAt: string): Promise<void>;
    markDispatchFailed(jobId: string, error: string, at: string): Promise<void>;
    markDispatchCancelled(jobId: string, at: string, unitOfWork?: import("../domain/contracts").CancellationUnitOfWork): Promise<void>;
    listCandidatesBySearchRun(searchRunId: string, ownerUserId?: string): Promise<StoredCandidate[]>;
    createAttempt(attempt: BacktestAttemptAudit): Promise<void>;
    updateAttempt(attempt: BacktestAttemptAudit): Promise<void>;
    readAttempt(attemptId: string, ownerUserId?: string): Promise<BacktestAttemptAudit | undefined>;
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
    repairTerminalQueueFailure(input: {
        candidateId: string;
        error: string;
        now: string;
    }): Promise<void>;
    persistWorkerSuccess(input: {
        candidate: StoredCandidate;
        attempt: BacktestAttemptAudit;
        result: CompletedBacktestResult;
        fenceToken: string;
    }): Promise<void>;
    claimCompletion(input: {
        candidateId: string;
        claimToken: string;
        now: string;
        leaseExpiresAt: string;
    }): Promise<{
        candidate: StoredCandidate;
        claimToken: string;
    } | undefined>;
    listDueCompletions(nowValue: string, limit: number): Promise<string[]>;
    readLatestCompletedAttempt(candidateId: string): Promise<BacktestAttemptAudit | undefined>;
    stageCompletionExperiment(experiment: StoredExperiment): Promise<StoredExperiment>;
    finalizeCompletion(input: {
        candidate: StoredCandidate;
        experimentId: string;
        claimToken: string;
        now: string;
    }): Promise<void>;
    finalizeTerminalFailure(input: {
        candidate: StoredCandidate;
        claimToken: string;
        now: string;
    }): Promise<void>;
    failCompletion(input: {
        candidate: StoredCandidate;
        claimToken: string;
        retryAt?: string;
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
    readExperiment(experimentId: string, ownerUserId?: string): Promise<StoredExperiment | undefined>;
    findExperimentByCandidate(candidateId: string): Promise<StoredExperiment | undefined>;
    listExperimentsBySearchRun(searchRunId: string, ownerUserId?: string): Promise<StoredExperiment[]>;
    updateExperimentScore(experimentId: string, input: {
        overallScore: number;
        rankEligible: boolean;
    }, ownerUserId?: string): Promise<{
        overallScore: number;
        rankEligible: boolean;
        ownerUserId: string;
        backtestAttemptId: string;
        compositeDefinitionId: string;
        compositeDefinition: CompositeStrategyDefinition;
        datasetSnapshot: import("modules/market-data/api").DatasetSnapshotRef;
        sentimentDatasetSnapshot?: import("modules/sentiment/api").SentimentDatasetSnapshotRef;
        strategyDefinitions: StrategyDefinition[];
        executionPolicy?: ExecutionPolicySnapshot;
        simulatorVersion?: string;
        simulatorSha256?: string;
        benchmarkTimezone?: string;
        fillPolicyId?: string;
        oppositeSignalPolicyId?: string;
        sameCandleOrderingPolicyId?: string;
        deterministicGuarantee?: string;
        workerRuntimeVersion?: string;
        workerRuntimeSha256?: string;
        evaluationRuntimeVersion?: string;
        evaluationRuntimeSha256?: string;
        decimalPolicyId?: "MVP_DECIMAL_HALF_UP_V1";
        evaluationPolicyId?: "MVP_EVALUATION_V1";
        initialCapital?: number;
        feeRatePercent?: number;
        slippageBps?: number;
        totalProfitAmount?: number;
        endingEquity?: number;
        wins?: number;
        losses?: number;
        breakevens?: number;
        maxDrawdownAmount?: number;
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
    private assertAuth;
    private progress;
    private scope;
    private ownedScope;
    private candidate;
    private ownedCandidate;
    private ownedSearchCandidates;
    private requiredWarmupCandles;
    private validateStrategyReferences;
    private snapshot;
    private captureSnapshot;
    private validateScope;
    createBenchmarkScope(auth: AuthContext, command: CreateLeaderboardScopeCommand, options: {
        scopeIdempotencyKey: string;
    }): Promise<BenchmarkScopeSummary>;
    readBenchmarkScope(auth: AuthContext, scopeId: string): Promise<BenchmarkScopeSummary>;
    listBenchmarkScopes(auth: AuthContext): Promise<BenchmarkScopeSummary[]>;
    private compositeStrategy;
    private candidateRecord;
    private dispatchRecord;
    private dispatchOne;
    reconcileQueue(limit?: number): Promise<{
        dispatched: number;
        pending: number;
    }>;
    listQueueRecoveryCandidates(limit?: number): Promise<string[]>;
    private submit;
    startManual(auth: AuthContext, command: StartManualBacktestCommand, options?: {
        submissionIdempotencyKey?: string;
    }): Promise<BacktestSubmissionAccepted>;
    submitSearchCandidate(auth: AuthContext, command: SubmitSearchCandidateCommand): Promise<BacktestSubmissionAccepted>;
    processQueueJob(job: BacktestQueueJob, delivery: {
        attemptNumber: number;
        fenceToken?: string;
    }): Promise<BacktestQueueReturn>;
    private runClaimedAttempt;
    processCompletion(candidateId: string): Promise<{
        candidateId: string;
        status: "COMPLETED" | "FAILED" | "IGNORED";
    }>;
    processQueueTerminalSignal(signal: BacktestQueueTerminalSignal): Promise<{
        candidateId: string;
        status: "COMPLETED" | "FAILED" | "IGNORED";
    }>;
    reconcileCompletions(limit?: number): Promise<{
        processed: number;
        pending: number;
    }>;
    status(auth: AuthContext, candidateId: string): Promise<CandidateProgress>;
    summarizeSearchCandidates(auth: AuthContext, searchRunId: string): Promise<SearchCandidateSummary>;
    listSearchCandidates(auth: AuthContext, searchRunId: string, page: SearchCandidatePageRequest): Promise<SearchCandidatePage>;
    cancelSearchCandidates(auth: AuthContext, searchRunId: string, unitOfWork: import("../domain/contracts").CancellationUnitOfWork): Promise<{
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
    private visualizationContexts;
    private buildExperimentOverlays;
    readExperimentVisualization(auth: AuthContext, experimentId: string, page: ExperimentVisualizationPageRequest): Promise<ExperimentVisualization>;
    private pageTrades;
    verifyReplay(auth: AuthContext, experimentId: string): Promise<ReplayVerificationResult>;
}
export declare function createBacktestingService(dependencies?: BacktestingModuleDependencies): BacktestLogApi;
