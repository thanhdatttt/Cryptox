import type { Candle, Pair, Timeframe } from "modules/market-data/api";
import type { Strategy } from "modules/strategy/api";
import type { CompletedBacktestResult } from "./contracts";
export interface SimulationInput {
    candidateId: string;
    attemptId: string;
    pair: Pair;
    settlementAsset: string;
    timeframe: Timeframe;
    candles: Candle[];
    /** Number of leading sealed candles reserved for indicator warm-up. */
    warmupCandles?: number;
    strategy: Strategy;
    initialCapital: number;
    feeRatePercent: number;
    slippageBps?: number;
    stopLossPercent?: number;
    takeProfitPercent?: number;
    workerRuntimeVersion: string;
    workerRuntimeSha256: string;
    startedAt: string;
    completedAt: string;
}
export declare function simulateBacktest(input: SimulationInput): CompletedBacktestResult;
