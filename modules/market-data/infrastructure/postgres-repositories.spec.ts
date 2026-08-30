import { describe, expect, it } from "vitest";
import { PostgresCandleRepository, PostgresSnapshotRepository } from "./postgres-repositories";
import { createHash } from "node:crypto";
import { snapshotSerialization } from "../domain/rules";

describe("PostgreSQL market repositories", () => {
  it("uses normalized candle keys and sealed snapshot rows", async () => {
    const calls: Array<{ text: string; values: unknown[] }> = [];
    const client = { query: async <Row>(text: string, values: unknown[]) => { calls.push({ text, values }); return { rows: [] as Row[] }; } };
    const candle = { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T00:00:00.000Z", open: 100, high: 102, low: 99, close: 101, volume: 4, isClosed: true };
    const range = { from: candle.timestamp, to: "2025-01-01T01:00:00.000Z" };
    const ref = { id: "snapshot-1", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h" as const, range, candleCount: 1, sha256: createHash("sha256").update(snapshotSerialization("BTCUSDT", "1h", range, [candle]), "utf8").digest("hex"), createdAt: candle.timestamp };
    await new PostgresCandleRepository(client).upsert(candle);
    await new PostgresSnapshotRepository(client).create({ snapshot: ref, candles: [candle] });
    expect(calls.some((call) => call.text.startsWith("INSERT INTO market_candles") && call.values.includes("BTCUSDT"))).toBe(true);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO market_dataset_snapshots") && call.values.includes(ref.sha256))).toBe(true);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO market_dataset_snapshot_candles") && call.values.includes(ref.id))).toBe(true);
  });

  it("seals PostgreSQL snapshots atomically and rolls back when a child write fails", async () => {
    const calls: string[] = [];
    const candle = { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T00:00:00.000Z", open: 100, high: 102, low: 99, close: 101, volume: 4, isClosed: true };
    const range = { from: candle.timestamp, to: "2025-01-01T01:00:00.000Z" };
    const ref = { id: "snapshot-transaction", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h" as const, range, candleCount: 1, sha256: createHash("sha256").update(snapshotSerialization("BTCUSDT", "1h", range, [candle]), "utf8").digest("hex"), createdAt: candle.timestamp };
    const transaction = { query: async <Row>(text: string) => { calls.push(text); if (text.startsWith("INSERT INTO market_dataset_snapshot_candles")) throw new Error("write failed"); return { rows: [] as Row[] }; }, release: () => undefined };
    const client = { query: async <Row>() => ({ rows: [] as Row[] }), connect: async () => transaction };
    await expect(new PostgresSnapshotRepository(client).create({ snapshot: ref, candles: [candle] })).rejects.toThrow("write failed");
    expect(calls).toEqual(expect.arrayContaining(["BEGIN", expect.stringContaining("INSERT INTO market_dataset_snapshots"), expect.stringContaining("INSERT INTO market_dataset_snapshot_candles"), "ROLLBACK"]));
    expect(calls).not.toContain("COMMIT");
  });

  it("rejects forming, incomplete, or hash-mismatched snapshot content before persistence", async () => {
    const client = { query: async <Row>() => ({ rows: [] as Row[] }) };
    const ref = { id: "bad-snapshot", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h" as const, range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T01:00:00.000Z" }, candleCount: 1, sha256: "f".repeat(64), createdAt: "2025-01-01T00:00:00.000Z" };
    await expect(new PostgresSnapshotRepository(client).create({ snapshot: ref, candles: [{ pair: "BTCUSDT", timeframe: "1h", timestamp: "2025-01-01T00:00:00.000Z", open: 100, high: 101, low: 99, close: 100, volume: 1, isClosed: false }] })).rejects.toMatchObject({ code: "DATASET_INTEGRITY_FAILURE" });
  });

  it("rejects snapshots whose candle rows are not strictly chronological", async () => {
    const client = { query: async <Row>() => ({ rows: [] as Row[] }) };
    const candles = [
      { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T01:00:00.000Z", open: 101, high: 102, low: 100, close: 101, volume: 1, isClosed: true },
      { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T00:00:00.000Z", open: 100, high: 101, low: 99, close: 100, volume: 1, isClosed: true },
    ];
    const ref = { id: "out-of-order", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h" as const, range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T02:00:00.000Z" }, candleCount: 2, sha256: "f".repeat(64), createdAt: "2025-01-01T00:00:00.000Z" };
    await expect(new PostgresSnapshotRepository(client).create({ snapshot: ref, candles })).rejects.toMatchObject({ code: "DATASET_INTEGRITY_FAILURE" });
  });
});
