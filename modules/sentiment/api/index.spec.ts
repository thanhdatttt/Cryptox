import { describe, expect, it } from "vitest";
import { createInMemorySentimentDependencies, createSentimentModule } from "./index";

const at = (minute: number) => `2025-01-01T00:${String(minute).padStart(2, "0")}:00.000Z`;
const input = (newsId: string, minute: number) => ({ newsId, title: `News ${newsId}`, content: "Normalized crypto news", source: "RSS", publishedAt: at(minute), relatedCoins: ["BTC"] });

describe("sentiment runtime", () => {
  it("persists model-provenant results append-only and selects the latest result deterministically", async () => {
    const dependencies = createInMemorySentimentDependencies();
    let modelVersion = "1";
    dependencies.analysis = { analyze: async (value) => ({ newsId: value.newsId, label: "POSITIVE" as const, score: 0.4, modelName: "demo-model", modelVersion, analyzedAt: at(20) }) };
    const runtime = createSentimentModule(dependencies);

    await expect(runtime.analyze(input("news-1", 1))).resolves.toMatchObject({ modelName: "demo-model", modelVersion: "1", score: 0.4 });
    modelVersion = "2";
    await runtime.analyze(input("news-1", 1));

    await expect(runtime.readLatestForNews("news-1")).resolves.toMatchObject({ modelVersion: "2" });
    await expect(runtime.analyze(input("news-1", 1))).rejects.toMatchObject({ code: "DUPLICATE_RESULT" });
  });

  it("rejects invalid inference output without persisting a fabricated sentiment result", async () => {
    const dependencies = createInMemorySentimentDependencies();
    const failures: string[] = [];
    dependencies.analysis = { analyze: async (value) => ({ newsId: value.newsId, label: "POSITIVE" as const, score: 2, modelName: "bad", modelVersion: "1", analyzedAt: at(1) }) };
    dependencies.observability = { recordInferenceFailure: ({ reason }) => failures.push(reason) };
    const runtime = createSentimentModule(dependencies);

    await expect(runtime.analyze(input("news-invalid", 1))).rejects.toMatchObject({ code: "INVALID_RESULT" });
    await expect(runtime.readLatestForNews("news-invalid")).resolves.toBeUndefined();
    expect(failures).toEqual(["INVALID_RESULT"]);
  });

  it("seals content-hashed, window-aligned snapshots without future or carry-forward reads", async () => {
    const dependencies = createInMemorySentimentDependencies();
    const scores = new Map([["one", 0.5], ["two", -0.1], ["three", -0.4]]);
    dependencies.analysis = { analyze: async (value) => ({ newsId: value.newsId, label: "NEUTRAL" as const, score: scores.get(value.newsId)!, modelName: "demo-model", modelVersion: "1", analyzedAt: at(20) }) };
    dependencies.clock = { now: () => at(20) };
    const runtime = createSentimentModule(dependencies);
    await runtime.analyze(input("one", 1));
    await runtime.analyze(input("two", 4));
    await runtime.analyze(input("three", 6));

    const snapshot = await runtime.createSnapshot({ relatedCoin: "BTC", range: { from: at(0), to: at(15) }, aggregationWindowSeconds: 300, modelName: "demo-model", modelVersion: "1", modelSha256: "a".repeat(64) });
    const reader = await runtime.readSnapshot(snapshot.id);

    expect(snapshot).toMatchObject({ relatedCoin: "BTC", pointCount: 2, createdAt: at(20), sha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(await runtime.getSnapshotRef(snapshot.id)).toEqual(snapshot);
    expect(reader.readAt(snapshot.id, at(5))).toMatchObject({ timestamp: at(5), label: "POSITIVE", averageScore: 0.2 });
    expect(reader.readAt(snapshot.id, at(10))).toMatchObject({ timestamp: at(10), label: "NEGATIVE", averageScore: -0.4 });
    expect(reader.readAt(snapshot.id, at(11))).toBeUndefined();
    await expect(runtime.createSnapshot({ relatedCoin: "BTCUSDT", range: { from: at(0), to: at(15) }, aggregationWindowSeconds: 300, modelName: "demo-model", modelVersion: "1", modelSha256: "a".repeat(64) })).rejects.toMatchObject({ code: "INVALID_SNAPSHOT" });
  });
});
