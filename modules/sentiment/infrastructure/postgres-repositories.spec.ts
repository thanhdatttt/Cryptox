import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { PostgresSentimentResultRepository, PostgresSentimentSnapshotRepository } from "./postgres-repositories";
import { sentimentSnapshotSerialization } from "../domain/rules";

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
    const snapshotCommand = { relatedCoin: "BTC", range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T00:05:00.000Z" }, aggregationWindowSeconds: 300, modelName: "LOCAL_LEXICON", modelVersion: "1.0.0", modelSha256: "a".repeat(64) } as const;
    const points = [{ timestamp: "2025-01-01T00:05:00.000Z", label: "POSITIVE" as const, averageScore: 0.5 }];
    const sha256 = createHash("sha256").update(sentimentSnapshotSerialization(snapshotCommand, points), "utf8").digest("hex");
    await snapshotRepository.insertSealed({ id: "snapshot-1", ...snapshotCommand, pointCount: 1, sha256, createdAt: "2025-01-01T00:05:00.000Z" }, points);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO sentiment_results") && call.text.includes("ON CONFLICT"))).toBe(true);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO sentiment_dataset_snapshots"))).toBe(true);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO sentiment_dataset_snapshot_points"))).toBe(true);
  });

  it("rolls back metadata and points together when a point insert fails", async () => {
    const calls: string[] = [];
    const command = { relatedCoin: "BTC", range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T00:05:00.000Z" }, aggregationWindowSeconds: 300, modelName: "model", modelVersion: "1", modelSha256: "a".repeat(64) } as const;
    const points = [{ timestamp: "2025-01-01T00:05:00.000Z", label: "NEUTRAL" as const, averageScore: 0 }];
    const sha256 = createHash("sha256").update(sentimentSnapshotSerialization(command, points), "utf8").digest("hex");
    const transaction = { query: async <Row>(text: string) => { calls.push(text); if (text.startsWith("INSERT INTO sentiment_dataset_snapshot_points")) throw new Error("point write failed"); return { rows: [] as Row[] }; }, release: () => undefined };
    const client = { query: async <Row>() => ({ rows: [] as Row[] }), connect: async () => transaction };
    await expect(new PostgresSentimentSnapshotRepository(client).insertSealed({ id: "snapshot-rollback", ...command, pointCount: 1, sha256, createdAt: "2025-01-01T00:05:00.000Z" }, points)).rejects.toThrow("point write failed");
    expect(calls).toEqual(expect.arrayContaining(["BEGIN", expect.stringContaining("INSERT INTO sentiment_dataset_snapshots"), expect.stringContaining("INSERT INTO sentiment_dataset_snapshot_points"), "ROLLBACK"]));
    expect(calls).not.toContain("COMMIT");
  });
});
