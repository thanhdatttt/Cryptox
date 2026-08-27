import type { SearchRunRankingEntry } from "@cryptox/leaderboard";

export const SEARCH_GENERATOR_TYPES = ["RANDOM"] as const;
export type GeneratorType = (typeof SEARCH_GENERATOR_TYPES)[number];

export interface GeneratedCandidate {
  strategyDefinitionIds: readonly string[];
  compositeDefinitionId?: string;
  generatedBy: GeneratorType;
}

export interface SearchSpaceConfig {
  availableStrategyDefinitionIds: readonly string[];
  maxComponents?: number;
}

type StopConditionFields = {
  maxCandidates?: number;
  maxDurationSeconds?: number;
  noImprovementAfterIterations?: number;
};

export type StopCondition =
  | (StopConditionFields & { maxCandidates: number })
  | (StopConditionFields & { maxDurationSeconds: number })
  | (StopConditionFields & { noImprovementAfterIterations: number });

export interface StrategyGenerator {
  readonly type: GeneratorType;
  generate(searchSpace: SearchSpaceConfig): GeneratedCandidate;
}

export type SearchRunState = "CREATED" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED" | "FAILED";
export type SearchRunStopReason =
  | "MAX_CANDIDATES"
  | "MAX_DURATION"
  | "NO_IMPROVEMENT"
  | "USER_CANCELLED"
  | "ERROR";

export interface SearchRunStatus {
  searchRunId: string;
  generatorType: GeneratorType;
  searchSpace: SearchSpaceConfig;
  stopCondition: StopCondition;
  leaderboardScopeId: string;
  maxInFlight: number;
  state: SearchRunState;
  activeCandidateIds: readonly string[];
  submittedCandidateCount: number;
  completedCandidateCount: number;
  failedCandidateCount: number;
  averageBacktestDurationMs: number | null;
  currentTopLeaderboardEntryId?: string;
  createdAt: string;
  startedAt?: string;
  updatedAt: string;
  endedAt?: string;
  stopReason?: SearchRunStopReason;
  lastError?: string;
}

export interface StartSearchCommand {
  searchSpace: SearchSpaceConfig;
  stopCondition: StopCondition;
  generatorType: GeneratorType;
  leaderboardScopeId: string;
  maxInFlight: number;
}

export interface SearchModulePublicApi {
  start(command: StartSearchCommand): Promise<{ searchRunId: string }>;
  pause(searchRunId: string): Promise<void>;
  resume(searchRunId: string): Promise<void>;
  cancel(searchRunId: string): Promise<void>;
  status(searchRunId: string): Promise<SearchRunStatus>;
  leaderboard(searchRunId: string): Promise<readonly SearchRunRankingEntry[]>;
}
