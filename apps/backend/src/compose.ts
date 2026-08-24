import { createConfiguredAuthModule } from "modules/auth/api/bootstrap";
import { Pool } from "pg";
import type { AuthModulePublicApi } from "modules/auth/api";
import type { MarketDataModulePublicApi } from "modules/market-data/api";
import type { NewsModulePublicApi } from "modules/news/api";
import type { StrategyModuleRuntime } from "modules/strategy/api/bootstrap";
import type { BacktestLogApi } from "modules/backtesting/api";
import { createBacktestingModule, createInMemoryBacktestingDependencies, createPostgresBacktestingDependencies } from "modules/backtesting/api/bootstrap";
import { createEvaluationModule } from "modules/evaluation/api/bootstrap";
import type { EvaluatorModulePublicApi } from "modules/evaluation/api";
import { createLeaderboardModule } from "modules/leaderboard/api/bootstrap";
import { createBinanceMarketDataAdapter, createMarketDataModule } from "modules/market-data/api/bootstrap";
import { createNewsModule } from "modules/news/api/bootstrap";
import { createSearchModule } from "modules/search/api/bootstrap";
import { createSentimentModule } from "modules/sentiment/api/bootstrap";
import { createPostgresStrategyDependencies, createStrategyModule } from "modules/strategy/api/bootstrap";

export interface BackendModules extends Record<string, unknown> {
  auth: AuthModulePublicApi;
  marketData: MarketDataModulePublicApi;
  news: NewsModulePublicApi;
  strategy: StrategyModuleRuntime;
  backtesting: BacktestLogApi;
  evaluation: EvaluatorModulePublicApi;
}

export function composeAllModules(): BackendModules {
  const postgres = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : undefined;
  const marketData = process.env.MARKET_DATA_PROVIDER === "BINANCE"
    ? createMarketDataModule({ providerRegistry: { defaultProvider: createBinanceMarketDataAdapter() } })
    : createMarketDataModule();
  const strategy = postgres
    ? createStrategyModule(createPostgresStrategyDependencies(postgres))
    : createStrategyModule();
  const evaluation = createEvaluationModule();
  const backtesting = postgres
    ? createBacktestingModule(createPostgresBacktestingDependencies(postgres, { marketData, strategy, evaluation, clock: { now: () => new Date().toISOString() } }))
    : createBacktestingModule({ ...createInMemoryBacktestingDependencies(), marketData, strategy, evaluation });
  const modules = {
    marketData,
    strategy,
    search: createSearchModule(undefined as never),
    backtesting,
    evaluation,
    leaderboard: createLeaderboardModule(undefined as never),
    news: createNewsModule(undefined as never),
    sentiment: createSentimentModule(undefined as never),
    auth: createConfiguredAuthModule(),
  };
  console.log("backend modules composed", Object.keys(modules).join(","));
  return modules;
}
