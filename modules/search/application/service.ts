import type {
  BacktestSubmissionAccepted,
  CandidateProgress,
  SubmitSearchCandidateCommand,
} from "@cryptox/backtesting";
import type { SearchRunRankingEntry } from "@cryptox/leaderboard";
import type {
  AuthenticatedRequestContext,
  AuthenticatedUserId,
} from "modules/auth/api";
import type {
  CandidateGenerationRequest,
  GeneratorType,
  GeneratedCandidate,
  SearchCandidateTemplate,
  SearchModulePublicApi,
  SearchRunPage,
  SearchRunPageRequest,
  SearchRunState,
  SearchRunStatus,
  SearchRunStopReason,
  SearchSpaceConfig,
  SeededDiscoveryProvenance,
  StartSearchCommand,
  StopCondition,
} from "../api/contracts";
import { GENETIC_V1_DEFAULTS } from "../api/contracts";
import type { SearchApplicationDependencies, StrategyGeneratorPort } from "./ports";
import {
  DomainGuidedStrategyGenerator,
  type DomainGuidedGeneratorOptions,
} from "../domain/generators/domain-guided";
import {
  GeneticStrategyGenerator,
  type GeneticGeneratorOptions,
} from "../domain/generators/genetic";

type Dependencies = SearchApplicationDependencies<
  SearchRunStatus,
  CandidateGenerationRequest,
  GeneratedCandidate
>;

export interface SearchClock {
  now(): string;
}

export interface SearchApplicationOptions {
  clock?: SearchClock;
  idGenerator?: () => string;
  pollIntervalMs?: number;
}

export class SearchApplicationError extends Error {
  public readonly name = "SearchApplicationError";

  public constructor(public readonly code: string, message = code) {
    super(message);
  }
}

interface SearchRunControl {
  status: SearchRunStatus;
  generator: StrategyGeneratorPort<CandidateGenerationRequest, GeneratedCandidate>;
  generatedCandidateKeys: Set<string>;
  nextIterationNumber: number;
  terminalCandidateIds: Set<string>;
  cancelledCandidateIds: Set<string>;
  rankedTerminalCount: number;
  iterationsWithoutImprovement: number;
  bestScore?: number;
  driving: boolean;
  pollTimer?: ReturnType<typeof setTimeout>;
  deadlineTimer?: ReturnType<typeof setTimeout>;
  deadlineAtMonotonicMs?: number;
  persistTail: Promise<void>;
}

const DEADLINE_EXCEEDED = Symbol("DEADLINE_EXCEEDED");
type DeadlineResult<T> = { value: T } | { deadlineExceeded: typeof DEADLINE_EXCEEDED };

const TERMINAL_STATES = new Set<SearchRunState>(["COMPLETED", "CANCELLED", "FAILED"]);

function isTerminal(state: SearchRunState): boolean {
  return TERMINAL_STATES.has(state);
}

function assertContext(context: AuthenticatedRequestContext): AuthenticatedUserId {
  if (
    !context ||
    typeof context.authenticatedUserId !== "string" ||
    context.authenticatedUserId.trim().length === 0
  ) {
    throw new SearchApplicationError("UNAUTHENTICATED");
  }
  return context.authenticatedUserId;
}

function assertNonEmptyString(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SearchApplicationError(code);
  }
}

function normalizeSearchSpace(searchSpace: SearchSpaceConfig): SearchSpaceConfig {
  if (
    !searchSpace ||
    !Array.isArray(searchSpace.availableStrategyDefinitionIds) ||
    searchSpace.availableStrategyDefinitionIds.length < 2 ||
    searchSpace.requireDistinctComponents !== true
  ) {
    throw new SearchApplicationError("INVALID_SEARCH_SPACE");
  }

  const ids = [...searchSpace.availableStrategyDefinitionIds];
  if (
    ids.some((id) => typeof id !== "string" || id.trim().length === 0) ||
    new Set(ids).size !== ids.length
  ) {
    throw new SearchApplicationError("INVALID_SEARCH_SPACE");
  }

  const { minimum, maximum } = searchSpace.componentCount ?? {};
  if (
    !Number.isInteger(minimum) ||
    !Number.isInteger(maximum) ||
    minimum < 2 ||
    maximum < minimum ||
    maximum > ids.length
  ) {
    throw new SearchApplicationError("INVALID_SEARCH_SPACE");
  }

  return Object.freeze({
    availableStrategyDefinitionIds: Object.freeze(ids.sort((left, right) => left.localeCompare(right))),
    componentCount: Object.freeze({ minimum, maximum }),
    requireDistinctComponents: true,
  });
}

function normalizeStopCondition(stopCondition: StopCondition): StopCondition {
  if (!stopCondition || typeof stopCondition !== "object") {
    throw new SearchApplicationError("INVALID_STOP_CONDITION");
  }

  const values = [
    ["maxCandidates", stopCondition.maxCandidates],
    ["maxDurationSeconds", stopCondition.maxDurationSeconds],
    ["noImprovementAfterIterations", stopCondition.noImprovementAfterIterations],
  ] as const;
  const present = values.filter(([, value]) => value !== undefined);
  if (present.length === 0) {
    throw new SearchApplicationError("INVALID_STOP_CONDITION");
  }

  for (const [key, value] of present) {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value <= 0 ||
      (key !== "maxDurationSeconds" && !Number.isInteger(value))
    ) {
      throw new SearchApplicationError("INVALID_STOP_CONDITION");
    }
  }

  return Object.freeze(Object.fromEntries(present) as StopCondition);
}

