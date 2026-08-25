"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const postgres_repositories_1 = require("./postgres-repositories");
(0, vitest_1.describe)("PostgreSQL sentiment repositories", () => {
    (0, vitest_1.it)("persists model-versioned results and sealed snapshot points", async () => {
        const calls = [];
        const client = {
            query: async (text, values) => {
                calls.push({ text, values });
                if (text.startsWith("INSERT INTO sentiment_results")) {
                    return { rows: [{ news_id: "news-1", label: "POSITIVE", score: "0.5", model_name: "LOCAL_LEXICON", model_version: "1.0.0", analyzed_at: "2025-01-01T00:01:00.000Z" }] };
                }
                return { rows: [] };
            },
        };
        const resultRepository = new postgres_repositories_1.PostgresSentimentResultRepository(client);
        await resultRepository.insert({ newsId: "news-1", label: "POSITIVE", score: 0.5, modelName: "LOCAL_LEXICON", modelVersion: "1.0.0", analyzedAt: "2025-01-01T00:01:00.000Z" }, { newsId: "news-1", title: "headline", content: "body", source: "LOCAL_DEMO", publishedAt: "2025-01-01T00:00:00.000Z", relatedCoins: ["BTC"] });
        const snapshotRepository = new postgres_repositories_1.PostgresSentimentSnapshotRepository(client);
        await snapshotRepository.insertSealed({ id: "snapshot-1", relatedCoin: "BTC", range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T00:05:00.000Z" }, aggregationWindowSeconds: 300, modelName: "LOCAL_LEXICON", modelVersion: "1.0.0", modelSha256: "a".repeat(64), pointCount: 1, sha256: "b".repeat(64), createdAt: "2025-01-01T00:05:00.000Z" }, [{ timestamp: "2025-01-01T00:05:00.000Z", label: "POSITIVE", averageScore: 0.5 }]);
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO sentiment_results") && call.text.includes("ON CONFLICT"))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO sentiment_dataset_snapshots"))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO sentiment_dataset_snapshot_points"))).toBe(true);
    });
});
