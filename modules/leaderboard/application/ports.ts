import type { EvaluationMetrics } from "@cryptox/evaluation";
import type { AuthenticatedUserId } from "modules/auth/api";

export interface LeaderboardScope {
  id: string;
  ownerUserId: AuthenticatedUserId;
  name: string;
  k: number;
  rankingConfigurationId: string;
  comparisonKey: string;
  createdAt: string;
}

export interface CreateLeaderboardScopeCommand {
  name: string;
  k?: number;
  rankingConfigurationId: string;
  comparisonKey: string;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  candidateId: string;
  searchRunId?: string;
  experimentId: string;
  leaderboardScopeId: string;
  rankingConfigurationId: string;
  score: number;
  addedAt: string;
}

export interface SearchRunRankingEntry {
  rank: number;
  searchRunId: string;
  leaderboardScopeId: string;
  candidateId: string;
  experimentId: string;
  rankingConfigurationId: string;
  score: number;
}

export interface RankableExperiment {
  executionState: "SUCCEEDED";
  experimentId: string;
  candidateId: string;
  searchRunId?: string;
  metrics: EvaluationMetrics;
  /** Read-only provenance reference; ranking must not alter execution provenance. */
  extensionProvenance?: {
    searchProfileId?: string;
    paperExecutionProfileId?: string;
    newsExtractionTemplateVersion?: number;
  };
}

export interface LeaderboardSubmissionResult {
  admitted: boolean;
  entry?: LeaderboardEntry;
  evictedExperimentId?: string;
}

export interface LeaderboardSubmission {
  leaderboardScopeId: string;
  experiment: RankableExperiment;
}

export interface LeaderboardScopeRepository<TScope, TCreateCommand> {
  insert(ownerUserId: AuthenticatedUserId, command: TCreateCommand): Promise<TScope>;
  getByOwnerAndId(
    ownerUserId: AuthenticatedUserId,
    id: string,
  ): Promise<TScope | undefined>;
}

export interface RankingConfigurationRepository<TConfiguration> {
  getById(id: string): Promise<TConfiguration | undefined>;
  listAll(): Promise<readonly TConfiguration[]>;
}

export interface LeaderboardEntryRepository<TEntry extends object> {
  getActiveTopK(
    ownerUserId: AuthenticatedUserId,
    scopeId: string,
    k: number,
  ): Promise<readonly TEntry[]>;
  listByOwnerAndSearchRun(
    ownerUserId: AuthenticatedUserId,
    searchRunId: string,
  ): Promise<readonly TEntry[]>;
  insertForScopeOwner(
    ownerUserId: AuthenticatedUserId,
    entry: Omit<TEntry, "id" | "rank">,
  ): Promise<TEntry>;
  deactivateForScopeOwner(ownerUserId: AuthenticatedUserId, entryId: string): Promise<void>;
  /** Optional lookup used to make resubmission idempotent after eviction. */
  findByScopeOwnerAndExperiment?(
    ownerUserId: AuthenticatedUserId,
    scopeId: string,
    experimentId: string,
  ): Promise<TEntry | undefined>;
}

/**
 * Leaderboard does not own Experiment persistence.  This read port lets the
 * completion boundary prove owner, candidate, and successful completion before
 * a result is admitted without importing Backtesting internals.
 */
export interface LeaderboardExperimentRepository {
  getByOwnerAndId(
    ownerUserId: AuthenticatedUserId,
    experimentId: string,
  ): Promise<RankableExperiment | undefined>;
  listByOwnerAndSearchRun(
    ownerUserId: AuthenticatedUserId,
    searchRunId: string,
  ): Promise<readonly RankableExperiment[]>;
}

export interface Clock {
  now(): string;
}

export interface LeaderboardApplicationDependencies<
  TScope,
  TCreateCommand,
  TEntry extends object,
  TConfiguration,
> {
  scopeRepository: LeaderboardScopeRepository<TScope, TCreateCommand>;
  entryRepository: LeaderboardEntryRepository<TEntry>;
  configurationRepository: RankingConfigurationRepository<TConfiguration>;
  clock: Clock;
  experimentRepository?: LeaderboardExperimentRepository;
  idGenerator?: () => string;
  initialize?: () => Promise<void>;
}

export interface ExtensionProvenanceReadPort {
  readExperimentExtensionProvenance(
    ownerUserId: AuthenticatedUserId,
    experimentId: string,
  ): Promise<{
    searchProfileId?: string;
    paperExecutionProfileId?: string;
    newsExtractionTemplateVersion?: number;
  } | undefined>;
}
