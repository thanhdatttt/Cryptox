import { describe, expect, it, vi } from "vitest";
import { createMarketDataService } from "./index";
import type { Candle } from "../domain/contracts";

const clock = { now: () => "2025-02-01T00:00:00.000Z" };
const candle = (timestamp: string, close = 100): Candle => ({ pair: "BTCUSDT", timeframe: "1h", timestamp, open: close - 1, high: close + 1, low: close - 2, close, volume: 10, isClosed: true });
const deps = (rows: Candle[]) => ({ clock, observability: { record: vi.fn() }, candleRepository: { read: vi.fn(async () => rows), upsert: vi.fn(async (value: Candle) => { rows.push(value); }) } });

describe("market-data service", () => {
  it("validates pair syntax before touching a provider or repository", async () => {
    const repository = { read: vi.fn(async () => []), upsert: vi.fn(async () => undefined) };
    const service = createMarketDataService({ ...deps([]), candleRepository: repository });
    await expect(service.readCandles({ pair: "btcusdt", timeframe: "1h" })).rejects.toMatchObject({ code: "INVALID_PAIR" });
    expect(repository.read).not.toHaveBeenCalled();
  });

  it("uses the bounded default page size of 1000 candles", async () => {
    const rows = Array.from({ length: 1001 }, (_, index) => candle(new Date(Date.UTC(2024, 11, 1, index)).toISOString(), 100 + index));
    const service = createMarketDataService(deps(rows));
    const page = await service.readCandles({ pair: "BTCUSDT", timeframe: "1h" });
    expect(page.candles).toHaveLength(1000);
    expect(page.candles[0].close).toBe(101);
    expect(page.nextCursor).toBeUndefined();
  });

  it("reports missing aligned intervals instead of fabricating candles", async () => {
    const rows = [candle("2025-01-01T00:00:00.000Z"), candle("2025-01-01T02:00:00.000Z")];
    const service = createMarketDataService(deps(rows));
    const page = await service.readCandles({ pair: "BTCUSDT", timeframe: "1h", range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T03:00:00.000Z" } });
    expect(page.complete).toBe(false);
    expect(page.candles.map((item) => item.timestamp)).toEqual(["2025-01-01T00:00:00.000Z", "2025-01-01T02:00:00.000Z"]);
    expect(page.missingRanges).toEqual([{ from: "2025-01-01T01:00:00.000Z", to: "2025-01-01T02:00:00.000Z" }]);
  });

  it("seals identical snapshot content idempotently", async () => {
    const rows = [candle("2025-01-01T00:00:00.000Z"), candle("2025-01-01T01:00:00.000Z")];
    const service = createMarketDataService(deps(rows));
    const command = { pair: "BTCUSDT", timeframe: "1h" as const, range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T02:00:00.000Z" } };
    const first = await service.createDatasetSnapshot(command);
    const second = await service.createDatasetSnapshot(command);
    expect(first.id).toBe(second.id);
    expect(first.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.candleCount).toBe(2);
  });
});
