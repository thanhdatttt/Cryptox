"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("./index");
const at = (minute) => `2025-01-01T00:${String(minute).padStart(2, "0")}:00.000Z`;
const input = (newsId, minute) => ({ newsId, title: `News ${newsId}`, content: "Normalized crypto news", source: "RSS", publishedAt: at(minute), relatedCoins: ["BTC"] });
(0, vitest_1.describe)("sentiment runtime", () => {
    (0, vitest_1.it)("persists model-provenant results append-only and selects the latest result deterministically", async () => {
        const dependencies = (0, index_1.createInMemorySentimentDependencies)();
        let modelVersion = "1";
        dependencies.analysis = { analyze: async (value) => ({ newsId: value.newsId, label: "POSITIVE", score: 0.4, modelName: "demo-model", modelVersion, analyzedAt: at(20) }) };
        const runtime = (0, index_1.createSentimentModule)(dependencies);
        await (0, vitest_1.expect)(runtime.analyze(input("news-1", 1))).resolves.toMatchObject({ modelName: "demo-model", modelVersion: "1", score: 0.4 });
        modelVersion = "2";
        await runtime.analyze(input("news-1", 1));
        await (0, vitest_1.expect)(runtime.readLatestForNews("news-1")).resolves.toMatchObject({ modelVersion: "2" });
        await (0, vitest_1.expect)(runtime.analyze(input("news-1", 1))).rejects.toMatchObject({ code: "DUPLICATE_RESULT" });
    });
    (0, vitest_1.it)("rejects invalid inference output without persisting a fabricated sentiment result", async () => {
        const dependencies = (0, index_1.createInMemorySentimentDependencies)();
        const failures = [];
        dependencies.analysis = { analyze: async (value) => ({ newsId: value.newsId, label: "POSITIVE", score: 2, modelName: "bad", modelVersion: "1", analyzedAt: at(1) }) };
        dependencies.observability = { recordInferenceFailure: ({ reason }) => failures.push(reason) };
        const runtime = (0, index_1.createSentimentModule)(dependencies);
        await (0, vitest_1.expect)(runtime.analyze(input("news-invalid", 1))).rejects.toMatchObject({ code: "INVALID_RESULT" });
        await (0, vitest_1.expect)(runtime.readLatestForNews("news-invalid")).resolves.toBeUndefined();
        (0, vitest_1.expect)(failures).toEqual(["INVALID_RESULT"]);
    });
    (0, vitest_1.it)("seals content-hashed, window-aligned snapshots without future or carry-forward reads", async () => {
        const dependencies = (0, index_1.createInMemorySentimentDependencies)();
        const scores = new Map([["one", 0.5], ["two", -0.1], ["three", -0.4]]);
        dependencies.analysis = { analyze: async (value) => ({ newsId: value.newsId, label: "NEUTRAL", score: scores.get(value.newsId), modelName: "demo-model", modelVersion: "1", analyzedAt: at(20) }) };
        dependencies.clock = { now: () => at(20) };
        const runtime = (0, index_1.createSentimentModule)(dependencies);
        await runtime.analyze(input("one", 1));
        await runtime.analyze(input("two", 4));
        await runtime.analyze(input("three", 6));
        const snapshot = await runtime.createSnapshot({ relatedCoin: "BTC", range: { from: at(0), to: at(15) }, aggregationWindowSeconds: 300, modelName: "demo-model", modelVersion: "1", modelSha256: "a".repeat(64) });
        const reader = await runtime.readSnapshot(snapshot.id);
        (0, vitest_1.expect)(snapshot).toMatchObject({ relatedCoin: "BTC", pointCount: 2, createdAt: at(20), sha256: vitest_1.expect.stringMatching(/^[a-f0-9]{64}$/) });
        (0, vitest_1.expect)(await runtime.getSnapshotRef(snapshot.id)).toEqual(snapshot);
        (0, vitest_1.expect)(reader.readAt(snapshot.id, at(5))).toMatchObject({ timestamp: at(5), label: "POSITIVE", averageScore: 0.2 });
        (0, vitest_1.expect)(reader.readAt(snapshot.id, at(10))).toMatchObject({ timestamp: at(10), label: "NEGATIVE", averageScore: -0.4 });
        (0, vitest_1.expect)(reader.readAt(snapshot.id, at(11))).toBeUndefined();
        await (0, vitest_1.expect)(runtime.createSnapshot({ relatedCoin: "BTCUSDT", range: { from: at(0), to: at(15) }, aggregationWindowSeconds: 300, modelName: "demo-model", modelVersion: "1", modelSha256: "a".repeat(64) })).rejects.toMatchObject({ code: "INVALID_SNAPSHOT" });
    });
});
