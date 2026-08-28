import {
  ColorType,
  CrosshairMode,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
  type WhitespaceData,
} from "lightweight-charts";
import type { CandleDto } from "@cryptox/contracts/rest";

export interface CandlestickSurface {
  setCandles(candles: readonly CandleDto[]): void;
  destroy(): void;
}

export interface LightweightChartDependencies {
  create(element: HTMLElement): {
    chart: Pick<IChartApi, "remove">;
    series: {
      setData(data: Array<CandlestickData<Time> | WhitespaceData<Time>>): void;
    };
  };
}

function toChartCandle(candle: CandleDto): CandlestickData<Time> {
  return {
    time: Math.floor(Date.parse(candle.timestamp) / 1000) as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  };
}

export function createLightweightCandlestickSurface(
  element: HTMLElement,
  dependencies: LightweightChartDependencies = browserChartDependencies,
): CandlestickSurface {
  const { chart, series } = dependencies.create(element);

  return {
    setCandles(candles) {
      series.setData(candles.map(toChartCandle));
    },
    destroy() {
      chart.remove();
    },
  };
}

const browserChartDependencies: LightweightChartDependencies = {
  create(element) {
    const chart: IChartApi = createChart(element, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#10151c" },
        textColor: "#8f9aaa",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.035)" },
        horzLines: { color: "rgba(255, 255, 255, 0.035)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(255, 255, 255, 0.09)" },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.09)",
        timeVisible: true,
        secondsVisible: false,
      },
    });
    const series: ISeriesApi<"Candlestick"> = chart.addCandlestickSeries({
      upColor: "#2dd4a8",
      downColor: "#ff5e72",
      borderVisible: false,
      wickUpColor: "#2dd4a8",
      wickDownColor: "#ff5e72",
    });
    return { chart, series };
  },
};
