import { describe, expect, it } from "vitest";
import { addMarketPanel, canAddChart, defaultMarketLayout, equalWeights, initialChartPanels, MARKET_LAYOUT_STORAGE_KEY, marketConnectionSummary, mergeCandle, nextChartId, parameterDefaults, persistMarketLayout, readMarketLayout, validateMarketLayout } from "./state";

describe("frontend presentation state", () => {
  it("starts with an empty Market workspace and still caps added panels at four", () => {
    expect(defaultMarketLayout()).toEqual({ version: 2, panels: [], realtimeEnabled: true, selectedPair: "BTCUSDT" });
    expect(initialChartPanels.map((panel) => panel.timeframe)).toEqual(["1m", "5m", "15m", "1h"]);
    expect(canAddChart(initialChartPanels)).toBe(false);
    expect(canAddChart(initialChartPanels.slice(0, 3))).toBe(true);
  });

  it("round-trips a valid layout for navigation and refresh, but falls back for invalid or stale storage", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const layout = { ...defaultMarketLayout(), panels: initialChartPanels.slice(0, 2).map((panel) => ({ ...panel, pair: panel.id === "chart-1" ? "ETHUSDT" : panel.pair })), selectedPair: "ETHUSDT", realtimeEnabled: false };
    persistMarketLayout(layout, storage);
    expect(values.has(MARKET_LAYOUT_STORAGE_KEY)).toBe(true);
    expect(readMarketLayout(storage)).toEqual(layout);
    values.set(MARKET_LAYOUT_STORAGE_KEY, JSON.stringify({ ...layout, version: 999 }));
    expect(readMarketLayout(storage)).toEqual(defaultMarketLayout());
    values.set(MARKET_LAYOUT_STORAGE_KEY, "not-json");
    expect(readMarketLayout(storage)).toEqual(defaultMarketLayout());
  });

  it("validates selected pair, unique ids, and chart bounds before restoring", () => {
    const layout = defaultMarketLayout();
    expect(validateMarketLayout(layout)).toEqual(layout);
    expect(validateMarketLayout({ ...layout, selectedPair: "unsupported pair" })).toBeUndefined();
    expect(validateMarketLayout({ ...layout, panels: [{ ...initialChartPanels[0]!, id: "chart-1" }, { ...initialChartPanels[1]!, id: "chart-1" }] })).toBeUndefined();
    expect(validateMarketLayout({ ...layout, panels: initialChartPanels.map((panel) => ({ ...panel })).concat({ id: "chart-5", pair: "BTCUSDT", timeframe: "1d" }) })).toBeUndefined();
    expect(nextChartId(layout.panels)).toBe("chart-1");
  });

  it("adds duplicate timeframe panels with the selected pair until the four-chart limit", () => {
    const empty = defaultMarketLayout();
    const first = addMarketPanel(empty, "BTCUSDT", "1m")!;
    const second = addMarketPanel(first, "BTCUSDT", "1m")!;
    const full = initialChartPanels.reduce((current) => addMarketPanel(current, "ETHUSDT", "1h")!, empty);
    expect(second.panels.map((panel) => `${panel.pair}:${panel.timeframe}`)).toEqual(["BTCUSDT:1m", "BTCUSDT:1m"]);
    expect(full.panels).toHaveLength(4);
    expect(addMarketPanel(full, "BTCUSDT", "5m")).toBeUndefined();
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

  it("summarizes live connection state without hiding paused or failed panels", () => {
    expect(marketConnectionSummary(["CONNECTED", "CONNECTED"], true)).toEqual({ label: "Receiving data", tone: "connected" });
    expect(marketConnectionSummary(["CONNECTED", "RECONNECTING"], true)).toEqual({ label: "Reconnecting", tone: "pending" });
    expect(marketConnectionSummary(["ERROR"], true)).toEqual({ label: "Connection error", tone: "error" });
    expect(marketConnectionSummary(["DISCONNECTED"], true)).toEqual({ label: "Connection error", tone: "error" });
    expect(marketConnectionSummary(["CONNECTED"], false)).toEqual({ label: "Realtime paused", tone: "paused" });
  });
});
