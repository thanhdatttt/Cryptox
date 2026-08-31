import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import type { IncomingMessage, Server } from "node:http";
import { Duplex } from "node:stream";
import { describe, expect, it } from "vitest";
import type {
  AuthModulePublicApi,
  AuthenticatedRequestContext,
  AuthenticatedSessionIdentity,
  AuthenticatedUserId,
} from "@cryptox/auth";
import type {
  BacktestConfiguration,
  BacktestingModulePublicApi,
  CandidateProgress,
  Experiment,
} from "@cryptox/backtesting";
import {
  createBacktestingApplication,
  createBoundedLocalBacktestExecutor,
  createInMemoryBacktestingRepositories,
  type BacktestingApplication,
  type CandidateExecutionRequest,
  type CandidateRunResult,
} from "@cryptox/backtesting/bootstrap";
import { createEvaluationModule } from "@cryptox/evaluation/bootstrap";
import type {
  LeaderboardEntry,
  LeaderboardModulePublicApi,
  LeaderboardScope,
  RankableExperiment,
  RankingConfiguration,
} from "@cryptox/leaderboard";
import { LINEAR_REQUIRED_V1 } from "@cryptox/leaderboard";
import { createLeaderboardModule } from "@cryptox/leaderboard/bootstrap";
import type {
  Candle,
  DatasetSnapshotRef,
  HistoricalCandlePage,
  MarketDataModulePublicApi,
  MarketDataUpdate,
} from "@cryptox/market-data";
import type { MarketDataModuleRuntime } from "@cryptox/market-data/bootstrap";
import type {
  ExtractionTemplateRecord,
  NewsModulePublicApi,
  NewsObservability,
  NewsProvider,
  NewsProviderDocument,
  NewsUrlImportExtractor,
  NormalizedNewsItemRecord,
  SafeNewsUrlFetchPort,
  SafeNewsFailureReason,
} from "@cryptox/news/bootstrap";
import {
  createInMemoryExtractionTemplateRepository,
  createInMemoryNewsExtractionProvenanceRepository,
  createInMemoryNewsRawHtmlRepository,
  createInMemoryNewsRepository,
  createNewsModule,
  createSafeNewsUrlFetcher,
} from "@cryptox/news/bootstrap";
import type {
  SearchModulePublicApi,
  SearchRunStatus,
  SearchSpaceConfig,
  SeededDiscoveryProvenance,
} from "@cryptox/search";
import { createSearchGeneratorRegistry, createSearchModule } from "@cryptox/search/bootstrap";
import type {
  CompositeStrategyDefinition,
  Strategy,
  StrategyAuthoringDraft,
  StrategyDefinition,
  StrategyModulePublicApi,
} from "@cryptox/strategy";
import {
  createStrategyAuthoringPort,
  type StrategyAuthoringApplicationDependencies,
} from "@cryptox/strategy/bootstrap";
import * as strategyPublic from "@cryptox/strategy";
import type { MarketWebSocketServerMessage } from "@cryptox/contracts/websocket";
import { REST_SCHEMA_VERSION } from "@cryptox/contracts/rest";
import {
  toExperimentDto,
  toMarketHistoryResponse,
  toSearchRunStatusDto,
  toStrategyDefinitionDto,
} from "./transport";
import { createBackendRuntime } from "./runtime";

const USER_A = "00000000-0000-4000-8000-000000000001" as AuthenticatedUserId;
const USER_B = "00000000-0000-4000-8000-000000000002" as AuthenticatedUserId;
const FIXED_NOW = "2026-09-01T00:00:00.000Z";
const RANGE = {
  from: "2026-01-01T00:00:00.000Z",
  to: "2026-01-01T04:00:00.000Z",
};
const NEWS_SOURCE_ID = "approved-news-source";
const RAW_IMPORT_MARKER = "raw-url-marker-must-not-cross-authoring";
const RANKING_CONFIGURATION_ID = "ranking-i03";

function context(authenticatedUserId: AuthenticatedUserId): AuthenticatedRequestContext {
  return { authenticatedUserId };
}

function copy<T>(value: T): T {
  return structuredClone(value);
}

function notFound(): never {
  throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" });
}

function normalizedContentHash(value: string): string {
  return createHash("sha256")
    .update(value.normalize("NFKC").replace(/\s+/gu, " ").trim().toLocaleLowerCase("en-US"), "utf8")
    .digest("hex");
}

function addDays(timestamp: string, days: number): string {
  return new Date(Date.parse(timestamp) + days * 24 * 60 * 60 * 1_000).toISOString();
}

interface NewsBoundaryFixture {
  news: ReturnType<typeof createNewsModule>;
  safetyCalls: Array<Parameters<SafeNewsUrlFetchPort["fetch"]>[0]>;
  transportCalls: Array<{ url: string; credentials: string; redirect: string; authorization?: string; cookie?: string }>;
  sentimentFailures: Array<{ newsId: string; reason: "TIMEOUT" | "INFERENCE_ERROR" | "INVALID_RESULT" }>;
  providerFailures: Array<{ providerId: string; detail?: string }>;
  extractionFailures: Array<{ sourceId: string; detail?: string }>;
  extractionRepository: ReturnType<typeof createInMemoryNewsExtractionProvenanceRepository>;
  rawHtmlRepository: ReturnType<typeof createInMemoryNewsRawHtmlRepository>;
  templateRepository: ReturnType<typeof createInMemoryExtractionTemplateRepository>;
}

