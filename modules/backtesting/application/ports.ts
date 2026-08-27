export interface Clock {
  now(): string;
}

export interface BacktestingModuleDependencies {
  marketData?: unknown;
  strategy?: unknown;
  evaluation?: unknown;
  leaderboard?: unknown;
  sentiment?: unknown;
  repositories?: Record<string, unknown>;
  clock?: Clock;
}
