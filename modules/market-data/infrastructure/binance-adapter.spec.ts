import { describe, expect, it } from "vitest";
import { createBinanceMarketDataAdapter } from "./binance-adapter";

describe("Binance market-data adapter", () => {
  it("paginates Binance's 1000-row REST limit without duplicating candles", async () => {
    const start = Date.parse("2025-01-01T00:00:00.000Z");
    const calls: string[] = [];
    const adapter = createBinanceMarketDataAdapter({ now: () => Date.parse("2025-01-02T00:00:00.000Z"), restBaseUrl: "https://example.test", fetchFn: async (url) => {
      calls.push(url);
      const requestedStart = Number(new URL(url).searchParams.get("startTime"));
      const offset = Math.round((requestedStart - start) / 60_000);
      const count = offset === 0 ? 1000 : 200;
      return { ok: true, status: 200, json: async () => Array.from({ length: count }, (_, index) => { const timestamp = start + (offset + index) * 60_000; return [timestamp, "100", "101", "99", "100.5", "2", timestamp + 59_999]; }) };
    } });
    const candles = await adapter.fetchHistorical({ pair: "BTCUSDT", timeframe: "1m", range: { from: new Date(start).toISOString(), to: new Date(start + 1_200 * 60_000).toISOString() } });

    expect(calls).toHaveLength(2);
    expect(new URL(calls[1]!).searchParams.get("startTime")).toBe(String(start + 1_000 * 60_000));
    expect(candles).toHaveLength(1_200);
    expect(new Set(candles.map((item) => item.candle.timestamp)).size).toBe(1_200);
  });

  it("normalizes REST klines without exposing Binance rows", async () => {
    const urls: string[] = [];
    const adapter = createBinanceMarketDataAdapter({ now: () => Date.parse("2025-01-01T02:00:00.000Z"), restBaseUrl: "https://example.test", fetchFn: async (url) => {
      urls.push(url);
      return { ok: true, status: 200, json: async () => [[Date.parse("2025-01-01T00:00:00.000Z"), "100", "103", "99", "102", "10", Date.parse("2025-01-01T00:59:59.999Z")]] };
    } });
    const candles = await adapter.fetchHistorical({ pair: "BTCUSDT", timeframe: "1h", range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T01:00:00.000Z" } });

    expect(urls[0]).toContain("symbol=BTCUSDT");
    expect(candles).toEqual([{ source: "HISTORICAL_SYNC", orderKey: `${Date.parse("2025-01-01T00:00:00.000Z")}`, candle: { pair: "BTCUSDT", timeframe: "1h", timestamp: "2025-01-01T00:00:00.000Z", open: 100, high: 103, low: 99, close: 102, volume: 10, isClosed: true } }]);
  });

  it("normalizes combined-stream trades and candles at the adapter boundary", async () => {
    let socket!: { onopen: (() => void) | null; onmessage: ((event: { data: string }) => void) | null; onclose: (() => void) | null; onerror: (() => void) | null; close(): void };
    let streamUrl = "";
    const adapter = createBinanceMarketDataAdapter({ fetchFn: async () => ({ ok: true, status: 200, json: async () => [] }), webSocketFactory: (url) => { streamUrl = url; return (socket = { onopen: null, onmessage: null, onclose: null, onerror: null, close: () => undefined }); } });
    const ticks: unknown[] = [], candles: unknown[] = [];
    const connection = await adapter.connectRealtime({ subscriptions: [{ pair: "BTCUSDT", timeframe: "1m" }, { pair: "BTCUSDT", timeframe: "5m" }, { pair: "BTCUSDT", timeframe: "1m" }], onTick: (item) => ticks.push(item), onCandle: (item) => candles.push(item), onDisconnect: () => undefined });
    socket.onopen?.();
    await connection.ready;
    expect(streamUrl.match(/btcusdt@trade/g)).toHaveLength(1);
    expect(streamUrl).toContain("btcusdt@kline_1m");
    expect(streamUrl).toContain("btcusdt@kline_5m");
    socket.onmessage?.({ data: JSON.stringify({ data: { e: "trade", s: "BTCUSDT", p: "123.45", T: Date.parse("2025-01-01T00:00:00.000Z"), t: 1 } }) });
    socket.onmessage?.({ data: JSON.stringify({ data: { e: "kline", s: "BTCUSDT", k: { i: "1m", t: Date.parse("2025-01-01T00:00:00.000Z"), o: "120", h: "125", l: "119", c: "123", v: "42", x: false } } }) });

    expect(ticks).toMatchObject([{ tick: { pair: "BTCUSDT", price: 123.45, timestamp: "2025-01-01T00:00:00.000Z" } }]);
    expect(candles).toMatchObject([{ candle: { pair: "BTCUSDT", timeframe: "1m", open: 120, high: 125, low: 119, close: 123, volume: 42, isClosed: false } }]);
  });
});
