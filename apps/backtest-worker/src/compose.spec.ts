import { describe, expect, it } from "vitest";
import { composeWorkerModules } from "./compose";

describe("worker composition", () => {
  const queue = { enqueue: async () => undefined, remove: async () => undefined };

  it("requires durable PostgreSQL and Redis configuration", () => {
    expect(() => composeWorkerModules({ redisUrl: "redis://127.0.0.1:6379" })).toThrow("BACKTEST_WORKER_DATABASE_URL_REQUIRED");
    expect(() => composeWorkerModules({ databaseUrl: "postgres://cryptox:cryptox@127.0.0.1:5432/cryptox" })).toThrow("BACKTEST_WORKER_REDIS_URL_REQUIRED");
  });

  it("exposes only the Backtesting public worker runtime", () => {
    const modules = composeWorkerModules({
      databaseUrl: "postgres://cryptox:cryptox@127.0.0.1:5432/cryptox",
      redisUrl: "redis://127.0.0.1:6379",
      pool: { query: async <Row>() => ({ rows: [] as Row[] }) } as never,
      queue,
    });
    expect(Object.keys(modules)).toEqual(["backtesting", "start", "stop"]);
    expect(typeof modules.backtesting.processQueueJob).toBe("function");
    expect(typeof modules.backtesting.reconcileQueue).toBe("function");
    expect(typeof modules.stop).toBe("function");
  });

  it("rejects invalid worker concurrency before starting BullMQ", () => {
    const previous = process.env.BACKTEST_WORKER_CONCURRENCY;
    process.env.BACKTEST_WORKER_CONCURRENCY = "0";
    try {
      const modules = composeWorkerModules({
        databaseUrl: "postgres://cryptox:cryptox@127.0.0.1:5432/cryptox",
        redisUrl: "redis://127.0.0.1:6379",
        pool: { query: async <Row>() => ({ rows: [] as Row[] }) } as never,
        queue,
      });
      expect(() => modules.start()).toThrow("INVALID_CONFIGURATION:BACKTEST_WORKER_CONCURRENCY");
    } finally {
      if (previous === undefined) delete process.env.BACKTEST_WORKER_CONCURRENCY;
      else process.env.BACKTEST_WORKER_CONCURRENCY = previous;
    }
  });
});
