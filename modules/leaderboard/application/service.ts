import type { EvaluationMetrics } from "@cryptox/evaluation";
import type { AuthenticatedRequestContext, AuthenticatedUserId } from "modules/auth/api";
import {
  assertFiniteMetrics,
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
  extensionProvenance?: NonNullable<RankableExperiment["extensionProvenance"]>;
};

type RuntimeRankableExperiment = RankableExperiment & {
  readonly ownerUserId?: unknown;
};

type ExtensionProvenance = NonNullable<RankableExperiment["extensionProvenance"]>;

const EXTENSION_PROVENANCE_FIELDS = new Set([
  "searchProfileId",
  "paperExecutionProfileId",
  "newsExtractionTemplateVersion",
]);

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

function requiredIdentifier(value: unknown, code: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value !== value.trim()) {
    throw new LeaderboardApplicationError(code);
  }
  return value;
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
    tieBreakers: configuration.tieBreakers.map((tieBreaker) => ({ ...tieBreaker })) as unknown as RankingConfiguration["tieBreakers"],
  };
}

function cloneExtensionProvenance(
  provenance: ExtensionProvenance | undefined,
): ExtensionProvenance | undefined {
  return provenance === undefined ? undefined : { ...provenance };
}

function extensionProvenanceMatch(
  authoritative: ExtensionProvenance | undefined,
  supplied: ExtensionProvenance | undefined,
): boolean {
  // The submission projection keeps extension provenance optional. When it is
  // omitted, the owner-scoped Experiment read remains authoritative; when it
  // is supplied, it must agree with that read-through value.
  if (supplied === undefined) return true;
  return (
    authoritative?.searchProfileId === supplied.searchProfileId &&
    authoritative?.paperExecutionProfileId === supplied.paperExecutionProfileId &&
    authoritative?.newsExtractionTemplateVersion === supplied.newsExtractionTemplateVersion
  );
}

function optionalIdentifierMatches(
  authoritative: string | undefined,
  supplied: string | undefined,
): boolean {
  return supplied === undefined || authoritative === supplied;
}

function factsKey(
  ownerUserId: AuthenticatedUserId,
  scopeId: string,
  experimentId: string,
): string {
  return ownerUserId + "\u0000" + scopeId + "\u0000" + experimentId;
}

function validateExtensionProvenance(value: unknown): ExtensionProvenance | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new LeaderboardApplicationError("INELIGIBLE_EXPERIMENT", "extension provenance must be an object");
  }

  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((field) => !EXTENSION_PROVENANCE_FIELDS.has(field))) {
    throw new LeaderboardApplicationError("INELIGIBLE_EXPERIMENT", "extension provenance contains an unsupported field");
  }

  const searchProfileId = record.searchProfileId;
  if (
    searchProfileId !== undefined &&
    (typeof searchProfileId !== "string" ||
      searchProfileId.trim().length === 0 ||
      searchProfileId !== searchProfileId.trim())
  ) {
    throw new LeaderboardApplicationError("INELIGIBLE_EXPERIMENT", "search profile provenance is invalid");
  }

  const paperExecutionProfileId = record.paperExecutionProfileId;
  if (
    paperExecutionProfileId !== undefined &&
    (typeof paperExecutionProfileId !== "string" ||
      paperExecutionProfileId.trim().length === 0 ||
      paperExecutionProfileId !== paperExecutionProfileId.trim())
  ) {
    throw new LeaderboardApplicationError("INELIGIBLE_EXPERIMENT", "paper execution provenance is invalid");
  }

  const newsExtractionTemplateVersion = record.newsExtractionTemplateVersion;
  if (
    newsExtractionTemplateVersion !== undefined &&
    (typeof newsExtractionTemplateVersion !== "number" ||
      !Number.isSafeInteger(newsExtractionTemplateVersion) ||
      newsExtractionTemplateVersion < 1)
  ) {
    throw new LeaderboardApplicationError("INELIGIBLE_EXPERIMENT", "news extraction provenance is invalid");
  }

  if (
    searchProfileId === undefined &&
    paperExecutionProfileId === undefined &&
    newsExtractionTemplateVersion === undefined
  ) {
    return undefined;
  }

  return {
    ...(searchProfileId === undefined ? {} : { searchProfileId }),
    ...(paperExecutionProfileId === undefined ? {} : { paperExecutionProfileId }),
    ...(newsExtractionTemplateVersion === undefined ? {} : { newsExtractionTemplateVersion }),
  };
}

