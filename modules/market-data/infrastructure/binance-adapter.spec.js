"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const binance_adapter_1 = require("./binance-adapter");
(0, vitest_1.describe)("Binance market-data adapter", () => {
    (0, vitest_1.it)("normalizes REST klines without exposing Binance rows", async () => {
        const urls = [];
        const adapter = (0, binance_adapter_1.createBinanceMarketDataAdapter)({ now: () => Date.parse("2025-01-01T02:00:00.000Z"), restBaseUrl: "https://example.test", fetchFn: async (url) => {
                urls.push(url);
                return { ok: true, status: 200, json: async () => [[Date.parse("2025-01-01T00:00:00.000Z"), "100", "103", "99", "102", "10", Date.parse("2025-01-01T00:59:59.999Z")]] };
            } });
        const candles = await adapter.fetchHistorical({ pair: "BTCUSDT", timeframe: "1h", range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T01:00:00.000Z" } });
        (0, vitest_1.expect)(urls[0]).toContain("symbol=BTCUSDT");
        (0, vitest_1.expect)(candles).toEqual([{ source: "HISTORICAL_SYNC", orderKey: `${Date.parse("2025-01-01T00:00:00.000Z")}`, candle: { pair: "BTCUSDT", timeframe: "1h", timestamp: "2025-01-01T00:00:00.000Z", open: 100, high: 103, low: 99, close: 102, volume: 10, isClosed: true } }]);
    });
    (0, vitest_1.it)("normalizes combined-stream trades and candles at the adapter boundary", async () => {
        let socket;
        const adapter = (0, binance_adapter_1.createBinanceMarketDataAdapter)({ fetchFn: async () => ({ ok: true, status: 200, json: async () => [] }), webSocketFactory: () => (socket = { onmessage: null, onclose: null, onerror: null, close: () => undefined }) });
        const ticks = [], candles = [];
        await adapter.connectRealtime({ subscriptions: [{ pair: "BTCUSDT", timeframe: "1m" }], onTick: (item) => ticks.push(item), onCandle: (item) => candles.push(item), onDisconnect: () => undefined });
        socket.onmessage?.({ data: JSON.stringify({ data: { e: "trade", s: "BTCUSDT", p: "123.45", T: Date.parse("2025-01-01T00:00:00.000Z"), t: 1 } }) });
        socket.onmessage?.({ data: JSON.stringify({ data: { e: "kline", s: "BTCUSDT", k: { i: "1m", t: Date.parse("2025-01-01T00:00:00.000Z"), o: "120", h: "125", l: "119", c: "123", v: "42", x: false } } }) });
        (0, vitest_1.expect)(ticks).toMatchObject([{ tick: { pair: "BTCUSDT", price: 123.45, timestamp: "2025-01-01T00:00:00.000Z" } }]);
        (0, vitest_1.expect)(candles).toMatchObject([{ candle: { pair: "BTCUSDT", timeframe: "1m", open: 120, high: 125, low: 119, close: 123, volume: 42, isClosed: false } }]);
    });
});
