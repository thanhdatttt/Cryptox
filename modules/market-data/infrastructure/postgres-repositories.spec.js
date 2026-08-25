"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const postgres_repositories_1 = require("./postgres-repositories");
(0, vitest_1.describe)("PostgreSQL market repositories", () => {
    (0, vitest_1.it)("uses normalized candle keys and sealed snapshot rows", async () => {
        const calls = [];
        const client = { query: async (text, values) => { calls.push({ text, values }); return { rows: [] }; } };
        const candle = { pair: "BTCUSDT", timeframe: "1h", timestamp: "2025-01-01T00:00:00.000Z", open: 100, high: 102, low: 99, close: 101, volume: 4, isClosed: true };
        const ref = { id: "snapshot-1", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h", range: { from: candle.timestamp, to: "2025-01-01T01:00:00.000Z" }, candleCount: 1, sha256: "a".repeat(64), createdAt: candle.timestamp };
        await new postgres_repositories_1.PostgresCandleRepository(client).upsert(candle);
        await new postgres_repositories_1.PostgresSnapshotRepository(client).create({ snapshot: ref, candles: [candle] });
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO market_candles") && call.values.includes("BTCUSDT"))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO market_dataset_snapshots") && call.values.includes(ref.sha256))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO market_dataset_snapshot_candles") && call.values.includes(ref.id))).toBe(true);
    });
});
