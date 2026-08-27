import { createBacktestingModule } from "@cryptox/backtesting/bootstrap";
import { createEvaluationModule } from "@cryptox/evaluation/bootstrap";
import { createLeaderboardModule } from "@cryptox/leaderboard/bootstrap";
import { createMarketDataModule } from "@cryptox/market-data/bootstrap";
import { createNewsModule } from "@cryptox/news/bootstrap";
import { createSearchModule } from "@cryptox/search/bootstrap";
import { createSentimentModule } from "@cryptox/sentiment/bootstrap";
import { createStrategyModule } from "@cryptox/strategy/bootstrap";

export function composeAllModules(): Record<string, unknown> {
  const modules = {
    marketData: createMarketDataModule(undefined as never),
    strategy: createStrategyModule(undefined as never),
    search: createSearchModule(undefined as never),
    backtesting: createBacktestingModule(undefined as never),
    evaluation: createEvaluationModule(),
    leaderboard: createLeaderboardModule(undefined as never),
    news: createNewsModule(undefined as never),
    sentiment: createSentimentModule(undefined as never),
  };
  console.log("backend modules composed", Object.keys(modules).join(","));
  return modules;
}