function createNewsBoundaryFixture(): NewsBoundaryFixture {
  const content = "Bitcoin strategy outlook remains constructive.";
  const canonicalUrl = "https://news.example.test/articles/bitcoin";
  const body = "<article>Bitcoin strategy outlook remains constructive.</article>";
  const safetyCalls: NewsBoundaryFixture["safetyCalls"] = [];
  const transportCalls: NewsBoundaryFixture["transportCalls"] = [];
  const sentimentFailures: NewsBoundaryFixture["sentimentFailures"] = [];
  const providerFailures: NewsBoundaryFixture["providerFailures"] = [];
  const extractionFailures: NewsBoundaryFixture["extractionFailures"] = [];
  const newsRepository = createInMemoryNewsRepository();
  const extractionRepository = createInMemoryNewsExtractionProvenanceRepository();
  const rawHtmlRepository = createInMemoryNewsRawHtmlRepository();
  const templateRepository = createInMemoryExtractionTemplateRepository();

  const safeFetcher = createSafeNewsUrlFetcher({
    sources: [{ id: NEWS_SOURCE_ID, allowedHosts: ["news.example.test"] }],
    resolve: async () => ["203.0.113.7"],
    fetch: async (url, init) => {
      transportCalls.push({
        url,
        credentials: init.credentials,
        redirect: init.redirect,
        ...(init.headers.Authorization === undefined ? {} : { authorization: init.headers.Authorization }),
        ...(init.headers.Cookie === undefined ? {} : { cookie: init.headers.Cookie }),
      });
      return {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "content-length": String(Buffer.byteLength(body, "utf8")),
        },
        text: async () => body,
      };
    },
    now: () => Date.parse(FIXED_NOW),
  });

  const safeUrlFetcher: SafeNewsUrlFetchPort = {
    fetch: async (input) => {
      safetyCalls.push(copy(input));
      return safeFetcher.fetch(input);
    },
  };

  const importedItem: NormalizedNewsItemRecord = {
    id: "ignored-by-import-boundary",
    providerId: NEWS_SOURCE_ID,
    providerItemId: "article-1",
    title: "Bitcoin market update",
    content,
    source: "Approved News Source",
    publishedAt: "2026-01-01T00:00:00.000Z",
    crawledAt: FIXED_NOW,
    relatedCoins: ["BTC"],
    url: canonicalUrl,
    extraction: {
      sourceKind: "ALLOWLISTED_URL_IMPORT",
      canonicalUrl,
      normalizedContentHash: normalizedContentHash(content),
      template: {
        id: "template-1",
        sourceId: NEWS_SOURCE_ID,
        version: 1,
        status: "APPROVED",
      },
      extractedAt: FIXED_NOW,
      normalizedRetainUntil: addDays(FIXED_NOW, 90),
    },
  };

  const urlImportExtractor: NewsUrlImportExtractor = {
    extract: async (input): Promise<NewsProviderDocument> => ({
      sourceKind: "ALLOWLISTED_URL_IMPORT",
      canonicalUrl: input.canonicalUrl,
      body: input.body,
      contentType: input.contentType,
      redirects: input.redirects,
      extractedAt: input.extractedAt,
      items: [copy(importedItem)],
    }),
  };

  const failingProvider: NewsProvider = {
    id: "failing-provider",
    fetch: async () => {
      throw new Error("provider secret=must-not-cross-boundary");
    },
  };

  const observability: NewsObservability = {
    recordProviderFailure: (input) => providerFailures.push(copy(input)),
    recordSentimentFailure: (input) => sentimentFailures.push(copy(input)),
    recordExternalContentFailure: () => undefined,
    recordExtractionFailure: (input) => extractionFailures.push(copy(input)),
  };

  const news = createNewsModule({
    providers: [failingProvider],
    newsRepository,
    sentiment: {
      analyze: async () => {
        throw new Error("sentiment provider secret=must-not-cross-boundary");
      },
      readLatestForNews: async () => undefined,
    },
    sentimentTimeoutMs: 50,
    observability,
    safeUrlFetcher,
    urlImportExtractor,
    templateRepository,
    extractionProvenanceRepository: extractionRepository,
    rawHtmlRepository,
    clock: { now: () => FIXED_NOW },
  });

  return {
    news,
    safetyCalls,
    transportCalls,
    sentimentFailures,
    providerFailures,
    extractionFailures,
    extractionRepository,
    rawHtmlRepository,
    templateRepository,
  };
}

function strategyDefinition(
  ownerUserId: AuthenticatedUserId,
  id: string,
  parameters: Readonly<Record<string, number>> = { fastPeriod: 1, slowPeriod: 2 },
): StrategyDefinition {
  return {
    id,
    ownerUserId,
    logicalFamilyKey: id,
    strategyName: "MA",
    implementationVersion: "1.0.0",
    behaviorProfileId: "TECHNICAL_PROFILES_V1",
    version: 1,
    parameters,
    createdAt: FIXED_NOW,
  };
}

function createStrategyFacade(): StrategyModulePublicApi {
  const definitions = new Map<string, StrategyDefinition>([
    ["strategy-a", strategyDefinition(USER_A, "strategy-a")],
    ["strategy-b", strategyDefinition(USER_A, "strategy-b", { fastPeriod: 1, slowPeriod: 3 })],
    ["strategy-c", strategyDefinition(USER_A, "strategy-c", { fastPeriod: 2, slowPeriod: 3 })],
  ]);
  const composites = new Map<string, CompositeStrategyDefinition>();
  let definitionSequence = 0;
  let compositeSequence = 0;

  const owned = <T extends { ownerUserId: AuthenticatedUserId }>(
    ownerUserId: AuthenticatedUserId,
    value: T | undefined,
  ): T => {
    if (!value || value.ownerUserId !== ownerUserId) return notFound();
    return copy(value);
  };

  const deterministicStrategy = (): Strategy => ({
    name: "I03_TEST_STRATEGY",
    category: "TREND",
    analyze: (input) => ({
      signal: input.candles.length === 1 ? "SELL" : "HOLD",
      signalAt: input.candles.at(-1)?.timestamp ?? FIXED_NOW,
      visualization: [],
    }),
  });

  return {
    listStrategies: () => strategyPublic.listStrategies(),
    defineStrategy: async (ownerContext, command) => {
      const id = `${ownerContext.authenticatedUserId}-definition-${definitionSequence++}`;
      const value: StrategyDefinition = {
        ...strategyDefinition(ownerContext.authenticatedUserId, id),
        logicalFamilyKey: command.logicalFamilyKey,
        strategyName: command.strategyName,
        parameters: command.parameters,
      };
      definitions.set(id, value);
      return copy(value);
    },
    defineComposite: async (ownerContext, command) => {
      const components = command.strategyDefinitionIds.map((strategyDefinitionId) => {
        const definition = definitions.get(strategyDefinitionId);
        if (!definition || definition.ownerUserId !== ownerContext.authenticatedUserId) return notFound();
        return { strategyDefinitionId, strategyDefinitionVersion: definition.version };
      });
      const id = `${ownerContext.authenticatedUserId}-composite-${compositeSequence++}`;
      const value: CompositeStrategyDefinition = {
        id,
        ownerUserId: ownerContext.authenticatedUserId,
        logicalFamilyKey: command.logicalFamilyKey,
        version: 1,
        method: "MAJORITY_VOTE",
        combinationProfileId: "MAJORITY_VOTE_V1",
        components,
        createdAt: FIXED_NOW,
      };
      composites.set(id, value);
      return copy(value);
    },
    readStrategyDefinition: async (ownerContext, id) => owned(ownerContext.authenticatedUserId, definitions.get(id)),
    readCompositeDefinition: async (ownerContext, id) => owned(ownerContext.authenticatedUserId, composites.get(id)),
    listStrategyDefinitions: async (ownerContext, page) => ({
      items: [...definitions.values()]
        .filter((definition) => definition.ownerUserId === ownerContext.authenticatedUserId)
        .sort((left, right) => left.id.localeCompare(right.id))
        .slice(0, page.limit)
        .map(copy),
    }),
    listCompositeDefinitions: async (ownerContext, page) => ({
      items: [...composites.values()]
        .filter((definition) => definition.ownerUserId === ownerContext.authenticatedUserId)
        .sort((left, right) => left.id.localeCompare(right.id))
        .slice(0, page.limit)
        .map(copy),
    }),
    resolveStrategy: async () => deterministicStrategy(),
    combineSignals: (definition, signals) => strategyPublic.combineSignals(definition, signals),
  };
}

