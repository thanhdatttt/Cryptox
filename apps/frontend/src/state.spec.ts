import { describe, expect, it } from "vitest";
import { canAddChart, equalWeights, initialChartPanels, mergeCandle, parameterDefaults } from "./state";

describe("frontend presentation state", () => {
  it("keeps four independent initial chart selections and caps additional panels", () => {
    expect(initialChartPanels.map((panel) => panel.timeframe)).toEqual(["1m", "5m", "15m", "1h"]);
    expect(canAddChart(initialChartPanels)).toBe(false);
    expect(canAddChart(initialChartPanels.slice(0, 3))).toBe(true);
  });

  it("merges repeated/forming candle updates by timestamp without regressing a closed candle", () => {
    const closed = { timestamp: "2025-01-01T00:00:00.000Z", open: 1, high: 3, low: 1, close: 2, volume: 4, isClosed: true };
    const later = { timestamp: "2025-01-01T00:01:00.000Z", open: 2, high: 4, low: 2, close: 3, volume: 5, isClosed: false };
    expect(mergeCandle([closed], { ...closed, close: 99, isClosed: false })).toEqual([closed]);
    expect(mergeCandle([closed], later)).toEqual([closed, later]);
  });

  it("derives editor fields from descriptor metadata rather than strategy names", () => {
    expect(parameterDefaults([{ key: "period", label: "Period", type: "INTEGER", required: true, defaultValue: 14 }])).toEqual({ period: 14 });
  });

  it("starts a selected composite with backend-valid equal weights", () => {
    expect(equalWeights(["ma", "rsi"])).toEqual({ ma: 0.5, rsi: 0.5 });
    expect(equalWeights([])).toEqual({});
  });
});
