import { createConfiguredAuthModule } from "modules/auth/api/bootstrap";
import { Pool } from "pg";
import type { AuthModulePublicApi } from "modules/auth/api";
import type { MarketDataModulePublicApi } from "modules/market-data/api";
import type { NewsModulePublicApi } from "modules/news/api";
import type { StrategyModuleRuntime } from "modules/strategy/api/bootstrap";
import { createBacktestingModule } from "modules/backtesting/api/bootstrap";
import { createEvaluationModule } from "modules/evaluation/api/bootstrap";
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
}

export function composeAllModules(): BackendModules {
  const marketData = process.env.MARKET_DATA_PROVIDER === "BINANCE"
    ? createMarketDataModule({ providerRegistry: { defaultProvider: createBinanceMarketDataAdapter() } })
    : createMarketDataModule();
  const strategy = process.env.DATABASE_URL
    ? createStrategyModule(createPostgresStrategyDependencies(new Pool({ connectionString: process.env.DATABASE_URL })))
    : createStrategyModule();
  const modules = {
    marketData,
    strategy,
    search: createSearchModule(undefined as never),
    backtesting: createBacktestingModule(undefined as never),
    evaluation: createEvaluationModule(),
    leaderboard: createLeaderboardModule(undefined as never),
    news: createNewsModule(undefined as never),
    sentiment: createSentimentModule(undefined as never),
    auth: createConfiguredAuthModule(),
  };
  console.log("backend modules composed", Object.keys(modules).join(","));
  return modules;
}
