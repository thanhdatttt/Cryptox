import "./module-paths";
import type { Server } from "node:http";
import type { AuthModulePublicApi } from "@cryptox/auth";
import type { BacktestingModulePublicApi } from "@cryptox/backtesting";
import {
  createBacktestingApplication,
  createBoundedLocalBacktestExecutor,
  createPostgresBacktestingDependencies,
  type BacktestingApplication,
  type CandidateExecutionRequest,
  type CandidateRunResult,
} from "@cryptox/backtesting/bootstrap";
import { createEvaluationModule } from "@cryptox/evaluation/bootstrap";
import type { LeaderboardModulePublicApi } from "@cryptox/leaderboard";
import {
  createLeaderboardModule,
  createPostgresLeaderboardDependencies,
} from "@cryptox/leaderboard/bootstrap";
import {
  createBinanceRealtimeProvider,
  createMarketDataModule,
  createPostgresMarketDataDependencies,
  type MarketDataModuleRuntime,
} from "@cryptox/market-data/bootstrap";
import type { NewsModulePublicApi } from "@cryptox/news";
import {
  createCoinDeskNewsProvider,
  createNewsModule,
  createPostgresNewsDependencies,
  createNewsRefreshScheduler,
  createRssNewsProvider,
  createSafeNewsUrlFetcher,
  type CoinDeskFetch,
  type NewsProvider,
  type NewsUrlImportExtractor,
  type SafeDnsResolver,
  type SafeNewsFetch,
  type SafeNewsUrlFetchPort,
  type NewsRefreshClock,
  type NewsRefreshScheduler,
  type NewsRefreshTimer,
} from "@cryptox/news/bootstrap";
import type { SearchModulePublicApi } from "@cryptox/search";
import {
  createPostgresSearchRunRepository,
  createSearchGeneratorRegistry,
  createSearchModule,
} from "@cryptox/search/bootstrap";
import type { SentimentModulePublicApi } from "@cryptox/sentiment";
import * as sentimentPublic from "@cryptox/sentiment";
import {
  createPostgresSentimentDependencies,
  createSentimentModule,
} from "@cryptox/sentiment/bootstrap";
import type { StrategyModulePublicApi } from "@cryptox/strategy";
import * as strategyPublic from "@cryptox/strategy";
import {
  createOpenAiCompatibleAuthoringProvider,
  createPostgresStrategyDependencies,
  createStrategyModule,
  type OpenAiCompatibleFetch,
  type StrategyModuleWithAuthoring,
} from "@cryptox/strategy/bootstrap";
import {
  ACTIVE_MVP_MODULES,
  readinessOf,
  type DependencyAvailability,
  type RuntimeCompositionState,
  type RuntimeReadiness,
} from "./compose";
import { createBackendAuthRuntime, type BackendAuthRuntime } from "./auth.runtime";
import { MarketWebSocketGateway } from "./market.gateway";

export const BACKEND_RUNTIME_TOKEN = "CRYPT0X_BACKEND_RUNTIME";

export type BackendCapabilityName =
  | "strategy"
  | "market-data"
  | "search"
  | "backtesting"
  | "leaderboard"
  | "news";

export class BackendCapabilityUnavailableError extends Error {
  public readonly code = "CAPABILITY_UNAVAILABLE" as const;

  public constructor(public readonly capability: BackendCapabilityName) {
    super(`${capability} capability is unavailable`);
    this.name = "BackendCapabilityUnavailableError";
  }
}

type StrategyRuntimeModule = StrategyModulePublicApi | StrategyModuleWithAuthoring;

interface RuntimeOverrides {
  readonly auth?: AuthModulePublicApi;
  readonly strategy?: StrategyRuntimeModule;
  readonly marketData?: MarketDataModuleRuntime;
  readonly search?: SearchModulePublicApi;
  readonly backtesting?: BacktestingModulePublicApi;
  readonly leaderboard?: LeaderboardModulePublicApi;
  readonly news?: NewsModulePublicApi;
  readonly newsRefresh?: BackendNewsRefreshOptions;
  readonly sentiment?: SentimentModulePublicApi;
  readonly databaseReady?: boolean;
}

/** Runtime-only seams for deterministic composition tests; News owns the scheduler contract. */
export interface BackendNewsRefreshOptions {
  readonly intervalMinutes?: number;
  readonly refreshIntervalMinutes?: number;
  readonly timer?: NewsRefreshTimer;
  readonly clock?: NewsRefreshClock;
}

export interface BackendRuntimeOptions extends RuntimeOverrides {
  readonly databaseUrl?: string;
}

type Closable = { close(): Promise<void> };

type BackendCapabilityApi = {
  readonly strategy: StrategyModulePublicApi;
  readonly "market-data": MarketDataModuleRuntime;
  readonly search: SearchModulePublicApi;
  readonly backtesting: BacktestingModulePublicApi;
  readonly leaderboard: LeaderboardModulePublicApi;
  readonly news: NewsModulePublicApi;
};

