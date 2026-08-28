import { describe, expect, it, vi } from "vitest";
import type { CandlestickData, Time, WhitespaceData } from "lightweight-charts";
import type { CandleDto } from "@cryptox/contracts/rest";
import {
  createLightweightCandlestickSurface,
  type LightweightChartDependencies,
} from "./lightweight-adapter";

describe("lightweight-charts adapter", () => {
  it("projects normalized candles and owns renderer teardown", () => {
    const setData = vi.fn<
      (data: Array<CandlestickData<Time> | WhitespaceData<Time>>) => void
    >();
    const remove = vi.fn();
    const dependencies: LightweightChartDependencies = {
      create: vi.fn(() => ({ chart: { remove }, series: { setData } })),
    };
    const surface = createLightweightCandlestickSurface({} as HTMLElement, dependencies);
    const candle: CandleDto = {
      pair: "BTCUSDT",
      timeframe: "5m",
      timestamp: "2026-08-28T00:00:00.000Z",
      open: 100,
      high: 112,
      low: 97,
      close: 108,
      volume: 50,
      isClosed: true,
    };

    surface.setCandles([candle]);
    surface.destroy();

    expect(setData).toHaveBeenCalledWith([
      { time: 1_787_875_200, open: 100, high: 112, low: 97, close: 108 },
    ]);
    expect(remove).toHaveBeenCalledOnce();
  });
});