interface AuthoringFixture {
  port: ReturnType<typeof createStrategyAuthoringPort>;
  dependencies: StrategyAuthoringApplicationDependencies;
  providerCalls: Array<{ prompt?: string; newsItemId?: string; timeoutMs: 45_000 }>;
  definitions: Map<string, StrategyDefinition>;
  drafts: Map<string, StrategyAuthoringDraft>;
}

function createAuthoringFixture(news: NewsModulePublicApi): AuthoringFixture {
  const definitions = new Map<string, StrategyDefinition>();
  const drafts = new Map<string, StrategyAuthoringDraft>();
  const providerCalls: AuthoringFixture["providerCalls"] = [];
  let idSequence = 0;

  const definitionRepository: StrategyAuthoringApplicationDependencies["definitionRepository"] = {
    allocateNextVersion: async (ownerUserId, logicalFamilyKey) => [...definitions.values()]
      .filter((definition) => definition.ownerUserId === ownerUserId && definition.logicalFamilyKey === logicalFamilyKey)
      .reduce((maximum, definition) => Math.max(maximum, definition.version), 0) + 1,
    insert: async (ownerUserId, definition) => {
      if (definition.ownerUserId !== ownerUserId) return notFound();
      definitions.set(definition.id, copy(definition));
      return copy(definition);
    },
    getByOwnerAndId: async (ownerUserId, id) => {
      const definition = definitions.get(id);
      return definition?.ownerUserId === ownerUserId ? copy(definition) : undefined;
    },
    listByOwner: async (ownerUserId, page) => ({
      items: [...definitions.values()]
        .filter((definition) => definition.ownerUserId === ownerUserId)
        .slice(0, page.limit)
        .map(copy),
    }),
  };

  const draftRepository: StrategyAuthoringApplicationDependencies["draftRepository"] = {
    insert: async (ownerUserId, draft) => {
      if (draft.ownerUserId !== ownerUserId) return notFound();
      drafts.set(draft.id, copy(draft));
      return copy(draft);
    },
    getByOwnerAndId: async (ownerUserId, draftId) => {
      const draft = drafts.get(draftId);
      return draft?.ownerUserId === ownerUserId ? copy(draft) : undefined;
    },
    save: async (ownerUserId, draft) => {
      const current = drafts.get(draft.id);
      if (!current || current.ownerUserId !== ownerUserId || draft.ownerUserId !== ownerUserId) return notFound();
      drafts.set(draft.id, copy(draft));
      return copy(draft);
    },
  };

  const provider: NonNullable<StrategyAuthoringApplicationDependencies["provider"]> = {
    id: "openai-compatible-test-adapter",
    modelId: "configured-test-model",
    configured: true,
    createStructuredDraft: async (input) => {
      providerCalls.push(copy(input));
      return { fastPeriod: 1, slowPeriod: 2 };
    },
  };

  const dependencies: StrategyAuthoringApplicationDependencies = {
    factories: strategyPublic.STRATEGY_FACTORIES,
    definitionRepository,
    draftRepository,
    provider,
    news,
    logicalFamilyKey: "news-authored-ma",
    strategyName: "MA",
    clock: { now: () => FIXED_NOW },
    idFactory: () => `authoring-${++idSequence}`,
  };

  return {
    port: createStrategyAuthoringPort(context(USER_A), dependencies),
    dependencies,
    providerCalls,
    definitions,
    drafts,
  };
}

function createSnapshotMarket(): Pick<MarketDataModulePublicApi, "createDatasetSnapshot" | "readDatasetSnapshot"> {
  const candles: Candle[] = [
    {
      pair: "BTCUSDT",
      timeframe: "1h",
      timestamp: "2026-01-01T00:00:00.000Z",
      open: 100,
      high: 101,
      low: 99,
      close: 101,
      volume: 10,
      isClosed: true,
    },
    {
      pair: "BTCUSDT",
      timeframe: "1h",
      timestamp: "2026-01-01T01:00:00.000Z",
      open: 110,
      high: 111,
      low: 109,
      close: 111,
      volume: 10,
      isClosed: true,
    },
    {
      pair: "BTCUSDT",
      timeframe: "1h",
      timestamp: "2026-01-01T02:00:00.000Z",
      open: 120,
      high: 121,
      low: 119,
      close: 121,
      volume: 10,
      isClosed: true,
    },
    {
      pair: "BTCUSDT",
      timeframe: "1h",
      timestamp: "2026-01-01T03:00:00.000Z",
      open: 130,
      high: 131,
      low: 128,
      close: 129,
      volume: 10,
      isClosed: true,
    },
  ];
  const snapshot: DatasetSnapshotRef = {
    id: "dataset-i03",
    provider: "binance",
    pair: "BTCUSDT",
    timeframe: "1h",
    range: copy(RANGE),
    candleCount: candles.length,
    replayGuarantee: "EXACT_REPLAY_AVAILABLE",
    version: "dataset-v1",
    createdAt: FIXED_NOW,
  };
  return {
    createDatasetSnapshot: async () => copy(snapshot),
    readDatasetSnapshot: async (query) => {
      if (query.snapshotId !== snapshot.id) return notFound();
      return { snapshot: copy(snapshot), candles: copy(candles) };
    },
  };
}