function validateTemplate(template: SearchCandidateTemplate): SearchCandidateTemplate {
  if (!template || typeof template !== "object") {
    throw new SearchApplicationError("INVALID_CANDIDATE_TEMPLATE");
  }
  assertNonEmptyString(template.marketInput?.pair, "INVALID_CANDIDATE_TEMPLATE");
  assertNonEmptyString(template.marketInput?.timeframe, "INVALID_CANDIDATE_TEMPLATE");
  if (!template.marketInput.range || typeof template.marketInput.range !== "object") {
    throw new SearchApplicationError("INVALID_CANDIDATE_TEMPLATE");
  }
  if (!template.configuration || typeof template.configuration !== "object") {
    throw new SearchApplicationError("INVALID_CANDIDATE_TEMPLATE");
  }
  return template;
}

function validatePage(page: SearchRunPageRequest): void {
  if (!page || !Number.isInteger(page.limit) || page.limit < 1 || page.limit > 100) {
    throw new SearchApplicationError("INVALID_PAGE");
  }
}

function cloneTemplate(template: SearchCandidateTemplate): SearchCandidateTemplate {
  return {
    marketInput: {
      ...template.marketInput,
      range: { ...template.marketInput.range },
    },
    configuration: { ...template.configuration },
  };
}

function cloneStatus(status: SearchRunStatus): SearchRunStatus {
  return {
    ...status,
    searchSpace: {
      ...status.searchSpace,
      availableStrategyDefinitionIds: [...status.searchSpace.availableStrategyDefinitionIds],
      componentCount: { ...status.searchSpace.componentCount },
    },
    stopCondition: { ...status.stopCondition },
    candidateTemplate: cloneTemplate(status.candidateTemplate),
    activeCandidateIds: [...status.activeCandidateIds],
    ...(status.seededDiscovery
      ? {
          seededDiscovery: {
            ...status.seededDiscovery,
            algorithmConfiguration: { ...status.seededDiscovery.algorithmConfiguration },
            datasetIdentity: { ...status.seededDiscovery.datasetIdentity },
            code: { ...status.seededDiscovery.code },
            defaultBudget: { ...status.seededDiscovery.defaultBudget },
          },
        }
      : {}),
  };
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type AlgorithmConfiguration = SeededDiscoveryProvenance["algorithmConfiguration"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asStringArray(value: unknown): readonly string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : undefined;
}

function configurationNumber(configuration: AlgorithmConfiguration, key: string): number | undefined {
  const value = configuration[key];
  return typeof value === "number" ? value : undefined;
}

function domainOptionsFromConfiguration(
  configuration: AlgorithmConfiguration | undefined,
): DomainGuidedGeneratorOptions {
  if (!configuration) return {};
  const categories = asStringArray(configuration.categories);
  const categoryMembers: Record<string, string[]> = {};
  const encodedMembers = [
    asStringArray(configuration.categoryMembers),
    asStringArray(configuration.categoryStrategyDefinitionIds),
  ].find((value): value is readonly string[] => value !== undefined);
  for (const encoded of encodedMembers ?? []) {
    const separator = encoded.indexOf("=");
    if (separator <= 0 || separator === encoded.length - 1) continue;
    const category = encoded.slice(0, separator);
    const strategyDefinitionId = encoded.slice(separator + 1);
    categoryMembers[category] ??= [];
    categoryMembers[category]!.push(strategyDefinitionId);
  }
  for (const [key, value] of Object.entries(configuration)) {
    const category = key.startsWith("category.") ? key.slice("category.".length) : undefined;
    const members = asStringArray(value);
    if (category && category.length > 0 && members) categoryMembers[category] = [...members];
  }
  return {
    ...(categories ? { categories } : {}),
    ...(Object.keys(categoryMembers).length > 0 ? { categoryMembers } : {}),
  };
}

function geneticOptionsFromConfiguration(
  configuration: AlgorithmConfiguration | undefined,
): GeneticGeneratorOptions {
  if (!configuration) return {};
  return {
    ...(configurationNumber(configuration, "population") !== undefined
      ? { population: configurationNumber(configuration, "population") }
      : {}),
    ...(configurationNumber(configuration, "maximumGenerations") !== undefined
      ? { maximumGenerations: configurationNumber(configuration, "maximumGenerations") }
      : {}),
    ...(configurationNumber(configuration, "elitePercent") !== undefined
      ? { elitePercent: configurationNumber(configuration, "elitePercent") }
      : {}),
    ...(configurationNumber(configuration, "mutationPercent") !== undefined
      ? { mutationPercent: configurationNumber(configuration, "mutationPercent") }
      : {}),
  };
}

function generatorProfileId(generatorType: GeneratorType): SeededDiscoveryProvenance["profileId"] {
  switch (generatorType) {
    case "RANDOM":
      return "RANDOM_V1";
    case "DOMAIN_GUIDED":
      return "DOMAIN_GUIDED_V1";
    case "GENETIC":
      return "GENETIC_V1";
  }
}

function isSeededGenerator(generatorType: GeneratorType): boolean {
  return generatorType === "DOMAIN_GUIDED" || generatorType === "GENETIC";
}

function clonedAlgorithmConfiguration(
  value: AlgorithmConfiguration,
): AlgorithmConfiguration {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      Array.isArray(item) ? [...item] : item,
    ]),
  ) as AlgorithmConfiguration;
}

