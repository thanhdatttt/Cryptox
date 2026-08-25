"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBinanceMarketDataAdapter = createBinanceMarketDataAdapter;
const intervals = { "1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "4h": "4h", "1d": "1d" };
const supportedPairs = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT"];
const supportedTimeframes = Object.keys(intervals);
const publicRestDefault = "https://api.binance.com";
const publicStreamDefault = "wss://stream.binance.com:9443";
const asNumber = (value) => {
    const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    if (!Number.isFinite(numeric))
        throw new Error("BINANCE_MALFORMED_PAYLOAD");
    return numeric;
};
const unix = (value) => {
    const timestamp = asNumber(value);
    if (!Number.isInteger(timestamp) || timestamp <= 0)
        throw new Error("BINANCE_MALFORMED_PAYLOAD");
    const date = new Date(timestamp);
    if (!Number.isFinite(date.getTime()))
        throw new Error("BINANCE_MALFORMED_PAYLOAD");
    return date.toISOString();
};
const failure = (code, retryable, safeMessage) => ({ code, retryable, safeMessage });
const metadata = (pair) => {
    const quoteAsset = ["USDT", "BUSD", "USDC", "BTC", "ETH"].find((quote) => pair.endsWith(quote)) ?? "";
    return { pair, baseAsset: quoteAsset ? pair.slice(0, -quoteAsset.length) : pair, quoteAsset, settlementAsset: quoteAsset };
};
const normalizeKline = (pair, timeframe, row, now) => {
    if (!Array.isArray(row) || row.length < 7)
        throw new Error("BINANCE_MALFORMED_PAYLOAD");
    const openTime = asNumber(row[0]);
    const closeTime = asNumber(row[6]);
    const candle = { pair, timeframe, timestamp: unix(openTime), open: asNumber(row[1]), high: asNumber(row[2]), low: asNumber(row[3]), close: asNumber(row[4]), volume: asNumber(row[5]), isClosed: closeTime < now };
    return { candle, source: "HISTORICAL_SYNC", orderKey: `${openTime}` };
};
function createBinanceMarketDataAdapter(options = {}) {
    const fetchFn = options.fetchFn ?? globalThis.fetch;
    const webSocketFactory = options.webSocketFactory ?? (typeof WebSocket === "undefined" ? undefined : ((url) => new WebSocket(url)));
    const restBaseUrl = options.restBaseUrl ?? process.env.MARKET_DATA_BINANCE_REST_URL ?? publicRestDefault;
    const streamBaseUrl = options.streamBaseUrl ?? process.env.MARKET_DATA_BINANCE_WS_URL ?? publicStreamDefault;
    const now = options.now ?? Date.now;
    if (!fetchFn)
        throw new Error("BINANCE_FETCH_UNAVAILABLE");
    return {
        id: "BINANCE",
        capabilities: async () => ({ pairs: [...supportedPairs], timeframes: [...supportedTimeframes] }),
        readPairMetadata: async (pair) => metadata(pair),
        fetchHistorical: async ({ pair, timeframe, range }) => {
            const results = [];
            const endTime = Date.parse(range.to);
            let startTime = Date.parse(range.from);
            while (startTime < endTime) {
                const url = new URL("/api/v3/klines", restBaseUrl);
                url.searchParams.set("symbol", pair);
                url.searchParams.set("interval", intervals[timeframe]);
                url.searchParams.set("startTime", `${startTime}`);
                url.searchParams.set("endTime", `${endTime - 1}`);
                url.searchParams.set("limit", "1000");
                let response;
                try {
                    response = await fetchFn(url.toString());
                }
                catch {
                    throw new Error("BINANCE_HISTORY_UNAVAILABLE");
                }
                if (!response.ok)
                    throw new Error(response.status === 429 ? "BINANCE_RATE_LIMITED" : "BINANCE_HISTORY_UNAVAILABLE");
                let payload;
                try {
                    payload = await response.json();
                }
                catch {
                    throw new Error("BINANCE_MALFORMED_PAYLOAD");
                }
                if (!Array.isArray(payload))
                    throw new Error("BINANCE_MALFORMED_PAYLOAD");
                const page = payload.map((row) => normalizeKline(pair, timeframe, row, now()));
                results.push(...page);
                const last = page.at(-1)?.candle.timestamp;
                if (!last || page.length < 1000)
                    break;
                const nextStart = Date.parse(last) + ({ "1m": 60_000, "5m": 300_000, "15m": 900_000, "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000 }[timeframe]);
                if (nextStart <= startTime)
                    throw new Error("BINANCE_MALFORMED_PAYLOAD");
                startTime = nextStart;
            }
            return results.filter((item) => Date.parse(item.candle.timestamp) >= Date.parse(range.from) && Date.parse(item.candle.timestamp) < endTime);
        },
        connectRealtime: async ({ subscriptions, onTick, onCandle, onConnect, onDisconnect }) => {
            if (!webSocketFactory)
                throw new Error("BINANCE_WEBSOCKET_UNAVAILABLE");
            const streams = [...new Set(subscriptions.flatMap((subscription) => [`${subscription.pair.toLowerCase()}@trade`, `${subscription.pair.toLowerCase()}@kline_${intervals[subscription.timeframe]}`]))];
            const socket = webSocketFactory(`${streamBaseUrl}/stream?streams=${streams.join("/")}`);
            let closed = false;
            let opened = false;
            let resolveReady;
            let rejectReady;
            const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
            const disconnect = (reason) => { if (!closed) {
                closed = true;
                onDisconnect(reason);
            } };
            socket.onopen = () => { if (closed || opened)
                return; opened = true; resolveReady(); onConnect?.(); };
            socket.onmessage = (event) => {
                try {
                    const outer = JSON.parse(event.data);
                    const payload = outer.data ?? outer;
                    if (typeof payload.code === "number" || (typeof payload.msg === "string" && !payload.e))
                        throw new Error("BINANCE_MALFORMED_PAYLOAD");
                    if (payload.e === "trade") {
                        if (typeof payload.m !== "boolean")
                            throw new Error("BINANCE_MALFORMED_PAYLOAD");
                        const quantity = asNumber(payload.q);
                        if (quantity <= 0)
                            throw new Error("BINANCE_MALFORMED_PAYLOAD");
                        const tick = { source: "REALTIME_STREAM", orderKey: `${payload.t}`, tick: { pair: String(payload.s), price: asNumber(payload.p), quantity, timestamp: unix(payload.T), side: payload.m ? "SELL" : "BUY" } };
                        onTick(tick);
                    }
                    else if (payload.e === "kline" && payload.k && typeof payload.k === "object") {
                        const kline = payload.k;
                        const timeframe = Object.entries(intervals).find(([, interval]) => interval === kline.i)?.[0];
                        if (!timeframe)
                            throw new Error("unsupported interval");
                        const candle = { pair: String(payload.s), timeframe, timestamp: unix(kline.t), open: asNumber(kline.o), high: asNumber(kline.h), low: asNumber(kline.l), close: asNumber(kline.c), volume: asNumber(kline.v), isClosed: Boolean(kline.x) };
                        onCandle({ candle, source: "REALTIME_STREAM", orderKey: `${kline.t}` });
                    }
                }
                catch {
                    disconnect(failure("MALFORMED_RESPONSE", true, "Binance sent an invalid realtime message."));
                }
            };
            socket.onerror = () => { if (!opened)
                rejectReady(new Error("BINANCE_WEBSOCKET_UNAVAILABLE")); disconnect(failure("UNAVAILABLE", true, "Binance realtime connection is unavailable.")); };
            socket.onclose = () => { if (!opened)
                rejectReady(new Error("BINANCE_WEBSOCKET_UNAVAILABLE")); disconnect(failure("UNAVAILABLE", true, "Binance realtime connection closed.")); };
            return { ready, close: async () => { if (!closed) {
                    closed = true;
                    resolveReady();
                    socket.close();
                } } };
        },
    };
}