function paperConfiguration(): BacktestConfiguration {
  const paperExecution = {
    executionProfileId: "SYNTHETIC_SHORT_PAPER_V1" as const,
    positionMode: "SYNTHETIC_SHORT" as const,
    exitPolicyId: "STOP_LOSS_WINS_V1" as const,
    feeRatePercent: 0.08 as const,
    adverseSlippageBps: 5 as const,
    decimalScale: 8 as const,
    roundingMode: "HALF_UP" as const,
  };
  return {
    executionProfileId: "BACKTEST_EXECUTION_V1",
    initialCapital: 1_000,
    feeRatePercent: 0,
    slippageBps: 0,
    paperExecution,
  };
}

function createLeaderboardFixture(
  repositories: ReturnType<typeof createInMemoryBacktestingRepositories>,
): LeaderboardModulePublicApi {
  const configuration: RankingConfiguration = {
    id: RANKING_CONFIGURATION_ID,
    profileId: LINEAR_REQUIRED_V1.id,
    version: LINEAR_REQUIRED_V1.version,
    name: "I-03 required ranking",
    formula: { ...LINEAR_REQUIRED_V1.formula },
    minimumNumberOfTrades: LINEAR_REQUIRED_V1.eligibility.minimumNumberOfTrades,
    tieBreakers: LINEAR_REQUIRED_V1.tieBreakers,
    createdAt: FIXED_NOW,
  };
  const scopes = new Map<string, LeaderboardScope>();
  const entries = new Map<string, LeaderboardEntry>();
  const entryOwners = new Map<string, AuthenticatedUserId>();
  let entrySequence = 0;
  let scopeSequence = 0;

  const rankable = async (
    ownerUserId: AuthenticatedUserId,
    experimentId: string,
  ): Promise<RankableExperiment | undefined> => {
    const experiment = await repositories.experimentRepository.getByCandidateOwnerAndId(ownerUserId, experimentId);
    if (!experiment) return undefined;
    return {
      executionState: "SUCCEEDED",
      experimentId: experiment.id,
      candidateId: experiment.candidateId,
      ...(experiment.searchRunId === undefined ? {} : { searchRunId: experiment.searchRunId }),
      metrics: copy(experiment.metrics),
    };
  };

  return createLeaderboardModule({
    scopeRepository: {
      insert: async (ownerUserId, command) => {
        const scope: LeaderboardScope = {
          id: `scope-${++scopeSequence}`,
          ownerUserId,
          name: command.name,
          k: command.k ?? 10,
          rankingConfigurationId: command.rankingConfigurationId,
          comparisonKey: command.comparisonKey,
          createdAt: FIXED_NOW,
        };
        scopes.set(scope.id, copy(scope));
        return copy(scope);
      },
      getByOwnerAndId: async (ownerUserId, id) => {
        const scope = scopes.get(id);
        return scope?.ownerUserId === ownerUserId ? copy(scope) : undefined;
      },
    },
    entryRepository: {
      getActiveTopK: async (ownerUserId, scopeId) => [...entries.values()]
        .filter((entry) => entry.leaderboardScopeId === scopeId && entryOwners.get(entry.id) === ownerUserId)
        .map(copy),
      listByOwnerAndSearchRun: async (ownerUserId, searchRunId) => [...entries.values()]
        .filter((entry) => entry.searchRunId === searchRunId && entryOwners.get(entry.id) === ownerUserId)
        .map(copy),
      insertForScopeOwner: async (ownerUserId, entry) => {
        const stored: LeaderboardEntry = {
          ...entry,
          id: `entry-${++entrySequence}`,
          rank: 0,
        };
        entries.set(stored.id, copy(stored));
        entryOwners.set(stored.id, ownerUserId);
        return copy(stored);
      },
      deactivateForScopeOwner: async (ownerUserId, entryId) => {
        if (entryOwners.get(entryId) !== ownerUserId) return notFound();
        entries.delete(entryId);
        entryOwners.delete(entryId);
      },
      findByScopeOwnerAndExperiment: async (ownerUserId, scopeId, experimentId) => [...entries.values()]
        .find((entry) => entry.leaderboardScopeId === scopeId
          && entry.experimentId === experimentId
          && entryOwners.get(entry.id) === ownerUserId),
    },
    configurationRepository: {
      getById: async (id) => id === configuration.id ? copy(configuration) : undefined,
      listAll: async () => [copy(configuration)],
    },
    experimentRepository: {
      getByOwnerAndId: (ownerUserId, experimentId) => rankable(ownerUserId, experimentId),
      listByOwnerAndSearchRun: async (ownerUserId, searchRunId) => {
        const experiments = await repositories.experimentRepository.listByCandidateOwnerAndSearchRun(ownerUserId, searchRunId);
        return Promise.all(experiments.map((experiment) => rankable(ownerUserId, experiment.id))).then(
          (values) => values.filter((value): value is RankableExperiment => value !== undefined),
        );
      },
    },
    clock: { now: () => FIXED_NOW },
  });
}

interface IntegratedFixture {
  repositories: ReturnType<typeof createInMemoryBacktestingRepositories>;
  strategy: StrategyModulePublicApi;
  leaderboard: LeaderboardModulePublicApi;
  backtesting: BacktestingApplication;
  search: SearchModulePublicApi;
  registry: ReturnType<typeof createSearchGeneratorRegistry>;
  scope: LeaderboardScope;
}

