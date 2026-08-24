"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PAGE_LIMIT = exports.DEFAULT_PAGE_LIMIT = exports.TIMEFRAME_SECONDS = void 0;
exports.isTimeframe = isTimeframe;
exports.validateTimeframe = validateTimeframe;
exports.validatePair = validatePair;
exports.validateLimit = validateLimit;
exports.parseTimestamp = parseTimestamp;
exports.validateRange = validateRange;
exports.validateCandle = validateCandle;
exports.missingRanges = missingRanges;
exports.canonicalNumber = canonicalNumber;
exports.snapshotSerialization = snapshotSerialization;
const errors_1 = require("./errors");
exports.TIMEFRAME_SECONDS = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 };
exports.DEFAULT_PAGE_LIMIT = 1000;
exports.MAX_PAGE_LIMIT = 10_000;
function isTimeframe(value) { return typeof value === "string" && Object.prototype.hasOwnProperty.call(exports.TIMEFRAME_SECONDS, value); }
function validateTimeframe(value) { if (typeof value !== "string")
    throw new errors_1.MarketDataException("INVALID_TIMEFRAME", "Timeframe must be a string."); if (!isTimeframe(value))
    throw new errors_1.MarketDataException("UNSUPPORTED_TIMEFRAME", "Timeframe is not supported."); return value; }
function validatePair(value) { if (typeof value !== "string" || !/^[A-Z0-9][A-Z0-9_-]*$/.test(value))
    throw new errors_1.MarketDataException("INVALID_PAIR", "Pair must be uppercase ASCII without whitespace."); return value; }
function validateLimit(value) { const limit = value === undefined ? exports.DEFAULT_PAGE_LIMIT : value; if (typeof limit !== "number" || !Number.isInteger(limit) || limit <= 0 || limit > exports.MAX_PAGE_LIMIT)
    throw new errors_1.MarketDataException("RANGE_TOO_LARGE", `Limit must be a positive integer no greater than ${exports.MAX_PAGE_LIMIT}.`); return limit; }
function parseTimestamp(value, timeframe, now, allowFuture = false) {
    if (typeof value !== "string")
        throw new errors_1.MarketDataException("INVALID_RANGE", "Timestamp must be an ISO-8601 UTC string.");
    const milliseconds = Date.parse(value);
    if (!Number.isFinite(milliseconds) || !value.endsWith("Z"))
        throw new errors_1.MarketDataException("INVALID_RANGE", "Timestamp must be an ISO-8601 UTC string.");
    if (milliseconds % (exports.TIMEFRAME_SECONDS[timeframe] * 1000) !== 0)
        throw new errors_1.MarketDataException("INVALID_RANGE", "Timestamp is not aligned to the timeframe grid.");
    if (!allowFuture && milliseconds > Date.parse(now))
        throw new errors_1.MarketDataException("INVALID_RANGE", "Timestamp cannot be in the future.");
    return new Date(milliseconds).toISOString();
}
function validateRange(range, timeframe, now) { const from = parseTimestamp(range.from, timeframe, now); const to = parseTimestamp(range.to, timeframe, now, true); if (Date.parse(to) <= Date.parse(from))
    throw new errors_1.MarketDataException("INVALID_RANGE", "Range end must be after range start."); return { from, to }; }
function validateCandle(input, now, allowFuture = false) {
    const pair = validatePair(input.pair);
    const timeframe = validateTimeframe(input.timeframe);
    const timestamp = parseTimestamp(input.timestamp, timeframe, now, allowFuture);
    const values = [input.open, input.high, input.low, input.close, input.volume];
    if (values.some((value) => typeof value !== "number" || !Number.isFinite(value)))
        throw new errors_1.MarketDataException("PROVIDER_PAYLOAD_INVALID", "Candle values must be finite numbers.", true);
    if (input.open <= 0 || input.high <= 0 || input.low <= 0 || input.close <= 0 || input.volume < 0)
        throw new errors_1.MarketDataException("PROVIDER_PAYLOAD_INVALID", "Candle prices must be positive and volume cannot be negative.");
    if (input.high < Math.max(input.open, input.close, input.low) || input.low > Math.min(input.open, input.close, input.high))
        throw new errors_1.MarketDataException("PROVIDER_PAYLOAD_INVALID", "Candle OHLC values are inconsistent.");
    if (typeof input.isClosed !== "boolean")
        throw new errors_1.MarketDataException("PROVIDER_PAYLOAD_INVALID", "Candle closure state is invalid.");
    return { ...input, pair, timeframe, timestamp };
}
function missingRanges(candles, range, timeframe) {
    const interval = exports.TIMEFRAME_SECONDS[timeframe] * 1000;
    const existing = new Set(candles.filter((candle) => candle.isClosed).map((candle) => Date.parse(candle.timestamp)));
    const missing = [];
    let start;
    for (let timestamp = Date.parse(range.from); timestamp < Date.parse(range.to); timestamp += interval) {
        if (!existing.has(timestamp)) {
            start ??= timestamp;
            continue;
        }
        if (start !== undefined) {
            missing.push({ from: new Date(start).toISOString(), to: new Date(timestamp).toISOString() });
            start = undefined;
        }
    }
    if (start !== undefined)
        missing.push({ from: new Date(start).toISOString(), to: range.to });
    return missing;
}
function canonicalNumber(value) { if (Object.is(value, -0))
    return "0"; const fixed = value.toFixed(15).replace(/0+$/, "").replace(/\.$/, ""); return fixed === "-0" ? "0" : fixed; }
function snapshotSerialization(pair, timeframe, range, candles) {
    const lines = ["version=market-data-snapshot-v1", `pair=${new TextEncoder().encode(pair).byteLength}:${pair}`, `timeframe=${new TextEncoder().encode(timeframe).byteLength}:${timeframe}`, `fromEpochMicros=${Date.parse(range.from) * 1000}`, `toEpochMicros=${Date.parse(range.to) * 1000}`, `candleCount=${candles.length}`, ...candles.map((candle) => `candle=${Date.parse(candle.timestamp) * 1000}|${canonicalNumber(candle.open)}|${canonicalNumber(candle.high)}|${canonicalNumber(candle.low)}|${canonicalNumber(candle.close)}|${canonicalNumber(candle.volume)}`)];
    return lines.join("\n");
}
