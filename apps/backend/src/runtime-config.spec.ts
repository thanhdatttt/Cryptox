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

  it("keeps RSS independent from crawler configuration", () => {
    const config = loadBackendRuntimeConfig({ NEWS_PROVIDER: "COINDESK_RSS" }, "TEST");
    expect(config.newsProvider).toBe("COINDESK_RSS");
    expect(config.crawlerSourceUrls).toEqual([]);
    expect(config.crawlerModelEndpoint).toBeUndefined();
  });

  it("requires and validates every crawler setting only when CRAWLER_LLM is selected", () => {
    expect(() => loadBackendRuntimeConfig({ NEWS_PROVIDER: "CRAWLER_LLM" }, "TEST")).toThrow("MISSING_CONFIGURATION:CRAWLER_SOURCE_URLS");
    const config = loadBackendRuntimeConfig({
      NEWS_PROVIDER: "CRAWLER_LLM",
      CRAWLER_SOURCE_URLS: "https://news.example.test/a, https://news.example.test/b",
      CRAWLER_MODEL_ENDPOINT: "http://127.0.0.1:8080/v1/chat/completions",
      CRAWLER_MODEL_NAME: "fake-model",
      CRAWLER_LLM_API_KEY: "fake-key",
      CRAWLER_REQUEST_TIMEOUT_MS: "500",
      CRAWLER_MAX_OUTPUT_BYTES: "4096",
    }, "TEST");
    expect(config).toMatchObject({
      newsProvider: "CRAWLER_LLM",
      crawlerSourceUrls: ["https://news.example.test/a", "https://news.example.test/b"],
      crawlerModelEndpoint: "http://127.0.0.1:8080/v1/chat/completions",
      crawlerModelName: "fake-model",
      crawlerLlmApiKey: "fake-key",
      crawlerRequestTimeoutMs: 500,
      crawlerMaxOutputBytes: 4096,
    });
    expect(() => loadBackendRuntimeConfig({
      NEWS_PROVIDER: "CRAWLER_LLM",
      CRAWLER_SOURCE_URLS: "http://127.0.0.1/private",
      CRAWLER_MODEL_ENDPOINT: "not-a-url",
      CRAWLER_MODEL_NAME: "fake-model",
      CRAWLER_LLM_API_KEY: "fake-key",
    }, "TEST")).toThrow("INVALID_CONFIGURATION:CRAWLER_MODEL_ENDPOINT");
  });
});
