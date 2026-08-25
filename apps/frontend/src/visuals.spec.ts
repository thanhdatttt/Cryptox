import { describe, expect, it } from "vitest";
import { chartBounds, percent, sentimentDistribution } from "./visuals";

describe("frontend backend-data visual helpers", () => {
  it("adds stable padding around OHLC ranges for candlestick rendering", () => {
    expect(chartBounds([{ open: 100, high: 110, low: 90, close: 105, volume: 2 }])).toEqual({ min: 88.4, max: 111.6, range: 23.2 });
    expect(chartBounds([])).toEqual({ min: 0, max: 1, range: 1 });
  });

  it("does not turn missing backend metrics into zeroes", () => {
    expect(percent(undefined)).toBe("Unavailable");
    expect(percent(12.345)).toBe("12.35%");
  });

  it("summarizes only persisted sentiment labels", () => {
    expect(sentimentDistribution([{ sentiment: { label: "POSITIVE" } }, { sentiment: { label: "NEGATIVE" } }, { sentiment: { label: "NEUTRAL" } }, {}])).toEqual({ positive: 33, neutral: 33, negative: 34, total: 3 });
    expect(sentimentDistribution([])).toEqual({ positive: 0, neutral: 0, negative: 0, total: 0 });
  });
});
