import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChartController } from "../market/chart-state";
import { FixtureMarketDataSource } from "../market/fixture-source";
import { MarketChart } from "./MarketChart";

describe("MarketChart rendered state", () => {
  it("renders the selected timeframe, chart host, and live connection state", async () => {
    const controller = new ChartController(
      "rendered-chart",
      "BTCUSDT",
      "15m",
      new FixtureMarketDataSource(),
    );
    await controller.start();
    await Promise.resolve();

    const markup = renderToStaticMarkup(createElement(MarketChart, { controller }));

    expect(markup).toContain("BTCUSDT");
    expect(markup).toContain("15m market");
    expect(markup).toContain("connection--live");
    expect(markup).toContain('aria-label="BTCUSDT chart"');
    expect(markup).toContain('<option value="15m" selected="">15m</option>');
    controller.stop();
  });
});
