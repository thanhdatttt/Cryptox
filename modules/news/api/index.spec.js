"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const bootstrap_1 = require("./bootstrap");
const coindesk_rss_provider_1 = require("../infrastructure/coindesk-rss-provider");
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
    (0, vitest_1.it)("isolates malformed provider values before they reach News persistence", async () => {
        const rows = [];
        const failures = [];
        const runtime = (0, bootstrap_1.createNewsModule)({
            providers: [
                { name: "api", fetch: async () => [{ ...item("bad", 1), url: "not-a-url" }] },
                { name: "rss", fetch: async () => [item("good", 2)] },
            ],
            newsRepository: { insert: async (value) => { rows.push(value); return value; }, readAll: async () => rows },
            sentiment: { analyze: async () => ({ newsId: "good", label: "POSITIVE", score: 0.5, modelName: "demo", modelVersion: "1", analyzedAt: "2025-01-01T01:01:00.000Z" }), readLatestForNews: async () => undefined },
            observability: { recordProviderFailure: ({ providerName, stage }) => failures.push({ providerName, stage }) },
        });
        await (0, vitest_1.expect)(runtime.collect()).resolves.toBeUndefined();
        (0, vitest_1.expect)(rows.map((row) => row.id)).toEqual(["good"]);
        (0, vitest_1.expect)(failures).toEqual([{ providerName: "api", stage: "VALIDATION" }]);
    });
    (0, vitest_1.it)("continues with independent providers after a provider fetch failure", async () => {
        const rows = [];
        const failures = [];
        const runtime = (0, bootstrap_1.createNewsModule)({
            providers: [
                (0, coindesk_rss_provider_1.createCoinDeskRssProvider)({ fetch: async () => { throw new Error("connection refused"); } }),
                { name: "rss", fetch: async () => [item("rss-item", 3)] },
            ],
            newsRepository: { insert: async (value) => { rows.push(value); return value; }, readAll: async () => rows },
            sentiment: { analyze: async () => ({ newsId: "rss-item", label: "NEUTRAL", score: 0, modelName: "demo", modelVersion: "1", analyzedAt: "2025-01-01T01:01:00.000Z" }), readLatestForNews: async () => undefined },
            observability: { recordProviderFailure: (failure) => failures.push(failure) },
        });
        await runtime.collect();
        (0, vitest_1.expect)(rows.map((row) => row.id)).toEqual(["rss-item"]);
        (0, vitest_1.expect)(failures).toEqual([{ providerName: "COINDESK_RSS_V1", stage: "FETCH", reason: "ERROR" }]);
    });
    (0, vitest_1.it)("configures CoinDesk RSS by default and when explicitly selected", () => {
        (0, vitest_1.expect)(coindesk_rss_provider_1.COINDESK_RSS_FEED_URL).toBe("https://www.coindesk.com/arc/outboundfeeds/rss/");
        (0, vitest_1.expect)((0, coindesk_rss_provider_1.createConfiguredNewsProviders)()[0]).toEqual(vitest_1.expect.objectContaining({ name: "COINDESK_RSS_V1" }));
        (0, vitest_1.expect)((0, coindesk_rss_provider_1.createConfiguredNewsProviders)({ provider: "coindesk_rss" })[0]).toEqual(vitest_1.expect.objectContaining({ name: "COINDESK_RSS_V1" }));
    });
    (0, vitest_1.it)("rejects providers that have no registered adapter", () => {
        (0, vitest_1.expect)(() => (0, coindesk_rss_provider_1.createConfiguredNewsProviders)({ provider: "UNKNOWN" })).toThrow("INVALID_CONFIGURATION:NEWS_PROVIDER:UNKNOWN");
        (0, vitest_1.expect)(() => (0, coindesk_rss_provider_1.createConfiguredNewsProviders)({ provider: "CRAWLER" })).toThrow("MISSING_CONFIGURATION:NEWS_PROVIDER_CRAWLER");
    });
});
