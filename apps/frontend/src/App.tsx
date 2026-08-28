import { useEffect, useMemo } from "react";
import { MarketChart } from "./components/MarketChart";
import { MarketDashboardController } from "./market/chart-state";
import { MarketWebSocketClient, RestMarketDataClient } from "./market/clients";
import { FixtureMarketDataSource } from "./market/fixture-source";
import { RemoteMarketDataSource } from "./market/remote-source";
import type { MarketDataSource } from "./market/types";

interface RuntimeMarketSource {
  readonly source?: MarketDataSource;
  readonly label: string;
  readonly fixture: boolean;
  readonly error?: string;
}

function runtimeMarketSource(): RuntimeMarketSource {
  const requestedMode = import.meta.env.VITE_MARKET_SOURCE;
  const fixtureAllowed = import.meta.env.DEV && (requestedMode === undefined || requestedMode === "fixture");
  if (fixtureAllowed) {
    return { source: new FixtureMarketDataSource(), label: "Deterministic fixture", fixture: true };
  }
  if (requestedMode !== "remote") {
    return {
      label: "Not configured",
      fixture: false,
      error: "Set VITE_MARKET_SOURCE=remote for production. Fixture data is development-only.",
    };
  }
  const restUrl = import.meta.env.VITE_MARKET_REST_URL;
  const websocketUrl = import.meta.env.VITE_MARKET_WS_URL;
  if (!restUrl || !websocketUrl) {
    return {
      label: "Remote configuration incomplete",
      fixture: false,
      error: "Remote market mode requires VITE_MARKET_REST_URL and VITE_MARKET_WS_URL.",
    };
  }
  return {
    source: new RemoteMarketDataSource(
      new RestMarketDataClient(restUrl),
      new MarketWebSocketClient(websocketUrl),
    ),
    label: "Configured market provider",
    fixture: false,
  };
}

export function App(): React.ReactElement {
  const runtime = useMemo(runtimeMarketSource, []);
  const dashboard = useMemo(
    () =>
      runtime.source
        ? new MarketDashboardController(runtime.source, [
            { id: "chart-1", pair: "BTCUSDT", timeframe: "5m" },
            { id: "chart-2", pair: "BTCUSDT", timeframe: "15m" },
            { id: "chart-3", pair: "BTCUSDT", timeframe: "1h" },
            { id: "chart-4", pair: "BTCUSDT", timeframe: "4h" },
          ])
        : undefined,
    [runtime.source],
  );

  useEffect(() => {
    if (!dashboard) return;
    void dashboard.start();
    return () => dashboard.stop();
  }, [dashboard]);

  return (
    <main className="app-shell">
      <nav className="topbar" aria-label="Primary">
        <a className="brand" href="#market" aria-label="Cryptox market lab">
          <span className="brand__mark">CX</span>
          <span>Cryptox</span>
        </a>
        <div className="nav-tabs">
          <a className="nav-tabs__active" href="#market">Market lab</a>
          <span>Strategies</span>
          <span>Experiments</span>
        </div>
        <span className={`source-pill ${runtime.fixture ? "source-pill--fixture" : ""}`}>
          {runtime.label}
        </span>
      </nav>

      <section className="hero" id="market">
        <div>
          <span className="kicker">Realtime workspace</span>
          <h1>Read the market across time.</h1>
          <p>Each chart owns its history, timeframe, subscription, and recovery state.</p>
        </div>
        <div className="market-summary">
          <span>Pair</span>
          <strong>BTC / USDT</strong>
          <small>Normalized market contracts</small>
        </div>
      </section>

      {runtime.error ? (
        <section className="configuration-error" role="alert">
          <span>Market source unavailable</span>
          <strong>{runtime.error}</strong>
        </section>
      ) : (
        <section className="chart-grid" aria-label="Independent market charts">
          {dashboard?.charts.map((chart) => <MarketChart key={chart.snapshot().id} controller={chart} />)}
        </section>
      )}
    </main>
  );
}