const APPLICATION_TABLES = [
  "users",
  "auth_sessions",
  "strategy_definitions",
  "composite_strategy_definitions",
  "composite_components",
  "market_candles",
  "market_dataset_snapshots",
  "market_dataset_snapshot_candles",
  "ranking_configurations",
  "leaderboard_scopes",
  "search_runs",
  "candidates",
  "experiments",
  "trades",
  "evaluation_results",
  "leaderboard_entries",
  "news_items",
  "sentiment_results",
  "strategy_authoring_drafts",
  "extraction_templates",
  "news_extraction_provenance",
  "news_raw_html_artifacts",
] as const;

interface QueryPool {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
}

async function probeApplicationSchema(pool: QueryPool): Promise<void> {
  const result = await pool.query<{ missing_count: number | string }>(
    `
      SELECT COUNT(*)::int AS missing_count
      FROM unnest($1::text[]) AS required(relname)
      WHERE NOT EXISTS (
        SELECT 1
        FROM pg_class relation
        INNER JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = current_schema()
          AND relation.relname = required.relname
          AND relation.relkind IN ('r', 'p')
      )
    `,
    [APPLICATION_TABLES],
  );
  const missing = Number(result.rows[0]?.missing_count);
  if (!Number.isFinite(missing) || missing !== 0) {
    throw new Error("required application schema is incomplete");
  }
}

function boundedInteger(value: string | undefined, fallback: number, maximum: number): number {
  const parsed = value === undefined ? NaN : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

export class RuntimeHealth {
  private readonly required = new Map<string, DependencyAvailability>();
  private readonly optional = new Map<string, DependencyAvailability>();

  public constructor() {
    this.setRequired("auth-persistence", false, "DATABASE_URL is not configured.");
    this.setRequired("persistence-adapters", false, "PostgreSQL application adapters are not configured.");
    this.setRequired("market-data-provider", false, "The real Binance market provider is not configured.");
    this.setRequired(
      "backtest-runner",
      false,
      "The bounded local executor is available through the public Backtesting bootstrap but is not configured without runtime persistence.",
    );
    this.setRequired("leaderboard-persistence", false, "The public PostgreSQL Leaderboard adapter is not configured.");
    this.setRequired("strategy-persistence", false, "The public PostgreSQL Strategy adapter is not configured.");
    this.setRequired("search-composition", false, "The public Search generator registry and persistence adapter are not configured.");
    this.setOptional("news-provider", false, "No explicitly configured real News provider is available.");
    this.setOptional("sentiment-provider", true, "LEXICON_V1 is provided by the public local Sentiment facade.");
    this.setOptional("sentiment-persistence", false, "The public Sentiment PostgreSQL adapter is not configured.");
  }

  public setRequired(name: string, available: boolean, detail: string): void {
    this.required.set(name, { name, available, detail });
  }

  public setOptional(name: string, available: boolean, detail: string): void {
    this.optional.set(name, { name, available, detail });
  }

  public requiredDependencies(): readonly DependencyAvailability[] {
    return [...this.required.values()];
  }

  public optionalDependencies(): readonly DependencyAvailability[] {
    return [...this.optional.values()];
  }
}

function moduleFacade(): StrategyModulePublicApi {
  const unavailableAsync = async (): Promise<never> => {
    throw new BackendCapabilityUnavailableError("strategy");
  };
  const unavailableSync = (): never => {
    throw new BackendCapabilityUnavailableError("strategy");
  };
  return {
    listStrategies: strategyPublic.listStrategies,
    defineStrategy: unavailableAsync,
    defineComposite: unavailableAsync,
    readStrategyDefinition: unavailableAsync,
    readCompositeDefinition: unavailableAsync,
    listStrategyDefinitions: unavailableAsync,
    listCompositeDefinitions: unavailableAsync,
    resolveStrategy: unavailableAsync,
    combineSignals: unavailableSync,
  };
}

function sentimentFacade(): SentimentModulePublicApi {
  return {
    analyze: sentimentPublic.analyze,
    readLatestForNews: sentimentPublic.readLatestForNews,
  };
}

function dataBaseConfigured(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export const BACKEND_RUNTIME_ENV_NAMES = {
  coindeskRssUrl: "COINDESK_RSS_URL",
  coindeskRssAllowedHosts: "COINDESK_RSS_ALLOWED_HOSTS",
  coindeskRssAllowedUrlPrefixes: "COINDESK_RSS_ALLOWED_URL_PREFIXES",
  coindeskRssAllowedUrls: "COINDESK_RSS_ALLOWED_URLS",
} as const;

export type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

export interface RuntimeProviderCompositionOptions {
  readonly environment?: RuntimeEnvironment;
  readonly safeNewsFetch?: SafeNewsFetch;
  readonly safeDnsResolver?: SafeDnsResolver;
  readonly coinDeskFetch?: CoinDeskFetch;
  readonly authoringFetch?: OpenAiCompatibleFetch;
}

export interface ConfiguredNewsProviderComposition {
  readonly providers: readonly NewsProvider[];
  readonly safeUrlFetcher?: SafeNewsUrlFetchPort;
  readonly urlImportExtractor?: NewsUrlImportExtractor;
}

function environmentText(environment: RuntimeEnvironment, name: string): string | undefined {
  const value = environment[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

interface EnvironmentList {
  readonly present: boolean;
  readonly valid: boolean;
  readonly values?: readonly string[];
}

function environmentList(
  environment: RuntimeEnvironment,
  name: string,
  options: { readonly blankIsAbsent?: boolean } = {},
): EnvironmentList {
  const raw = environment[name];
  if (raw === undefined) return { present: false, valid: true };
  if (typeof raw !== "string") return { present: true, valid: false };
  if (!raw.trim()) {
    return options.blankIsAbsent
      ? { present: false, valid: true }
      : { present: true, valid: false };
  }
  const values = raw.split(/[,\r\n]/u).map((value) => value.trim());
  if (values.some((value) => value.length === 0)) return { present: true, valid: false };
  return { present: true, valid: true, values };
}

interface EnvironmentUrl {
  readonly present: boolean;
  readonly valid: boolean;
  readonly value?: string;
}

function unsafeConfiguredHostname(value: string): boolean {
  const hostname = value.toLowerCase().replace(/^\[|\]$/gu, "").replace(/\.$/u, "");
  if (
    hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || hostname === "local"
    || hostname === "0.0.0.0"
    || hostname === "::"
  ) return true;

  const octets = hostname.split(".").map(Number);
  if (octets.length === 4 && octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)) {
    const [first, second] = octets;
    if (
      first === 0
      || first === 10
      || first === 127
      || (first === 100 && second >= 64 && second <= 127)
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168)
      || (first === 192 && second === 0)
      || (first === 198 && second >= 18 && second <= 19)
      || first >= 224
    ) return true;
  }
  return hostname === "::1"
    || hostname.startsWith("fc")
    || hostname.startsWith("fd")
    || /^fe[89ab]/u.test(hostname)
    || hostname.startsWith("2001:db8:")
    || hostname.startsWith("2001:10:");
}

function secureConfiguredHttpsUrl(value: string): URL | undefined {
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || unsafeConfiguredHostname(parsed.hostname)) {
      return undefined;
    }
    parsed.hash = "";
    return parsed;
  } catch {
    return undefined;
  }
}

