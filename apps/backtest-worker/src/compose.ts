import { Pool } from "pg";
import { BullMqBacktestWorker, createBacktestingModule, createInMemoryBacktestingDependencies, createPostgresBacktestingDependencies } from "modules/backtesting/api/bootstrap";
import type { BacktestLogApi } from "modules/backtesting/api";
import { createStrategyModule } from "modules/strategy/api/bootstrap";

export interface WorkerModules {
  backtesting: BacktestLogApi;
  start(): BullMqBacktestWorker;
}

export interface WorkerCompositionOptions {
  databaseUrl?: string;
  redisUrl?: string;
  pool?: Pool;
}

export function composeWorkerModules(options: WorkerCompositionOptions = {}): WorkerModules {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  const redisUrl = options.redisUrl ?? process.env.REDIS_URL;
  if (!databaseUrl) throw new Error("BACKTEST_WORKER_DATABASE_URL_REQUIRED");
  if (!redisUrl) throw new Error("BACKTEST_WORKER_REDIS_URL_REQUIRED");
  const inMemory = createInMemoryBacktestingDependencies();
  const pool = options.pool ?? new Pool({ connectionString: databaseUrl });
  const backtesting = createBacktestingModule(createPostgresBacktestingDependencies(pool, {
    marketData: inMemory.marketData,
    strategy: createStrategyModule(),
    evaluation: inMemory.evaluation,
    queue: inMemory.queue,
    completion: inMemory.completion,
    clock: { now: () => new Date().toISOString() },
  }));
  return { backtesting, start: () => new BullMqBacktestWorker(redisUrl, backtesting, Number(process.env.BACKTEST_WORKER_CONCURRENCY ?? "1")) };
}