function normalizeRankableExperiment(value: unknown): RuntimeRankableExperiment {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new LeaderboardApplicationError("INELIGIBLE_EXPERIMENT");
  }

  const record = value as Record<string, unknown>;
  const experimentId = requiredIdentifier(record.experimentId, "INELIGIBLE_EXPERIMENT");
  const candidateId = requiredIdentifier(record.candidateId, "INELIGIBLE_EXPERIMENT");
  if (record.executionState !== LINEAR_REQUIRED_V1.eligibility.requiredExecutionState) {
    throw new LeaderboardApplicationError("INELIGIBLE_EXPERIMENT");
  }

  const metrics = record.metrics;
  if (metrics === null || typeof metrics !== "object" || Array.isArray(metrics)) {
    throw new LeaderboardApplicationError("INELIGIBLE_EXPERIMENT");
  }
  const metricRecord = metrics as Record<string, unknown>;
  if (metricRecord.candidateId !== candidateId) {
    throw new LeaderboardApplicationError("INELIGIBLE_EXPERIMENT");
  }

  const searchRunId = record.searchRunId;
  if (searchRunId !== undefined) {
    requiredIdentifier(searchRunId, "INELIGIBLE_EXPERIMENT");
  }

  const suppliedOwnerUserId = record.ownerUserId;
  if (suppliedOwnerUserId !== undefined && (typeof suppliedOwnerUserId !== "string" || suppliedOwnerUserId.trim().length === 0)) {
    throw new LeaderboardApplicationError("INELIGIBLE_EXPERIMENT");
  }

  const extensionProvenance = validateExtensionProvenance(record.extensionProvenance);
  const normalizedMetrics = {
    candidateId,
    totalReturnPercent: metricRecord.totalReturnPercent,
    winRatePercent: metricRecord.winRatePercent,
    numberOfTrades: metricRecord.numberOfTrades,
    maxDrawdownMagnitudePercent: metricRecord.maxDrawdownMagnitudePercent,
    evaluationProfileId: metricRecord.evaluationProfileId,
  } as EvaluationMetrics;

  return {
    executionState: "SUCCEEDED",
    experimentId,
    candidateId,
    ...(searchRunId === undefined ? {} : { searchRunId: searchRunId as string }),
    metrics: normalizedMetrics,
    ...(extensionProvenance === undefined ? {} : { extensionProvenance }),
    ...(suppliedOwnerUserId === undefined ? {} : { ownerUserId: suppliedOwnerUserId }),
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
  ownerUserId: AuthenticatedUserId,
): number {
  const leftFacts = facts.get(factsKey(ownerUserId, left.leaderboardScopeId, left.experimentId));
  const rightFacts = facts.get(factsKey(ownerUserId, right.leaderboardScopeId, right.experimentId));
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
    (left.experimentId < right.experimentId ? -1 : left.experimentId > right.experimentId ? 1 : 0)
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
  ownerUserId: AuthenticatedUserId,
): LeaderboardEntry[] {
  return uniqueEntries(entries)
    .sort((left, right) => compareEntries(left, right, facts, ownerUserId))
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
    ...(experiment.extensionProvenance === undefined
      ? {}
      : { extensionProvenance: cloneExtensionProvenance(experiment.extensionProvenance) }),
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
    const scope = cached?.ownerUserId === ownerUserId
      ? cached
      : await dependencies.scopeRepository.getByOwnerAndId(ownerUserId, scopeId);
    if (!scope) throw new LeaderboardApplicationError("NOT_FOUND");
    if (
      scope.id !== scopeId ||
      scope.ownerUserId !== ownerUserId ||
      typeof scope.name !== "string" ||
      scope.name.trim().length === 0 ||
      !Number.isInteger(scope.k) ||
      scope.k < 1 ||
      typeof scope.rankingConfigurationId !== "string" ||
      scope.rankingConfigurationId.trim().length === 0 ||
      typeof scope.comparisonKey !== "string" ||
      scope.comparisonKey.trim().length === 0
    ) {
      throw new LeaderboardApplicationError("INVALID_SCOPE");
    }
    const stored = cloneScope(scope);
    scopes.set(scope.id, stored);
    return cloneScope(stored);
  };

  const readConfiguration = async (configurationId: string): Promise<RankingConfiguration> => {
    await ensureInitialized();
    const cached = configurations.get(configurationId);
    if (cached) return cloneConfiguration(cached);
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
    return cloneConfiguration(stored);
  };

  const hydrateFacts = async (
    ownerUserId: AuthenticatedUserId,
    entries: readonly LeaderboardEntry[],
  ): Promise<LeaderboardEntry[]> => {
    if (!dependencies.experimentRepository) return entries.map(cloneEntry);
    const hydrated = await Promise.all(
      entries.map(async (entry): Promise<LeaderboardEntry | undefined> => {
        const key = factsKey(ownerUserId, entry.leaderboardScopeId, entry.experimentId);
        if (facts.has(key)) return cloneEntry(entry);
        const experiment = await dependencies.experimentRepository!.getByOwnerAndId(
          ownerUserId,
          entry.experimentId,
        );
        if (!experiment) return undefined;

        let normalized: RuntimeRankableExperiment;
        try {
          normalized = normalizeRankableExperiment(experiment);
          assertFiniteMetrics(normalized.metrics);
        } catch {
          return undefined;
        }
        if (
          normalized.candidateId !== entry.candidateId ||
          normalized.searchRunId !== entry.searchRunId ||
          normalized.metrics.numberOfTrades < LINEAR_REQUIRED_V1.eligibility.minimumNumberOfTrades
        ) {
          return undefined;
        }
        facts.set(key, factsForExperiment(ownerUserId, normalized, entry.score));
        return cloneEntry(entry);
      }),
    );
    return hydrated.filter((entry): entry is LeaderboardEntry => entry !== undefined);
  };

  const assertAdmissibleExperiment = async (
    ownerUserId: AuthenticatedUserId,
    submission: LeaderboardSubmission,
  ): Promise<RuntimeRankableExperiment> => {
    if (!submission || typeof submission !== "object" || Array.isArray(submission)) {
      throw new LeaderboardApplicationError("INELIGIBLE_EXPERIMENT");
    }
    const experiment = normalizeRankableExperiment(submission.experiment);
    if (experiment.ownerUserId !== undefined && experiment.ownerUserId !== ownerUserId) {
      throw new LeaderboardApplicationError("NOT_FOUND");
    }

    try {
      assertFiniteMetrics(experiment.metrics);
    } catch (error) {
      if (error instanceof LeaderboardScoringDomainError) {
        throw new LeaderboardApplicationError(error.code, error.message);
      }
      throw error;
    }

    const persisted = await dependencies.experimentRepository?.getByOwnerAndId(
      ownerUserId,
      experiment.experimentId,
    );
    if (!dependencies.experimentRepository) {
      throw new LeaderboardApplicationError("EXPERIMENT_OWNERSHIP_UNVERIFIED");
    }
    if (!persisted) throw new LeaderboardApplicationError("NOT_FOUND");

    let authoritative: RuntimeRankableExperiment;
    try {
      authoritative = normalizeRankableExperiment(persisted);
      assertFiniteMetrics(authoritative.metrics);
    } catch (error) {
      if (error instanceof LeaderboardApplicationError && error.code === "INELIGIBLE_EXPERIMENT") {
        throw error;
      }
      if (error instanceof LeaderboardScoringDomainError) {
        throw new LeaderboardApplicationError(error.code, error.message);
      }
      throw error;
    }
    if (
      authoritative.candidateId !== experiment.candidateId ||
      !optionalIdentifierMatches(authoritative.searchRunId, experiment.searchRunId) ||
      !metricsMatch(authoritative.metrics, experiment.metrics) ||
      !extensionProvenanceMatch(authoritative.extensionProvenance, experiment.extensionProvenance)
    ) {
      throw new LeaderboardApplicationError("NOT_FOUND");
    }
    return authoritative;
  };

  const getActiveEntries = async (
    ownerUserId: AuthenticatedUserId,
    scope: LeaderboardScope,
  ): Promise<LeaderboardEntry[]> => {
    const entries = await dependencies.entryRepository.getActiveTopK(ownerUserId, scope.id, scope.k);
    return rankEntries(await hydrateFacts(ownerUserId, entries), facts, ownerUserId).slice(0, scope.k);
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
        const stored = cloneConfiguration(configuration);
        configurations.set(configuration.id, stored);
        return cloneConfiguration(stored);
      })
      .sort((left, right) =>
        left.version - right.version || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
      )
      .map(cloneConfiguration);
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
    const hydratedEntries = await hydrateFacts(ownerUserId, ownerEntries);
    return rankEntries(hydratedEntries, facts, ownerUserId).map((entry) => ({
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
      const factKey = factsKey(ownerUserId, scope.id, experiment.experimentId);
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
      const ordered = rankEntries(
        [...activeEntries, { ...candidate, id: "__candidate__", rank: 0 }],
        facts,
        ownerUserId,
      );
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
