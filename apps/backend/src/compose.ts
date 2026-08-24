import { createConfiguredAuthModule } from "modules/auth/api/bootstrap";
import type { AuthModulePublicApi } from "modules/auth/api";
import { createBacktestingModule } from "modules/backtesting/api/bootstrap";
import { createEvaluationModule } from "modules/evaluation/api/bootstrap";
import { createLeaderboardModule } from "modules/leaderboard/api/bootstrap";
import { createMarketDataModule } from "modules/market-data/api/bootstrap";
import { createNewsModule } from "modules/news/api/bootstrap";
import { createSearchModule } from "modules/search/api/bootstrap";
import { createSentimentModule } from "modules/sentiment/api/bootstrap";
import { createStrategyModule } from "modules/strategy/api/bootstrap";

export interface BackendModules extends Record<string, unknown> {
  auth: AuthModulePublicApi;
}

export function composeAllModules(): BackendModules {
  const modules = {
    marketData: createMarketDataModule(undefined as never),
    strategy: createStrategyModule(undefined as never),
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
