import { createConfiguredAuthModule } from "modules/auth/api/bootstrap";
import { Pool } from "pg";
import type { AuthModulePublicApi } from "modules/auth/api";
import type { MarketDataModulePublicApi } from "modules/market-data/api";
import type { NewsModulePublicApi } from "modules/news/api";
import type { SentimentModulePublicApi } from "modules/sentiment/api";
import type { StrategyModuleRuntime } from "modules/strategy/api/bootstrap";
import type { BacktestLogApi } from "modules/backtesting/api";
import { BullMqBacktestCompletionListener, BullMqBacktestQueue, createBacktestingModule, createInMemoryBacktestingDependencies, createPostgresBacktestingDependencies } from "modules/backtesting/api/bootstrap";
import { createEvaluationModule } from "modules/evaluation/api/bootstrap";
import type { EvaluatorModulePublicApi } from "modules/evaluation/api";
import type { LeaderboardModulePublicApi } from "modules/leaderboard/api";
import { createBacktestingExperimentReader, createBacktestingScopeRepository, createInMemoryLeaderboardDependencies, createLeaderboardModule, createPostgresLeaderboardDependencies } from "modules/leaderboard/api/bootstrap";
import { createBinanceMarketDataAdapter, createMarketDataModule, createRedisLatestValueCache, PostgresCandleRepository, PostgresSnapshotRepository } from "modules/market-data/api/bootstrap";
import { createConfiguredNewsProviders, createNewsModule, PostgresNewsRepository } from "modules/news/api/bootstrap";
import type { SearchModulePublicApi, SearchModuleRuntime } from "modules/search/api";
import { createInMemorySearchDependencies, createPostgresCancellationUnitOfWork, createPostgresSearchDependencies, createSearchModule } from "modules/search/api/bootstrap";
import { createDeterministicSentimentAdapter, createOpenAiCompatibleSentimentAdapter, createSentimentModule, PostgresSentimentResultRepository, PostgresSentimentSnapshotRepository } from "modules/sentiment/api/bootstrap";
import { createOpenAiCompatibleStrategyGenerationAdapter, createPostgresStrategyDependencies, createStrategyModule } from "modules/strategy/api/bootstrap";
import { createAuthModule, createInMemoryAuthDependencies } from "modules/auth/api";
import { loadBackendRuntimeConfig, type RuntimeProfile } from "./runtime-config";

export interface BackendModules extends Record<string, unknown> {
  auth: AuthModulePublicApi;
  marketData: MarketDataModulePublicApi;
  news: NewsModulePublicApi;
  sentiment: SentimentModulePublicApi;
  strategy: StrategyModuleRuntime;
  backtesting: BacktestLogApi;
  evaluation: EvaluatorModulePublicApi;
  leaderboard: LeaderboardModulePublicApi;
  search: SearchModulePublicApi;
  startRuntime(): Promise<void>;
  stopRuntime(): Promise<void>;
}

