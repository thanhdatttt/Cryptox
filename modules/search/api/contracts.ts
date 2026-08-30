import type { SearchRunRankingEntry } from "@cryptox/leaderboard";
import type { BacktestConfiguration, MarketInputSelection } from "@cryptox/backtesting";
import type { MajorityVoteProfileId } from "@cryptox/strategy";
import type {
  AuthenticatedRequestContext,
  AuthenticatedUserId,
} from "modules/auth/api";

export const SEARCH_GENERATOR_TYPES = ["RANDOM", "DOMAIN_GUIDED", "GENETIC"] as const;
export type GeneratorType = (typeof SEARCH_GENERATOR_TYPES)[number];
export const SEEDED_DISCOVERY_PROFILE_IDS = ["RANDOM_V1", "DOMAIN_GUIDED_V1", "GENETIC_V1"] as const;
export type SeededDiscoveryProfileId = (typeof SEEDED_DISCOVERY_PROFILE_IDS)[number];

export interface SeededDiscoveryProvenance {
  profileId: SeededDiscoveryProfileId;
  algorithmConfiguration: Readonly<Record<string, number | string | boolean | readonly string[]>>;
  datasetIdentity: { datasetId?: string; datasetVersion?: string; provider?: string };
  code: { applicationVersion?: string; gitCommit?: string };
  seed: string;
  defaultBudget: { maxCandidates: 500; maxDurationSeconds: 300 };
}

export const GENETIC_V1_DEFAULTS = {
  population: 50,
  maximumGenerations: 10,
  elitePercent: 0.1,
  mutationPercent: 0.2,
  candidateBudget: 500,
} as const;

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
  ownerUserId: AuthenticatedUserId;
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
  /** Additive DEC-007 provenance; absent for legacy RANDOM runs. */
  seededDiscovery?: SeededDiscoveryProvenance;
}

export interface StartSearchCommand {
  searchSpace: SearchSpaceConfig;
  stopCondition: StopCondition;
  generatorType: GeneratorType;
  randomSeed: string;
  leaderboardScopeId: string;
  candidateTemplate: SearchCandidateTemplate;
  maxInFlight: number;
  /** Optional bounded provenance supplied when a seeded profile is selected. */
  seededDiscovery?: SeededDiscoveryProvenance;
}

export interface SearchRunPageRequest {
  limit: number;
  cursor?: string;
}

export interface SearchRunPage {
  items: readonly SearchRunStatus[];
  nextCursor?: string;
}

export interface SearchModulePublicApi {
  start(
    context: AuthenticatedRequestContext,
    command: StartSearchCommand,
  ): Promise<{ searchRunId: string }>;
  pause(context: AuthenticatedRequestContext, searchRunId: string): Promise<void>;
  resume(context: AuthenticatedRequestContext, searchRunId: string): Promise<void>;
  cancel(context: AuthenticatedRequestContext, searchRunId: string): Promise<void>;
  status(context: AuthenticatedRequestContext, searchRunId: string): Promise<SearchRunStatus>;
  list(context: AuthenticatedRequestContext, page: SearchRunPageRequest): Promise<SearchRunPage>;
  leaderboard(
    context: AuthenticatedRequestContext,
    searchRunId: string,
  ): Promise<readonly SearchRunRankingEntry[]>;
}