function environmentUrl(environment: RuntimeEnvironment, name: string): EnvironmentUrl {
  const raw = environment[name];
  if (raw === undefined) return { present: false, valid: true };
  if (typeof raw !== "string" || !raw.trim()) return { present: true, valid: false };
  const parsed = secureConfiguredHttpsUrl(raw);
  return parsed === undefined
    ? { present: true, valid: false }
    : { present: true, valid: true, value: parsed.toString() };
}

function configuredHost(value: string): string | undefined {
  const host = value.trim().toLowerCase();
  const candidate = host.startsWith("*.") ? host.slice(2) : host;
  if (!candidate || host.includes("*") && !host.startsWith("*.") || candidate.includes("/") || candidate.includes(":")) {
    return undefined;
  }
  if (!/^[a-z0-9.-]+$/u.test(candidate) || unsafeConfiguredHostname(candidate)) return undefined;
  return host;
}

function configuredUrlList(values: readonly string[], prefix: boolean): readonly string[] | undefined {
  const normalized = values.map((value) => {
    const parsed = secureConfiguredHttpsUrl(value);
    if (parsed === undefined) return undefined;
    if (prefix) parsed.search = "";
    return parsed.toString();
  });
  return normalized.some((value) => value === undefined) ? undefined : normalized as string[];
}

function hostMatches(hostname: string, allowed: string): boolean {
  return allowed.startsWith("*.")
    ? hostname.endsWith(allowed.slice(1)) && hostname !== allowed.slice(2)
    : hostname === allowed;
}

function pathMatches(target: URL, prefix: URL): boolean {
  if (target.origin !== prefix.origin) return false;
  if (target.pathname === prefix.pathname) return true;
  const prefixPath = prefix.pathname.endsWith("/") ? prefix.pathname : `${prefix.pathname}/`;
  return target.pathname.startsWith(prefixPath);
}

function allowlistCovers(target: URL, hosts: readonly string[], prefixes: readonly string[], urls: readonly string[]): boolean {
  if (urls.includes(target.toString())) return true;
  if (hosts.some((host) => hostMatches(target.hostname, host))) return true;
  return prefixes.some((prefix) => {
    const parsed = secureConfiguredHttpsUrl(prefix);
    return parsed !== undefined && pathMatches(target, parsed);
  });
}

interface ConfiguredRssSource {
  readonly url: string;
  readonly allowedHosts: readonly string[];
  readonly allowedUrlPrefixes: readonly string[];
  readonly allowedUrls: readonly string[];
}

