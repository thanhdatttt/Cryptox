import { describe, expect, it } from "vitest";
import { composeAllModules } from "./compose";

const crawlerEnvironment = {
  NEWS_PROVIDER: "CRAWLER_LLM",
  CRAWLER_SOURCE_URLS: "https://news.example.test/feed",
  CRAWLER_MODEL_ENDPOINT: "http://127.0.0.1:18080/v1/chat/completions",
  CRAWLER_MODEL_NAME: "fake-model",
  CRAWLER_LLM_API_KEY: "fake-key",
};

describe("backend composition", () => {
  it("composes RSS without any crawler settings", async () => {
    const modules = composeAllModules({ profile: "TEST", env: { NEWS_PROVIDER: "COINDESK_RSS" } });
    expect(modules.news).toBeDefined();
    await modules.stopRuntime();
  });

  it("composes the configured OpenAI-compatible crawler", async () => {
    const modules = composeAllModules({ profile: "TEST", env: crawlerEnvironment });
    expect(modules.news).toBeDefined();
    await modules.stopRuntime();
  });

  it("fails before composition when crawler settings are incomplete", () => {
    expect(() => composeAllModules({ profile: "TEST", env: { NEWS_PROVIDER: "CRAWLER_LLM" } })).toThrow("MISSING_CONFIGURATION:CRAWLER_SOURCE_URLS");
  });

  it("keeps an explicit DEMO profile non-durable even when infrastructure variables are inherited", async () => {
    const modules = composeAllModules({ profile: "DEMO", env: { DATABASE_URL: "postgres://unreachable", REDIS_URL: "redis://unreachable", JWT_SECRET: "not-used-in-demo" } });
    expect(modules.auth).toBeDefined();
    await modules.stopRuntime();
  });
});