async function createIntegratedFixture(): Promise<IntegratedFixture> {
  const repositories = createInMemoryBacktestingRepositories();
  let candidateSequence = 0;
  repositories.idGenerator = () => `candidate-${++candidateSequence}`;
  repositories.clock = { now: () => FIXED_NOW };
  const strategy = createStrategyFacade();
  const leaderboard = createLeaderboardFixture(repositories);
  const marketData = createSnapshotMarket();
  let backtesting: BacktestingApplication | undefined;
  let search: SearchModulePublicApi | undefined;
  const execution = createBoundedLocalBacktestExecutor<CandidateExecutionRequest, CandidateRunResult>({
    capacity: 2,
    runner: {
      run: (request, signal) => {
        if (!backtesting) return Promise.reject(new Error("backtesting fixture is not initialized"));
        return backtesting.runCandidate(request, signal);
      },
    },
    clock: repositories.clock,
  });
  backtesting = createBacktestingApplication(
    repositories.createDependencies({
      execution,
      marketData,
      strategy,
      evaluation: createEvaluationModule(),
      leaderboard,
    }),
    {
      searchRunOwnerGuard: async (ownerContext, searchRunId) => {
        if (!search) throw new Error("Search module is not initialized");
        await search.status(ownerContext, searchRunId);
      },
    },
  );

  const registry = createSearchGeneratorRegistry({
    domainGuided: {
      categories: ["TREND", "MOMENTUM"],
      categoryMembers: {
        TREND: ["strategy-a", "strategy-b"],
        MOMENTUM: ["strategy-c"],
      },
    },
  });
  const searchRuns = new Map<string, SearchRunStatus>();
  let searchSequence = 0;
  const searchRunRepository = {
    getByOwnerAndId: async (ownerUserId: AuthenticatedUserId, searchRunId: string) => {
      const value = searchRuns.get(searchRunId);
      return value?.ownerUserId === ownerUserId ? copy(value) : undefined;
    },
    save: async (ownerUserId: AuthenticatedUserId, value: SearchRunStatus) => {
      if (value.ownerUserId !== ownerUserId) return notFound();
      searchRuns.set(value.searchRunId, copy(value));
      return copy(value);
    },
    listByOwner: async (ownerUserId: AuthenticatedUserId, page: { limit: number; cursor?: string }) => ({
      items: [...searchRuns.values()]
        .filter((value) => value.ownerUserId === ownerUserId)
        .slice(0, page.limit)
        .map(copy),
    }),
  };
  search = createSearchModule({
    searchRunRepository,
    generators: registry,
    strategy: { defineComposite: strategy.defineComposite },
    backtesting: {
      submitSearchCandidate: backtesting.submitSearchCandidate,
      status: backtesting.status,
      summarizeSearchCandidates: backtesting.summarizeSearchCandidates,
      cancelSearchCandidates: backtesting.cancelSearchCandidates,
    },
    leaderboard: {
      getLeaderboardScope: leaderboard.getLeaderboardScope,
      rankSearchRun: leaderboard.rankSearchRun,
    },
  }, {
    clock: { now: () => FIXED_NOW },
    idGenerator: () => `search-${++searchSequence}`,
    pollIntervalMs: 0,
  });
  const scope = await leaderboard.createLeaderboardScope(context(USER_A), {
    name: "I-03 scope",
    rankingConfigurationId: RANKING_CONFIGURATION_ID,
    comparisonKey: "BTCUSDT|1h",
  });
  return { repositories, strategy, leaderboard, backtesting, search, registry, scope };
}

function searchSpace(ids: readonly string[] = ["strategy-a", "strategy-b", "strategy-c"]): SearchSpaceConfig {
  return {
    availableStrategyDefinitionIds: ids,
    componentCount: { minimum: 2, maximum: 2 },
    requireDistinctComponents: true,
  };
}

function seededProvenance(seed: string): SeededDiscoveryProvenance {
  return {
    profileId: "RANDOM_V1",
    algorithmConfiguration: {},
    datasetIdentity: { datasetId: "dataset-i03", datasetVersion: "dataset-v1", provider: "binance" },
    code: { applicationVersion: "i03-test-runtime", gitCommit: "i03-test-commit" },
    seed,
    defaultBudget: { maxCandidates: 500, maxDurationSeconds: 300 },
  };
}

async function waitForCandidate(
  backtesting: BacktestingModulePublicApi,
  ownerUserId: AuthenticatedUserId,
  candidateId: string,
): Promise<CandidateProgress> {
  const deadline = Date.now() + 5_000;
  let latest = await backtesting.status(context(ownerUserId), candidateId);
  while (latest.status !== "SUCCEEDED" && latest.status !== "FAILED" && Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
    latest = await backtesting.status(context(ownerUserId), candidateId);
  }
  if (latest.status !== "SUCCEEDED") throw new Error(`candidate did not succeed: ${latest.status}`);
  return latest;
}

async function waitForSearch(
  search: SearchModulePublicApi,
  ownerUserId: AuthenticatedUserId,
  searchRunId: string,
): Promise<SearchRunStatus> {
  const deadline = Date.now() + 5_000;
  let latest = await search.status(context(ownerUserId), searchRunId);
  while (latest.state !== "COMPLETED" && latest.state !== "FAILED" && Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
    latest = await search.status(context(ownerUserId), searchRunId);
  }
  if (latest.state !== "COMPLETED") throw new Error(`SearchRun did not complete: ${latest.state}`);
  return latest;
}

function sequence(
  generator: { generate(request: { searchSpace: SearchSpaceConfig; randomSeed: string; iterationNumber: number; previouslyGeneratedCandidateKeys: readonly string[] }): { candidateKey: string } },
  input: SearchSpaceConfig,
  seed: string,
  count: number,
): readonly string[] {
  const previous: string[] = [];
  const result: string[] = [];
  for (let iterationNumber = 1; iterationNumber <= count; iterationNumber += 1) {
    const generated = generator.generate({
      searchSpace: input,
      randomSeed: seed,
      iterationNumber,
      previouslyGeneratedCandidateKeys: previous,
    });
    result.push(generated.candidateKey);
    previous.push(generated.candidateKey);
  }
  return result;
}

class TestSocket extends Duplex {
  public readonly writes: Buffer[] = [];

  public _read(): void {}

  public _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error) => void,
  ): void {
    this.writes.push(Buffer.isBuffer(chunk) ? Buffer.from(chunk) : Buffer.from(chunk, encoding));
    callback();
  }
}

function clientTextFrame(text: string): Buffer {
  const payload = Buffer.from(text, "utf8");
  const mask = Buffer.from([0x11, 0x22, 0x33, 0x44]);
  const masked = Buffer.from(payload);
  for (let index = 0; index < masked.length; index += 1) masked[index] = masked[index]! ^ mask[index % 4]!;
  if (payload.length < 126) return Buffer.concat([Buffer.from([0x81, 0x80 | payload.length]), mask, masked]);
  if (payload.length <= 0xffff) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
    return Buffer.concat([header, mask, masked]);
  }
  throw new Error("I-03 test frame is too large");
}

function serverTextFrames(socket: TestSocket): MarketWebSocketServerMessage[] {
  const bytes = Buffer.concat(socket.writes);
  const handshakeEnd = bytes.indexOf(Buffer.from("\r\n\r\n", "utf8"));
  if (handshakeEnd < 0) return [];
  const frames: MarketWebSocketServerMessage[] = [];
  let offset = handshakeEnd + 4;
  while (offset + 2 <= bytes.length) {
    const first = bytes[offset]!;
    const second = bytes[offset + 1]!;
    if ((first & 0x0f) !== 0x1 || (second & 0x80) !== 0) break;
    let length = second & 0x7f;
    let headerLength = 2;
    if (length === 126) {
      if (offset + 4 > bytes.length) break;
      length = bytes.readUInt16BE(offset + 2);
      headerLength = 4;
    }
    const end = offset + headerLength + length;
    if (end > bytes.length) break;
    frames.push(JSON.parse(bytes.subarray(offset + headerLength, end).toString("utf8")) as MarketWebSocketServerMessage);
    offset = end;
  }
  return frames;
}

