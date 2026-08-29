import type { EvaluationMetrics } from "@cryptox/evaluation";
import type { AuthenticatedRequestContext, AuthenticatedUserId } from "modules/auth/api";
import {
  assertRankingConfiguration,
  LeaderboardScoringDomainError,
  scoreEvaluation,
} from "../domain/ranking";
import {
  LINEAR_REQUIRED_V1,
  type CreateLeaderboardScopeCommand,
  type LeaderboardEntry,
  type LeaderboardModulePublicApi,
  type LeaderboardScope,
  type LeaderboardSubmission,
  type LeaderboardSubmissionResult,
  type RankableExperiment,
  type RankingConfiguration,
  type ScoredEvaluation,
  type SearchRunRankingEntry,
} from "../api/contracts";
import type {
  LeaderboardApplicationDependencies,
} from "./ports";

export class LeaderboardApplicationError extends Error {
  public readonly name = "LeaderboardApplicationError";

  public constructor(public readonly code: string, message = code) {
    super(message);
  }
}

type Dependencies = LeaderboardApplicationDependencies<
  LeaderboardScope,
  CreateLeaderboardScopeCommand,
  LeaderboardEntry,
  RankingConfiguration
>;

type RankingFacts = {
  ownerUserId: AuthenticatedUserId;
  experimentId: string;
  candidateId: string;
  searchRunId?: string;
  score: number;
  metrics: EvaluationMetrics;
};

type RuntimeRankableExperiment = RankableExperiment & {
  readonly ownerUserId?: AuthenticatedUserId;
};

function requireContext(context: AuthenticatedRequestContext): AuthenticatedUserId {
  if (
    !context ||
    typeof context.authenticatedUserId !== "string" ||
    context.authenticatedUserId.trim().length === 0
  ) {
    throw new LeaderboardApplicationError("UNAUTHENTICATED");
  }
  return context.authenticatedUserId;
}

function requiredString(value: unknown, code: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new LeaderboardApplicationError(code);
  }
  return value.trim();
}

function validateK(k: unknown): number {
  if (k === undefined) return LINEAR_REQUIRED_V1.defaultTopK;
  if (typeof k !== "number" || !Number.isInteger(k) || k < 1) {
    throw new LeaderboardApplicationError("INVALID_TOP_K");
  }
  return k;
}

function cloneScope(scope: LeaderboardScope): LeaderboardScope {
  return { ...scope };
}

function cloneEntry(entry: LeaderboardEntry): LeaderboardEntry {
  return { ...entry };
}

function cloneConfiguration(configuration: RankingConfiguration): RankingConfiguration {
  return {
    ...configuration,
    formula: { ...configuration.formula },
    tieBreakers: [...configuration.tieBreakers] as RankingConfiguration["tieBreakers"],
  };
}

function metricsMatch(left: EvaluationMetrics, right: EvaluationMetrics): boolean {
  return (
    left.candidateId === right.candidateId &&
    left.totalReturnPercent === right.totalReturnPercent &&
    left.winRatePercent === right.winRatePercent &&
    left.numberOfTrades === right.numberOfTrades &&
    left.maxDrawdownMagnitudePercent === right.maxDrawdownMagnitudePercent &&
    left.evaluationProfileId === right.evaluationProfileId
  );
}

function compareMetric(
  left: number | undefined,
  right: number | undefined,
  direction: "ASCENDING" | "DESCENDING",
): number {
  if (left === undefined && right === undefined) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  if (left === right) return 0;
  const comparison = left < right ? -1 : 1;
  return direction === "ASCENDING" ? comparison : -comparison;
}

function compareEntries(
  left: LeaderboardEntry,
  right: LeaderboardEntry,
  facts: Map<string, RankingFacts>,
): number {
  const leftFacts = facts.get(left.leaderboardScopeId + "\u0000" + left.experimentId);
  const rightFacts = facts.get(right.leaderboardScopeId + "\u0000" + right.experimentId);
  return (
    compareMetric(left.score, right.score, "DESCENDING") ||
    compareMetric(
      leftFacts?.metrics.totalReturnPercent,
      rightFacts?.metrics.totalReturnPercent,
      "DESCENDING",
    ) ||
    compareMetric(
      leftFacts?.metrics.maxDrawdownMagnitudePercent,
      rightFacts?.metrics.maxDrawdownMagnitudePercent,
      "ASCENDING",
    ) ||
    compareMetric(leftFacts?.metrics.winRatePercent, rightFacts?.metrics.winRatePercent, "DESCENDING") ||
    left.experimentId.localeCompare(right.experimentId)
  );
}

