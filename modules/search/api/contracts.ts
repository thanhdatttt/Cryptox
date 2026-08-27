import type { SearchRunRankingEntry } from "@cryptox/leaderboard";
import type { BacktestConfiguration, MarketInputSelection } from "@cryptox/backtesting";
import type { MajorityVoteProfileId } from "@cryptox/strategy";

export const SEARCH_GENERATOR_TYPES = ["RANDOM"] as const;
export type GeneratorType = (typeof SEARCH_GENERATOR_TYPES)[number];

export interface GeneratedCandidate {
  candidateKey: string;
  compositeLogicalFamilyKey: string;
  strategyDefinitionIds: readonly string[];
  combinationProfileId: MajorityVoteProfileId;
  generatedBy: GeneratorType;
}

export const SEARCH_CANDIDATE_IDENTITY_V1 = {
  id: "SEARCH_CANDIDATE_IDENTITY_V1",
  strategyDefinitionOrder: "ID_ASCENDING",
  candidateKeyEncoding: "JSON_ARRAY_OF_COMBINATION_PROFILE_AND_ORDERED_DEFINITION_IDS",
  compositeLogicalFamilyKey: "EQUAL_TO_CANDIDATE_KEY",
} as const;

export interface SearchSpaceConfig {
  availableStrategyDefinitionIds: readonly string[];
  componentCount: {
    minimum: number;
    maximum: number;
  };
  requireDistinctComponents: true;
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
  generate(request: CandidateGenerationRequest): GeneratedCandidate;
}

export interface CandidateGenerationRequest {
  searchSpace: SearchSpaceConfig;
  randomSeed: string;
  iterationNumber: number;
  previouslyGeneratedCandidateKeys: readonly string[];
}

export interface SearchCandidateTemplate {
  marketInput: MarketInputSelection;
  configuration: BacktestConfiguration;
}

export type SearchRunState =
  | "CREATED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";
export type SearchRunStopReason =
  | "MAX_CANDIDATES"
  | "MAX_DURATION"
  | "NO_IMPROVEMENT"
  | "SEARCH_SPACE_EXHAUSTED"
  | "USER_CANCELLED"
  | "ERROR";

export interface SearchRunStatus {
  searchRunId: string;
  generatorType: GeneratorType;
  randomSeed: string;
  searchSpace: SearchSpaceConfig;
  stopCondition: StopCondition;
  leaderboardScopeId: string;
  candidateTemplate: SearchCandidateTemplate;
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
  randomSeed: string;
  leaderboardScopeId: string;
  candidateTemplate: SearchCandidateTemplate;
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
