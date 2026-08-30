import type { CompositeStrategyDefinition, StrategyDefinition } from "modules/strategy/api";
export type GeneratorType = "RANDOM" | "DOMAIN_GUIDED" | "GENETIC";
export type StrategyCategory = "TREND" | "MOMENTUM" | "VOLATILITY" | "STRUCTURE" | "INFORMATION";
export interface GeneratedCandidate {
    strategyDefinitions: StrategyDefinition[];
    compositeDefinition: CompositeStrategyDefinition;
    executionPolicyIntent: {
        mode: "TWO_SIDED_ONE_X_V1";
        stopLossPercent?: number;
        takeProfitPercent?: number;
    };
    generatedBy: GeneratorType;
}
export interface SearchSpaceConfig {
    availableStrategies: StrategyDefinition[];
    domainRules?: {
        requiredCategories: StrategyCategory[];
    };
    maxComponents?: number;
}
export interface StrategyGenerator {
    readonly type: GeneratorType;
    generate(searchSpace: SearchSpaceConfig): GeneratedCandidate;
}
type StopConditionFields = {
    maxCandidates?: number;
    maxDurationSeconds?: number;
    noImprovementAfterIterations?: number;
};
export type StopCondition = (StopConditionFields & {
    maxCandidates: number;
}) | (StopConditionFields & {
    maxDurationSeconds: number;
}) | (StopConditionFields & {
    noImprovementAfterIterations: number;
});
export interface CandidateProgress {
    candidateId: string;
    origin: "MANUAL" | "SEARCH";
    searchRunId?: string;
    iterationNumber?: number;
    leaderboardScopeId: string;
    status: string;
    attempts: unknown[];
    maxAttempts: number;
    activeAttemptNumber?: number;
    completionAttemptCount: number;
    completionMaxAttempts: number;
    completionNextRetryAt?: string;
    experimentResultId?: string;
    failureKind?: "RETRY_EXHAUSTED" | "INFRASTRUCTURE" | "COMPLETION_PROCESSING";
    lastError?: string;
    createdAt: string;
    updatedAt: string;
}
export interface SearchRunRankingEntry {
    rank: number;
    searchRunId: string;
    leaderboardScopeId: string;
    candidateId: string;
    experimentResultId: string;
    scoreFormulaId: string;
    score: number;
}
export interface LoopStatus {
    searchRunId: string;
    state: "CREATED" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED" | "FAILED";
    activeCandidates: CandidateProgress[];
    queuedCount: number;
    runningCount: number;
    candidatesTested: number;
    failedCandidateCount: number;
    retryExhaustedCandidateCount: number;
    infrastructureFailureCandidateCount: number;
    completionProcessingFailureCandidateCount: number;
    failedAttemptCount: number;
    averageBacktestDurationMs: number;
    currentTopEntry?: SearchRunRankingEntry;
    createdAt: string;
    startedAt?: string;
    updatedAt: string;
    endedAt?: string;
    stopReason?: "MAX_CANDIDATES" | "MAX_DURATION" | "NO_IMPROVEMENT" | "USER_CANCELLED" | "ERROR";
    stopCondition: StopCondition;
    lastError?: string;
}
export interface SearchRun extends LoopStatus {
    ownerUserId: string;
    searchSpace: SearchSpaceConfig;
    generatorType: GeneratorType;
    leaderboardScopeId: string;
    maxInFlight: number;
    nextIteration: number;
    activeDurationMs: number;
    activeSince?: string;
    bestScore?: number;
    lastImprovementAtCandidates?: number;
}
export {};