function normalizeSeededDiscovery(
  supplied: SeededDiscoveryProvenance | undefined,
  generatorType: GeneratorType,
  randomSeed: string,
  generator: StrategyGeneratorPort<CandidateGenerationRequest, GeneratedCandidate>,
): SeededDiscoveryProvenance | undefined {
  if (!isSeededGenerator(generatorType) && supplied === undefined) return undefined;
  const expectedProfileId = generatorProfileId(generatorType);
  if (supplied && (supplied.profileId !== expectedProfileId || supplied.seed !== randomSeed)) {
    throw new SearchApplicationError("INVALID_SEEDED_PROVENANCE");
  }
  if (supplied && (
    !isRecord(supplied.defaultBudget) ||
    supplied.defaultBudget.maxCandidates !== 500 ||
    supplied.defaultBudget.maxDurationSeconds !== 300 ||
    !isRecord(supplied.algorithmConfiguration) ||
    !isRecord(supplied.datasetIdentity) ||
    !isRecord(supplied.code)
  )) {
    throw new SearchApplicationError("INVALID_SEEDED_PROVENANCE");
  }
  const generatorConfiguration = (generator as StrategyGeneratorPort<CandidateGenerationRequest, GeneratedCandidate> & {
    readonly algorithmConfiguration?: AlgorithmConfiguration;
  }).algorithmConfiguration;
  const algorithmConfiguration = supplied?.algorithmConfiguration ?? generatorConfiguration ?? {};
  return {
    profileId: expectedProfileId,
    algorithmConfiguration: clonedAlgorithmConfiguration(algorithmConfiguration),
    datasetIdentity: supplied ? { ...supplied.datasetIdentity } : {},
    code: supplied ? { ...supplied.code } : {},
    seed: randomSeed,
    defaultBudget: { maxCandidates: 500, maxDurationSeconds: 300 },
  };
}

function boundedSeededStopCondition(stopCondition: StopCondition): StopCondition {
  return Object.freeze({
    ...stopCondition,
    maxCandidates: Math.min(stopCondition.maxCandidates ?? GENETIC_V1_DEFAULTS.candidateBudget, 500),
    maxDurationSeconds: Math.min(stopCondition.maxDurationSeconds ?? 300, 300),
  }) as StopCondition;
}

function isSearchSpaceExhausted(error: unknown): boolean {
  return isRecord(error) && error.code === "SEARCH_SPACE_EXHAUSTED";
}

function generatedCandidateIsValid(
  candidate: GeneratedCandidate,
  searchSpace: SearchSpaceConfig,
  generatorType: GeneratorType,
): boolean {
  if (
    !candidate ||
    candidate.generatedBy !== generatorType ||
    candidate.combinationProfileId !== "MAJORITY_VOTE_V1" ||
    !Array.isArray(candidate.strategyDefinitionIds)
  ) {
    return false;
  }

  const ids = [...candidate.strategyDefinitionIds];
  if (
    ids.length < searchSpace.componentCount.minimum ||
    ids.length > searchSpace.componentCount.maximum ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => typeof id !== "string" || !searchSpace.availableStrategyDefinitionIds.includes(id))
  ) {
    return false;
  }

  const sortedIds = [...ids].sort((left, right) => left.localeCompare(right));
  const expectedKey = JSON.stringify([candidate.combinationProfileId, ...sortedIds]);
  return (
    JSON.stringify(ids) === JSON.stringify(sortedIds) &&
    candidate.candidateKey === expectedKey &&
    candidate.compositeLogicalFamilyKey === expectedKey
  );
}

function makeContext(ownerUserId: AuthenticatedUserId): AuthenticatedRequestContext {
  return { authenticatedUserId: ownerUserId };
}

