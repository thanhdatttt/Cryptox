import type { CompositeStrategyDefinition, StrategyDefinition, StrategyParameterDescriptor } from "modules/strategy/api";
export type GeneratorType = "RANDOM" | "DOMAIN_GUIDED" | "GENETIC";
export type StrategyCategory = "TREND" | "MOMENTUM" | "VOLATILITY" | "STRUCTURE" | "INFORMATION";
export interface SearchStrategyDefinition extends StrategyDefinition {
  category?: StrategyCategory;
  /** A snapshot of the public Strategy descriptor needed to generate valid drafts. */
  parameterDescriptors?: readonly StrategyParameterDescriptor[];
}
export interface CandidateLineage {
  parentFingerprints: string[];
  crossoverPoint: number;
  mutatedParameterKeys: string[];
  selectionMutation?: { replacedStrategyId?: string; replacementStrategyId?: string };
}
export interface GeneratedCandidate { strategyDefinitions: SearchStrategyDefinition[]; compositeDefinition: CompositeStrategyDefinition; executionPolicyIntent: { mode: "TWO_SIDED_ONE_X_V1"; stopLossPercent?: number; takeProfitPercent?: number }; generatedBy: GeneratorType; fingerprint: string; lineage?: CandidateLineage; }
export interface SearchSpaceConfig { availableStrategies: SearchStrategyDefinition[]; domainRules?: { requiredCategories?: StrategyCategory[]; allowedCategories?: StrategyCategory[]; forbiddenCategories?: StrategyCategory[] }; maxComponents?: number; generatedFingerprints?: string[]; }
export interface GeneratorContext { searchRunId: string; iterationNumber: number; }
export interface StrategyGenerator { readonly type: GeneratorType; generate(searchSpace: SearchSpaceConfig, context?: GeneratorContext): GeneratedCandidate; }
type StopConditionFields = { maxCandidates?: number; maxDurationSeconds?: number; noImprovementAfterIterations?: number };
export type StopCondition = (StopConditionFields & { maxCandidates: number }) | (StopConditionFields & { maxDurationSeconds: number }) | (StopConditionFields & { noImprovementAfterIterations: number });
export interface CandidateProgress { candidateId: string; origin: "MANUAL" | "SEARCH"; searchRunId?: string; iterationNumber?: number; generatedBy?: GeneratorType; fingerprint?: string; lineage?: CandidateLineage; leaderboardScopeId: string; status: string; attempts: unknown[]; maxAttempts: number; activeAttemptNumber?: number; completionAttemptCount: number; completionMaxAttempts: number; completionNextRetryAt?: string; experimentResultId?: string; failureKind?: "RETRY_EXHAUSTED" | "INFRASTRUCTURE" | "COMPLETION_PROCESSING"; lastError?: string; createdAt: string; updatedAt: string; }
export interface SearchRunRankingEntry { rank: number; searchRunId: string; leaderboardScopeId: string; candidateId: string; experimentResultId: string; scoreFormulaId: string; score: number; }
export interface LoopStatus { searchRunId: string; state: "CREATED" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED" | "FAILED"; activeCandidates: CandidateProgress[]; queuedCount: number; runningCount: number; candidatesTested: number; failedCandidateCount: number; retryExhaustedCandidateCount: number; infrastructureFailureCandidateCount: number; completionProcessingFailureCandidateCount: number; failedAttemptCount: number; averageBacktestDurationMs: number | null; currentTopEntry?: SearchRunRankingEntry; createdAt: string; startedAt?: string; updatedAt: string; endedAt?: string; stopReason?: "MAX_CANDIDATES" | "MAX_DURATION" | "NO_IMPROVEMENT" | "USER_CANCELLED" | "ERROR"; stopCondition: StopCondition; lastError?: string; }
export interface SearchRun extends LoopStatus { ownerUserId: string; searchSpace: SearchSpaceConfig; generatorType: GeneratorType; leaderboardScopeId: string; maxInFlight: number; nextIteration: number; activeDurationMs: number; activeSince?: string; bestScore?: number; lastImprovementAtCandidates?: number; }
export interface SearchRunSummary { searchRunId: string; state: SearchRun["state"]; generatorType: GeneratorType; leaderboardScopeId: string; maxInFlight: number; nextIteration: number; bestScore?: number; stopReason?: SearchRun["stopReason"]; createdAt: string; startedAt?: string; endedAt?: string; updatedAt: string; }
