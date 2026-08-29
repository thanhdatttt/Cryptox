import type { Candle, Pair, Timeframe } from "./contracts";
import { MarketDataException } from "./errors";

export const TIMEFRAME_SECONDS: Record<Timeframe, number> = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 };
export const DEFAULT_HISTORICAL_CANDLE_LIMIT = 1000;
export const DEFAULT_PAGE_LIMIT = DEFAULT_HISTORICAL_CANDLE_LIMIT;
export const MAX_PAGE_LIMIT = 10_000;
export function isTimeframe(value: unknown): value is Timeframe { return typeof value === "string" && Object.prototype.hasOwnProperty.call(TIMEFRAME_SECONDS, value); }
export function validateTimeframe(value: unknown): Timeframe { if (typeof value !== "string") throw new MarketDataException("INVALID_TIMEFRAME", "Timeframe must be a string."); if (!isTimeframe(value)) throw new MarketDataException("UNSUPPORTED_TIMEFRAME", "Timeframe is not supported."); return value; }
export function validatePair(value: unknown): Pair { if (typeof value !== "string" || !/^[A-Z0-9][A-Z0-9_-]*$/.test(value)) throw new MarketDataException("INVALID_PAIR", "Pair must be uppercase ASCII without whitespace."); return value; }
export function validateLimit(value: unknown): number { const limit = value === undefined ? DEFAULT_PAGE_LIMIT : value; if (typeof limit !== "number" || !Number.isInteger(limit) || limit <= 0 || limit > MAX_PAGE_LIMIT) throw new MarketDataException("RANGE_TOO_LARGE", `Limit must be a positive integer no greater than ${MAX_PAGE_LIMIT}.`); return limit; }
export function parseTimestamp(value: unknown, timeframe: Timeframe, now: string, allowFuture = false): string {
  if (typeof value !== "string") throw new MarketDataException("INVALID_RANGE", "Timestamp must be an ISO-8601 UTC string.");
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || !value.endsWith("Z")) throw new MarketDataException("INVALID_RANGE", "Timestamp must be an ISO-8601 UTC string.");
  if (milliseconds % (TIMEFRAME_SECONDS[timeframe] * 1000) !== 0) throw new MarketDataException("INVALID_RANGE", "Timestamp is not aligned to the timeframe grid.");
  if (!allowFuture && milliseconds > Date.parse(now)) throw new MarketDataException("INVALID_RANGE", "Timestamp cannot be in the future.");
  return new Date(milliseconds).toISOString();
}
export function validateRange(range: { from: unknown; to: unknown }, timeframe: Timeframe, now: string): { from: string; to: string } { const from = parseTimestamp(range.from, timeframe, now); const to = parseTimestamp(range.to, timeframe, now, true); if (Date.parse(to) <= Date.parse(from)) throw new MarketDataException("INVALID_RANGE", "Range end must be after range start."); return { from, to }; }
export function validateCandle(input: Candle, now: string, allowFuture = false): Candle {
  const pair = validatePair(input.pair); const timeframe = validateTimeframe(input.timeframe); const timestamp = parseTimestamp(input.timestamp, timeframe, now, allowFuture);
  const values = [input.open, input.high, input.low, input.close, input.volume];
  if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) throw new MarketDataException("PROVIDER_PAYLOAD_INVALID", "Candle values must be finite numbers.", true);
  if (input.open <= 0 || input.high <= 0 || input.low <= 0 || input.close <= 0 || input.volume < 0) throw new MarketDataException("PROVIDER_PAYLOAD_INVALID", "Candle prices must be positive and volume cannot be negative.");
  if (input.high < Math.max(input.open, input.close, input.low) || input.low > Math.min(input.open, input.close, input.high)) throw new MarketDataException("PROVIDER_PAYLOAD_INVALID", "Candle OHLC values are inconsistent.");
  if (typeof input.isClosed !== "boolean") throw new MarketDataException("PROVIDER_PAYLOAD_INVALID", "Candle closure state is invalid.");
  return { ...input, pair, timeframe, timestamp };
}
export function missingRanges(candles: Candle[], range: { from: string; to: string }, timeframe: Timeframe): Array<{ from: string; to: string }> {
  const interval = TIMEFRAME_SECONDS[timeframe] * 1000; const existing = new Set(candles.filter((candle) => candle.isClosed).map((candle) => Date.parse(candle.timestamp))); const missing: Array<{ from: string; to: string }> = []; let start: number | undefined;
  for (let timestamp = Date.parse(range.from); timestamp < Date.parse(range.to); timestamp += interval) { if (!existing.has(timestamp)) { start ??= timestamp; continue; } if (start !== undefined) { missing.push({ from: new Date(start).toISOString(), to: new Date(timestamp).toISOString() }); start = undefined; } }
  if (start !== undefined) missing.push({ from: new Date(start).toISOString(), to: range.to }); return missing;
}
export function canonicalNumber(value: number): string { if (Object.is(value, -0)) return "0"; const fixed = value.toFixed(15).replace(/0+$/, "").replace(/\.$/, ""); return fixed === "-0" ? "0" : fixed; }
export function snapshotSerialization(pair: string, timeframe: Timeframe, range: { from: string; to: string }, candles: Candle[]): string {
  const lines = ["version=market-data-snapshot-v1", `pair=${new TextEncoder().encode(pair).byteLength}:${pair}`, `timeframe=${new TextEncoder().encode(timeframe).byteLength}:${timeframe}`, `fromEpochMicros=${Date.parse(range.from) * 1000}`, `toEpochMicros=${Date.parse(range.to) * 1000}`, `candleCount=${candles.length}`, ...candles.map((candle) => `candle=${Date.parse(candle.timestamp) * 1000}|${canonicalNumber(candle.open)}|${canonicalNumber(candle.high)}|${canonicalNumber(candle.low)}|${canonicalNumber(candle.close)}|${canonicalNumber(candle.volume)}`)];
  return lines.join("\n");
}
