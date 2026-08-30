import { Pool } from "pg";
import { BullMqBacktestQueue, BullMqBacktestWorker, createBacktestingModule, createPostgresBacktestingDependencies } from "modules/backtesting/api/bootstrap";
import type { BacktestLogApi } from "modules/backtesting/api";
import { createMarketDataSnapshotReader, PostgresSnapshotRepository } from "modules/market-data/api/bootstrap";
import { createStrategyModule } from "modules/strategy/api/bootstrap";
import { createSentimentModule, PostgresSentimentSnapshotRepository } from "modules/sentiment/api/bootstrap";

interface WorkerQueue {
  enqueue(value: import("@cryptox/contracts/queue").BacktestQueuePayload): Promise<void>;
  remove(jobId: string): Promise<void>;
  close?(): Promise<void>;
}

export interface WorkerModules {
  backtesting: BacktestLogApi;
  start(): BullMqBacktestWorker;
  stop(): Promise<void>;
}

export interface WorkerCompositionOptions {
  databaseUrl?: string;
  redisUrl?: string;
  pool?: Pool;
  queue?: WorkerQueue;
}

const workerConcurrency = (env: NodeJS.ProcessEnv = process.env): number => {
  const raw = env.BACKTEST_WORKER_CONCURRENCY?.trim() ?? "1";
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) throw new Error("INVALID_CONFIGURATION:BACKTEST_WORKER_CONCURRENCY");
  return parsed;
};

export function composeWorkerModules(options: WorkerCompositionOptions = {}): WorkerModules {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  const redisUrl = options.redisUrl ?? process.env.REDIS_URL;
  if (!databaseUrl) throw new Error("BACKTEST_WORKER_DATABASE_URL_REQUIRED");
  if (!redisUrl) throw new Error("BACKTEST_WORKER_REDIS_URL_REQUIRED");
  const pool = options.pool ?? new Pool({ connectionString: databaseUrl });
  const queue: WorkerQueue = options.queue ?? new BullMqBacktestQueue(redisUrl);
  const marketData = createMarketDataSnapshotReader({
    snapshotRepository: new PostgresSnapshotRepository(pool),
    clock: { now: () => new Date().toISOString() },
    observability: { record: () => undefined },
  });
  const sentiment = createSentimentModule({ snapshotRepository: new PostgresSentimentSnapshotRepository(pool) });
  const backtesting = createBacktestingModule(createPostgresBacktestingDependencies(pool, {
    marketData,
    sentiment,
    strategy: createStrategyModule(),
    queue,
    completion: {
      score: async () => { throw new Error("BACKTEST_WORKER_COMPLETION_NOT_AVAILABLE"); },
      submit: async () => { throw new Error("BACKTEST_WORKER_COMPLETION_NOT_AVAILABLE"); },
    },
    clock: { now: () => new Date().toISOString() },
  }));
  let worker: BullMqBacktestWorker | undefined;
  return {
    backtesting,
    start: () => worker ?? (worker = new BullMqBacktestWorker(redisUrl, backtesting, workerConcurrency())),
    stop: async () => {
      await worker?.close();
      await queue.close?.();
      if (!options.pool && typeof (pool as Pool & { end?: () => Promise<void> }).end === "function") await (pool as Pool & { end: () => Promise<void> }).end();
    },
  };
}
