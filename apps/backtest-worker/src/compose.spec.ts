import { describe, expect, it } from "vitest";
import { composeWorkerModules } from "./compose";

describe("worker composition", () => {
  it("requires durable PostgreSQL and Redis configuration", () => {
    expect(() => composeWorkerModules({ redisUrl: "redis://127.0.0.1:6379" })).toThrow("BACKTEST_WORKER_DATABASE_URL_REQUIRED");
    expect(() => composeWorkerModules({ databaseUrl: "postgres://cryptox:cryptox@127.0.0.1:5432/cryptox" })).toThrow("BACKTEST_WORKER_REDIS_URL_REQUIRED");
  });

  it("exposes only the Backtesting public worker runtime", () => {
    const modules = composeWorkerModules({
      databaseUrl: "postgres://cryptox:cryptox@127.0.0.1:5432/cryptox",
      redisUrl: "redis://127.0.0.1:6379",
      pool: { query: async <Row>() => ({ rows: [] as Row[] }) } as never,
    });
    expect(Object.keys(modules)).toEqual(["backtesting", "start"]);
    expect(typeof modules.backtesting.processQueueJob).toBe("function");
    expect(typeof modules.backtesting.reconcileQueue).toBe("function");
  });
});