function configuredRssSource(environment: RuntimeEnvironment): ConfiguredRssSource | undefined {
  const url = environmentUrl(environment, BACKEND_RUNTIME_ENV_NAMES.coindeskRssUrl);
  const hosts = environmentList(environment, BACKEND_RUNTIME_ENV_NAMES.coindeskRssAllowedHosts);
  const prefixes = environmentList(environment, BACKEND_RUNTIME_ENV_NAMES.coindeskRssAllowedUrlPrefixes);
  const urls = environmentList(environment, BACKEND_RUNTIME_ENV_NAMES.coindeskRssAllowedUrls, {
    blankIsAbsent: true,
  });
  const hasConfiguration = url.present || hosts.present || prefixes.present || urls.present;
  if (!hasConfiguration || !url.valid || !url.value || !hosts.valid || !prefixes.valid || !urls.valid) return undefined;

  const allowedHosts = (hosts.values ?? []).map(configuredHost);
  const allowedUrlPrefixes = configuredUrlList(prefixes.values ?? [], true);
  const allowedUrls = configuredUrlList(urls.values ?? [], false);
  if (
    allowedHosts.some((value) => value === undefined)
    || allowedUrlPrefixes === undefined
    || allowedUrls === undefined
    || (allowedHosts.length === 0 && allowedUrlPrefixes.length === 0 && allowedUrls.length === 0)
  ) return undefined;

  const target = secureConfiguredHttpsUrl(url.value);
  if (target === undefined) return undefined;
  const normalizedHosts = allowedHosts as string[];
  if (!allowlistCovers(target, normalizedHosts, allowedUrlPrefixes, allowedUrls)) return undefined;
  return {
    url: target.toString(),
    allowedHosts: normalizedHosts,
    allowedUrlPrefixes,
    allowedUrls,
  };
}

export function createConfiguredAuthoringProvider(
  options: Pick<RuntimeProviderCompositionOptions, "environment" | "authoringFetch"> = {},
) {
  const environment = options.environment ?? process.env;
  const endpoint = environmentText(environment, "LLM_AUTHORING_ENDPOINT");
  const model = environmentText(environment, "LLM_AUTHORING_MODEL");
  const apiKey = environment["LLM_AUTHORING_API_KEY"];
  if (!endpoint || !model || typeof apiKey !== "string" || !apiKey.trim()) return undefined;

  const provider = createOpenAiCompatibleAuthoringProvider({
    endpoint,
    model,
    apiKey,
    ...(options.authoringFetch === undefined ? {} : { fetch: options.authoringFetch }),
  });
  return provider.configured ? provider : undefined;
}

