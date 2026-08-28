import { useEffect, useMemo } from "react";
import { MarketChart } from "./components/MarketChart";
import { MarketDashboardController } from "./market/chart-state";
import { MarketWebSocketClient, RestMarketDataClient } from "./market/clients";
import { FixtureMarketDataSource } from "./market/fixture-source";
import { RemoteMarketDataSource } from "./market/remote-source";
import type { MarketDataSource } from "./market/types";
import { InMemoryPrivateCache } from "./auth/cache";
import {
  RestAuthClient,
  RestProtectedRequestClient,
  UnavailableAuthClient,
  UnavailableProtectedRequestClient,
  type ProtectedRequestClient,
} from "./auth/clients";
import { FixtureAuthClient, FixtureProtectedRequestClient } from "./auth/fixture-client";
import { useAuth } from "./auth/hooks";
import {
  guardRoute,
  isProtectedRoute,
  navigateTo,
  useAppLocation,
} from "./auth/navigation";
import { AuthScreen, PrivateWorkspace } from "./auth/screens";
import { AuthStore } from "./auth/state";
import type { AuthClient } from "./auth/types";

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

interface RuntimeAuthSource {
  readonly client: AuthClient;
  readonly protectedClientFactory: (onUnauthorized: () => void) => ProtectedRequestClient;
  readonly label: string;
  readonly fixture: boolean;
  readonly error?: string;
}

const fixtureAuthClient = new FixtureAuthClient();

function runtimeAuthSource(): RuntimeAuthSource {
  const requestedMode = import.meta.env.VITE_AUTH_SOURCE;
  const fixtureAllowed = import.meta.env.DEV && (requestedMode === undefined || requestedMode === "fixture");
  if (fixtureAllowed) {
    return {
      client: fixtureAuthClient,
      protectedClientFactory: (onUnauthorized) => new FixtureProtectedRequestClient(onUnauthorized),
      label: "Fixture session",
      fixture: true,
    };
  }
  if (requestedMode !== "remote") {
    const error = "Set VITE_AUTH_SOURCE=remote for production. Fixture Auth is development-only.";
    return {
      client: new UnavailableAuthClient(error),
      protectedClientFactory: () => new UnavailableProtectedRequestClient(error),
      label: "Not configured",
      fixture: false,
      error,
    };
  }
  const baseUrl = import.meta.env.VITE_AUTH_BASE_URL;
  if (!baseUrl) {
    const error = "Remote Auth mode requires VITE_AUTH_BASE_URL.";
    return {
      client: new UnavailableAuthClient(error),
      protectedClientFactory: () => new UnavailableProtectedRequestClient(error),
      label: "Configuration incomplete",
      fixture: false,
      error,
    };
  }
  return {
    client: new RestAuthClient(baseUrl),
    protectedClientFactory: (onUnauthorized) =>
      new RestProtectedRequestClient(baseUrl, fetch, onUnauthorized),
    label: "Configured Auth",
    fixture: false,
  };
}

export function App(): React.ReactElement {
  const runtime = useMemo(runtimeMarketSource, []);
  const authRuntime = useMemo(runtimeAuthSource, []);
  const authStore = useMemo(
    () => new AuthStore(authRuntime.client, new InMemoryPrivateCache()),
    [authRuntime.client],
  );
  const authState = useAuth(authStore);
  const location = useAppLocation();
  const routeGuard = guardRoute(location.name, authState.status);
  const protectedClient = useMemo(
    () => authRuntime.protectedClientFactory(() => authStore.handleUnauthorized()),
    [authRuntime, authStore],
  );
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

  useEffect(() => {
    void authStore.restore();
  }, [authStore]);

  useEffect(() => {
    if (routeGuard.kind === "redirect") {
      navigateTo("login", routeGuard.returnTo);
      return;
    }
    if (
      authState.status === "authenticated" &&
      (location.name === "login" || location.name === "register")
    ) {
      navigateTo(location.returnTo ?? "market");
    }
  }, [authState.status, location.name, location.returnTo, routeGuard]);

  async function signOut(): Promise<void> {
    await authStore.logout();
    if (authStore.snapshot().status === "anonymous" && isProtectedRoute(location.name)) {
      navigateTo("login");
    }
  }

  let page: React.ReactElement;
  if (routeGuard.kind === "redirect") {
    page = (
      <section className="route-status" role="status">
        Redirecting to sign in…
      </section>
    );
  } else if (routeGuard.kind === "restore") {
    page = (
      <section className="route-status" role="status">
        Restoring your secure session…
      </section>
    );
  } else if (routeGuard.kind === "unavailable") {
    page = (
      <section className="configuration-error" role="alert">
        <span>Authentication source unavailable</span>
        <strong>{authState.message ?? authRuntime.error}</strong>
      </section>
    );
  } else if (location.name === "login" || location.name === "register") {
    page = (
      <AuthScreen
        mode={location.name}
        store={authStore}
        returnTo={location.returnTo ?? "market"}
      />
    );
  } else if (location.name === "strategies" || location.name === "experiments") {
    page = (
      <PrivateWorkspace
        section={location.name === "strategies" ? "Strategies" : "Experiments"}
        email={authState.user?.email ?? "authenticated user"}
        protectedClient={protectedClient}
      />
    );
  } else {
    page = (
      <>
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
      </>
    );
  }

  return (
    <main className="app-shell">
      <nav className="topbar" aria-label="Primary">
        <a className="brand" href="#market" aria-label="Cryptox market lab">
          <span className="brand__mark">CX</span>
          <span>Cryptox</span>
        </a>
        <div className="nav-tabs">
          <a className={location.name === "market" ? "nav-tabs__active" : ""} href="#market">Market lab</a>
          <a className={location.name === "strategies" ? "nav-tabs__active" : ""} href="#strategies">Strategies</a>
          <a className={location.name === "experiments" ? "nav-tabs__active" : ""} href="#experiments">Experiments</a>
        </div>
        <div className="topbar__status">
          <span className={`source-pill ${runtime.fixture ? "source-pill--fixture" : ""}`}>
            {runtime.label}
          </span>
          <span className={`source-pill ${authRuntime.fixture ? "source-pill--fixture" : ""}`}>
            {authRuntime.label}
          </span>
          {authState.status === "authenticated" ? (
            <>
              <span className="user-pill">{authState.user?.email}</span>
              <button className="sign-out" type="button" onClick={() => void signOut()} disabled={authState.pending}>
                Sign out
              </button>
            </>
          ) : (
            <a className="sign-in-link" href="#login">Sign in</a>
          )}
          {authState.message && authState.status === "authenticated" ? (
            <span className="auth-feedback" role="status">{authState.message}</span>
          ) : null}
        </div>
      </nav>
      {page}
    </main>
  );
}
