import type { Candle, Pair, Timeframe } from "./contracts";
export declare const TIMEFRAME_SECONDS: Record<Timeframe, number>;
export declare const DEFAULT_HISTORICAL_CANDLE_LIMIT = 1000;
export declare const DEFAULT_PAGE_LIMIT = 1000;
export declare const MAX_PAGE_LIMIT = 10000;
export declare function isTimeframe(value: unknown): value is Timeframe;
export declare function validateTimeframe(value: unknown): Timeframe;
export declare function validatePair(value: unknown): Pair;
export declare function validateLimit(value: unknown): number;
export declare function parseTimestamp(value: unknown, timeframe: Timeframe, now: string, allowFuture?: boolean): string;
export declare function validateRange(range: {
    from: unknown;
    to: unknown;
}, timeframe: Timeframe, now: string): {
    from: string;
    to: string;
};
export declare function validateCandle(input: Candle, now: string, allowFuture?: boolean): Candle;
export declare function missingRanges(candles: Candle[], range: {
    from: string;
    to: string;
}, timeframe: Timeframe): Array<{
    from: string;
    to: string;
}>;
export declare function canonicalNumber(value: number): string;
export declare function snapshotSerialization(pair: string, timeframe: Timeframe, range: {
    from: string;
    to: string;
}, candles: Candle[]): string;