export function composeAllModules(options: { profile?: RuntimeProfile; env?: NodeJS.ProcessEnv } = {}): BackendModules {
  const config = loadBackendRuntimeConfig(options.env ?? process.env, options.profile);
  const postgres = config.databaseUrl ? new Pool({ connectionString: config.databaseUrl }) : undefined;
  const marketDataProvider = config.marketDataProvider;
  const inMemoryBacktesting = createInMemoryBacktestingDependencies();
  const queue = config.durable ? new BullMqBacktestQueue(config.redisUrl!) : inMemoryBacktesting.queue;
  const latestValueCache = config.durable ? createRedisLatestValueCache(config.redisUrl!) : undefined;
  const marketData = createMarketDataModule({
    candleRepository: postgres ? new PostgresCandleRepository(postgres) : undefined,
    snapshotRepository: postgres ? new PostgresSnapshotRepository(postgres) : undefined,
    latestValueCache,
    providerRegistry: { defaultProviderId: marketDataProvider, ...(marketDataProvider === "BINANCE" ? { defaultProvider: createBinanceMarketDataAdapter() } : {}) },
  });
  const strategyDependencies = postgres ? createPostgresStrategyDependencies(postgres) : undefined;
  const strategy = strategyDependencies
    ? createStrategyModule({
      ...strategyDependencies,
      ...(config.strategyLlmApiKey && config.strategyModelEndpoint && config.strategyModelName ? {
        generationAdapter: createOpenAiCompatibleStrategyGenerationAdapter({
          apiKey: config.strategyLlmApiKey,
          model: config.strategyModelName,
          modelVersion: config.strategyModelVersion,
          endpoint: config.strategyModelEndpoint,
        }),
      } : {}),
    })
    : createStrategyModule();
  const evaluation = createEvaluationModule();
  let backtesting: BacktestLogApi;
  let search: SearchModuleRuntime;
  const backtestingReader = {
    readBenchmarkScope: (...args: Parameters<BacktestLogApi["readBenchmarkScope"]>) => backtesting.readBenchmarkScope(...args),
    listSearchExperimentSummaries: (...args: Parameters<BacktestLogApi["listSearchExperimentSummaries"]>) => backtesting.listSearchExperimentSummaries(...args),
  };
  const scopeRepository = createBacktestingScopeRepository(backtestingReader);
  const experimentReader = createBacktestingExperimentReader(backtestingReader);
  const leaderboard = postgres
    ? createLeaderboardModule(createPostgresLeaderboardDependencies(postgres, { scopeRepository, experimentReader, clock: { now: () => new Date().toISOString() } }))
    : createLeaderboardModule({ ...createInMemoryLeaderboardDependencies(), scopeRepository, experimentReader, clock: { now: () => new Date().toISOString() } });
  const completion = {
    score: (leaderboardScopeId: string, metrics: import("modules/evaluation/api").EvaluationMetrics) => leaderboard.score(leaderboardScopeId, metrics),
    submit: async (experiment: import("modules/backtesting/api").ExperimentResultSummary, unitOfWork: import("modules/backtesting/api").CompletionUnitOfWork) => { await leaderboard.submit(experiment, unitOfWork); },
    notifySearchCandidateFinished: async (searchRunId: string) => { await search.onCandidateFinished(searchRunId); },
  };
  backtesting = postgres
    ? createBacktestingModule(createPostgresBacktestingDependencies(postgres, { marketData, strategy, evaluation, queue, completion, clock: { now: () => new Date().toISOString() } }))
    : createBacktestingModule({ ...inMemoryBacktesting, marketData, strategy, evaluation, queue, completion });
  search = postgres
    ? createSearchModule(createPostgresSearchDependencies(postgres, { backtestCoordinator: backtesting, leaderboardService: leaderboard, beginCancellation: () => createPostgresCancellationUnitOfWork(postgres), clock: { now: () => new Date().toISOString() } }))
    : createSearchModule({ ...createInMemorySearchDependencies(), backtestCoordinator: backtesting, leaderboardService: leaderboard, clock: { now: () => new Date().toISOString() } });
  const sentiment = createSentimentModule({
    analysis: config.durable
      ? createOpenAiCompatibleSentimentAdapter({ apiKey: config.strategyLlmApiKey!, model: config.strategyModelName!, modelVersion: config.strategyModelVersion, endpoint: config.strategyModelEndpoint, timeoutMs: config.strategyModelTimeoutMs })
      : createDeterministicSentimentAdapter(),
    resultRepository: postgres ? new PostgresSentimentResultRepository(postgres) : undefined,
    snapshotRepository: postgres ? new PostgresSentimentSnapshotRepository(postgres) : undefined,
  });
  const news = createNewsModule({
    providers: createConfiguredNewsProviders({ provider: config.newsProvider }),
    newsRepository: postgres ? new PostgresNewsRepository(postgres) : undefined,
    sentiment,
  });
  const completionListener = config.durable ? new BullMqBacktestCompletionListener(config.redisUrl!, backtesting) : undefined;
  let recoveryTimer: NodeJS.Timeout | undefined;
  const reconcileRuntime = async (): Promise<void> => {
    await backtesting.reconcileQueue();
    await completionListener?.reconcileTerminalJobs();
    await backtesting.reconcileCompletions();
    await search.reconcileRunningRuns();
  };
  const modules: BackendModules = {
    marketData,
    strategy,
    search,
    backtesting,
    evaluation,
    leaderboard,
    news,
    sentiment,
    auth: config.durable ? createConfiguredAuthModule({ profile: config.profile, databaseUrl: config.databaseUrl, jwtSecret: config.jwtSecret }) : createAuthModule(createInMemoryAuthDependencies({ jwtSecret: config.jwtSecret ?? "cryptox-test-profile-secret" })),
  } as unknown as BackendModules;
  Object.defineProperties(modules, {
    startRuntime: { enumerable: false, value: async () => {
      await completionListener?.waitUntilReady();
      await reconcileRuntime();
      if (!recoveryTimer) {
        recoveryTimer = setInterval(() => { void reconcileRuntime(); }, config.backtestRecoveryIntervalMs);
        recoveryTimer.unref();
      }
    } },
    stopRuntime: { enumerable: false, value: async () => { if (recoveryTimer) clearInterval(recoveryTimer); recoveryTimer = undefined; await marketData.shutdown(); await completionListener?.close(); } },
  });
  console.log("backend modules composed", Object.keys(modules).join(","));
  return modules;
}
