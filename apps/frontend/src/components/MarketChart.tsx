import { useEffect, useRef, useSyncExternalStore } from "react";
import { REST_MARKET_TIMEFRAMES, type RestMarketTimeframe } from "@cryptox/contracts/rest";
import { createLightweightCandlestickSurface } from "../chart/lightweight-adapter";
import type { ChartController } from "../market/chart-state";

export interface MarketChartProps {
  readonly controller: ChartController;
}

export function MarketChart({ controller }: MarketChartProps): React.ReactElement {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.snapshot,
    controller.snapshot,
  );
  const container = useRef<HTMLDivElement>(null);
  const surface = useRef<ReturnType<typeof createLightweightCandlestickSurface>>();

  useEffect(() => {
    if (!container.current) return;
    surface.current = createLightweightCandlestickSurface(container.current);
    return () => {
      surface.current?.destroy();
      surface.current = undefined;
    };
  }, []);

  useEffect(() => {
    surface.current?.setCandles(state.candles);
  }, [state.candles]);

  return (
    <article className={`market-card ${state.stale ? "market-card--stale" : ""}`}>
      <header className="market-card__header">
        <div>
          <span className="market-card__eyebrow">{state.pair}</span>
          <strong>{state.timeframe} market</strong>
        </div>
        <div className="market-card__controls">
          <label>
            <span className="sr-only">Timeframe for {state.id}</span>
            <select
              aria-label={`Timeframe for ${state.id}`}
              value={state.timeframe}
              onChange={(event) =>
                void controller.changeTimeframe(event.target.value as RestMarketTimeframe)
              }
            >
              {REST_MARKET_TIMEFRAMES.map((timeframe) => (
                <option key={timeframe} value={timeframe}>
                  {timeframe}
                </option>
              ))}
            </select>
          </label>
          <span className={`connection connection--${state.connection.toLowerCase()}`}>
            <i aria-hidden="true" />
            {state.connection.replaceAll("_", " ")}
          </span>
        </div>
      </header>
      <div className="market-card__canvas" ref={container} aria-label={`${state.pair} chart`} />
      {state.stale && state.candles.length > 0 ? (
        <div className="stale-banner" role="status">
          Feed is stale — retaining the latest history while connection recovers.
        </div>
      ) : null}
      {state.error ? <div className="error-banner">{state.error}</div> : null}
    </article>
  );
}