export function composeConfiguredNewsProviders(
  options: RuntimeProviderCompositionOptions = {},
): ConfiguredNewsProviderComposition {
  const environment = options.environment ?? process.env;
  const providers: NewsProvider[] = [];

  const apiKey = environmentText(environment, "COINDESK_API_KEY");
  const baseUrl = environmentText(environment, "COINDESK_BASE_URL");
  if (apiKey || baseUrl) {
    try {
      providers.push(createCoinDeskNewsProvider({
        ...(apiKey === undefined ? {} : { apiKey }),
        ...(baseUrl === undefined ? {} : { baseUrl }),
        ...(options.coinDeskFetch === undefined ? {} : { fetch: options.coinDeskFetch }),
      }));
    } catch {
      // An invalid legacy configuration remains unavailable without selecting a fixture.
    }
  }

  let safeUrlFetcher: SafeNewsUrlFetchPort | undefined;
  let urlImportExtractor: NewsUrlImportExtractor | undefined;
  const rssSource = configuredRssSource(environment);
  if (rssSource) {
    try {
      const source = {
        id: "coindesk-rss",
        kind: "RSS" as const,
        url: rssSource.url,
        allowedHosts: rssSource.allowedHosts,
        allowedUrlPrefixes: rssSource.allowedUrlPrefixes,
        allowedUrls: rssSource.allowedUrls,
        displayName: "CoinDesk RSS",
      };
      const configuredSafeUrlFetcher = createSafeNewsUrlFetcher({
        sources: [source],
        ...(options.safeNewsFetch === undefined ? {} : { fetch: options.safeNewsFetch }),
        ...(options.safeDnsResolver === undefined ? {} : { resolve: options.safeDnsResolver }),
      });
      const provider = createRssNewsProvider({ source, safeFetcher: configuredSafeUrlFetcher });
      providers.push(provider);
      safeUrlFetcher = configuredSafeUrlFetcher;
      urlImportExtractor = provider;
    } catch {
      // Missing or unsafe RSS configuration remains unavailable without a fixture fallback.
    }
  }

  return {
    providers,
    ...(safeUrlFetcher === undefined ? {} : { safeUrlFetcher }),
    ...(urlImportExtractor === undefined ? {} : { urlImportExtractor }),
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function searchGenerators() {
  // The public registry requires a declared Domain-guided configuration even
  // when the runtime only uses its deterministic RANDOM profile.  Keep the
  // optional Domain-guided implementation out of the runtime registry unless
  // a caller has explicitly supplied a per-run configuration through the
  // Search contract. RANDOM and GENETIC remain the public registry profiles;
  // the Search application creates Domain-guided only from explicit run data.
  const registry = createSearchGeneratorRegistry({
    domainGuided: { categories: ["RUNTIME_RANDOM_ONLY"] },
  });
  return { RANDOM: registry.RANDOM, GENETIC: registry.GENETIC };
}

function localLexiconProvider() {
  return {
    id: sentimentPublic.LEXICON_V1_ID,
    analyze: async (input: Parameters<SentimentModulePublicApi["analyze"]>[0]) => {
      const result = await sentimentPublic.analyze(input);
      return {
        label: result.label,
        score: result.score,
        providerId: result.providerId,
        analysisProfileId: result.analysisProfileId,
        modelName: result.modelName,
        modelVersion: result.modelVersion,
      };
    },
  };
}

export interface BackendRuntime extends BackendAuthRuntime {
  readonly strategy: StrategyRuntimeModule;
  readonly marketData?: MarketDataModuleRuntime;
  readonly search?: SearchModulePublicApi;
  readonly backtesting?: BacktestingModulePublicApi;
  readonly leaderboard?: LeaderboardModulePublicApi;
  readonly news?: NewsModulePublicApi;
  readonly sentiment: SentimentModulePublicApi;
  readonly strategyConfigured: boolean;
  readonly health: RuntimeHealth;
  readonly marketWebSocket: MarketWebSocketGateway;
  composition(): RuntimeCompositionState;
  readiness(): RuntimeReadiness;
  isCapabilityAvailable(capability: BackendCapabilityName): boolean;
  requireCapability<K extends BackendCapabilityName>(capability: K): BackendCapabilityApi[K];
  markFailure(name: string, detail?: string): void;
}

export function createBackendRuntime(options: BackendRuntimeOptions = {}): BackendRuntime {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  const health = new RuntimeHealth();
  const closers: Closable[] = [];
  const authRuntime: BackendAuthRuntime = options.auth
    ? { auth: options.auth, configured: true, close: async () => undefined }
    : createBackendAuthRuntime(databaseUrl);
  if (!options.auth) closers.push(authRuntime);

  const realPersistence = Boolean(dataBaseConfigured(databaseUrl) && authRuntime.pool);
  const clock = { now: nowIso };
  let databaseReady = realPersistence
    ? false
    : options.databaseReady ?? Boolean(options.auth);

  let strategy = options.strategy ?? moduleFacade();
  let strategyConfigured = options.strategy !== undefined;
  let marketData = options.marketData;
  let search = options.search;
  let backtesting = options.backtesting;
  let leaderboard = options.leaderboard;
  let news = options.news;
  let sentiment = options.sentiment ?? sentimentFacade();
  let sentimentPersistenceConfigured = false;
  let realMarketData = false;

  const evaluation = createEvaluationModule();
  let postgresBacktesting: ReturnType<typeof createPostgresBacktestingDependencies> | undefined;

  if (!options.strategy && realPersistence) {
    try {
      const dependencies = createPostgresStrategyDependencies({
        connectionString: databaseUrl!,
        pool: authRuntime.pool,
      });
      const provider = createConfiguredAuthoringProvider();
      strategy = createStrategyModule({
        factories: strategyPublic.STRATEGY_FACTORIES,
        definitionRepository: dependencies.definitionRepository,
        compositeRepository: dependencies.compositeRepository,
        ...(provider === undefined
          ? {}
          : {
              authoring: {
                draftRepository: dependencies.draftRepository,
                provider,
                logicalFamilyKey: "llm-authoring",
                strategyName: "MA",
                news: {
                  readNews: async (input: Parameters<NewsModulePublicApi["readNews"]>[0]) => {
                    if (!news) throw new Error("NEWS_BOUNDARY_UNAVAILABLE");
                    return news.readNews(input);
                  },
                },
                clock,
              },
            }),
      });
      strategyConfigured = true;
    } catch {
      strategy = moduleFacade();
      strategyConfigured = false;
    }
  }

  if (!options.sentiment && realPersistence) {
    try {
      const dependencies = createPostgresSentimentDependencies({
        connectionString: databaseUrl!,
        pool: authRuntime.pool,
      });
      sentiment = createSentimentModule({
        provider: localLexiconProvider(),
        resultRepository: dependencies.resultRepository,
        clock,
        observability: {
          recordInferenceFailure: () => {
            health.setOptional("sentiment-provider", false, "Sentiment failure is isolated and visible in readiness.");
          },
        },
      });
      sentimentPersistenceConfigured = true;
    } catch {
      sentiment = sentimentFacade();
    }
  }

  if (!options.marketData && realPersistence) {
    try {
      const dependencies = createPostgresMarketDataDependencies({
        connectionString: databaseUrl!,
        pool: authRuntime.pool,
      });
      const marketObservability = {
        record: (event: { type: "PROVIDER_FAILURE" | "PROVIDER_RECONNECT" | "HISTORY_GAP" }): void => {
          if (event.type === "PROVIDER_FAILURE") {
            health.setRequired("market-data-provider", false, "Binance market provider failure is visible in readiness.");
          }
        },
      };
      const realtimeProvider = createBinanceRealtimeProvider({
        ...(process.env.BINANCE_API_BASE_URL?.trim()
          ? { baseUrl: process.env.BINANCE_API_BASE_URL.trim() }
          : {}),
        ...(process.env.BINANCE_WS_URL?.trim()
          ? { websocketUrl: process.env.BINANCE_WS_URL.trim() }
          : {}),
        clock: nowIso,
        observability: marketObservability,
      });
      marketData = createMarketDataModule({
        ...dependencies,
        providers: [realtimeProvider],
        clock,
        observability: marketObservability,
      });
      realMarketData = true;
      closers.push({ close: () => marketData!.shutdown() });
    } catch {
      marketData = undefined;
    }
  }

  if (!options.backtesting && realPersistence) {
    try {
      postgresBacktesting = createPostgresBacktestingDependencies({
        connectionString: databaseUrl!,
        pool: authRuntime.pool,
      });
    } catch {
      postgresBacktesting = undefined;
    }
  }

  if (!leaderboard && realPersistence && postgresBacktesting) {
    try {
      const experimentRepository = {
        getByOwnerAndId: async (
          ownerUserId: Parameters<typeof postgresBacktesting.experimentRepository.getByCandidateOwnerAndId>[0],
          experimentId: string,
        ) => {
          const experiment = await postgresBacktesting!.experimentRepository.getByCandidateOwnerAndId(ownerUserId, experimentId);
          if (!experiment) return undefined;
          return {
            executionState: "SUCCEEDED" as const,
            experimentId: experiment.id,
            candidateId: experiment.candidateId,
            ...(experiment.searchRunId === undefined ? {} : { searchRunId: experiment.searchRunId }),
            metrics: experiment.metrics,
          };
        },
        listByOwnerAndSearchRun: async (
          ownerUserId: Parameters<typeof postgresBacktesting.experimentRepository.listByCandidateOwnerAndSearchRun>[0],
          searchRunId: string,
        ) => {
          const experiments = await postgresBacktesting!.experimentRepository.listByCandidateOwnerAndSearchRun(ownerUserId, searchRunId);
          return experiments.map((experiment) => ({
            executionState: "SUCCEEDED" as const,
            experimentId: experiment.id,
            candidateId: experiment.candidateId,
            ...(experiment.searchRunId === undefined ? {} : { searchRunId: experiment.searchRunId }),
            metrics: experiment.metrics,
          }));
        },
      };
      const dependencies = createPostgresLeaderboardDependencies({
        connectionString: databaseUrl!,
        pool: authRuntime.pool,
        experimentRepository,
      });
      leaderboard = createLeaderboardModule(dependencies);
      void dependencies.initialize().catch(() => {
        health.setRequired("leaderboard-persistence", false, "Leaderboard persistence initialization failed.");
      });
    } catch {
      leaderboard = undefined;
    }
  }

  if (!backtesting && postgresBacktesting && leaderboard && marketData && strategyConfigured) {
    const configuredMarketData = marketData;
    const configuredLeaderboard = leaderboard;
    let application: BacktestingApplication | undefined;
    const execution = createBoundedLocalBacktestExecutor<CandidateExecutionRequest, CandidateRunResult>({
      capacity: boundedInteger(process.env.BACKTEST_MAX_IN_FLIGHT, 2, 50),
      runner: {
        run: (request, signal) => {
          if (!application) return Promise.reject(new Error("backtesting application is not initialized"));
          return application.runCandidate(request, signal);
        },
      },
      clock,
    });
    application = createBacktestingApplication({
      execution,
      marketData: configuredMarketData,
      strategy,
      evaluation,
      leaderboard: configuredLeaderboard,
      candidateRepository: postgresBacktesting.candidateRepository,
      experimentRepository: postgresBacktesting.experimentRepository,
      unitOfWork: postgresBacktesting.unitOfWork,
      completionUnitOfWork: postgresBacktesting.completionUnitOfWork,
      clock: postgresBacktesting.clock,
    }, {
      searchRunOwnerGuard: async (context, searchRunId) => {
        if (!search) throw new Error("SearchRun ownership adapter is not configured");
        await search.status(context, searchRunId);
      },
    });
    backtesting = application;
  }

  if (!search && realPersistence && postgresBacktesting && backtesting && leaderboard && strategyConfigured) {
    try {
      const searchRunRepository = createPostgresSearchRunRepository({
        connectionString: databaseUrl!,
        pool: authRuntime.pool,
      });
      const generators = searchGenerators();
      search = createSearchModule({
        searchRunRepository,
        generators,
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
      });
    } catch {
      search = undefined;
    }
  }

  const configuredNews = composeConfiguredNewsProviders();
  const newsConfigured = configuredNews.providers.length > 0;
  if (!news && realPersistence && newsConfigured) {
    try {
      const dependencies = createPostgresNewsDependencies({
        connectionString: databaseUrl!,
        pool: authRuntime.pool,
      });
      news = createNewsModule({
        providers: configuredNews.providers,
        newsRepository: dependencies.newsRepository,
        sentiment,
        sentimentTimeoutMs: 1_000,
        observability: {
          recordProviderFailure: () => {
            health.setOptional("news-provider", false, "News provider failure is isolated from core capabilities.");
          },
          recordSentimentFailure: () => {
            health.setOptional("sentiment-provider", false, "Sentiment failure is isolated from News and core capabilities.");
          },
        },
        clock,
        templateRepository: dependencies.extractionTemplateRepository,
        extractionProvenanceRepository: dependencies.extractionProvenanceRepository,
        rawHtmlRepository: dependencies.rawHtmlRepository,
        ...(configuredNews.safeUrlFetcher === undefined
          ? {}
          : { safeUrlFetcher: configuredNews.safeUrlFetcher }),
        ...(configuredNews.urlImportExtractor === undefined
          ? {}
          : { urlImportExtractor: configuredNews.urlImportExtractor }),
      });
    } catch {
      news = undefined;
    }
  }

  const strategyReadyDetail = strategyConfigured
    ? "Strategy is supplied through the public PostgreSQL module bootstrap seam."
    : "The public PostgreSQL Strategy adapter is not configured.";
  health.setRequired("strategy-persistence", strategyConfigured, strategyReadyDetail);
  health.setRequired(
    "market-data-provider",
    Boolean(marketData),
    realMarketData
      ? "Real Binance historical and realtime adapters are configured."
      : marketData
        ? "Market data is supplied through the public module bootstrap seam."
        : "The real Binance market provider is not configured.",
  );
  health.setRequired(
    "leaderboard-persistence",
    Boolean(leaderboard),
    leaderboard
      ? "Leaderboard is supplied through a public module bootstrap seam."
      : "The public PostgreSQL Leaderboard adapter is not configured.",
  );
  health.setRequired(
    "backtest-runner",
    Boolean(backtesting),
    backtesting
      ? "Backtesting uses the bounded local executor through the public bootstrap seam."
      : "The bounded local executor is not configured with the required public persistence seams.",
  );
  health.setRequired(
    "search-composition",
    Boolean(search),
    search
      ? "Search uses the public generator registry and PostgreSQL SearchRun adapter."
      : "The public Search generator registry and persistence adapter are not configured.",
  );
  health.setOptional(
    "news-provider",
    Boolean(news),
    news
      ? options.news
        ? "News is supplied through the public module bootstrap seam."
        : "Configured CoinDesk News provider is available."
      : "No explicitly configured real News provider is available.",
  );
  health.setOptional(
    "sentiment-provider",
    true,
    options.sentiment || !sentimentPersistenceConfigured
      ? "LEXICON_V1 is provided by the public local Sentiment facade."
      : "LEXICON_V1 is composed with PostgreSQL Sentiment persistence.",
  );
  health.setOptional(
    "sentiment-persistence",
    sentimentPersistenceConfigured,
    sentimentPersistenceConfigured
      ? "PostgreSQL Sentiment persistence is configured through the public bootstrap seam."
      : "The public Sentiment PostgreSQL adapter is not configured.",
  );

  let newsRefreshScheduler: NewsRefreshScheduler | undefined;
  if (news) {
    try {
      const intervalMinutes = options.newsRefresh?.intervalMinutes
        ?? options.newsRefresh?.refreshIntervalMinutes
        ?? (process.env.NEWS_REFRESH_INTERVAL_MINUTES?.trim()
          ? Number(process.env.NEWS_REFRESH_INTERVAL_MINUTES.trim())
          : undefined);
      newsRefreshScheduler = createNewsRefreshScheduler(news, {
        ...(intervalMinutes === undefined ? {} : { intervalMinutes }),
        ...(options.newsRefresh?.timer === undefined ? {} : { timer: options.newsRefresh.timer }),
        ...(options.newsRefresh?.clock === undefined ? {} : { clock: options.newsRefresh.clock }),
        onRefreshFailure: () => {
          health.setOptional("news-provider", false, "News provider failure is isolated from core capabilities.");
        },
      });
    } catch {
      health.setOptional("news-provider", false, "Configured News refresh scheduler could not be initialized.");
    }
  }

  const persistenceAdaptersConfigured = Boolean(
    databaseReady &&
    strategyConfigured &&
    marketData &&
    backtesting &&
    leaderboard &&
    search,
  );
  health.setRequired(
    "auth-persistence",
    Boolean(authRuntime.configured && databaseReady),
    authRuntime.configured
      ? databaseReady
        ? "PostgreSQL Auth connectivity and application schema are available."
        : realPersistence
          ? "PostgreSQL connectivity and application schema probe is pending."
          : "Authentication persistence is awaiting configuration."
      : "DATABASE_URL is not configured.",
  );
  health.setRequired(
    "persistence-adapters",
    persistenceAdaptersConfigured,
    persistenceAdaptersConfigured
      ? "Required PostgreSQL application adapters are configured."
      : "Required PostgreSQL application adapters are not configured or not ready.",
  );

  const markDatabaseFailure = (): void => {
    databaseReady = false;
    health.setRequired("auth-persistence", false, "PostgreSQL connectivity or application schema probe failed.");
    health.setRequired("persistence-adapters", false, "PostgreSQL connectivity or application schema probe failed.");
    if (realPersistence) {
      health.setRequired("strategy-persistence", false, "PostgreSQL Strategy persistence is unavailable.");
      health.setRequired("leaderboard-persistence", false, "PostgreSQL Leaderboard persistence is unavailable.");
      health.setRequired("backtest-runner", false, "PostgreSQL Backtesting persistence is unavailable.");
      health.setRequired("search-composition", false, "PostgreSQL SearchRun persistence is unavailable.");
      health.setOptional("sentiment-persistence", false, "PostgreSQL Sentiment persistence is unavailable.");
    }
  };

  if (realPersistence && authRuntime.probe) {
    void authRuntime.probe()
      .then(async () => probeApplicationSchema(authRuntime.pool!))
      .then(() => {
        databaseReady = true;
        health.setRequired("auth-persistence", true, "PostgreSQL Auth connectivity and application schema are available.");
        health.setRequired(
          "persistence-adapters",
          Boolean(strategyConfigured && marketData && backtesting && leaderboard && search),
          strategyConfigured && marketData && backtesting && leaderboard && search
            ? "Required PostgreSQL application adapters are configured."
            : "Required PostgreSQL application adapters are not configured.",
        );
      })
      .catch(() => markDatabaseFailure());
  }

  const marketWebSocket = new MarketWebSocketGateway({
    auth: authRuntime.auth,
    marketData,
    health,
  });

  const capabilityValue = (capability: BackendCapabilityName): unknown => {
    switch (capability) {
      case "strategy": return strategy;
      case "market-data": return marketData;
      case "search": return search;
      case "backtesting": return backtesting;
      case "leaderboard": return leaderboard;
      case "news": return news;
    }
  };

  const scheduledNewsRefresh = newsRefreshScheduler;
  let closePromise: Promise<void> | undefined;
  const runtime: BackendRuntime = {
    ...authRuntime,
    strategy,
    marketData,
    search,
    backtesting,
    leaderboard,
    news,
    sentiment,
    strategyConfigured,
    health,
    marketWebSocket,
    composition: () => ({
      activeModules: ACTIVE_MVP_MODULES,
      requiredDependencies: health.requiredDependencies(),
      optionalDependencies: health.optionalDependencies(),
    }),
    readiness: () => readinessOf({
      activeModules: ACTIVE_MVP_MODULES,
      requiredDependencies: health.requiredDependencies(),
      optionalDependencies: health.optionalDependencies(),
    }),
    isCapabilityAvailable: (capability) => {
      if (capability === "strategy") return strategyConfigured;
      return capabilityValue(capability) !== undefined;
    },
    requireCapability: (capability) => {
      const value = capabilityValue(capability);
      if (!value || !runtime.isCapabilityAvailable(capability)) {
        throw new BackendCapabilityUnavailableError(capability);
      }
      return value as never;
    },
    markFailure: (name) => {
      const safeDetail = name === "news-provider"
        ? "News provider failure is visible in readiness."
        : name === "sentiment-provider"
          ? "Sentiment provider failure is isolated and visible in readiness."
          : name === "auth-persistence"
            ? "Authentication persistence failure is visible in readiness."
            : name === "market-data-provider"
              ? "Market provider failure is visible in readiness."
              : "Configured dependency failure is visible in readiness.";
      if (name === "news-provider" || name === "sentiment-provider") {
        health.setOptional(name, false, safeDetail);
      } else {
        health.setRequired(name, false, safeDetail);
      }
    },
    close: () => {
      if (closePromise) return closePromise;
      closePromise = (async () => {
        scheduledNewsRefresh?.shutdown();
        await marketWebSocket.close();
        const unique = [...new Set(closers)];
        await Promise.all(unique.map(async (closer) => closer.close().catch(() => undefined)));
      })();
      return closePromise;
    },
  };

  if (news && scheduledNewsRefresh) {
    const configuredNews = news;
    void (async () => {
      try {
        await configuredNews.collect({});
      } catch {
        health.setOptional("news-provider", false, "News provider failure is isolated from core capabilities.");
      }
      try {
        scheduledNewsRefresh.start();
      } catch {
        health.setOptional("news-provider", false, "Configured News refresh scheduler could not be started.");
      }
    })();
  }
  return runtime;
}

export function attachBackendWebSocket(runtime: BackendRuntime, server: Server): void {
  runtime.marketWebSocket.attach(server);
}
