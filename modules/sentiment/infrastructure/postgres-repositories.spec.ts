import { describe, expect, it } from "vitest";
import { PostgresSentimentResultRepository, PostgresSentimentSnapshotRepository } from "./postgres-repositories";

describe("PostgreSQL sentiment repositories", () => {
  it("persists model-versioned results and sealed snapshot points", async () => {
    const calls: Array<{ text: string; values: unknown[] }> = [];
    const client = {
      query: async <Row>(text: string, values: unknown[]) => {
        calls.push({ text, values });
        if (text.startsWith("INSERT INTO sentiment_results")) {
          return { rows: [{ news_id: "news-1", label: "POSITIVE", score: "0.5", model_name: "LOCAL_LEXICON", model_version: "1.0.0", analyzed_at: "2025-01-01T00:01:00.000Z" }] as Row[] };
        }
        return { rows: [] as Row[] };
      },
    };
    const resultRepository = new PostgresSentimentResultRepository(client);
    await resultRepository.insert({ newsId: "news-1", label: "POSITIVE", score: 0.5, modelName: "LOCAL_LEXICON", modelVersion: "1.0.0", analyzedAt: "2025-01-01T00:01:00.000Z" }, { newsId: "news-1", title: "headline", content: "body", source: "COINDESK", publishedAt: "2025-01-01T00:00:00.000Z", relatedCoins: ["BTC"] });
    const snapshotRepository = new PostgresSentimentSnapshotRepository(client);
    await snapshotRepository.insertSealed({ id: "snapshot-1", relatedCoin: "BTC", range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T00:05:00.000Z" }, aggregationWindowSeconds: 300, modelName: "LOCAL_LEXICON", modelVersion: "1.0.0", modelSha256: "a".repeat(64), pointCount: 1, sha256: "b".repeat(64), createdAt: "2025-01-01T00:05:00.000Z" }, [{ timestamp: "2025-01-01T00:05:00.000Z", label: "POSITIVE", averageScore: 0.5 }]);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO sentiment_results") && call.text.includes("ON CONFLICT"))).toBe(true);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO sentiment_dataset_snapshots"))).toBe(true);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO sentiment_dataset_snapshot_points"))).toBe(true);
  });
});
