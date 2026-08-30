import type { Server } from "node:http";
import type { AuthModulePublicApi } from "@cryptox/auth";
import type { BacktestingModulePublicApi } from "@cryptox/backtesting";
import type { LeaderboardModulePublicApi } from "@cryptox/leaderboard";
import {
  createLeaderboardModule,
  createPostgresLeaderboardDependencies,
  type PostgresLeaderboardDependencies,
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
} from "@cryptox/news/bootstrap";
import type { SearchModulePublicApi } from "@cryptox/search";
import type { SentimentModulePublicApi } from "@cryptox/sentiment";
import * as sentimentPublic from "@cryptox/sentiment";
import type { StrategyModulePublicApi } from "@cryptox/strategy";
import * as strategyPublic from "@cryptox/strategy";
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

interface RuntimeOverrides {
  readonly auth?: AuthModulePublicApi;
  readonly strategy?: StrategyModulePublicApi;
  readonly marketData?: MarketDataModuleRuntime;
  readonly search?: SearchModulePublicApi;
  readonly backtesting?: BacktestingModulePublicApi;
  readonly leaderboard?: LeaderboardModulePublicApi;
  readonly news?: NewsModulePublicApi;
  readonly sentiment?: SentimentModulePublicApi;
  readonly databaseReady?: boolean;
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
      "The bounded executor is not exported by the Backtesting public bootstrap; the backend cannot create the approved Execution Port without an excluded module export change.",
    );
    this.setRequired("leaderboard-persistence", false, "The PostgreSQL Leaderboard adapter is not configured.");
    this.setRequired(
      "strategy-persistence",
      false,
      "Strategy has no public PostgreSQL bootstrap in the current source tree; its public default facade is in-memory.",
    );
    this.setRequired(
      "search-composition",
      false,
      "Search bootstrap does not export the required random generator implementation, so a persisted Search module cannot be composed through public entrypoints.",
    );
    this.setOptional("news-provider", false, "No explicitly configured real News provider is available.");
    this.setOptional("sentiment-provider", true, "LEXICON_V1 is provided by the public local Sentiment facade.");
    this.setOptional(
      "sentiment-persistence",
      false,
      "Sentiment PostgreSQL persistence exists outside the current public package bootstrap facade.",
    );
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
  return {
    listStrategies: strategyPublic.listStrategies,
    defineStrategy: strategyPublic.defineStrategy,
    defineComposite: strategyPublic.defineComposite,
    readStrategyDefinition: strategyPublic.readStrategyDefinition,
    readCompositeDefinition: strategyPublic.readCompositeDefinition,
    listStrategyDefinitions: strategyPublic.listStrategyDefinitions,
    listCompositeDefinitions: strategyPublic.listCompositeDefinitions,
    resolveStrategy: strategyPublic.resolveStrategy,
    combineSignals: strategyPublic.combineSignals,
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

export interface BackendRuntime extends BackendAuthRuntime {
  readonly strategy: StrategyModulePublicApi;
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
  let databaseReady = options.databaseReady ?? Boolean(options.auth);
  let persistenceAdaptersConfigured = Boolean(options.marketData && options.leaderboard);

  const authRuntime: BackendAuthRuntime = options.auth
    ? { auth: options.auth, configured: true, close: async () => undefined }
    : createBackendAuthRuntime(databaseUrl);
  if (!options.auth) closers.push(authRuntime);

  const strategy = options.strategy ?? moduleFacade();
  const sentiment = options.sentiment ?? sentimentFacade();
  const strategyConfigured = options.strategy !== undefined;

  health.setRequired(
    "auth-persistence",
    Boolean(authRuntime.configured && databaseReady),
    authRuntime.configured
      ? databaseReady ? "PostgreSQL Auth connectivity is available." : "PostgreSQL connectivity probe is pending."
      : "DATABASE_URL is not configured.",
  );
  health.setRequired(
    "strategy-persistence",
    strategyConfigured,
    strategyConfigured
      ? "Strategy is supplied through the public module bootstrap seam."
      : "Strategy has no public PostgreSQL bootstrap in the current source tree; its public default facade is in-memory.",
  );
  health.setOptional(
    "sentiment-provider",
    true,
    "LEXICON_V1 is provided by the public local Sentiment facade.",
  );

  const markDatabaseFailure = (): void => {
    databaseReady = false;
    health.setRequired("auth-persistence", false, "PostgreSQL connectivity probe failed.");
    health.setRequired("persistence-adapters", false, "PostgreSQL connectivity probe failed.");
  };

  if (authRuntime.probe) {
    void authRuntime.probe().then(() => {
      databaseReady = true;
      health.setRequired("auth-persistence", true, "PostgreSQL Auth connectivity is available.");
      if (dataBaseConfigured(databaseUrl) && persistenceAdaptersConfigured) {
        health.setRequired("persistence-adapters", true, "PostgreSQL application adapters are configured.");
      }
    }).catch(() => markDatabaseFailure());
  }

  let marketData = options.marketData;
  let backtesting = options.backtesting;
  let leaderboard = options.leaderboard;
  let news = options.news;

  if (!marketData && dataBaseConfigured(databaseUrl)) {
    try {
      const marketDependencies = createPostgresMarketDataDependencies({ connectionString: databaseUrl! });
      const realtimeProvider = createBinanceRealtimeProvider({
        ...(process.env.BINANCE_API_BASE_URL?.trim()
          ? { baseUrl: process.env.BINANCE_API_BASE_URL.trim() }
          : {}),
        ...(process.env.BINANCE_WS_URL?.trim()
          ? { websocketUrl: process.env.BINANCE_WS_URL.trim() }
          : {}),
      });
      const marketObservability = {
        record: (event: { type: "PROVIDER_FAILURE" | "PROVIDER_RECONNECT" | "HISTORY_GAP"; providerId: string; detail?: string }): void => {
          if (event.type === "PROVIDER_FAILURE") {
            health.setRequired("market-data-provider", false, "Binance market provider failure is visible in readiness.");
          }
        },
      };
      marketData = createMarketDataModule({
        ...marketDependencies,
        providers: [realtimeProvider],
        clock: { now: () => new Date().toISOString() },
        observability: marketObservability,
      });
      closers.push({ close: marketData.shutdown });
      closers.push(marketDependencies);
      health.setRequired("market-data-provider", true, "Real Binance historical and realtime adapters are configured.");
    } catch {
      health.setRequired("market-data-provider", false, "The real Binance market provider could not be configured.");
    }
  } else if (marketData) {
    health.setRequired("market-data-provider", true, "Market data is supplied through the public module bootstrap seam.");
  }

  let leaderboardDependencies: PostgresLeaderboardDependencies | undefined;
  if (!leaderboard && dataBaseConfigured(databaseUrl)) {
    try {
      leaderboardDependencies = createPostgresLeaderboardDependencies({
        connectionString: databaseUrl!,
      });
      leaderboard = createLeaderboardModule(leaderboardDependencies);
      closers.push(leaderboardDependencies);
      health.setRequired("leaderboard-persistence", true, "PostgreSQL Leaderboard adapters are configured.");
    } catch {
      health.setRequired("leaderboard-persistence", false, "The PostgreSQL Leaderboard adapter could not be configured.");
      leaderboardDependencies = undefined;
      leaderboard = undefined;
    }
  } else {
    if (leaderboard) health.setRequired("leaderboard-persistence", true, "Leaderboard is supplied through the public module bootstrap seam.");
  }

  persistenceAdaptersConfigured = Boolean(
    dataBaseConfigured(databaseUrl) && marketData && leaderboard,
  ) || Boolean(options.marketData && options.leaderboard);

  if (options.backtesting) {
    health.setRequired("backtest-runner", true, "Backtesting is supplied through the public module bootstrap seam.");
  }
  if (options.leaderboard) {
    health.setRequired("persistence-adapters", true, "Required persistence is supplied through the public module bootstrap seam.");
  }

  if (!news && dataBaseConfigured(databaseUrl) && (process.env.COINDESK_API_KEY?.trim() || process.env.COINDESK_BASE_URL?.trim())) {
    try {
      const newsDependencies = createPostgresNewsDependencies({ connectionString: databaseUrl! });
      const provider = createCoinDeskNewsProvider({
        ...(process.env.COINDESK_API_KEY?.trim() ? { apiKey: process.env.COINDESK_API_KEY.trim() } : {}),
        ...(process.env.COINDESK_BASE_URL?.trim() ? { baseUrl: process.env.COINDESK_BASE_URL.trim() } : {}),
      });
      news = createNewsModule({
        providers: [provider],
        newsRepository: newsDependencies.newsRepository,
        sentiment: {
          analyze: sentiment.analyze,
          readLatestForNews: sentiment.readLatestForNews,
        },
        sentimentTimeoutMs: 1_000,
        observability: {
          recordProviderFailure: () => health.setOptional("news-provider", false, "News provider failure is isolated from core capabilities."),
          recordSentimentFailure: () => health.setOptional("sentiment-provider", false, "Sentiment failure is isolated from News and core capabilities."),
        },
      });
      closers.push(newsDependencies);
      health.setOptional("news-provider", true, "Configured CoinDesk News provider is available.");
    } catch {
      health.setOptional("news-provider", false, "Configured CoinDesk News provider could not be initialized.");
    }
  } else if (news) {
    health.setOptional("news-provider", true, "News is supplied through the public module bootstrap seam.");
  }

  if (options.search) {
    health.setRequired("search-composition", true, "Search is supplied through the public module bootstrap seam.");
  }

  health.setRequired(
    "market-data-provider",
    Boolean(marketData),
    marketData
      ? "Real Binance historical and realtime adapters are configured."
      : "The real Binance market provider is not configured.",
  );
  if (backtesting) {
    health.setRequired("backtest-runner", true, "Backtesting is supplied through the public module bootstrap seam.");
  }
  if (persistenceAdaptersConfigured && databaseReady) {
    health.setRequired("persistence-adapters", true, "PostgreSQL application adapters are configured.");
  }
  if (!databaseReady && dataBaseConfigured(databaseUrl)) {
    health.setRequired("persistence-adapters", false, "PostgreSQL connectivity probe is pending or failed.");
  }

  const marketWebSocket = new MarketWebSocketGateway({
    auth: authRuntime.auth,
    marketData,
    health,
  });

  const runtime: BackendRuntime = {
    ...authRuntime,
    strategy,
    marketData,
    search: options.search,
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
      switch (capability) {
        case "strategy": return strategyConfigured;
        case "market-data": return marketData !== undefined;
        case "search": return options.search !== undefined;
        case "backtesting": return backtesting !== undefined;
        case "leaderboard": return leaderboard !== undefined;
        case "news": return news !== undefined;
      }
    },
    requireCapability: (capability) => {
      const value = capability === "strategy"
        ? strategy
        : capability === "market-data"
          ? marketData
          : capability === "search"
            ? options.search
            : capability === "backtesting"
              ? backtesting
              : capability === "leaderboard"
                ? leaderboard
                : news;
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
      if (name === "news-provider" || name === "sentiment-provider") health.setOptional(name, false, safeDetail);
      else health.setRequired(name, false, safeDetail);
    },
    close: async () => {
      await marketWebSocket.close();
      const unique = [...new Set(closers)];
      await Promise.all(unique.map(async (closer) => closer.close().catch(() => undefined)));
    },
  };
  return runtime;
}

export function attachBackendWebSocket(runtime: BackendRuntime, server: Server): void {
  runtime.marketWebSocket.attach(server);
}
