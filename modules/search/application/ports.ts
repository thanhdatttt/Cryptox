import type {
  BacktestConfiguration,
  BacktestingModulePublicApi,
  MarketInputSelection,
} from "@cryptox/backtesting";
import type {
  LeaderboardModulePublicApi,
  SearchRunRankingEntry,
} from "@cryptox/leaderboard";
import type { StrategyModulePublicApi } from "@cryptox/strategy";
import type {
  AuthenticatedRequestContext,
  AuthenticatedUserId,
} from "modules/auth/api";
import type {
  GeneratorType,
  SearchSpaceConfig,
  SeededDiscoveryProfileId,
} from "../domain/random-generator";

export interface SeededDiscoveryProvenance {
  profileId: SeededDiscoveryProfileId;
  algorithmConfiguration: Readonly<Record<string, number | string | boolean | readonly string[]>>;
  datasetIdentity: { datasetId?: string; datasetVersion?: string; provider?: string };
  code: { applicationVersion?: string; gitCommit?: string };
  seed: string;
  defaultBudget: { maxCandidates: 500; maxDurationSeconds: 300 };
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

export interface SearchApplicationApi {
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

export interface SearchRunRepository<TSearchRun> {
  getByOwnerAndId(
    ownerUserId: AuthenticatedUserId,
    id: string,
  ): Promise<TSearchRun | undefined>;
  save(ownerUserId: AuthenticatedUserId, searchRun: TSearchRun): Promise<TSearchRun>;
  listByOwner(
    ownerUserId: AuthenticatedUserId,
    page: { limit: number; cursor?: string },
  ): Promise<{ items: readonly TSearchRun[]; nextCursor?: string }>;
}

export interface StrategyGeneratorPort<TGenerationRequest, TCandidate> {
  generate(request: TGenerationRequest): TCandidate;
}

export interface SeededDiscoveryGeneratorPort<
  TGenerationRequest,
  TCandidate,
  TProfile extends SeededDiscoveryProfileId = SeededDiscoveryProfileId,
> extends StrategyGeneratorPort<TGenerationRequest, TCandidate> {
  readonly profileId: TProfile;
}

export interface StrategyGeneratorRegistry<TGenerationRequest, TCandidate> {
  readonly RANDOM: StrategyGeneratorPort<TGenerationRequest, TCandidate>;
  /** Reserved typed seam; Q-02 supplies the implementation. */
  readonly DOMAIN_GUIDED?: SeededDiscoveryGeneratorPort<
    TGenerationRequest,
    TCandidate,
    "DOMAIN_GUIDED_V1"
  >;
  /** Reserved typed seam; Q-02 supplies the implementation. */
  readonly GENETIC?: SeededDiscoveryGeneratorPort<
    TGenerationRequest,
    TCandidate,
    "GENETIC_V1"
  >;
}

export interface SearchApplicationDependencies<TSearchRun, TGenerationRequest, TCandidate> {
  searchRunRepository: SearchRunRepository<TSearchRun>;
  generators: StrategyGeneratorRegistry<TGenerationRequest, TCandidate>;
  strategy: Pick<StrategyModulePublicApi, "defineComposite">;
  backtesting: Pick<
    BacktestingModulePublicApi,
    | "submitSearchCandidate"
    | "status"
    | "summarizeSearchCandidates"
    | "cancelSearchCandidates"
  >;
  leaderboard: Pick<LeaderboardModulePublicApi, "getLeaderboardScope" | "rankSearchRun">;
}
