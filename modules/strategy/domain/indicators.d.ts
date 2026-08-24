import type { StrategyCandle } from "./contracts";
export declare function simpleMovingAverage(values: number[], period: number): number | undefined;
export declare function relativeStrengthIndex(values: number[], period: number): number | undefined;
export declare function bollingerBands(values: number[], period: number, deviations: number): {
    middle: number;
    upper: number;
    lower: number;
} | undefined;
export declare function supportResistance(candles: StrategyCandle[], lookback: number): {
    support: number;
    resistance: number;
} | undefined;
