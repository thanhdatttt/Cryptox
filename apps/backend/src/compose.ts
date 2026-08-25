import { createConfiguredAuthModule } from "modules/auth/api/bootstrap";
import { Pool } from "pg";
import type { AuthModulePublicApi } from "modules/auth/api";
import type { MarketDataModulePublicApi } from "modules/market-data/api";
import type { NewsModulePublicApi } from "modules/news/api";
import type { SentimentModulePublicApi } from "modules/sentiment/api";
import type { StrategyModuleRuntime } from "modules/strategy/api/bootstrap";
import type { BacktestLogApi } from "modules/backtesting/api";
import { BullMqBacktestQueue, createBacktestingModule, createInMemoryBacktestingDependencies, createPostgresBacktestingDependencies } from "modules/backtesting/api/bootstrap";
import { createEvaluationModule } from "modules/evaluation/api/bootstrap";
import type { EvaluatorModulePublicApi } from "modules/evaluation/api";
import type { LeaderboardModulePublicApi } from "modules/leaderboard/api";
import { createBacktestingExperimentReader, createBacktestingScopeRepository, createInMemoryLeaderboardDependencies, createLeaderboardModule, createPostgresLeaderboardDependencies } from "modules/leaderboard/api/bootstrap";
import { createBinanceMarketDataAdapter, createMarketDataModule, PostgresCandleRepository, PostgresSnapshotRepository } from "modules/market-data/api/bootstrap";
import { createConfiguredNewsProviders, createNewsModule, PostgresNewsRepository } from "modules/news/api/bootstrap";
import type { SearchModulePublicApi } from "modules/search/api";
import { createInMemorySearchDependencies, createPostgresSearchDependencies, createSearchModule } from "modules/search/api/bootstrap";
import { createDeterministicSentimentAdapter, createSentimentModule, PostgresSentimentResultRepository, PostgresSentimentSnapshotRepository } from "modules/sentiment/api/bootstrap";
import { createPostgresStrategyDependencies, createStrategyModule } from "modules/strategy/api/bootstrap";

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
}

export function composeAllModules(): BackendModules {
  const postgres = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : undefined;
  const inMemoryBacktesting = createInMemoryBacktestingDependencies();
  const queue = process.env.REDIS_URL ? new BullMqBacktestQueue(process.env.REDIS_URL) : inMemoryBacktesting.queue;
  const marketData = createMarketDataModule({
    candleRepository: postgres ? new PostgresCandleRepository(postgres) : undefined,
    snapshotRepository: postgres ? new PostgresSnapshotRepository(postgres) : undefined,
    providerRegistry: process.env.MARKET_DATA_PROVIDER === "BINANCE" ? { defaultProvider: createBinanceMarketDataAdapter() } : undefined,
  });
  const strategy = postgres
    ? createStrategyModule(createPostgresStrategyDependencies(postgres))
    : createStrategyModule();
  const evaluation = createEvaluationModule();
  const backtesting = postgres
    ? createBacktestingModule(createPostgresBacktestingDependencies(postgres, { marketData, strategy, evaluation, queue, clock: { now: () => new Date().toISOString() } }))
    : createBacktestingModule({ ...inMemoryBacktesting, marketData, strategy, evaluation, queue });
  const scopeRepository = createBacktestingScopeRepository(backtesting);
  const experimentReader = createBacktestingExperimentReader(backtesting);
  const leaderboard = postgres
    ? createLeaderboardModule(createPostgresLeaderboardDependencies(postgres, { scopeRepository, experimentReader, clock: { now: () => new Date().toISOString() } }))
    : createLeaderboardModule({ ...createInMemoryLeaderboardDependencies(), scopeRepository, experimentReader, clock: { now: () => new Date().toISOString() } });
  const search = postgres
    ? createSearchModule(createPostgresSearchDependencies(postgres, { backtestCoordinator: backtesting, leaderboardService: leaderboard, clock: { now: () => new Date().toISOString() } }))
    : createSearchModule({ ...createInMemorySearchDependencies(), backtestCoordinator: backtesting, leaderboardService: leaderboard, clock: { now: () => new Date().toISOString() } });
  const sentiment = createSentimentModule({
    analysis: createDeterministicSentimentAdapter(),
    resultRepository: postgres ? new PostgresSentimentResultRepository(postgres) : undefined,
    snapshotRepository: postgres ? new PostgresSentimentSnapshotRepository(postgres) : undefined,
  });
  const news = createNewsModule({
    providers: createConfiguredNewsProviders({ provider: process.env.NEWS_PROVIDER }),
    newsRepository: postgres ? new PostgresNewsRepository(postgres) : undefined,
    sentiment,
  });
  const modules = {
    marketData,
    strategy,
    search,
    backtesting,
    evaluation,
    leaderboard,
    news,
    sentiment,
    auth: createConfiguredAuthModule(),
  };
  console.log("backend modules composed", Object.keys(modules).join(","));
  return modules;
}
