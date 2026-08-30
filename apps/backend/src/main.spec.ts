import { describe, expect, it } from "vitest";
import { HealthController } from "./app.module";
import { composeRuntimeState, readinessOf } from "./compose";

describe("backend runtime truth", () => {
  it("declares only active MVP modules without constructing fake facades", () => {
    expect(composeRuntimeState().activeModules).toEqual([
      "auth",
      "marketData",
      "strategy",
      "search",
      "backtesting",
      "evaluation",
      "leaderboard",
      "news",
      "sentiment",
    ]);
  });

  it("keeps optional providers degraded without hiding required unavailability", () => {
    const readiness = readinessOf(composeRuntimeState());

    expect(readiness.status).toBe("not-ready");
    expect(readiness.unavailableRequired.map(({ name }) => name)).toEqual([
      "auth-persistence",
      "persistence-adapters",
      "market-data-provider",
      "backtest-runner",
      "leaderboard-persistence",
      "strategy-persistence",
      "search-composition",
    ]);
    expect(readiness.degradedOptional.map(({ name }) => name)).toEqual([
      "news-provider",
      "sentiment-persistence",
    ]);
  });

  it("reports process liveness independently of readiness", () => {
    const controller = new HealthController();

    expect(controller.live()).toEqual({ status: "live" });
    expect(controller.ready()).toMatchObject({ status: "not-ready" });
  });
});
