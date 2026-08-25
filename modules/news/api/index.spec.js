"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const bootstrap_1 = require("./bootstrap");
const demo_provider_1 = require("../infrastructure/demo-provider");
const bootstrap_2 = require("modules/sentiment/api/bootstrap");
const item = (id, minute) => ({
    id,
    title: `Headline ${id}`,
    content: "A normalized article body.",
    source: "RSS",
    publishedAt: `2025-01-01T00:${String(minute).padStart(2, "0")}:00.000Z`,
    crawledAt: "2025-01-01T01:00:00.000Z",
    relatedCoins: ["BTC"],
    url: `https://example.test/${id}`,
});
(0, vitest_1.describe)("news runtime", () => {
    (0, vitest_1.it)("persists normalized News before calling the neutral Sentiment boundary and deduplicates exact URLs", async () => {
        const rows = [];
        const calls = [];
        const runtime = (0, bootstrap_1.createNewsModule)({
            providers: [{ name: "rss", fetch: async () => [item("first", 1), item("first", 1)] }],
            newsRepository: {
                insert: async (value) => {
                    calls.push(`insert:${value.id}`);
                    const existing = rows.find((row) => row.url === value.url);
                    if (existing)
                        return existing;
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
        (0, vitest_1.expect)(rows).toHaveLength(1);
        (0, vitest_1.expect)(calls).toEqual(["insert:first", "analyze:first", "insert:first", "analyze:first"]);
        (0, vitest_1.expect)(calls.indexOf("insert:first")).toBeLessThan(calls.indexOf("analyze:first"));
    });
    (0, vitest_1.it)("keeps persisted News readable with missing Sentiment when inference fails", async () => {
        const rows = [];
        const failures = [];
        const runtime = (0, bootstrap_1.createNewsModule)({
            providers: [{ name: "crawler", fetch: async () => [item("older", 1), item("newer", 2)] }],
            newsRepository: { insert: async (value) => { rows.push(value); return value; }, readAll: async () => rows },
            sentiment: {
                analyze: async (value) => {
                    if (value.newsId === "newer")
                        throw new Error("model timeout");
                    return { newsId: value.newsId, label: "NEGATIVE", score: -0.4, modelName: "demo", modelVersion: "1", analyzedAt: "2025-01-01T01:01:00.000Z" };
                },
                readLatestForNews: async (newsId) => newsId === "older" ? { newsId, label: "NEGATIVE", score: -0.4, modelName: "demo", modelVersion: "1", analyzedAt: "2025-01-01T01:01:00.000Z" } : undefined,
            },
            observability: { recordSentimentFailure: ({ reason }) => failures.push(reason) },
        });
        await runtime.collect();
        await (0, vitest_1.expect)(runtime.readNews()).resolves.toEqual([
            item("newer", 2),
            { ...item("older", 1), sentiment: { newsId: "older", label: "NEGATIVE", score: -0.4, modelName: "demo", modelVersion: "1", analyzedAt: "2025-01-01T01:01:00.000Z" } },
        ]);
        (0, vitest_1.expect)(failures).toEqual(["TIMEOUT"]);
    });
    (0, vitest_1.it)("rejects malformed provider values before they reach News persistence", async () => {
        let persisted = false;
        const runtime = (0, bootstrap_1.createNewsModule)({
            providers: [{ name: "api", fetch: async () => [{ ...item("bad", 1), url: "not-a-url" }] }],
            newsRepository: { insert: async (value) => { persisted = true; return value; }, readAll: async () => [] },
            sentiment: { analyze: async () => { throw new Error("unexpected"); }, readLatestForNews: async () => undefined },
        });
        await (0, vitest_1.expect)(runtime.collect()).rejects.toMatchObject({ code: "INVALID_NEWS_ITEM" });
        (0, vitest_1.expect)(persisted).toBe(false);
    });
    (0, vitest_1.it)("collects concrete local-demo News with deterministic local Sentiment and fails unsupported configured providers explicitly", async () => {
        const sentiment = (0, bootstrap_2.createSentimentModule)({ analysis: (0, bootstrap_2.createDeterministicSentimentAdapter)({ now: () => "2025-01-01T01:00:00.000Z" }) });
        const runtime = (0, bootstrap_1.createNewsModule)({ providers: [(0, demo_provider_1.createDemoNewsProvider)({ now: () => "2025-01-01T01:00:00.000Z" })], sentiment });
        await runtime.collect();
        await (0, vitest_1.expect)(runtime.readNews()).resolves.toEqual(vitest_1.expect.arrayContaining([vitest_1.expect.objectContaining({ source: "LOCAL_DEMO", sentiment: vitest_1.expect.objectContaining({ modelName: "LOCAL_LEXICON", modelVersion: "1.0.0" }) })]));
        await (0, vitest_1.expect)((0, demo_provider_1.createConfiguredNewsProviders)({ provider: "RSS" })[0].fetch()).rejects.toThrow("NEWS_PROVIDER_RSS_NOT_CONFIGURED");
    });
});
