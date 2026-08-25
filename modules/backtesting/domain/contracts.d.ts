import type { CompositeStrategyDefinition, StrategyDefinition } from "modules/strategy/api";
import type { DatasetSnapshotRef, Pair, Timeframe } from "modules/market-data/api";
import type { SentimentDatasetSnapshotRef } from "modules/sentiment/api";
export type CandidateStatus = "CREATED" | "QUEUED" | "BACKTESTING" | "RETRY_WAIT" | "PROCESSING_RESULT" | "TERMINAL_FAILURE_PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
export interface BacktestSubmissionAccepted {
    candidateId: string;
    jobId: string;
    status: CandidateStatus;
}
export interface CancellationUnitOfWork {
    kind: "CANCELLATION";
    id: string;
}
export interface CompletionUnitOfWork {
    kind: "COMPLETION";
    id: string;
    candidateId: string;
    completionAttemptCount: number;
    completionClaimToken: string;
    enlist(moduleName: "EVALUATION" | "LEADERBOARD" | "SEARCH"): void;
}
export interface Trade {
    id: string;
    sequence: number;
    pair: Pair;
    settlementAsset: string;
    backtestAttemptId: string;
    signal: "LONG" | "SHORT";
    entryTime: string;
    marketEntryPrice: number;
    entryPrice: number;
    stopLoss: number | null;
    takeProfit: number | null;
    exitTime: string;
    marketExitPrice: number;
    exitPrice: number;
    exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "STRATEGY_CLOSE" | "RANGE_END";
    quantity: number;
    notionalEntryValue: number;
    equityBeforeTrade: number;
    equityAfterTrade: number;
    grossProfit: number;
    feeAmount: number;
    slippageBps: number;
    slippageAmount: number;
    profit: number;
    resultPercent: number;
    result: "WIN" | "LOSS" | "BREAKEVEN";
}
export interface CompletedBacktestResult {
    status: "COMPLETED";
    candidateId: string;
    attemptId: string;
    workerRuntimeVersion: string;
    workerRuntimeSha256: string;
    startedAt: string;
    completedAt: string;
    trades: Trade[];
}
export type GeneratorType = "RANDOM" | "DOMAIN_GUIDED" | "GENETIC";
export interface CreateLeaderboardScopeCommand {
    name: string;
    datasetSnapshot: DatasetSnapshotRef;
    sentimentDatasetSnapshot?: SentimentDatasetSnapshotRef;
    initialCapital: number;
    feeRatePercent: number;
    slippageBps: number;
    scoreFormulaId: string;
    riskPolicy?: {
        stopLossPercent?: number;
        takeProfitPercent?: number;
    };
    workerRuntimeVersion: string;
    workerRuntimeSha256: string;
    evaluationRuntimeVersion: string;
    evaluationRuntimeSha256: string;
}
export interface StartManualBacktestCommand {
    leaderboardScopeId: string;
    strategyDefinitions: StrategyDefinition[];
    compositeDefinition: CompositeStrategyDefinition;
    maxAttempts: number;
}
export interface SubmitSearchCandidateCommand extends StartManualBacktestCommand {
    searchRunId: string;
    iterationNumber: number;
    generatedBy: GeneratorType;
}
export interface BenchmarkScopeSummary {
    id: string;
    name: string;
    version: number;
    datasetSnapshot: DatasetSnapshotRef;
    sentimentDatasetSnapshot?: SentimentDatasetSnapshotRef;
    workerRuntimeVersion: string;
    workerRuntimeSha256: string;
    evaluationRuntimeVersion: string;
    evaluationRuntimeSha256: string;
    pair: Pair;
    timeframe: Timeframe;
    datasetRange: {
        from: string;
        to: string;
    };
    datasetSnapshotId: string;
    datasetSnapshotSha256: string;
    initialCapital: number;
    feeRatePercent: number;
    slippageBps: number;
    riskPolicy?: {
        stopLossPercent?: number;
        takeProfitPercent?: number;
    };
    decimalPolicyId: "MVP_DECIMAL_HALF_UP_V1";
    evaluationPolicyId: "MVP_EVALUATION_V1";
    scoreFormulaId: string;
    createdAt: string;
}
export interface ReplayVerificationResult {
    experimentId: string;
    sourceAttemptId: string;
    status: "MATCH" | "MISMATCH" | "NON_REPLAYABLE";
    comparedTradeCount: number;
    mismatches: Array<{
        fieldPath: string;
        expected: string;
        actual: string;
    }>;
    failureCode?: "MISSING_SNAPSHOT" | "IMPLEMENTATION_ARTIFACT_UNAVAILABLE";
}
export interface CandidateProgress {
    candidateId: string;
    origin: "MANUAL" | "SEARCH";
    selectionMode: "SINGLE" | "COMPOSITE";
    searchRunId?: string;
    iterationNumber?: number;
    leaderboardScopeId: string;
    status: CandidateStatus;
    attempts: BacktestAttemptProgress[];
    maxAttempts: number;
    activeAttemptNumber?: number;
    completionAttemptCount: number;
    completionMaxAttempts: number;
    completionNextRetryAt?: string;
    experimentResultId?: string;
    failureKind?: "RETRY_EXHAUSTED" | "INFRASTRUCTURE" | "COMPLETION_PROCESSING";
    failureCode?: string;
    lastError?: string;
    createdAt: string;
    updatedAt: string;
}
export interface BacktestAttemptProgress {
    attemptId: string;
    attemptNumber: number;
    status: "QUEUED" | "RUNNING" | "RETRY_WAIT" | "COMPLETED" | "FAILED" | "CANCELLED";
    startedAt: string;
    completedAt?: string;
    deliveryAttemptCount?: number;
    failureCategory?: "RETRYABLE" | "INFRASTRUCTURE" | "CANCELLED_AUDIT";
    failureCode?: string;
    errorMessage?: string;
}
export interface BacktestAttemptAudit extends BacktestAttemptProgress {
    candidateId: string;
    queueJobId: string;
    workerRuntimeVersion: string;
    workerRuntimeSha256: string;
    tradeCount: number;
    auditOnly: boolean;
    fenceToken?: string;
    leaseExpiresAt?: string;
}
export interface ExperimentResult {
    id: string;
    candidateId: string;
    searchRunId?: string;
    leaderboardScopeId: string;
    scoreFormulaId: string;
    overallScore: number;
    rankEligible: boolean;
}
export interface ExperimentResultSummary extends ExperimentResult {
    backtestAttemptId: string;
    compositeDefinitionId: string;
    compositeDefinition: CompositeStrategyDefinition;
    datasetSnapshot: DatasetSnapshotRef;
    sentimentDatasetSnapshot?: SentimentDatasetSnapshotRef;
    strategyDefinitions: StrategyDefinition[];
    metrics: import("modules/evaluation/api").EvaluationMetrics;
    trades: Trade[];
    createdAt: string;
}