export function createSearchApplication(
  dependencies: Dependencies,
  options: SearchApplicationOptions = {},
): SearchModulePublicApi {
  const clock = options.clock ?? { now: () => new Date().toISOString() };
  const idGenerator = options.idGenerator ?? (() => crypto.randomUUID());
  const pollIntervalMs = options.pollIntervalMs ?? 10;
  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 0) {
    throw new RangeError("pollIntervalMs must be a non-negative integer");
  }

  const controls = new Map<string, SearchRunControl>();

  const resolveGenerator = (
    generatorType: GeneratorType,
    seededDiscovery?: SeededDiscoveryProvenance,
  ): StrategyGeneratorPort<CandidateGenerationRequest, GeneratedCandidate> => {
    if (generatorType === "RANDOM") return dependencies.generators.RANDOM;
    if (generatorType === "DOMAIN_GUIDED") {
      const configured = dependencies.generators.DOMAIN_GUIDED;
      if (configured && configured.profileId !== "DOMAIN_GUIDED_V1") {
        throw new SearchApplicationError("INVALID_GENERATOR_CONFIGURATION");
      }
      return configured ?? new DomainGuidedStrategyGenerator(
        domainOptionsFromConfiguration(seededDiscovery?.algorithmConfiguration),
      );
    }
    const configured = dependencies.generators.GENETIC;
    if (configured && configured.profileId !== "GENETIC_V1") {
      throw new SearchApplicationError("INVALID_GENERATOR_CONFIGURATION");
    }
    return configured ?? new GeneticStrategyGenerator(
      geneticOptionsFromConfiguration(seededDiscovery?.algorithmConfiguration),
    );
  };

  const touch = (control: SearchRunControl): void => {
    control.status.updatedAt = clock.now();
  };

  const persist = async (control: SearchRunControl): Promise<void> => {
    const snapshot = cloneStatus(control.status);
    const write = control.persistTail.then(async () => {
      await dependencies.searchRunRepository.save(snapshot.ownerUserId, snapshot);
    });
    control.persistTail = write.catch(() => undefined);
    await write;
  };

  const setActiveCandidateIds = (control: SearchRunControl, ids: Iterable<string>): void => {
    control.status.activeCandidateIds = [...new Set(ids)].filter(
      (id) => !control.cancelledCandidateIds.has(id),
    );
  };

  const terminalCandidateCount = (control: SearchRunControl): number =>
    control.status.completedCandidateCount + control.status.failedCandidateCount;

  const updateRankingProgress = async (control: SearchRunControl): Promise<void> => {
    const currentTerminalCount = terminalCandidateCount(control);
    const delta = currentTerminalCount - control.rankedTerminalCount;
    if (delta <= 0) return;

    const rankingResult = await awaitWithinDeadline(control, () =>
      dependencies.leaderboard.rankSearchRun(
        makeContext(control.status.ownerUserId),
        control.status.searchRunId,
      ),
    );
    if ("deadlineExceeded" in rankingResult) return;
    const entries = rankingResult.value;
    if (entries[0]) {
      control.status.currentTopLeaderboardEntryId = entries[0].candidateId;
    } else {
      delete control.status.currentTopLeaderboardEntryId;
    }
    const scores = entries
      .map((entry) => entry.score)
      .filter((score) => Number.isFinite(score));
    const topScore = scores.length > 0 ? Math.max(...scores) : undefined;
    if (topScore !== undefined && (control.bestScore === undefined || topScore > control.bestScore)) {
      control.bestScore = topScore;
      control.iterationsWithoutImprovement = 0;
    } else {
      control.iterationsWithoutImprovement += delta;
    }
    control.rankedTerminalCount = currentTerminalCount;
  };

  const refreshProgress = async (control: SearchRunControl): Promise<void> => {
    const context = makeContext(control.status.ownerUserId);
    const summaryResult = await awaitWithinDeadline(control, () =>
      dependencies.backtesting.summarizeSearchCandidates(
        context,
        control.status.searchRunId,
      ),
    );
    if ("deadlineExceeded" in summaryResult) return;
    const summary = summaryResult.value;
    const summaryActiveIds = new Set(summary.activeCandidateIds);
    const stillActive = new Set<string>();

    for (const candidateId of control.status.activeCandidateIds) {
      if (control.cancelledCandidateIds.has(candidateId)) continue;
      const candidateResult = await awaitWithinDeadline(control, () =>
        dependencies.backtesting.status(context, candidateId),
      );
      if ("deadlineExceeded" in candidateResult) return;
      const candidate = candidateResult.value;
      if (!candidate || candidate.status === "ACCEPTED" || candidate.status === "RUNNING") {
        if (summaryActiveIds.has(candidateId) || candidate !== undefined) {
          stillActive.add(candidateId);
        }
        continue;
      }
      control.terminalCandidateIds.add(candidateId);
    }

    for (const candidateId of summaryActiveIds) {
      if (!control.cancelledCandidateIds.has(candidateId) && !control.terminalCandidateIds.has(candidateId)) {
        stillActive.add(candidateId);
      }
    }

    control.status.submittedCandidateCount = Math.max(
      control.status.submittedCandidateCount,
      summary.submittedCandidateCount,
    );
    control.status.completedCandidateCount = Math.max(
      control.status.completedCandidateCount,
      summary.completedCandidateCount,
    );
    control.status.failedCandidateCount = Math.max(
      control.status.failedCandidateCount,
      summary.failedCandidateCount,
    );
    control.status.averageBacktestDurationMs = summary.averageBacktestDurationMs;
    setActiveCandidateIds(control, stillActive);
    await updateRankingProgress(control);
    if (hasDeadlinePassed(control)) return;
    touch(control);
    await persist(control);
  };

  const scheduleDrive = (control: SearchRunControl): void => {
    if (control.pollTimer !== undefined || control.driving) return;
    if (isTerminal(control.status.state)) return;
    if (!isTerminal(control.status.state) && control.status.state === "PAUSED") {
      if (control.status.activeCandidateIds.length === 0) return;
    }
    if (control.status.activeCandidateIds.length === 0) return;

    let delay = pollIntervalMs;
    const maxDurationSeconds = control.status.stopCondition.maxDurationSeconds;
    if (maxDurationSeconds !== undefined) {
      delay = Math.min(delay, remainingDeadlineMs(control) ?? 0);
    }
    control.pollTimer = setTimeout(() => {
      control.pollTimer = undefined;
      void drive(control).catch((error: unknown) => {
        void failRun(control, readableError(error));
      });
    }, delay);
    (control.pollTimer as unknown as { unref?: () => void }).unref?.();
  };

  const completeRun = async (
    control: SearchRunControl,
    state: "COMPLETED" | "CANCELLED" | "FAILED",
    stopReason: SearchRunStopReason,
    error?: string,
  ): Promise<void> => {
    if (isTerminal(control.status.state)) return;
    if (control.deadlineTimer !== undefined) {
      clearTimeout(control.deadlineTimer);
      control.deadlineTimer = undefined;
    }
    control.status.state = state;
    control.status.stopReason = stopReason;
    control.status.endedAt = clock.now();
    if (error !== undefined) control.status.lastError = error;
    touch(control);
    await persist(control);
    if (stopReason === "MAX_DURATION" && control.status.activeCandidateIds.length > 0) {
      try {
        await dependencies.backtesting.cancelSearchCandidates(
          makeContext(control.status.ownerUserId),
          control.status.searchRunId,
        );
      } catch (cancellationError) {
        control.status.lastError = `candidate cancellation failed: ${readableError(cancellationError)}`;
      }
      control.cancelledCandidateIds = new Set(control.status.activeCandidateIds);
      setActiveCandidateIds(control, []);
      touch(control);
      await persist(control);
    }
  };

  const failRun = async (control: SearchRunControl, message: string): Promise<void> => {
    if (isTerminal(control.status.state)) return;
    await completeRun(control, "FAILED", "ERROR", message);
  };

  const durationSeconds = (control: SearchRunControl): number | undefined =>
    control.status.stopCondition.maxDurationSeconds;

  const hasDeadlinePassed = (control: SearchRunControl): boolean => {
    const duration = durationSeconds(control);
    if (duration === undefined) return false;
    if (
      control.deadlineAtMonotonicMs !== undefined &&
      Date.now() >= control.deadlineAtMonotonicMs
    ) {
      return true;
    }
    if (!control.status.startedAt) return false;
    const startedAt = Date.parse(control.status.startedAt);
    const now = Date.parse(clock.now());
    return (
      Number.isFinite(startedAt) &&
      Number.isFinite(now) &&
      now - startedAt >= duration * 1_000
    );
  };

  const remainingDeadlineMs = (control: SearchRunControl): number | undefined => {
    const duration = durationSeconds(control);
    if (duration === undefined) return undefined;
    const monotonicRemaining =
      control.deadlineAtMonotonicMs === undefined
        ? duration * 1_000
        : control.deadlineAtMonotonicMs - Date.now();
    let remaining = monotonicRemaining;
    if (control.status.startedAt) {
      const startedAt = Date.parse(control.status.startedAt);
      const now = Date.parse(clock.now());
      if (Number.isFinite(startedAt) && Number.isFinite(now)) {
        remaining = Math.min(remaining, startedAt + duration * 1_000 - now);
      }
    }
    return Math.max(0, remaining);
  };

  const armDeadline = (control: SearchRunControl): void => {
    if (durationSeconds(control) === undefined || isTerminal(control.status.state)) return;
    if (control.deadlineAtMonotonicMs === undefined) {
      control.deadlineAtMonotonicMs = Date.now() + durationSeconds(control)! * 1_000;
    }
    if (control.deadlineTimer !== undefined) return;
    control.deadlineTimer = setTimeout(() => {
      control.deadlineTimer = undefined;
      if (!isTerminal(control.status.state)) {
        void completeRun(control, "COMPLETED", "MAX_DURATION").catch((error: unknown) => {
          void failRun(control, readableError(error));
        });
      }
    }, remainingDeadlineMs(control) ?? 0);
    (control.deadlineTimer as unknown as { unref?: () => void }).unref?.();
  };

  const enforceDeadline = async (control: SearchRunControl): Promise<boolean> => {
    if (!isTerminal(control.status.state) && hasDeadlinePassed(control)) {
      await completeRun(control, "COMPLETED", "MAX_DURATION");
      return true;
    }
    return isTerminal(control.status.state) && control.status.stopReason === "MAX_DURATION";
  };

  const awaitWithinDeadline = async <T>(
    control: SearchRunControl,
    operation: () => Promise<T>,
    onLateValue?: (value: T) => void | Promise<void>,
  ): Promise<DeadlineResult<T>> => {
    if (await enforceDeadline(control) || isTerminal(control.status.state)) {
      if (control.status.stopReason === "MAX_DURATION") {
        return { deadlineExceeded: DEADLINE_EXCEEDED };
      }
      return { value: await operation() };
    }

    const remaining = remainingDeadlineMs(control);
    if (remaining === undefined) return { value: await operation() };

    let timer: ReturnType<typeof setTimeout> | undefined;
    let deadlineTriggered = false;
    const handleLateValue = (value: T): void => {
      if (onLateValue === undefined) return;
      void Promise.resolve(onLateValue(value)).catch((error: unknown) => {
        void failRun(control, readableError(error));
      });
    };
    const operationResult = Promise.resolve()
      .then(operation)
      .then(
        (value) => {
          if (deadlineTriggered) handleLateValue(value);
          return { kind: "value" as const, value };
        },
        (error: unknown) => ({ kind: "error" as const, error }),
      );
    const timeoutResult = new Promise<{ kind: "deadline" }>((resolve) => {
      timer = setTimeout(() => {
        deadlineTriggered = true;
        void completeRun(control, "COMPLETED", "MAX_DURATION").catch((error: unknown) => {
          void failRun(control, readableError(error));
        });
        resolve({ kind: "deadline" });
      }, remaining);
      (timer as unknown as { unref?: () => void }).unref?.();
    });

    const result = await Promise.race([operationResult, timeoutResult]);
    if (timer !== undefined) clearTimeout(timer);
    if (result.kind === "deadline") {
      return { deadlineExceeded: DEADLINE_EXCEEDED };
    }
    if (result.kind === "error") throw result.error;
    if (hasDeadlinePassed(control)) {
      deadlineTriggered = true;
      handleLateValue(result.value);
      await enforceDeadline(control);
      return { deadlineExceeded: DEADLINE_EXCEEDED };
    }
    return { value: result.value };
  };

  const stopConditionReached = (control: SearchRunControl): SearchRunStopReason | undefined => {
    const stopCondition = control.status.stopCondition;
    if (
      stopCondition.maxCandidates !== undefined &&
      control.status.submittedCandidateCount >= stopCondition.maxCandidates
    ) {
      return "MAX_CANDIDATES";
    }
    if (
      stopCondition.maxDurationSeconds !== undefined &&
      hasDeadlinePassed(control)
    ) {
      return "MAX_DURATION";
    }
    if (
      stopCondition.noImprovementAfterIterations !== undefined &&
      control.iterationsWithoutImprovement >= stopCondition.noImprovementAfterIterations
    ) {
      return "NO_IMPROVEMENT";
    }
    return undefined;
  };

  async function drive(control: SearchRunControl): Promise<void> {
    if (control.driving) return;
    control.driving = true;
    try {
      await refreshProgress(control);
      if (isTerminal(control.status.state)) {
        scheduleDrive(control);
        return;
      }
      if (control.status.state === "PAUSED") {
        scheduleDrive(control);
        return;
      }

      while (control.status.state === "RUNNING") {
        const stopReason = stopConditionReached(control);
        if (stopReason !== undefined) {
          await completeRun(control, "COMPLETED", stopReason);
          return;
        }

        const availableSlots = control.status.maxInFlight - control.status.activeCandidateIds.length;
        if (availableSlots <= 0) {
          scheduleDrive(control);
          return;
        }

        const generator = control.generator;
        let generated: GeneratedCandidate;
        try {
          generated = generator.generate({
            searchSpace: control.status.searchSpace,
            randomSeed: control.status.randomSeed,
            iterationNumber: control.nextIterationNumber,
            previouslyGeneratedCandidateKeys: [...control.generatedCandidateKeys],
          });
        } catch (error) {
          if (isSearchSpaceExhausted(error)) {
            await completeRun(control, "COMPLETED", "SEARCH_SPACE_EXHAUSTED");
          } else {
            await failRun(control, readableError(error));
          }
          return;
        }
        control.nextIterationNumber += 1;
        if (!generatedCandidateIsValid(generated, control.status.searchSpace, control.status.generatorType)) {
          await failRun(control, "generator returned a malformed candidate");
          return;
        }
        if (control.generatedCandidateKeys.has(generated.candidateKey)) {
          await failRun(control, "generator returned a duplicate candidate");
          return;
        }
        control.generatedCandidateKeys.add(generated.candidateKey);

        const context = makeContext(control.status.ownerUserId);
        let composite: Awaited<ReturnType<Dependencies["strategy"]["defineComposite"]>>;
        try {
          const compositeResult = await awaitWithinDeadline(control, () =>
            dependencies.strategy.defineComposite(context, {
              logicalFamilyKey: generated.compositeLogicalFamilyKey,
              combinationProfileId: generated.combinationProfileId,
              strategyDefinitionIds: generated.strategyDefinitionIds,
            }),
          );
          if ("deadlineExceeded" in compositeResult) return;
          composite = compositeResult.value;
        } catch (error) {
          await failRun(control, readableError(error));
          return;
        }
        if (composite.ownerUserId !== control.status.ownerUserId) {
          await failRun(control, "strategy composite owner does not match SearchRun owner");
          return;
        }
        if (control.status.state !== "RUNNING") {
          scheduleDrive(control);
          return;
        }

        const command: SubmitSearchCandidateCommand = {
          leaderboardScopeId: control.status.leaderboardScopeId,
          strategySelection: { kind: "COMPOSITE", compositeDefinitionId: composite.id },
          marketInput: control.status.candidateTemplate.marketInput,
          configuration: control.status.candidateTemplate.configuration,
          searchRunId: control.status.searchRunId,
          iterationNumber: control.nextIterationNumber - 1,
        };
        let accepted: BacktestSubmissionAccepted;
        try {
          const submissionResult = await awaitWithinDeadline(control, () =>
            dependencies.backtesting.submitSearchCandidate(context, command),
            (lateAccepted) => {
              if (
                lateAccepted &&
                lateAccepted.status === "ACCEPTED" &&
                typeof lateAccepted.candidateId === "string"
              ) {
                return dependencies.backtesting
                  .cancelSearchCandidates(context, control.status.searchRunId)
                  .then(() => undefined);
              }
            },
          );
          if ("deadlineExceeded" in submissionResult) return;
          accepted = submissionResult.value;
        } catch (error) {
          await failRun(control, readableError(error));
          return;
        }
        if (!accepted || accepted.status !== "ACCEPTED" || typeof accepted.candidateId !== "string") {
          await failRun(control, "Backtesting did not accept the Search candidate");
          return;
        }
        if (control.status.state !== "RUNNING" || hasDeadlinePassed(control)) {
          await dependencies.backtesting.cancelSearchCandidates(context, control.status.searchRunId);
          return;
        }
        control.status.submittedCandidateCount += 1;
        control.status.activeCandidateIds = [
          ...new Set([...control.status.activeCandidateIds, accepted.candidateId]),
        ];
        touch(control);
        await persist(control);

        if (control.status.state !== "RUNNING") {
          await dependencies.backtesting.cancelSearchCandidates(context, control.status.searchRunId);
          scheduleDrive(control);
          return;
        }
        await refreshProgress(control);
      }
    } catch (error) {
      await failRun(control, readableError(error));
    } finally {
      control.driving = false;
      if (control.status.state === "RUNNING" || control.status.state === "PAUSED" || isTerminal(control.status.state)) {
        scheduleDrive(control);
      }
    }
  }

  const controlFromStatus = (
    status: SearchRunStatus,
    generator = resolveGenerator(status.generatorType, status.seededDiscovery),
  ): SearchRunControl => ({
    status,
    generator,
    generatedCandidateKeys: new Set(),
    nextIterationNumber: status.submittedCandidateCount + 1,
    terminalCandidateIds: new Set(),
    cancelledCandidateIds: new Set(),
    rankedTerminalCount: status.completedCandidateCount + status.failedCandidateCount,
    iterationsWithoutImprovement: 0,
    driving: false,
    persistTail: Promise.resolve(),
  });

  const getOwnedControl = async (
    context: AuthenticatedRequestContext,
    searchRunId: string,
  ): Promise<SearchRunControl> => {
    const ownerUserId = assertContext(context);
    const existing = controls.get(searchRunId);
    if (existing && existing.status.ownerUserId === ownerUserId) return existing;
    const status = await dependencies.searchRunRepository.getByOwnerAndId(ownerUserId, searchRunId);
    if (!status) throw new SearchApplicationError("NOT_FOUND");
    const control = controlFromStatus(status);
    controls.set(searchRunId, control);
    return control;
  };

  const start = async (
    context: AuthenticatedRequestContext,
    command: StartSearchCommand,
  ): Promise<{ searchRunId: string }> => {
    const ownerUserId = assertContext(context);
    if (!command || !["RANDOM", "DOMAIN_GUIDED", "GENETIC"].includes(command.generatorType)) {
      throw new SearchApplicationError("UNSUPPORTED_GENERATOR");
    }
    assertNonEmptyString(command.randomSeed, "INVALID_RANDOM_SEED");
    assertNonEmptyString(command.leaderboardScopeId, "INVALID_LEADERBOARD_SCOPE");
    if (!Number.isInteger(command.maxInFlight) || command.maxInFlight < 1) {
      throw new SearchApplicationError("INVALID_MAX_IN_FLIGHT");
    }
    const searchSpace = normalizeSearchSpace(command.searchSpace);
    let generator: StrategyGeneratorPort<CandidateGenerationRequest, GeneratedCandidate>;
    try {
      generator = resolveGenerator(command.generatorType, command.seededDiscovery);
    } catch (error) {
      throw new SearchApplicationError("INVALID_GENERATOR_CONFIGURATION", readableError(error));
    }
    const seededDiscovery = normalizeSeededDiscovery(
      command.seededDiscovery,
      command.generatorType,
      command.randomSeed,
      generator,
    );
    const stopCondition = isSeededGenerator(command.generatorType)
      ? boundedSeededStopCondition(normalizeStopCondition(command.stopCondition))
      : normalizeStopCondition(command.stopCondition);
    const candidateTemplate = validateTemplate(command.candidateTemplate);
    let leaderboardScope;
    try {
      leaderboardScope = await dependencies.leaderboard.getLeaderboardScope(
        makeContext(ownerUserId),
        command.leaderboardScopeId,
      );
    } catch (error) {
      if (error instanceof SearchApplicationError && error.code === "NOT_FOUND") {
        throw error;
      }
      if (error instanceof Error && error.message === "NOT_FOUND") {
        throw new SearchApplicationError("NOT_FOUND");
      }
      throw error;
    }
    if (
      !leaderboardScope ||
      leaderboardScope.id !== command.leaderboardScopeId ||
      leaderboardScope.ownerUserId !== ownerUserId
    ) {
      throw new SearchApplicationError("NOT_FOUND");
    }
    const createdAt = clock.now();
    const searchRunId = idGenerator();
    assertNonEmptyString(searchRunId, "INVALID_SEARCH_RUN_ID");
    const status: SearchRunStatus = {
      searchRunId,
      ownerUserId,
      generatorType: command.generatorType,
      randomSeed: command.randomSeed,
      searchSpace,
      stopCondition,
      leaderboardScopeId: command.leaderboardScopeId,
      candidateTemplate: cloneTemplate(candidateTemplate),
      maxInFlight: command.maxInFlight,
      state: "RUNNING",
      activeCandidateIds: [],
      submittedCandidateCount: 0,
      completedCandidateCount: 0,
      failedCandidateCount: 0,
      averageBacktestDurationMs: null,
      createdAt,
      startedAt: createdAt,
      updatedAt: createdAt,
      ...(seededDiscovery ? { seededDiscovery } : {}),
    };
    const control = controlFromStatus(status, generator);
    if (stopCondition.maxDurationSeconds !== undefined) {
      control.deadlineAtMonotonicMs = Date.now() + stopCondition.maxDurationSeconds * 1_000;
    }
    controls.set(searchRunId, control);
    await persist(control);
    armDeadline(control);
    void drive(control).catch((error: unknown) => {
      void failRun(control, readableError(error));
    });
    return { searchRunId };
  };

  const pause = async (context: AuthenticatedRequestContext, searchRunId: string): Promise<void> => {
    const control = await getOwnedControl(context, searchRunId);
    if (control.status.state !== "RUNNING") {
      throw new SearchApplicationError(isTerminal(control.status.state) ? "TERMINAL_STATE" : "INVALID_STATE");
    }
    control.status.state = "PAUSED";
    touch(control);
    await persist(control);
    scheduleDrive(control);
  };

  const resume = async (context: AuthenticatedRequestContext, searchRunId: string): Promise<void> => {
    const control = await getOwnedControl(context, searchRunId);
    if (control.status.state !== "PAUSED") {
      throw new SearchApplicationError(isTerminal(control.status.state) ? "TERMINAL_STATE" : "INVALID_STATE");
    }
    control.status.state = "RUNNING";
    touch(control);
    await persist(control);
    void drive(control).catch((error: unknown) => {
      void failRun(control, readableError(error));
    });
  };

  const cancel = async (context: AuthenticatedRequestContext, searchRunId: string): Promise<void> => {
    const ownedContext = makeContext(assertContext(context));
    const control = await getOwnedControl(ownedContext, searchRunId);
    if (isTerminal(control.status.state)) {
      throw new SearchApplicationError("TERMINAL_STATE");
    }
    control.status.state = "CANCELLED";
    control.status.stopReason = "USER_CANCELLED";
    control.status.endedAt = clock.now();
    touch(control);
    await persist(control);
    const cancelled = await dependencies.backtesting.cancelSearchCandidates(
      ownedContext,
      searchRunId,
    );
    for (const candidateId of cancelled.candidateIds) {
      control.cancelledCandidateIds.add(candidateId);
    }
    setActiveCandidateIds(control, []);
    touch(control);
    await persist(control);
    scheduleDrive(control);
  };

  const status = async (
    context: AuthenticatedRequestContext,
    searchRunId: string,
  ): Promise<SearchRunStatus> => {
    const control = await getOwnedControl(context, searchRunId);
    if (control.status.activeCandidateIds.length > 0) {
      await refreshProgress(control);
    }
    return cloneStatus(control.status);
  };

  const list = async (
    context: AuthenticatedRequestContext,
    page: SearchRunPageRequest,
  ): Promise<SearchRunPage> => {
    validatePage(page);
    const ownerUserId = assertContext(context);
    return dependencies.searchRunRepository.listByOwner(ownerUserId, page);
  };

  const leaderboard = async (
    context: AuthenticatedRequestContext,
    searchRunId: string,
  ): Promise<readonly SearchRunRankingEntry[]> => {
    const ownerUserId = assertContext(context);
    const control = await getOwnedControl({ authenticatedUserId: ownerUserId }, searchRunId);
    return dependencies.leaderboard.rankSearchRun(
      makeContext(control.status.ownerUserId),
      searchRunId,
    );
  };

  return { start, pause, resume, cancel, status, list, leaderboard };
}
