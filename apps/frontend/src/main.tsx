import React, { useEffect, useMemo, useState } from "react";
import { QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { api, session, type NewsItem, type Scope } from "./api";
import { BacktestScreen, ExperimentDetail, PersistentLeaderboardTable, RankingTable, SearchScreen } from "./features";
import { MarketScreen } from "./market";
import { appRoutePath, parseAppRoute, persistMarketLayout, readMarketLayout, type AppScreen, type MarketLayoutState } from "./state";
import { StrategyScreen } from "./strategy";
import { News } from "./news";
import { queryClient, clearAuthenticatedClientState, logout } from "./query";
import { sentimentDistribution } from "./visuals";
import "./style.css";
import "./auth.css";

const nav: Array<[AppScreen, string, string]> = [["market", "Realtime", "∿"], ["strategy", "Strategy Library", "⌘"], ["backtest", "Backtest", "▥"], ["search", "Search", "⌕"], ["leaderboard", "Leaderboard", "▥"], ["news", "News", "▤"], ["settings", "Settings", "⚙"]];
const Panel = ({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) => <section className={`panel ${className}`}>{title && <h2>{title}</h2>}{children}</section>;
const Btn = ({ children, primary, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) => <button {...props} className={`btn ${primary ? "primary" : ""}`}>{children}</button>;
const ErrorBox = ({ error }: { error: unknown }) => error ? <p className="error" role="alert">{error instanceof Error ? error.message : String(error)}</p> : null;
const Loading = () => <p className="muted" aria-live="polite">Loading live backend data...</p>;
const Empty = ({ children }: { children: React.ReactNode }) => <p className="muted empty-state">{children}</p>;

const MailIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v11H4z" /><path d="m5 8 7 5 7-5" /></svg>;
const LockIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2.5" /></svg>;
const EyeIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
const EyeOffIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;

function Auth({ onAuthenticated, initialRegister = false }: { onAuthenticated: () => void; initialRegister?: boolean }) {
  const [register, setRegister] = useState(initialRegister);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<unknown>();
  useEffect(() => setRegister(initialRegister), [initialRegister]);
  const mutation = useMutation({
    mutationFn: async () => {
      if (register) await api.register(email, password);
      return api.login(email, password);
    },
    onSuccess: onAuthenticated,
    onError: setError,
  });
  const chooseMode = (nextRegister: boolean) => {
    setError(undefined);
    setRegister(nextRegister);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", nextRegister ? "/register" : "/");
    }
  };
  return <main className="auth">
    <div className="auth-glow auth-glow-cyan" />
    <div className="auth-glow auth-glow-violet" />
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-emblem" aria-hidden="true"><span>C</span><i /></div>
      <div className="auth-heading">
        <span className="auth-kicker">CRYPTO STRATEGY LAB</span>
        <h1 id="auth-title">{register ? "Create your account" : "Welcome back"}</h1>
        <p>{register ? "Start building, backtesting, and discovering robust trading strategies in seconds." : "Sign in to access your saved strategies, active search runs, and real-time market data."}</p>
      </div>
      <div className="auth-modes" role="tablist" aria-label="Authentication mode">
        <button type="button" role="tab" aria-selected={!register} className={!register ? "active" : ""} onClick={() => chooseMode(false)}>Sign in</button>
        <button type="button" role="tab" aria-selected={register} className={register ? "active" : ""} onClick={() => chooseMode(true)}>Register</button>
      </div>
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          setError(undefined);
          mutation.mutate();
        }}
      >
        <label>
          <span>Email Address</span>
          <div className="auth-field">
            <MailIcon />
            <input
              type="email"
              autoComplete="email"
              autoFocus
              required
              placeholder="trader@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </label>
        <label>
          <span>Password</span>
          <div className="auth-field">
            <LockIcon />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete={register ? "new-password" : "current-password"}
              minLength={8}
              required
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="auth-toggle-pwd"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </label>
        {register && <p className="auth-hint">Use 8 or more characters. Your password is stored as a secure hash.</p>}
        <ErrorBox error={error ?? mutation.error} />
        <button className="auth-submit" type="submit" disabled={mutation.isPending}>
          <span>{mutation.isPending ? register ? "Creating account..." : "Signing in..." : register ? "Create account" : "Sign in"}</span>
          {!mutation.isPending && <b aria-hidden="true">→</b>}
        </button>
      </form>
      <p className="auth-switch">{register ? "Already have an account?" : "New to CryptoX?"} <button type="button" onClick={() => chooseMode(!register)}>{register ? "Sign in" : "Create an account"}</button></p>
      <footer className="auth-trust"><i /> Secured session · Backend-authenticated workspace</footer>
    </section>
  </main>;
}

function Heading({ title, text }: { title: string; text: string }) { return <div className="heading"><div><h1>{title}</h1><p>{text}</p></div><span className="status"><i />Live backend</span></div>; }

