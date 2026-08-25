import { describe, expect, it } from "vitest";
import type { Candle, MarketDataUpdate, MarketSubscription } from "../api";
import type { MarketDataProviderAdapter, NormalizedProviderCandleObservation } from "./ports";
import { createMarketDataService } from "./service";

const clock = { now: () => "2025-01-02T00:00:00.000Z" };
const candle = (timestamp: string, close: number, isClosed = true): Candle => ({ pair: "BTCUSDT", timeframe: "1h", timestamp, open: close - 1, high: close + 1, low: close - 2, close, volume: 10, isClosed });
const providerFor = (fetchHistorical: MarketDataProviderAdapter["fetchHistorical"]): MarketDataProviderAdapter => ({
  id: "BINANCE",
  capabilities: async () => ({ pairs: ["BTCUSDT"], timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"] }),
  fetchHistorical,
  connectRealtime: async () => ({ close: async () => undefined }),
});
const repositoryFor = (rows: Candle[]) => ({
  read: async ({ pair, timeframe }: { pair: string; timeframe: Candle["timeframe"] }) => rows.filter((item) => item.pair === pair && item.timeframe === timeframe).sort((left, right) => left.timestamp.localeCompare(right.timestamp)),
  upsert: async (item: Candle) => { const index = rows.findIndex((current) => current.pair === item.pair && current.timeframe === item.timeframe && current.timestamp === item.timestamp); if (index >= 0) rows[index] = item; else rows.push(item); },
});
const deps = (provider: MarketDataProviderAdapter, rows: Candle[]) => ({ providerRegistry: { defaultProviderId: "BINANCE", defaultProvider: provider }, candleRepository: repositoryFor(rows), clock });
const historical = (timestamp: string, close: number): NormalizedProviderCandleObservation => ({ source: "HISTORICAL_SYNC", orderKey: timestamp, candle: candle(timestamp, close) });

describe("live Binance market-data service behavior", () => {
  it("syncs the latest no-range history once and persists Binance provenance", async () => {
    const rows: Candle[] = [];
    const calls: Array<{ from: string; to: string }> = [];
    const provider = providerFor(async ({ range }) => { calls.push(range); return [historical("2025-01-01T21:00:00.000Z", 101), historical("2025-01-01T22:00:00.000Z", 102), historical("2025-01-01T23:00:00.000Z", 103)]; });
    const service = createMarketDataService(deps(provider, rows));

    const first = await service.readCandles({ pair: "BTCUSDT", timeframe: "1h", limit: 3 });
    const second = await service.readCandles({ pair: "BTCUSDT", timeframe: "1h", limit: 3 });

    expect(calls).toEqual([{ from: "2025-01-01T21:00:00.000Z", to: "2025-01-02T00:00:00.000Z" }]);
    expect(first.candles).toHaveLength(3);
    expect(second.candles.map((item) => item.timestamp)).toEqual(first.candles.map((item) => item.timestamp));
    expect(rows.every((item) => item.source === "BINANCE:HISTORICAL_SYNC")).toBe(true);
  });

  it("fetches only missing aligned ranges for an explicit request", async () => {
    const rows = [candle("2025-01-01T00:00:00.000Z", 100), candle("2025-01-01T02:00:00.000Z", 102)];
    const calls: Array<{ from: string; to: string }> = [];
    const provider = providerFor(async ({ range }) => { calls.push(range); return [historical("2025-01-01T01:00:00.000Z", 101)]; });
    const page = await createMarketDataService(deps(provider, rows)).readCandles({ pair: "BTCUSDT", timeframe: "1h", range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T03:00:00.000Z" }, completeness: "REQUIRE_COMPLETE" });

    expect(calls).toEqual([{ from: "2025-01-01T01:00:00.000Z", to: "2025-01-01T02:00:00.000Z" }]);
    expect(page.complete).toBe(true);
    expect(page.candles.map((item) => item.close)).toEqual([100, 101, 102]);
  });

  it("replaces forming candles, appends new timestamps, and ignores a late forming regression", async () => {
    const rows: Candle[] = [];
    let onCandle: ((observation: NormalizedProviderCandleObservation) => void) | undefined;
    const provider: MarketDataProviderAdapter = { ...providerFor(async () => []), connectRealtime: async ({ onCandle: next }) => { onCandle = next; return { close: async () => undefined }; } };
    const updates: MarketDataUpdate[] = [];
    const service = createMarketDataService(deps(provider, rows));
    const stop = await service.subscribeMarketData([{ pair: "BTCUSDT", timeframe: "1h" }], (update) => updates.push(update));
    const forming = candle("2025-01-01T00:00:00.000Z", 100, false);
    onCandle?.({ candle: forming, source: "REALTIME_STREAM" });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    onCandle?.({ candle: { ...forming, close: 101, high: 102 }, source: "REALTIME_STREAM" });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    onCandle?.({ candle: { ...forming, close: 99, isClosed: true }, source: "REALTIME_STREAM" });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    onCandle?.({ candle: { ...forming, close: 98, isClosed: false }, source: "REALTIME_STREAM" });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    onCandle?.({ candle: candle("2025-01-01T01:00:00.000Z", 98, false), source: "REALTIME_STREAM" });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await stop();

    const candleUpdates = updates.filter((update): update is Extract<MarketDataUpdate, { kind: "CANDLE" }> => update.kind === "CANDLE");
    expect(candleUpdates.map((update) => update.payload.close)).toEqual([100, 101, 99, 98]);
    expect(rows.find((item) => item.timestamp === forming.timestamp)).toMatchObject({ close: 99, isClosed: true, source: "BINANCE:REALTIME_STREAM" });
    expect(rows.some((item) => item.timestamp === "2025-01-01T01:00:00.000Z")).toBe(true);
  });

  it("resubscribes the upstream provider with the union of independent panels", async () => {
    const connections: MarketSubscription[][] = [];
    const provider: MarketDataProviderAdapter = {
      ...providerFor(async () => []),
      connectRealtime: async ({ subscriptions }) => { connections.push(subscriptions); return { close: async () => undefined }; },
    };
    const service = createMarketDataService(deps(provider, []));
    const stopOne = await service.subscribeMarketData([{ pair: "BTCUSDT", timeframe: "1m" }], () => undefined);
    const stopTwo = await service.subscribeMarketData([{ pair: "BTCUSDT", timeframe: "5m" }], () => undefined);

    expect(connections).toHaveLength(2);
    expect(connections[1]).toEqual([{ pair: "BTCUSDT", timeframe: "1m" }, { pair: "BTCUSDT", timeframe: "5m" }]);
    await stopTwo();
    expect(connections[2]).toEqual([{ pair: "BTCUSDT", timeframe: "1m" }]);
    await stopOne();
  });

  it("reports an unavailable provider instead of returning manufactured no-range data", async () => {
    const provider = providerFor(async () => { throw new Error("network blocked"); });
    await expect(createMarketDataService(deps(provider, [])).readCandles({ pair: "BTCUSDT", timeframe: "1h", limit: 3 })).rejects.toMatchObject({ code: "HISTORY_UNAVAILABLE", retryable: true });
  });
});