function websocketRequest(cookie: string | undefined, path = "/market-data/ws?ignored=1"): IncomingMessage {
  return {
    url: path,
    headers: {
      host: "localhost",
      upgrade: "websocket",
      "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==",
      ...(cookie === undefined ? {} : { cookie }),
    },
  } as IncomingMessage;
}

function websocketAuth(): AuthModulePublicApi {
  const identity: AuthenticatedSessionIdentity = {
    sessionId: "i03-session",
    expiresAt: FIXED_NOW,
    authenticatedUserId: USER_A,
  };
  return {
    register: async () => { throw new Error("unused"); },
    login: async () => { throw new Error("unused"); },
    resolveSession: async (token) => token === "i03-token" ? identity : undefined,
    currentUser: async () => { throw new Error("unused"); },
    logout: async () => undefined,
  };
}

function websocketMarket(sinkRef: { sink?: (update: MarketDataUpdate) => void; subscriptions?: readonly { pair: string; timeframe: string }[] }): MarketDataModuleRuntime {
  return {
    readCandles: async () => { throw new Error("unused"); },
    createDatasetSnapshot: async () => { throw new Error("unused"); },
    readDatasetSnapshot: async () => { throw new Error("unused"); },
    subscribeMarketData: async (subscriptions, sink) => {
      sinkRef.subscriptions = subscriptions;
      sinkRef.sink = sink;
      sink({ kind: "CONNECTION_STATUS", payload: { provider: "binance", status: "CONNECTED", lastEventAt: FIXED_NOW } });
      return async () => undefined;
    },
    readObservability: async () => ({
      profileId: "MARKET_OBSERVABILITY_V1",
      pair: "BTCUSDT",
      connection: { provider: "binance", status: "CONNECTED", lastEventAt: FIXED_NOW },
      lastLatencyMs: 5,
      latestTicks: [{
        pair: "BTCUSDT",
        price: 101,
        timestamp: FIXED_NOW,
        providerEventAt: FIXED_NOW,
        receivedAt: FIXED_NOW,
        latencyMs: 5,
      }],
      persistence: "EPHEMERAL_IN_MEMORY_ONLY",
    }),
    shutdown: async () => undefined,
  };
}