function Leaderboard() { const scopes = useQuery({ queryKey: ["scopes"], queryFn: api.scopes }); const [scopeId, setScopeId] = useState(""); const ranking = useQuery({ queryKey: ["leaderboard", scopeId], queryFn: () => api.leaderboard(scopeId), enabled: Boolean(scopeId) }); return <><Heading title="Leaderboard - Top strategies" text="Owner-scoped persistent admissions enriched with experiment metrics." /><Panel><label className="field scope-select">Benchmark scope<select value={scopeId} onChange={(event) => setScopeId(event.target.value)}><option value="">Select scope</option>{scopes.data?.map((scope: Scope) => <option key={scope.id} value={scope.id}>{scope.name}</option>)}</select></label>{scopes.isLoading ? <Loading /> : scopes.error ? <ErrorBox error={scopes.error} /> : null}{scopeId && ranking.isLoading ? <Loading /> : ranking.error ? <ErrorBox error={ranking.error} /> : ranking.data?.length ? <PersistentLeaderboardTable rows={ranking.data} /> : <p className="muted">{scopeId ? "No admitted experiments for this scope." : "Select a real backend scope to view rankings."}</p>}</Panel></>; }

function Settings({ onLogout }: { onLogout: () => void }) { const me = useQuery({ queryKey: ["auth", "me"], queryFn: api.me }); return <><Heading title="Settings" text="Authenticated session and backend connection." /><Panel title="Session">{me.isLoading ? <Loading /> : me.error ? <ErrorBox error={me.error} /> : <p>Authenticated user: {me.data?.userId}</p>}<Btn onClick={onLogout}>Log out</Btn></Panel></>; }

function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(session.token));
  const [route, setRoute] = useState(() => parseAppRoute(typeof window === "undefined" ? "/" : window.location.pathname));
  const [marketLayout, setMarketLayout] = useState<MarketLayoutState>(() => readMarketLayout());
  const screen = route.screen;
  const navigate = (nextScreen: AppScreen, resourceId?: string) => {
    const next = { screen: nextScreen, ...(resourceId ? { resourceId } : {}) };
    if (typeof window !== "undefined") window.history.pushState({}, "", appRoutePath(next));
    setRoute(next);
  };
  const handleLogout = () => {
    logout();
    if (typeof window !== "undefined") window.history.replaceState({}, "", "/");
    setRoute({ screen: "market" });
  };
  useEffect(() => {
    if (!authenticated && typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      if (currentPath !== "/" && currentPath !== "/register" && currentPath !== "/login") {
        window.history.replaceState({}, "", "/");
        setRoute({ screen: "market" });
      }
    }
  }, [authenticated]);
  useEffect(() => {
    const onPopState = () => setRoute(parseAppRoute(window.location.pathname));
    const onCustomNavigate = (e: Event) => {
      const detail = (e as CustomEvent<{ screen: AppScreen; resourceId?: string }>).detail;
      if (detail?.screen) {
        setRoute({ screen: detail.screen, ...(detail.resourceId ? { resourceId: detail.resourceId } : {}) });
      } else {
        setRoute(parseAppRoute(window.location.pathname));
      }
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("cryptox:navigate", onCustomNavigate);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("cryptox:navigate", onCustomNavigate);
    };
  }, []);
  useEffect(() => session.subscribe((nextToken) => { if (!nextToken) clearAuthenticatedClientState(); setAuthenticated(Boolean(nextToken)); }), []);
  useEffect(() => { if (session.token) void queryClient.fetchQuery({ queryKey: ["auth", "me"], queryFn: api.me }).catch(() => undefined); }, []);
  useEffect(() => { persistMarketLayout(marketLayout); }, [marketLayout]);
  const body = useMemo(() => screen === "market" ? <MarketScreen layout={marketLayout} onLayoutChange={setMarketLayout} /> : screen === "strategy" ? <StrategyScreen /> : screen === "backtest" ? route.resourceId ? <ExperimentDetail id={route.resourceId} /> : <BacktestScreen /> : screen === "search" ? <SearchScreen initialRunId={route.resourceId} /> : screen === "leaderboard" ? <Leaderboard /> : screen === "news" ? <News /> : <Settings onLogout={handleLogout} />, [screen, route.resourceId, authenticated, marketLayout]);
  if (!authenticated) return <Auth initialRegister={route.register} onAuthenticated={() => navigate("market")} />;
  return <div className="app"><aside><div className="brand"><span>⚗</span><b>Crypto<br />Strategy Lab</b></div><nav>{nav.map(([id, label, icon]) => <button className={screen === id ? "active" : ""} onClick={() => navigate(id)} key={id}><span className="nav-icon">{icon}</span><span>{label}</span></button>)}</nav><div className="side-bottom"><div className="account-card workspace-account"><span className="account-icon">✦</span><span><b>Live workspace</b><small>Backend connected</small></span></div><button className="account-card user-account" onClick={() => navigate("settings")}><span className="account-icon">●</span><span><b>Authenticated account</b><small>Session secured</small></span><span className="account-chevron">⌄</span></button><button className="account-card logout-account" onClick={handleLogout}><span className="account-icon logout-icon">⏻</span><span><b>Sign out</b><small>End current session</small></span></button></div></aside><main>{body}</main></div>;
}

createRoot(document.getElementById("root")!).render(<QueryClientProvider client={queryClient}><App /></QueryClientProvider>);
