import { describe, expect, it } from "vitest";
import { createNewsModule } from "./bootstrap";
import { createConfiguredNewsProviders, createDemoNewsProvider } from "../infrastructure/demo-provider";
import { createDeterministicSentimentAdapter, createSentimentModule } from "modules/sentiment/api/bootstrap";
import type { NewsItem } from "./index";

const item = (id: string, minute: number): NewsItem => ({
  id,
  title: `Headline ${id}`,
  content: "A normalized article body.",
  source: "RSS",
  publishedAt: `2025-01-01T00:${String(minute).padStart(2, "0")}:00.000Z`,
  crawledAt: "2025-01-01T01:00:00.000Z",
  relatedCoins: ["BTC"],
  url: `https://example.test/${id}`,
});

describe("news runtime", () => {
  it("persists normalized News before calling the neutral Sentiment boundary and deduplicates exact URLs", async () => {
    const rows: NewsItem[] = [];
    const calls: string[] = [];
    const runtime = createNewsModule({
      providers: [{ name: "rss", fetch: async () => [item("first", 1), item("first", 1)] }],
      newsRepository: {
        insert: async (value) => {
          calls.push(`insert:${value.id}`);
          const existing = rows.find((row) => row.url === value.url);
          if (existing) return existing;
          rows.push(value);
          return value;
        },
        readAll: async () => rows,
      },
      sentiment: {
        analyze: async (value) => {
          calls.push(`analyze:${value.newsId}`);
          return { newsId: value.newsId, label: "POSITIVE", score: 0.5, modelName: "demo", modelVersion: "1", analyzedAt: "2025-01-01T01:01:00.000Z" };
        },
        readLatestForNews: async () => undefined,
      },
    });

    await runtime.collect();

    expect(rows).toHaveLength(1);
    expect(calls).toEqual(["insert:first", "analyze:first", "insert:first", "analyze:first"]);
    expect(calls.indexOf("insert:first")).toBeLessThan(calls.indexOf("analyze:first"));
  });

  it("keeps persisted News readable with missing Sentiment when inference fails", async () => {
    const rows: NewsItem[] = [];
    const failures: string[] = [];
    const runtime = createNewsModule({
      providers: [{ name: "crawler", fetch: async () => [item("older", 1), item("newer", 2)] }],
      newsRepository: { insert: async (value) => { rows.push(value); return value; }, readAll: async () => rows },
      sentiment: {
        analyze: async (value) => {
          if (value.newsId === "newer") throw new Error("model timeout");
          return { newsId: value.newsId, label: "NEGATIVE", score: -0.4, modelName: "demo", modelVersion: "1", analyzedAt: "2025-01-01T01:01:00.000Z" };
        },
        readLatestForNews: async (newsId) => newsId === "older" ? { newsId, label: "NEGATIVE", score: -0.4, modelName: "demo", modelVersion: "1", analyzedAt: "2025-01-01T01:01:00.000Z" } : undefined,
      },
      observability: { recordSentimentFailure: ({ reason }) => failures.push(reason) },
    });

    await runtime.collect();

    await expect(runtime.readNews()).resolves.toEqual([
      item("newer", 2),
      { ...item("older", 1), sentiment: { newsId: "older", label: "NEGATIVE", score: -0.4, modelName: "demo", modelVersion: "1", analyzedAt: "2025-01-01T01:01:00.000Z" } },
    ]);
    expect(failures).toEqual(["TIMEOUT"]);
  });

  it("isolates malformed provider values before they reach News persistence", async () => {
    const rows: NewsItem[] = [];
    const failures: Array<{ providerName: string; stage: string }> = [];
    const runtime = createNewsModule({
      providers: [
        { name: "api", fetch: async () => [{ ...item("bad", 1), url: "not-a-url" }] },
        { name: "rss", fetch: async () => [item("good", 2)] },
      ],
      newsRepository: { insert: async (value) => { rows.push(value); return value; }, readAll: async () => rows },
      sentiment: { analyze: async () => ({ newsId: "good", label: "POSITIVE", score: 0.5, modelName: "demo", modelVersion: "1", analyzedAt: "2025-01-01T01:01:00.000Z" }), readLatestForNews: async () => undefined },
      observability: { recordProviderFailure: ({ providerName, stage }) => failures.push({ providerName, stage }) },
    });

    await expect(runtime.collect()).resolves.toBeUndefined();
    expect(rows.map((row) => row.id)).toEqual(["good"]);
    expect(failures).toEqual([{ providerName: "api", stage: "VALIDATION" }]);
  });

  it("continues with independent providers after a provider fetch failure", async () => {
    const rows: NewsItem[] = [];
    const failures: Array<{ providerName: string; stage: string; reason: string }> = [];
    const runtime = createNewsModule({
      providers: [
        { name: "crawler", fetch: async () => { throw new Error("connection refused"); } },
        { name: "rss", fetch: async () => [item("rss-item", 3)] },
      ],
      newsRepository: { insert: async (value) => { rows.push(value); return value; }, readAll: async () => rows },
      sentiment: { analyze: async () => ({ newsId: "rss-item", label: "NEUTRAL", score: 0, modelName: "demo", modelVersion: "1", analyzedAt: "2025-01-01T01:01:00.000Z" }), readLatestForNews: async () => undefined },
      observability: { recordProviderFailure: (failure) => failures.push(failure) },
    });

    await runtime.collect();

    expect(rows.map((row) => row.id)).toEqual(["rss-item"]);
    expect(failures).toEqual([{ providerName: "crawler", stage: "FETCH", reason: "ERROR" }]);
  });

  it("collects concrete local-demo News with deterministic local Sentiment and fails unsupported configured providers explicitly", async () => {
    const sentiment = createSentimentModule({ analysis: createDeterministicSentimentAdapter({ now: () => "2025-01-01T01:00:00.000Z" }) });
    const runtime = createNewsModule({ providers: [createDemoNewsProvider({ now: () => "2025-01-01T01:00:00.000Z" })], sentiment });
    await runtime.collect();
    await expect(runtime.readNews()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ source: "LOCAL_DEMO", sentiment: expect.objectContaining({ modelName: "LOCAL_LEXICON", modelVersion: "1.0.0" }) })]));
    await expect(createConfiguredNewsProviders({ provider: "RSS" })[0]!.fetch()).rejects.toThrow("NEWS_PROVIDER_RSS_NOT_CONFIGURED");
  });
});