async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("INS-124 / I-03 backend boundary proof", () => {
  it("joins safe URL import to approved Strategy authoring without leaking URL, prompt, or provider secrets", async () => {
    const fixture = createNewsBoundaryFixture();
    const template = await fixture.news.proposeTemplate({
      id: "template-1",
      sourceId: NEWS_SOURCE_ID,
      configuration: { articleSelector: "article" },
      createdAt: FIXED_NOW,
    });
    expect(template).toMatchObject({ id: "template-1", status: "DRAFT", version: 1 });
    expect(await fixture.news.approveTemplate(template.id)).toMatchObject({ id: "template-1", status: "APPROVED" });

    const imported = await fixture.news.importUrl({
      url: `https://news.example.test/articles/bitcoin#${RAW_IMPORT_MARKER}`,
      sourceId: NEWS_SOURCE_ID,
    });
    expect(imported).toMatchObject({ status: "FETCHED", canonicalUrl: "https://news.example.test/articles/bitcoin" });
    expect(imported.newsItemId).toBeTruthy();
    expect(fixture.safetyCalls).toEqual([{
      url: `https://news.example.test/articles/bitcoin#${RAW_IMPORT_MARKER}`,
      sourceId: NEWS_SOURCE_ID,
      timeoutMs: 20_000,
      maximumRedirects: 3,
      maximumBodyBytes: 1_048_576,
    }]);
    expect(fixture.transportCalls).toEqual([{
      url: "https://news.example.test/articles/bitcoin",
      credentials: "omit",
      redirect: "manual",
    }]);

    const page = await fixture.news.readNews({
      limit: 10,
      order: "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC",
    });
    expect(page.items).toHaveLength(1);
    const newsItem = page.items[0]!;
    expect(newsItem).toMatchObject({
      id: imported.newsItemId,
      url: "https://news.example.test/articles/bitcoin",
      extraction: {
        sourceKind: "ALLOWLISTED_URL_IMPORT",
        canonicalUrl: "https://news.example.test/articles/bitcoin",
        template: { id: "template-1", version: 1, status: "APPROVED" },
      },
      sentiment: null,
    });
    await expect(fixture.extractionRepository.readByNewsId(newsItem.id)).resolves.toMatchObject({
      newsId: newsItem.id,
      canonicalUrl: "https://news.example.test/articles/bitcoin",
      template: { version: 1, status: "APPROVED" },
    });
    await expect(fixture.rawHtmlRepository.readByNewsId(newsItem.id)).resolves.toMatchObject({
      newsId: newsItem.id,
      purgeAfter: addDays(FIXED_NOW, 7),
    });

    const authoring = createAuthoringFixture(fixture.news);
    const draft = await authoring.port.createDraft({
      source: { kind: "APPROVED_NEWS_ITEM", newsItemId: newsItem.id },
    });
    expect(draft).toMatchObject({
      ownerUserId: USER_A,
      profileId: "LLM_AUTHORING_V1",
      source: { kind: "APPROVED_NEWS_ITEM", newsItemId: newsItem.id },
      provider: { id: "openai-compatible-test-adapter", modelId: "configured-test-model", configured: true },
      status: "DRAFT",
      structuredDraft: { fastPeriod: 1, slowPeriod: 2 },
    });
    expect(authoring.definitions).toHaveLength(0);
    expect(authoring.providerCalls).toHaveLength(1);
    expect(authoring.providerCalls[0]).toMatchObject({ newsItemId: newsItem.id, timeoutMs: 45_000 });
    expect(authoring.providerCalls[0]?.prompt).toContain("Bitcoin market update");
    expect(authoring.providerCalls[0]?.prompt).not.toContain("news.example.test");
    expect(authoring.providerCalls[0]?.prompt).not.toContain(RAW_IMPORT_MARKER);

    const validated = await authoring.port.validateDraft(draft);
    expect(validated).toMatchObject({ status: "VALIDATED", validation: { valid: true, reasons: [] } });
    expect(authoring.definitions).toHaveLength(0);
    const approvedDefinition = await authoring.port.approveDraft(draft.id);
    expect(approvedDefinition).toMatchObject({
      ownerUserId: USER_A,
      authoringOrigin: {
        kind: "APPROVED_NEWS_ITEM",
        newsItemId: newsItem.id,
        extractionTemplateVersion: 1,
      },
    });
    expect(authoring.definitions).toHaveLength(1);
    expect(toStrategyDefinitionDto(approvedDefinition)).toMatchObject({
      ownerUserId: USER_A,
      authoringOrigin: { kind: "APPROVED_NEWS_ITEM", newsItemId: newsItem.id, extractionTemplateVersion: 1 },
    });

    const otherOwner = createStrategyAuthoringPort(context(USER_B), authoring.dependencies);
    await expect(otherOwner.validateDraft(draft)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(otherOwner.approveDraft(draft.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(JSON.stringify({ draft, approvedDefinition })).not.toContain("news.example.test");
    expect(JSON.stringify({ draft, approvedDefinition })).not.toContain(RAW_IMPORT_MARKER);

    const rejected = await fixture.news.importUrl({ url: "http://news.example.test/article", sourceId: NEWS_SOURCE_ID });
    expect(rejected).toEqual({ status: "REJECTED", reason: "NOT_HTTPS" });
    const failedCollection = await fixture.news.collect({ providerIds: ["failing-provider"], limit: 1 });
    expect(failedCollection).toEqual({ fetchedCount: 0, storedCount: 0, duplicateCount: 0, rejectedCount: 0 });
    expect(fixture.providerFailures.some(({ providerId }) => providerId === "failing-provider")).toBe(true);
    expect(fixture.sentimentFailures).toContainEqual({ newsId: newsItem.id, reason: "INFERENCE_ERROR" });
    expect(fixture.extractionFailures).toEqual([]);
  });

  it("joins seeded Search to synthetic paper Backtesting, Evaluation, and Leaderboard with owner isolation", async () => {
    const fixture = await createIntegratedFixture();
    const seed = "i03-reproducibility-seed";
    const seeded = seededProvenance(seed);
    const started = await fixture.search.start(context(USER_A), {
      searchSpace: searchSpace(),
      stopCondition: { maxCandidates: 2 },
      generatorType: "RANDOM",
      randomSeed: seed,
      leaderboardScopeId: fixture.scope.id,
      candidateTemplate: {
        marketInput: { pair: "BTCUSDT", timeframe: "1h", range: copy(RANGE) },
        configuration: paperConfiguration(),
      },
      maxInFlight: 1,
      seededDiscovery: seeded,
    });
    const status = await waitForSearch(fixture.search, USER_A, started.searchRunId);
    expect(status).toMatchObject({
      ownerUserId: USER_A,
      state: "COMPLETED",
      generatorType: "RANDOM",
      randomSeed: seed,
      submittedCandidateCount: 2,
      completedCandidateCount: 2,
      failedCandidateCount: 0,
      seededDiscovery: {
        profileId: "RANDOM_V1",
        seed,
        datasetIdentity: { datasetId: "dataset-i03", datasetVersion: "dataset-v1", provider: "binance" },
        code: { applicationVersion: "i03-test-runtime", gitCommit: "i03-test-commit" },
        defaultBudget: { maxCandidates: 500, maxDurationSeconds: 300 },
      },
    });
    const mappedStatus = toSearchRunStatusDto(status);
    expect(mappedStatus).toMatchObject({ seededDiscovery: seeded });

    const candidates = await fixture.backtesting.listSearchCandidates(context(USER_A), started.searchRunId, { limit: 100 });
    expect(candidates.items).toHaveLength(2);
    expect(candidates.items.every((candidate) => candidate.ownerUserId === USER_A)).toBe(true);
    expect(candidates.items.every((candidate) => candidate.origin.kind === "SEARCH")).toBe(true);
    expect(candidates.items.every((candidate) => candidate.status === "SUCCEEDED")).toBe(true);

    const experiments = await fixture.backtesting.listSearchExperiments(context(USER_A), started.searchRunId);
    expect(experiments).toHaveLength(2);
    for (const experiment of experiments) {
      expect(experiment).toMatchObject({
        searchRunId: started.searchRunId,
        marketData: {
          provider: "binance",
          datasetId: "dataset-i03",
          datasetVersion: "dataset-v1",
          replayGuarantee: "EXACT_REPLAY_AVAILABLE",
        },
        configuration: {
          executionProfileId: "BACKTEST_EXECUTION_V1",
          paperExecution: {
            executionProfileId: "SYNTHETIC_SHORT_PAPER_V1",
            positionMode: "SYNTHETIC_SHORT",
            exitPolicyId: "STOP_LOSS_WINS_V1",
            feeRatePercent: 0.08,
            adverseSlippageBps: 5,
            decimalScale: 8,
            roundingMode: "HALF_UP",
          },
        },
        paperExecutionProvenance: {
          executionProfileId: "SYNTHETIC_SHORT_PAPER_V1",
          positionMode: "SYNTHETIC_SHORT",
          exitPolicyId: "STOP_LOSS_WINS_V1",
          decimalScale: 8,
        },
        metrics: { evaluationProfileId: "REQUIRED_METRICS_V1", numberOfTrades: 1 },
      });
      const trades = await fixture.backtesting.listExperimentTrades(context(USER_A), experiment.id, { limit: 100 });
      expect(trades.items).toHaveLength(1);
      expect(trades.items[0]).toMatchObject({ positionMode: "SYNTHETIC_SHORT", slippageBps: 5 });
      expect(trades.items[0]).not.toHaveProperty("leverage");
      expect(trades.items[0]).not.toHaveProperty("margin");
      expect(toExperimentDto(experiment)).toMatchObject({
        paperExecutionProvenance: { executionProfileId: "SYNTHETIC_SHORT_PAPER_V1", decimalScale: 8 },
      });
    }

    const rankingA = await fixture.search.leaderboard(context(USER_A), started.searchRunId);
    expect(rankingA).toHaveLength(2);
    expect(rankingA).toEqual(await fixture.search.leaderboard(context(USER_A), started.searchRunId));
    expect(await fixture.leaderboard.topK(context(USER_A), fixture.scope.id)).toHaveLength(2);
    await expect(fixture.search.status(context(USER_B), started.searchRunId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(fixture.backtesting.status(context(USER_B), candidates.items[0]!.candidateId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(fixture.backtesting.readExperiment(context(USER_B), experiments[0]!.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(fixture.backtesting.listExperimentTrades(context(USER_B), experiments[0]!.id, { limit: 100 })).rejects.toThrow("NOT_FOUND");
    await expect(fixture.leaderboard.topK(context(USER_B), fixture.scope.id)).rejects.toMatchObject({ code: "NOT_FOUND" });

    const reproducibilitySpace = searchSpace(["strategy-a", "strategy-b", "strategy-c", "strategy-d"]);
    const reproducibilityRegistry = createSearchGeneratorRegistry({
      domainGuided: {
        categories: ["TREND", "MOMENTUM"],
        categoryMembers: {
          TREND: ["strategy-a", "strategy-b"],
          MOMENTUM: ["strategy-c", "strategy-d"],
        },
      },
    });
    for (const registration of reproducibilityRegistry.registrations) {
      expect(sequence(registration.generator, reproducibilitySpace, seed, 3))
        .toEqual(sequence(registration.generator, reproducibilitySpace, seed, 3));
    }
    expect(reproducibilityRegistry.GENETIC.algorithmConfiguration).toMatchObject({
      population: 50,
      maximumGenerations: 10,
      elitePercent: 0.1,
      mutationPercent: 0.2,
    });
  });

  it("keeps market delivery ephemeral and market-only at the backend WebSocket boundary", async () => {
    const sinkRef: { sink?: (update: MarketDataUpdate) => void; subscriptions?: readonly { pair: string; timeframe: string }[] } = {};
    const marketData = websocketMarket(sinkRef);
    const runtime = createBackendRuntime({ auth: websocketAuth(), marketData, databaseReady: true });
    const server = new EventEmitter() as unknown as Server;
    runtime.marketWebSocket.attach(server);

    const unauthenticated = new TestSocket();
    server.emit("upgrade", websocketRequest(undefined), unauthenticated, Buffer.alloc(0));
    await flush();
    expect(Buffer.concat(unauthenticated.writes).toString("utf8")).toContain("HTTP/1.1 401 Unauthorized");

    const socket = new TestSocket();
    server.emit("upgrade", websocketRequest("cryptox_session=i03-token"), socket, Buffer.alloc(0));
    await flush();
    expect(Buffer.concat(socket.writes).toString("utf8")).toContain("HTTP/1.1 101 Switching Protocols");
    socket.push(clientTextFrame(JSON.stringify({
      schemaVersion: 1,
      type: "SUBSCRIBE",
      requestId: "i03-request",
      payload: { subscriptions: [{ pair: "btcusdt", timeframe: "5m" }] },
    })));
    await flush();
    expect(sinkRef.subscriptions).toEqual([{ pair: "BTCUSDT", timeframe: "5m" }]);
    sinkRef.sink?.({ kind: "TICK", payload: { pair: "BTCUSDT", price: 101, timestamp: FIXED_NOW } });
    await flush();
    const messages = serverTextFrames(socket);
    expect(messages.map((message) => message.type)).toEqual(expect.arrayContaining([
      "CONNECTION_STATUS",
      "SUBSCRIPTION_ACK",
      "MARKET_OBSERVABILITY",
      "MARKET_TICK",
    ]));
    expect(messages.find((message) => message.type === "MARKET_OBSERVABILITY")?.payload).toMatchObject({
      profileId: "MARKET_OBSERVABILITY_V1",
      persistence: "EPHEMERAL_IN_MEMORY_ONLY",
    });
    expect(messages.find((message) => message.type === "SUBSCRIPTION_ACK")?.payload).toMatchObject({
      accepted: [{ subscription: { pair: "BTCUSDT", timeframe: "5m" }, state: "ACTIVE" }],
    });
    expect(messages.find((message) => message.type === "MARKET_TICK")?.payload).toMatchObject({ pair: "BTCUSDT", price: 101 });
    expect(messages.some((message) => message.type === ("LEADERBOARD_UPDATED" as never))).toBe(false);
    expect(JSON.stringify(messages)).not.toContain("secret");
    expect(JSON.stringify(messages)).not.toContain("leaderboard");

    const history: HistoricalCandlePage = {
      pair: "BTCUSDT",
      timeframe: "5m",
      range: copy(RANGE),
      candles: [],
      complete: true,
      missingRanges: [],
      formingIncluded: false,
      asOf: FIXED_NOW,
      provenance: {
        provider: "binance",
        pair: "BTCUSDT",
        timeframe: "5m",
        range: copy(RANGE),
        replayGuarantee: "TRACEABLE",
        replayLimitation: "ephemeral delivery is not historical input",
      },
    };
    expect(toMarketHistoryResponse(history)).toMatchObject({ schemaVersion: REST_SCHEMA_VERSION, pair: "BTCUSDT" });
    expect(JSON.stringify((await marketData.readObservability("BTCUSDT")))).toContain("EPHEMERAL_IN_MEMORY_ONLY");

    const unknownPath = new TestSocket();
    server.emit("upgrade", websocketRequest("cryptox_session=i03-token", "/events"), unknownPath, Buffer.alloc(0));
    await flush();
    expect(Buffer.concat(unknownPath.writes).toString("utf8")).toContain("HTTP/1.1 404 Not Found");
    await runtime.close();
  });

  it("fails closed when final real persistence/provider composition is absent and sanitizes observability", async () => {
    const runtime = createBackendRuntime({ databaseUrl: "", databaseReady: false });
    try {
      expect(runtime.strategyConfigured).toBe(false);
      expect(runtime.backtesting).toBeUndefined();
      expect(runtime.search).toBeUndefined();
      expect(runtime.leaderboard).toBeUndefined();
      expect(runtime.news).toBeUndefined();
      expect(runtime.readiness().status).toBe("not-ready");
      expect(runtime.readiness().unavailableRequired.map(({ name }) => name)).toEqual(expect.arrayContaining([
        "auth-persistence",
        "persistence-adapters",
        "market-data-provider",
        "backtest-runner",
        "leaderboard-persistence",
        "strategy-persistence",
        "search-composition",
      ]));
      runtime.markFailure("news-provider", "api_key=secret must not be returned");
      runtime.markFailure("sentiment-provider", "provider secret must not be returned");
      expect(JSON.stringify(runtime.composition())).not.toContain("secret");
      expect(JSON.stringify(runtime.composition())).not.toContain("api_key");
    } finally {
      await runtime.close();
    }
  });
});
