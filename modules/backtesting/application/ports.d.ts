import type { EvaluationMetrics, EvaluatorModulePublicApi } from "modules/evaluation/api";
import type { Candle, DatasetSnapshotRef, MarketDataModulePublicApi } from "modules/market-data/api";
import type { StrategyModulePublicApi } from "modules/strategy/api";
import type { BacktestAttemptAudit, BacktestAttemptProgress, BenchmarkScopeSummary, CandidateProgress, CompletedBacktestResult, ExperimentResultSummary, Trade } from "../domain/contracts";
import type { BacktestQueueJob } from "@cryptox/contracts/queue";
export interface StoredBenchmarkScope extends BenchmarkScopeSummary {
    ownerUserId: string;
}
export interface StoredCandidate extends CandidateProgress {
    ownerUserId: string;
    strategyDefinitions: import("modules/strategy/api").StrategyDefinition[];
    compositeDefinition: import("modules/strategy/api").CompositeStrategyDefinition;
    queueJobId: string;
    executionGeneration?: number;
    activeFenceToken?: string;
    activeLeaseExpiresAt?: string;
    completionGeneration?: number;
    activeCompletionClaimToken?: string;
    activeCompletionLeaseExpiresAt?: string;
}
export interface StoredExperiment extends ExperimentResultSummary {
    ownerUserId: string;
}
export interface BacktestDispatch {
    job: BacktestQueueJob;
    state: "PENDING" | "DISPATCHED" | "CANCELLED";
    dispatchAttempts: number;
    lastError?: string;
    dispatchedAt?: string;
    createdAt: string;
    updatedAt: string;
}
export interface BacktestQueuePort {
    enqueue(job: BacktestQueueJob): Promise<void>;
    remove(jobId: string): Promise<void>;
}
export interface WorkerAttemptClaim {
    candidate: StoredCandidate;
    attempt: BacktestAttemptAudit;
    fenceToken: string;
}
export interface CompletionProcessingClaim {
    candidate: StoredCandidate;
    claimToken: string;
}
export interface BacktestCompletionServices {
    score(leaderboardScopeId: string, metrics: EvaluationMetrics): Promise<{
        scoreFormulaId: string;
        overallScore: number;
        rankEligible: boolean;
    }>;
    submit(experiment: import("../domain/contracts").ExperimentResultSummary, unitOfWork: import("../domain/contracts").CompletionUnitOfWork): Promise<void>;
    notifySearchCandidateFinished?(searchRunId: string): Promise<void>;
}
export interface BacktestingRepository {
    createInputSnapshot(snapshot: DatasetSnapshotRef, candles: Candle[]): Promise<DatasetSnapshotRef>;
    readInputSnapshot(snapshotId: string): Promise<{
        snapshot: DatasetSnapshotRef;
        candles: Candle[];
    } | undefined>;
    createScope(scope: StoredBenchmarkScope, idempotencyKey: string): Promise<StoredBenchmarkScope>;
    findScopeByIdempotency(ownerUserId: string, idempotencyKey: string): Promise<StoredBenchmarkScope | undefined>;
    readScope(scopeId: string): Promise<StoredBenchmarkScope | undefined>;
    listScopesByOwner(ownerUserId: string): Promise<StoredBenchmarkScope[]>;
    createCandidate(candidate: StoredCandidate, submissionIdempotencyKey?: string): Promise<StoredCandidate>;
    createQueuedSubmission(input: {
        candidate: StoredCandidate;
        dispatch: BacktestDispatch;
        submissionIdempotencyKey?: string;
    }): Promise<StoredCandidate>;
    findCandidateBySubmission(ownerUserId: string, submissionIdempotencyKey: string): Promise<StoredCandidate | undefined>;
    readCandidate(candidateId: string): Promise<StoredCandidate | undefined>;
    updateCandidate(candidate: StoredCandidate): Promise<void>;
    readDispatch(jobId: string): Promise<BacktestDispatch | undefined>;
    listPendingDispatches(limit: number): Promise<BacktestDispatch[]>;
    listQueueRecoveryCandidates(limit: number): Promise<string[]>;
    markDispatchDispatched(jobId: string, dispatchedAt: string): Promise<void>;
    markDispatchFailed(jobId: string, error: string, at: string): Promise<void>;
    markDispatchCancelled(jobId: string, at: string): Promise<void>;
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
    }): Promise<CompletionProcessingClaim | undefined>;
    listDueCompletions(now: string, limit: number): Promise<string[]>;
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
    listCandidatesBySearchRun(searchRunId: string): Promise<StoredCandidate[]>;
    createAttempt(attempt: BacktestAttemptAudit): Promise<void>;
    updateAttempt(attempt: BacktestAttemptAudit): Promise<void>;
    readAttempt(attemptId: string): Promise<BacktestAttemptAudit | undefined>;
    listAttempts(candidateId: string): Promise<BacktestAttemptProgress[]>;
    completeAttempt(input: {
        candidate: StoredCandidate;
        attempt: BacktestAttemptAudit;
        result: CompletedBacktestResult;
        metrics: EvaluationMetrics;
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
    }): Promise<StoredExperiment | undefined>;
}
export interface BacktestingModuleDependencies {
    marketData: Pick<MarketDataModulePublicApi, "readDatasetSnapshot">;
    strategy: Pick<StrategyModulePublicApi, "resolveStrategy" | "combineSignals">;
    evaluation: Pick<EvaluatorModulePublicApi, "evaluator">;
    repository: BacktestingRepository;
    queue: BacktestQueuePort;
    completion: BacktestCompletionServices;
    clock: {
        now(): string;
    };
    idGenerator?: () => string;
}
