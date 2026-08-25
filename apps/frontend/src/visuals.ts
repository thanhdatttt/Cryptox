export type VisualCandle = { open: number; high: number; low: number; close: number; volume: number };

export type ChartBounds = { min: number; max: number; range: number };

export function chartBounds(candles: VisualCandle[]): ChartBounds {
  if (!candles.length) return { min: 0, max: 1, range: 1 };
  const low = Math.min(...candles.map((candle) => candle.low));
  const high = Math.max(...candles.map((candle) => candle.high));
  const rawRange = Math.max(high - low, Math.abs(high) * 0.001, 1);
  const padding = rawRange * 0.08;
  return { min: low - padding, max: high + padding, range: rawRange + padding * 2 };
}

export function percent(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined || !Number.isFinite(value) ? "Unavailable" : `${value.toFixed(digits)}%`;
}

export type SentimentItem = { sentiment?: { label?: string } };

export function sentimentDistribution(items: SentimentItem[]): { positive: number; neutral: number; negative: number; total: number } {
  const counts = items.reduce((result, item) => {
    const label = item.sentiment?.label;
    if (label === "POSITIVE") result.positive += 1;
    else if (label === "NEGATIVE") result.negative += 1;
    else if (label === "NEUTRAL") result.neutral += 1;
    return result;
  }, { positive: 0, neutral: 0, negative: 0 });
  const total = counts.positive + counts.neutral + counts.negative;
  if (!total) return { ...counts, total: 0 };
  return {
    positive: Math.round(counts.positive / total * 100),
    neutral: Math.round(counts.neutral / total * 100),
    negative: Math.max(0, 100 - Math.round(counts.positive / total * 100) - Math.round(counts.neutral / total * 100)),
    total,
  };
}
