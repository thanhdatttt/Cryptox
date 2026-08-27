import { describe, expect, it } from "vitest";
import {
  MARKET_DEMO_DEFAULTS_V1,
  MARKET_TIMEFRAMES,
  type HistoricalCandlePage,
} from "./contracts";

describe("market-data public contracts", () => {
  it("freezes normalized timeframes and configurable demo defaults", () => {
    expect(MARKET_TIMEFRAMES).toEqual(["1m", "5m", "15m", "1h", "4h", "1d"]);
    expect(MARKET_DEMO_DEFAULTS_V1).toEqual({
      pair: "BTCUSDT",
      timeframes: ["5m", "15m", "1h", "4h"],
      historyDays: 30,
      maximumCharts: 4,
    });
  });

  it("makes partial history and replay limitations explicit", () => {
    const page: HistoricalCandlePage = {
      pair: "BTCUSDT",
      timeframe: "5m",
      range: { from: "2026-01-01T00:00:00Z", to: "2026-01-01T00:10:00Z" },
      candles: [],
      complete: false,
      missingRanges: [
        { from: "2026-01-01T00:05:00Z", to: "2026-01-01T00:10:00Z" },
      ],
      formingIncluded: false,
      asOf: "2026-01-01T00:11:00Z",
      provenance: {
        provider: "binance",
        pair: "BTCUSDT",
        timeframe: "5m",
        range: { from: "2026-01-01T00:00:00Z", to: "2026-01-01T00:10:00Z" },
        replayGuarantee: "TRACEABLE",
        replayLimitation: "No immutable dataset version is available.",
      },
    };
    expect(page.complete).toBe(false);
    expect(page.provenance.replayGuarantee).toBe("TRACEABLE");
  });
});