function uniqueEntries(entries: readonly LeaderboardEntry[]): LeaderboardEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = entry.leaderboardScopeId + "\u0000" + entry.experimentId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(cloneEntry);
}

function rankEntries(
  entries: readonly LeaderboardEntry[],
  facts: Map<string, RankingFacts>,
): LeaderboardEntry[] {
  return uniqueEntries(entries)
    .sort((left, right) => compareEntries(left, right, facts))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function factsForExperiment(
  ownerUserId: AuthenticatedUserId,
  experiment: RankableExperiment,
  score: number,
): RankingFacts {
  return {
    ownerUserId,
    experimentId: experiment.experimentId,
    candidateId: experiment.candidateId,
    ...(experiment.searchRunId === undefined ? {} : { searchRunId: experiment.searchRunId }),
    score,
    metrics: { ...experiment.metrics },
  };
}

export function createLeaderboardApplication(
  dependencies: Dependencies,
): LeaderboardModulePublicApi {
  const scopes = new Map<string, LeaderboardScope>();
  const configurations = new Map<string, RankingConfiguration>();
  const facts = new Map<string, RankingFacts>();
  const scopeLocks = new Map<string, Promise<unknown>>();
  let initialization: Promise<void> | undefined;

  const ensureInitialized = async (): Promise<void> => {
    if (!dependencies.initialize) return;
    initialization ??= dependencies.initialize();
    await initialization;
  };

  const withScopeLock = async <T>(scopeId: string, operation: () => Promise<T>): Promise<T> => {
    const previous = scopeLocks.get(scopeId) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    scopeLocks.set(scopeId, current);
    try {
      return await current;
    } finally {
      if (scopeLocks.get(scopeId) === current) scopeLocks.delete(scopeId);
    }
  };

  const readScope = async (
    ownerUserId: AuthenticatedUserId,
    scopeId: string,
  ): Promise<LeaderboardScope> => {
    const cached = scopes.get(scopeId);
    if (cached && cached.ownerUserId === ownerUserId) return cloneScope(cached);
    const scope = await dependencies.scopeRepository.getByOwnerAndId(ownerUserId, scopeId);
    if (!scope) throw new LeaderboardApplicationError("NOT_FOUND");
    scopes.set(scope.id, cloneScope(scope));
    return cloneScope(scope);
  };

  const readConfiguration = async (configurationId: string): Promise<RankingConfiguration> => {
    await ensureInitialized();
    const cached = configurations.get(configurationId);
    if (cached) return cached;
    const configuration = await dependencies.configurationRepository.getById(configurationId);
    if (!configuration) throw new LeaderboardApplicationError("RANKING_CONFIGURATION_NOT_FOUND");
    try {
      assertRankingConfiguration(configuration);
    } catch (error) {
      if (error instanceof LeaderboardScoringDomainError) {
        throw new LeaderboardApplicationError(error.code, error.message);
      }
      throw error;
    }
    const stored = cloneConfiguration(configuration);
    configurations.set(configurationId, stored);
    return stored;
  };

  const hydrateFacts = async (
    ownerUserId: AuthenticatedUserId,
    entries: readonly LeaderboardEntry[],
  ): Promise<void> => {
    if (!dependencies.experimentRepository) return;
    await Promise.all(
      entries.map(async (entry) => {
        const key = entry.leaderboardScopeId + "\u0000" + entry.experimentId;
        if (facts.has(key)) return;
        const experiment = await dependencies.experimentRepository!.getByOwnerAndId(
          ownerUserId,
          entry.experimentId,
        );
        if (!experiment || experiment.candidateId !== entry.candidateId) return;
        facts.set(key, factsForExperiment(ownerUserId, experiment, entry.score));
      }),
    );
  };

  const assertAdmissibleExperiment = async (
    ownerUserId: AuthenticatedUserId,
    submission: LeaderboardSubmission,
  ): Promise<RuntimeRankableExperiment> => {
    const experiment = submission.experiment as RuntimeRankableExperiment;
    if (
      !experiment ||
      typeof experiment !== "object" ||
      experiment.executionState !== LINEAR_REQUIRED_V1.eligibility.requiredExecutionState ||
      typeof experiment.experimentId !== "string" ||
      experiment.experimentId.trim().length === 0 ||
      typeof experiment.candidateId !== "string" ||
      experiment.candidateId.trim().length === 0 ||
      !experiment.metrics ||
      typeof experiment.metrics !== "object" ||
      experiment.metrics.candidateId !== experiment.candidateId
    ) {
      throw new LeaderboardApplicationError("INELIGIBLE_EXPERIMENT");
    }

    if (experiment.ownerUserId !== undefined && experiment.ownerUserId !== ownerUserId) {
      throw new LeaderboardApplicationError("NOT_FOUND");
    }

    const persisted = await dependencies.experimentRepository?.getByOwnerAndId(
      ownerUserId,
      experiment.experimentId,
    );
    if (
      dependencies.experimentRepository &&
      (!persisted ||
        persisted.executionState !== "SUCCEEDED" ||
        persisted.candidateId !== experiment.candidateId ||
        !metricsMatch(persisted.metrics, experiment.metrics))
    ) {
      throw new LeaderboardApplicationError("NOT_FOUND");
    }
    if (!dependencies.experimentRepository && experiment.ownerUserId === undefined) {
      throw new LeaderboardApplicationError("EXPERIMENT_OWNERSHIP_UNVERIFIED");
    }
    return experiment;
  };

  const getActiveEntries = async (
    ownerUserId: AuthenticatedUserId,
    scope: LeaderboardScope,
  ): Promise<LeaderboardEntry[]> => {
    const entries = await dependencies.entryRepository.getActiveTopK(ownerUserId, scope.id, scope.k);
    await hydrateFacts(ownerUserId, entries);
    return rankEntries(entries, facts);
  };

  const score = (leaderboardScopeId: string, metrics: EvaluationMetrics): ScoredEvaluation => {
    const scope = scopes.get(leaderboardScopeId);
    if (!scope) throw new LeaderboardApplicationError("SCOPE_NOT_FOUND");
    const configuration = configurations.get(scope.rankingConfigurationId);
    if (!configuration) throw new LeaderboardApplicationError("RANKING_CONFIGURATION_NOT_FOUND");
    try {
      return scoreEvaluation(leaderboardScopeId, configuration, metrics);
    } catch (error) {
      if (error instanceof LeaderboardScoringDomainError) {
        throw new LeaderboardApplicationError(error.code, error.message);
      }
      throw error;
    }
  };

  const createLeaderboardScope = async (
    context: AuthenticatedRequestContext,
    command: CreateLeaderboardScopeCommand,
  ): Promise<LeaderboardScope> => {
    const ownerUserId = requireContext(context);
    const name = requiredString(command?.name, "INVALID_SCOPE");
    const comparisonKey = requiredString(command?.comparisonKey, "INVALID_COMPARISON_KEY");
    const k = validateK(command?.k);
    const rankingConfigurationId = requiredString(
      command?.rankingConfigurationId,
      "INVALID_RANKING_CONFIGURATION",
    );
    await readConfiguration(rankingConfigurationId);
    const scope = await dependencies.scopeRepository.insert(ownerUserId, {
      name,
      k,
      rankingConfigurationId,
      comparisonKey,
    });
    if (scope.ownerUserId !== ownerUserId) {
      throw new LeaderboardApplicationError("OWNER_MISMATCH");
    }
    scopes.set(scope.id, cloneScope(scope));
    return cloneScope(scope);
  };

  const getLeaderboardScope = async (
    context: AuthenticatedRequestContext,
    id: string,
  ): Promise<LeaderboardScope> => {
    const ownerUserId = requireContext(context);
    return readScope(ownerUserId, requiredString(id, "INVALID_SCOPE"));
  };

  const getRankingConfiguration = async (id: string): Promise<RankingConfiguration> => {
    const configuration = await readConfiguration(
      requiredString(id, "INVALID_RANKING_CONFIGURATION"),
    );
    return cloneConfiguration(configuration);
  };

  const listRankingConfigurations = async (): Promise<readonly RankingConfiguration[]> => {
    await ensureInitialized();
    const list = await dependencies.configurationRepository.listAll();
    return list
      .map((configuration) => {
        assertRankingConfiguration(configuration);
        configurations.set(configuration.id, cloneConfiguration(configuration));
        return configuration;
      })
      .sort((left, right) => left.version - right.version || left.id.localeCompare(right.id))
      .map((configuration) => ({
        ...configuration,
        formula: { ...configuration.formula },
        tieBreakers: [...configuration.tieBreakers] as RankingConfiguration["tieBreakers"],
      }));
  };

  const topK = async (
    context: AuthenticatedRequestContext,
    leaderboardScopeId: string,
  ): Promise<readonly LeaderboardEntry[]> => {
    const ownerUserId = requireContext(context);
    const scope = await readScope(ownerUserId, requiredString(leaderboardScopeId, "INVALID_SCOPE"));
    await readConfiguration(scope.rankingConfigurationId);
    return getActiveEntries(ownerUserId, scope);
  };

  const rankSearchRun = async (
    context: AuthenticatedRequestContext,
    searchRunId: string,
  ): Promise<readonly SearchRunRankingEntry[]> => {
    const ownerUserId = requireContext(context);
    const runId = requiredString(searchRunId, "INVALID_SEARCH_RUN");
    const entries = await dependencies.entryRepository.listByOwnerAndSearchRun(ownerUserId, runId);
    const ownerEntries: LeaderboardEntry[] = [];
    for (const entry of entries) {
      const scope = await readScope(ownerUserId, entry.leaderboardScopeId);
      if (scope.rankingConfigurationId !== entry.rankingConfigurationId) continue;
      await readConfiguration(scope.rankingConfigurationId);
      ownerEntries.push(entry);
    }
    await hydrateFacts(ownerUserId, ownerEntries);
    return rankEntries(ownerEntries, facts).map((entry) => ({
      rank: entry.rank,
      searchRunId: runId,
      leaderboardScopeId: entry.leaderboardScopeId,
      candidateId: entry.candidateId,
      experimentId: entry.experimentId,
      rankingConfigurationId: entry.rankingConfigurationId,
      score: entry.score,
    }));
  };

  const submit = async (
    context: AuthenticatedRequestContext,
    submission: LeaderboardSubmission,
  ): Promise<LeaderboardSubmissionResult> => {
    const ownerUserId = requireContext(context);
    const scopeId = requiredString(submission?.leaderboardScopeId, "INVALID_SCOPE");
    return withScopeLock(scopeId, async () => {
      const scope = await readScope(ownerUserId, scopeId);
      const configuration = await readConfiguration(scope.rankingConfigurationId);
      const experiment = await assertAdmissibleExperiment(ownerUserId, submission);
      let scored: ScoredEvaluation;
      try {
        scored = scoreEvaluation(scope.id, configuration, experiment.metrics);
      } catch (error) {
        if (error instanceof LeaderboardScoringDomainError) {
          throw new LeaderboardApplicationError(error.code, error.message);
        }
        throw error;
      }
      const factKey = scope.id + "\u0000" + experiment.experimentId;
      facts.set(factKey, factsForExperiment(ownerUserId, experiment, scored.overallScore));
      if (!scored.rankEligible) return { admitted: false };

      const activeEntries = await getActiveEntries(ownerUserId, scope);
      const knownEntry = await dependencies.entryRepository.findByScopeOwnerAndExperiment?.(
        ownerUserId,
        scope.id,
        experiment.experimentId,
      );
      if (knownEntry) {
        const active = activeEntries.find((entry) => entry.id === knownEntry.id);
        return active
          ? { admitted: true, entry: cloneEntry(active) }
          : { admitted: false };
      }
      const activeExisting = activeEntries.find((entry) => entry.experimentId === experiment.experimentId);
      if (activeExisting) return { admitted: true, entry: cloneEntry(activeExisting) };

      const candidate: Omit<LeaderboardEntry, "id" | "rank"> = {
        candidateId: experiment.candidateId,
        ...(experiment.searchRunId === undefined ? {} : { searchRunId: experiment.searchRunId }),
        experimentId: experiment.experimentId,
        leaderboardScopeId: scope.id,
        rankingConfigurationId: configuration.id,
        score: scored.overallScore,
        addedAt: dependencies.clock.now(),
      };
      const ordered = rankEntries([...activeEntries, { ...candidate, id: "__candidate__", rank: 0 }], facts);
      if (ordered.length > scope.k && ordered[scope.k]?.id === "__candidate__") {
        return { admitted: false };
      }
      const retained = ordered.slice(0, scope.k);
      const evicted = activeEntries.find(
        (entry) => !retained.some((retainedEntry) => retainedEntry.id === entry.id),
      );
      const inserted = await dependencies.entryRepository.insertForScopeOwner(ownerUserId, candidate);
      if (evicted) await dependencies.entryRepository.deactivateForScopeOwner(ownerUserId, evicted.id);
      const after = await getActiveEntries(ownerUserId, scope);
      const entry = after.find((item) => item.id === inserted.id) ?? {
        ...inserted,
        rank: retained.findIndex((item) => item.id === "__candidate__") + 1,
      };
      return {
        admitted: true,
        entry: cloneEntry(entry),
        ...(evicted ? { evictedExperimentId: evicted.experimentId } : {}),
      };
    });
  };

  return {
    createLeaderboardScope,
    getLeaderboardScope,
    getRankingConfiguration,
    listRankingConfigurations,
    score,
    topK,
    rankSearchRun,
    submit,
  };
}
