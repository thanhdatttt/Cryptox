import { describe, expect, it } from "vitest";
import { loadBackendRuntimeConfig } from "./runtime-config";

const durableEnvironment = {
  DATABASE_URL: "postgres://configured",
  REDIS_URL: "redis://configured",
  JWT_SECRET: "a-test-secret-that-is-long-enough-for-runtime",
  STRATEGY_MODEL_ENDPOINT: "https://model.test/v1",
  STRATEGY_MODEL_NAME: "gemini-test",
  STRATEGY_LLM_API_KEY: "configured-key",
};

describe("backend runtime profiles", () => {
  it("uses explicit test composition without durable dependencies", () => {
    const config = loadBackendRuntimeConfig({}, "TEST");
    expect(config).toMatchObject({ profile: "TEST", durable: false, marketDataProvider: "BINANCE", backtestPolicyDefaults: { initialCapital: 1000, feeRatePercent: 0, slippageBps: 5, maxAttempts: 1 } });
    expect(config.databaseUrl).toBeUndefined();
    expect(config.redisUrl).toBeUndefined();
  });

  it("requires durable storage and a real JWT secret outside test/demo", () => {
    expect(() => loadBackendRuntimeConfig({}, "DEVELOPMENT")).toThrow("MISSING_CONFIGURATION:DATABASE_URL");
    expect(() => loadBackendRuntimeConfig({ DATABASE_URL: "postgres://configured", REDIS_URL: "redis://configured" }, "DEVELOPMENT")).toThrow("MISSING_CONFIGURATION:JWT_SECRET");
    expect(loadBackendRuntimeConfig(durableEnvironment, "PRODUCTION")).toMatchObject({ profile: "PRODUCTION", durable: true });
  });

  it("requires model configuration only for production and rejects invalid operational bounds", () => {
    expect(() => loadBackendRuntimeConfig({ ...durableEnvironment, STRATEGY_MODEL_ENDPOINT: undefined, STRATEGY_MODEL_NAME: undefined, STRATEGY_LLM_API_KEY: undefined }, "DEVELOPMENT")).toThrow("MISSING_CONFIGURATION:STRATEGY_MODEL_ENDPOINT");
    expect(() => loadBackendRuntimeConfig({ ...durableEnvironment, STRATEGY_MODEL_NAME: undefined }, "PRODUCTION")).toThrow("MISSING_CONFIGURATION:STRATEGY_MODEL_NAME");
    expect(() => loadBackendRuntimeConfig({ ...durableEnvironment, BACKTEST_RECOVERY_INTERVAL_MS: "1000" }, "PRODUCTION")).toThrow("INVALID_CONFIGURATION:BACKTEST_RECOVERY_INTERVAL_MS");
    expect(() => loadBackendRuntimeConfig({ ...durableEnvironment, BACKTEST_DEFAULT_SLIPPAGE_BPS: "501" }, "PRODUCTION")).toThrow("INVALID_CONFIGURATION:BACKTEST_DEFAULT_SLIPPAGE_BPS");
  });

  it("loads configurable Backtest presentation defaults without exposing credentials", () => {
    const config = loadBackendRuntimeConfig({ ...durableEnvironment, BACKTEST_DEFAULT_INITIAL_CAPITAL: "2500", BACKTEST_DEFAULT_FEE_RATE_PERCENT: "0.1", BACKTEST_DEFAULT_SLIPPAGE_BPS: "8", BACKTEST_DEFAULT_MAX_ATTEMPTS: "3" }, "PRODUCTION");
    expect(config.backtestPolicyDefaults).toEqual({ initialCapital: 2500, feeRatePercent: 0.1, slippageBps: 8, maxAttempts: 3 });
  });
});
