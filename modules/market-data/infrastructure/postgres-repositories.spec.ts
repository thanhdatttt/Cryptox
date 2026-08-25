import { describe, expect, it } from "vitest";
import { PostgresCandleRepository, PostgresSnapshotRepository } from "./postgres-repositories";

describe("PostgreSQL market repositories", () => {
  it("uses normalized candle keys and sealed snapshot rows", async () => {
    const calls: Array<{ text: string; values: unknown[] }> = [];
    const client = { query: async <Row>(text: string, values: unknown[]) => { calls.push({ text, values }); return { rows: [] as Row[] }; } };
    const candle = { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T00:00:00.000Z", open: 100, high: 102, low: 99, close: 101, volume: 4, isClosed: true };
    const ref = { id: "snapshot-1", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h" as const, range: { from: candle.timestamp, to: "2025-01-01T01:00:00.000Z" }, candleCount: 1, sha256: "a".repeat(64), createdAt: candle.timestamp };
    await new PostgresCandleRepository(client).upsert(candle);
    await new PostgresSnapshotRepository(client).create({ snapshot: ref, candles: [candle] });
    expect(calls.some((call) => call.text.startsWith("INSERT INTO market_candles") && call.values.includes("BTCUSDT"))).toBe(true);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO market_dataset_snapshots") && call.values.includes(ref.sha256))).toBe(true);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO market_dataset_snapshot_candles") && call.values.includes(ref.id))).toBe(true);
  });
});
