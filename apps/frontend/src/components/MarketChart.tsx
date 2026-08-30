import { useEffect, useRef, useSyncExternalStore } from "react";
import { REST_MARKET_TIMEFRAMES, type RestMarketTimeframe } from "@cryptox/contracts/rest";
import { createLightweightCandlestickSurface } from "../chart/lightweight-adapter";
import type { ChartController } from "../market/chart-state";
import type { ChartState } from "../market/types";

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
      <MarketObservability state={state} />
      {state.stale && state.candles.length > 0 ? (
        <div className="stale-banner" role="status">
          Feed is stale — retaining the latest history while connection recovers.
        </div>
      ) : null}
      {state.error ? <div className="error-banner">{state.error}</div> : null}
    </article>
  );
}

function displayTime(value: string | undefined): string {
  return value ?? "not supplied/not yet composed";
}

function recoveryLabel(state: ChartState): string {
  switch (state.recoveryStatus) {
    case "PENDING":
      return "Recovery pending";
    case "RECOVERED":
      return "Recovered after reconnect";
    case "FAILED":
      return "Recovery failed";
    default:
      return "No recovery required";
  }
}

function MarketObservability({ state }: { readonly state: ChartState }): React.ReactElement {
  const observability = state.observability;
  if (!observability) {
    return (
      <div className="market-observability market-observability--missing" role="status">
        Market observability not supplied by the current feed.
      </div>
    );
  }

  const latest = observability.latestTicks.at(-1);
  return (
    <section className="market-observability" aria-label={`${state.pair} ephemeral market observability`}>
      <div className="market-observability__heading">
        <div>
          <strong>Ephemeral market observability</strong>
          <small>In-memory only · lost on restart · never historical or backtest input</small>
        </div>
        <span>{observability.latestTicks.length}/100 latest ticks</span>
      </div>
      <dl className="market-observability__facts">
        <dt>Provider</dt><dd>{observability.connection.provider}</dd>
        <dt>Connection</dt><dd>{observability.connection.status} · {recoveryLabel(state)}</dd>
        <dt>Provider event time</dt><dd>{displayTime(latest?.providerEventAt)}</dd>
        <dt>Received time</dt><dd>{displayTime(latest?.receivedAt)}</dd>
        <dt>Last latency</dt><dd>{observability.lastLatencyMs === null ? "not supplied/not yet composed" : `${observability.lastLatencyMs} ms`}</dd>
      </dl>
      {observability.latestTicks.length > 0 ? (
        <div className="market-observability__ticks">
          <span className="market-observability__label">Latest tick buffer</span>
          <div className="market-observability__tick-list">
            {observability.latestTicks.map((tick, index) => (
              <span key={`${tick.timestamp}-${index}`}>
                {tick.timestamp} · {tick.price} · {tick.latencyMs} ms
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="market-observability__empty">No ticks supplied in the ephemeral buffer.</p>
      )}
    </section>
  );
}
