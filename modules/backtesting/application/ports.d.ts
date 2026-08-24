import type { BacktestLogApi } from "../api";
export interface BacktestingModuleDependencies {
  coordinator?: BacktestLogApi;
  marketData?: unknown;
  strategy?: unknown;
  evaluation?: unknown;
  leaderboard?: unknown;
  sentiment?: unknown;
  repositories?: Record<string, unknown>;
  queue?: unknown;
  clock?: {
    now(): string;
  };
}
