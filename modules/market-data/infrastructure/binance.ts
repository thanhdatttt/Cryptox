import type { Candle } from "../domain/contracts";
import type {
  MarketDataHistoryRequest,
  MarketDataHistoryResult,
  MarketDataProvider,
  MarketDataProviderSubscription,
  MarketDataProviderUpdate,
} from "../application/ports";

const BINANCE_INTERVALS = new Set(["1m", "5m", "15m", "1h", "4h", "1d"]);
const DEFAULT_BASE_URL = "https://api.binance.com";
const BINANCE_MAX_PAGE_SIZE = 1_000;

type FetchResponse = {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
};

type FetchLike = (input: string, init?: { signal?: AbortSignal }) => Promise<FetchResponse>;

export interface BinanceHistoricalProviderOptions {
  readonly baseUrl?: string;
  readonly requestTimeoutMs?: number;
  readonly pageSize?: number;
  readonly fetch?: FetchLike;
}

interface BinanceKline {
  readonly openTime: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
  readonly closeTime: number;
}

function numberValue(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) throw new Error(`Binance returned an invalid ${field}`);
  return parsed;
}

function parseCursor(value: string | undefined): number | undefined {
  if (!value) return undefined;
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { timestamp?: unknown };
    const timestamp = numberValue(parsed.timestamp, "cursor timestamp");
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) throw new Error("invalid cursor timestamp");
    return timestamp;
  } catch {
    throw new Error("invalid Binance history cursor");
  }
}

function encodeCursor(timestamp: number): string {
  return Buffer.from(JSON.stringify({ timestamp }), "utf8").toString("base64url");
}

function parseKline(value: unknown): BinanceKline {
  if (!Array.isArray(value) || value.length < 7) throw new Error("Binance returned a malformed kline");
  const openTime = numberValue(value[0], "open time");
  const closeTime = numberValue(value[6], "close time");
  if (!Number.isSafeInteger(openTime) || !Number.isSafeInteger(closeTime) || openTime < 0 || closeTime < openTime) {
    throw new Error("Binance returned an invalid kline interval");
  }
  return {
    openTime,
    open: numberValue(value[1], "open price"),
    high: numberValue(value[2], "high price"),
    low: numberValue(value[3], "low price"),
    close: numberValue(value[4], "close price"),
    volume: numberValue(value[5], "volume"),
    closeTime,
  };
}

function toCandle(pair: string, timeframe: MarketDataHistoryRequest["timeframe"], kline: BinanceKline, now: number): Candle {
  if (kline.volume < 0 || kline.high < Math.max(kline.open, kline.close, kline.low) || kline.low > Math.min(kline.open, kline.close, kline.high)) {
    throw new Error("Binance returned invalid OHLCV values");
  }
  return {
    pair,
    timeframe,
    timestamp: new Date(kline.openTime).toISOString(),
    open: kline.open,
    high: kline.high,
    low: kline.low,
    close: kline.close,
    volume: kline.volume,
    isClosed: kline.closeTime < now,
  };
}

function requestUrl(baseUrl: string, request: MarketDataHistoryRequest, startTime: number, limit: number): string {
  const url = new URL("/api/v3/klines", baseUrl);
  url.searchParams.set("symbol", request.pair.toUpperCase());
  url.searchParams.set("interval", request.timeframe);
  url.searchParams.set("startTime", String(startTime));
  // Binance treats endTime as inclusive; subtracting one millisecond preserves
  // this module's explicit [from, to) range at the adapter boundary.
  url.searchParams.set("endTime", String(Date.parse(request.range.to) - 1));
  url.searchParams.set("limit", String(limit));
  return url.toString();
}

export function createBinanceHistoricalProvider(options: BinanceHistoricalProviderOptions = {}): MarketDataProvider {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const requestTimeoutMs = options.requestTimeoutMs ?? 15_000;
  const configuredPageSize = options.pageSize ?? BINANCE_MAX_PAGE_SIZE;
  if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs < 1) throw new Error("Binance request timeout must be positive");
  if (!Number.isSafeInteger(configuredPageSize) || configuredPageSize < 1) throw new Error("Binance page size must be positive");
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  const controllers = new Set<AbortController>();
  let stopped = false;

  return {
    id: "binance",
    async readCandles(request): Promise<MarketDataHistoryResult> {
      if (stopped) throw new Error("Binance provider is shut down");
      if (!BINANCE_INTERVALS.has(request.timeframe)) throw new Error("unsupported Binance interval");
      const fromMs = Date.parse(request.range.from);
      const toMs = Date.parse(request.range.to);
      if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs) throw new Error("invalid Binance history range");
      const cursorMs = parseCursor(request.cursor);
      const startTime = cursorMs === undefined ? fromMs : cursorMs + 1;
      const limit = Math.min(request.limit ?? configuredPageSize, configuredPageSize, BINANCE_MAX_PAGE_SIZE);
      if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("invalid Binance history limit");
      const controller = new AbortController();
      controllers.add(controller);
      const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
      try {
        const response = await fetcher(requestUrl(baseUrl, request, startTime, limit), { signal: controller.signal });
        if (!response.ok) throw new Error(`Binance historical request failed with HTTP ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload)) throw new Error("Binance returned a malformed historical response");
        const now = Date.now();
        const rawKlines = payload.map(parseKline);
        const candles = rawKlines
          .map((kline) => toCandle(request.pair, request.timeframe, kline, now))
          .filter((candle) => {
            const timestamp = Date.parse(candle.timestamp);
            return timestamp >= fromMs && timestamp < toMs && (request.includeForming || candle.isClosed);
          });
        const lastTimestamp = candles.at(-1) ? Date.parse(candles.at(-1)!.timestamp) : undefined;
        const nextCursor = payload.length >= limit && lastTimestamp !== undefined && lastTimestamp < toMs - 1
          ? encodeCursor(lastTimestamp)
          : undefined;
        return {
          range: request.range,
          candles,
          complete: nextCursor === undefined,
          missingRanges: [],
          formingIncluded: Boolean(request.includeForming && candles.some((candle) => !candle.isClosed)),
          observedAt: new Date(now).toISOString(),
          ...(nextCursor ? { nextCursor } : {}),
        };
      } finally {
        clearTimeout(timeout);
        controllers.delete(controller);
      }
    },
    async subscribe(_subscriptions: readonly MarketDataProviderSubscription[], _sink: (update: MarketDataProviderUpdate) => void): Promise<() => Promise<void>> {
      throw new Error("Binance realtime delivery is outside the M-01 historical provider");
    },
    async shutdown(): Promise<void> {
      stopped = true;
      for (const controller of controllers) controller.abort();
      controllers.clear();
    },
  };
}

