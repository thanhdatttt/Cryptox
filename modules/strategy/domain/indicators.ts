import type { StrategyCandle } from "./contracts";

export function simpleMovingAverage(values: number[], period: number): number | undefined {
  if (!Number.isInteger(period) || period <= 0 || values.length < period) return undefined;
  const window = values.slice(-period);
  return window.reduce((sum, value) => sum + value, 0) / period;
}

export function relativeStrengthIndex(values: number[], period: number): number | undefined {
  if (!Number.isInteger(period) || period <= 0 || values.length <= period) return undefined;
  let gains = 0;
  let losses = 0;
  for (let index = values.length - period; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }
  if (losses === 0) return gains === 0 ? 50 : 100;
  return 100 - 100 / (1 + gains / losses);
}

export function bollingerBands(values: number[], period: number, deviations: number): { middle: number; upper: number; lower: number } | undefined {
  const middle = simpleMovingAverage(values, period);
  if (middle === undefined) return undefined;
  const window = values.slice(-period);
  const variance = window.reduce((sum, value) => sum + (value - middle) ** 2, 0) / period;
  const spread = Math.sqrt(variance) * deviations;
  return { middle, upper: middle + spread, lower: middle - spread };
}

export function supportResistance(candles: StrategyCandle[], lookback: number): { support: number; resistance: number } | undefined {
  if (!Number.isInteger(lookback) || lookback <= 0 || candles.length < lookback) return undefined;
  const window = candles.slice(-lookback);
  return {
    support: Math.min(...window.map((candle) => candle.low)),
    resistance: Math.max(...window.map((candle) => candle.high)),
  };
}
