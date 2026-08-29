import { describe, expect, it } from "vitest";
import * as marketDataApi from "./index";

describe("market-data public entrypoint", () => {
  it("allowlists normalized history, snapshot, and realtime operations", async () => {
    expect(Object.keys(marketDataApi).sort()).toEqual(
      [
        "MARKET_DEMO_DEFAULTS_V1",
        "MARKET_OBSERVABILITY_V1",
        "MARKET_TIMEFRAMES",
        "createDatasetSnapshot",
        "readCandles",
        "readDatasetSnapshot",
        "readObservability",
        "shutdown",
        "subscribeMarketData",
      ].sort(),
    );
    await expect(
      marketDataApi.readCandles({
        pair: "BTCUSDT",
        timeframe: "1h",
        range: { from: "2026-01-01T00:00:00Z", to: "2026-01-02T00:00:00Z" },
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    await expect(marketDataApi.readObservability("BTCUSDT")).resolves.toBeUndefined();
  });
});
