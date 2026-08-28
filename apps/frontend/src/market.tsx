import React, { useEffect, useState } from "react";
import { api, marketSocket, type ApiCandle, type MarketCapabilities, type MarketTick, type Timeframe } from "./api";
import { addMarketPanel, mergeCandle, type ChartPanelState, type MarketLayoutState } from "./state";
import { chartBounds } from "./visuals";

const periods: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

const ErrorBox = ({ error }: { error: unknown }) => error ? <div className="market-error"><b>Unable to load market data</b><span>{error instanceof Error ? error.message : String(error)}</span></div> : null;

function CandleVisual({ candles, emptyLabel }: { candles: ApiCandle[]; emptyLabel: string }) {
  const visible = candles.slice(-80);
  if (!visible.length) return <div className="market-empty-chart"><div className="empty-chart-grid" aria-hidden="true"><i /><i /><i /><i /></div><span className="empty-chart-icon">⌁</span><b>{emptyLabel}</b><small>The backend returned no candles for this pair/timeframe.</small></div>;
  const bounds = chartBounds(visible);
  const maxVolume = Math.max(...visible.map((candle) => candle.volume), 1);
  const x = (index: number) => 26 + index * (748 / Math.max(visible.length - 1, 1));
  const y = (value: number) => 14 + (bounds.max - value) / bounds.range * 142;
  const last = visible[visible.length - 1]!;
  return <div className="market-candle-visual" aria-label="Backend candlestick visualization"><svg viewBox="0 0 800 230" role="img" aria-label="Candlestick chart with volume">{[0, 1, 2, 3].map((line) => <line key={line} className="market-grid-line" x1="0" x2="800" y1={14 + line * 45} y2={14 + line * 45} />)}{visible.map((candle, index) => { const candleX = x(index); const rising = candle.close >= candle.open; const bodyTop = y(Math.max(candle.open, candle.close)); const bodyHeight = Math.max(2, Math.abs(y(candle.open) - y(candle.close))); const volumeHeight = candle.volume / maxVolume * 38; return <g key={candle.timestamp} className={rising ? "market-candle-up" : "market-candle-down"}><line x1={candleX} x2={candleX} y1={y(candle.high)} y2={y(candle.low)} /><rect x={candleX - 3.5} y={bodyTop} width="7" height={bodyHeight} /><rect className="market-volume-bar" x={candleX - 3.5} y={184 - volumeHeight} width="7" height={Math.max(2, volumeHeight)} /></g>; })}<line className="market-last-price-line" x1="0" x2="800" y1={y(last.close)} y2={y(last.close)} /><rect className="market-last-price" x="720" y={y(last.close) - 9} width="78" height="18" rx="4" /><text className="market-last-price-text" x="759" y={y(last.close) + 3}>{last.close.toLocaleString()}</text><text className="market-axis-label" x="4" y="215">Volume</text></svg><div className="market-chart-caption"><span>Historical candles: {candles.length}</span><span>Close {last.close.toLocaleString()}</span></div></div>;
}

function connectionLabel(state: string): string {
  if (state === "CONNECTED") return "Connected";
  if (state === "RECONNECTING") return "Reconnecting";
  if (state === "CONNECTING") return "Connecting";
  if (state === "PAUSED") return "Paused";
  if (state === "ERROR") return "Error";
  return state.toLowerCase();
}

function LiveChart({ panel, realtimeEnabled, availablePairs, pairsReady, onChange, onRemove, onTick, onState, onProvider, canRemove }: { panel: ChartPanelState; realtimeEnabled: boolean; availablePairs: string[]; pairsReady: boolean; onChange: (pair: string, timeframe: Timeframe) => void; onRemove: () => void; onTick: (tick: MarketTick) => void; onState: (state: string) => void; onProvider: (provider: string) => void; canRemove: boolean }) {
  const { pair, timeframe } = panel;
  const [candles, setCandles] = useState<ApiCandle[]>([]);
  const [state, setState] = useState("CONNECTING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const loadHistory = async () => {
    setLoading(true);
    try { const page = await api.candles(pair, timeframe, 1000); setCandles(page.candles); setError(undefined); }
    catch (reason) { setError(reason); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    let active = true;
    setCandles([]); setError(undefined); setLoading(true);
    const updateState = (next: string) => { if (!active) return; setState(next); onState(next); };
    if (!realtimeEnabled) { updateState("PAUSED"); void loadHistory(); return () => { active = false; }; }
    const stop = marketSocket((message) => {
      if (message.type === "CONNECTION_STATUS" && message.payload) {
        onProvider(typeof message.payload.provider === "string" ? message.payload.provider : "UNKNOWN");
        updateState(message.payload.status === "CONNECTED" ? "CONNECTED" : message.payload.status === "RECONNECTING" ? "RECONNECTING" : "ERROR");
        return;
      }
      if (message.type === "ERROR") setError(new Error(message.payload?.message ?? "Market data subscription failed."));
      if (message.type === "MARKET_TICK" && message.payload?.pair === pair) onTick(message.payload as MarketTick);
      if (message.type !== "CANDLE" || message.payload?.pair !== pair || message.payload?.timeframe !== timeframe) return;
      setCandles((current) => mergeCandle(current, message.payload as ApiCandle).slice(-1000));
    }, updateState, [{ pair, timeframe }]);
    void loadHistory();
    return () => { active = false; stop(); };
  }, [pair, timeframe, realtimeEnabled]);
  const visible = candles.slice(-80);
  const last = visible[visible.length - 1];
  const previous = visible[visible.length - 2];
  const change = last && previous ? ((last.close - previous.close) / previous.close) * 100 : undefined;
  const emptyBackend = error instanceof Error && /no historical candles/i.test(error.message);
  const pairOptions = availablePairs.length ? availablePairs : [pair];
  return <article className="market-chart-card">
    <div className="market-card-heading">
      <div><h2>{pair} · {timeframe} <i className={`market-live-dot ${state === "CONNECTED" ? "is-connected" : ""}`} /></h2><small>{connectionLabel(state)}</small></div>
      <div className="market-card-price">{last ? <><strong>{last.close.toLocaleString()}</strong><em className={change !== undefined && change < 0 ? "is-negative" : ""}>{change === undefined ? "Unavailable" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}</em></> : <span>Waiting for price</span>}</div>
      <span className="market-signal unavailable">Signal unavailable</span>
    </div>
    <div className="market-panel-controls">
      <label>Pair<select aria-label={`Pair ${panel.id}`} value={pair} disabled={!pairsReady} onChange={(event) => onChange(event.target.value, timeframe)}>{pairOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Timeframe<select aria-label={`Timeframe ${panel.id}`} value={timeframe} onChange={(event) => onChange(pair, event.target.value as Timeframe)}>{periods.map((item) => <option key={item}>{item}</option>)}</select></label>
      <button type="button" className="market-remove" aria-label={`Remove chart ${panel.id}`} disabled={!canRemove} onClick={onRemove}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></svg><span>Remove chart</span></button>
      <span className={`market-panel-status status-${state.toLowerCase()}`}><i />{connectionLabel(state)}</span>
    </div>
    <ErrorBox error={emptyBackend ? undefined : error} />
    <div className="market-history-state">{loading ? "Loading backend history…" : last ? <><span>Historical candles: {candles.length}</span><span>{last.isClosed ? "Closed candle" : "Forming candle"}</span></> : emptyBackend ? "No backend candles are available" : "No historical candles are available"}</div>
    <CandleVisual candles={visible} emptyLabel={`No candles for ${pair} · ${timeframe}`} />
    <div className="market-card-footer"><button type="button" onClick={() => void loadHistory()}>↻ Load 1000 historical candles</button><span><i className={state === "CONNECTED" ? "is-connected" : ""} />Live updates: {connectionLabel(state)}</span></div>
  </article>;
}

export const formatMarketQuantity = (quantity: number): string => quantity.toLocaleString("en-US", { maximumFractionDigits: 8 });
export const marketTickKey = (item: MarketTick): string => `${item.pair}|${item.timestamp}|${item.price}|${item.quantity}|${item.side}`;
export const recentMarketTicks = (ticks: MarketTick[], pair: string, limit = 8): MarketTick[] => [...new Map(ticks.filter((tick) => tick.pair === pair).map((tick) => [marketTickKey(tick), tick])).values()].sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp)).slice(0, limit);

export function tickEmptyState(summary: { tone: string; label: string }, capabilities: { loading: boolean; error?: unknown }): string {
  if (capabilities.error) return "Supported market pairs are unavailable; live trades cannot be confirmed.";
  if (summary.label === "No active charts") return "Select a chart to receive live trades for this pair.";
  if (summary.tone === "error") return "Live trades unavailable while the provider connection is in error.";
  if (summary.tone === "paused") return "Realtime is paused; no live trades are being received.";
  if (summary.tone === "pending") return "Waiting for authenticated live trade events.";
  if (capabilities.loading) return "Loading supported market pairs…";
  return "Connected; waiting for live trade events.";
}

export interface MarketScreenProps { layout: MarketLayoutState; onLayoutChange: (layout: MarketLayoutState) => void; }

export function MarketScreen({ layout, onLayoutChange }: MarketScreenProps) {
  const { panels, realtimeEnabled, selectedPair } = layout;
  const [states, setStates] = useState<Record<string, string>>({});
  const [ticks, setTicks] = useState<MarketTick[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>();
  const [provider, setProvider] = useState<string>();
  const [capabilities, setCapabilities] = useState<{ data?: MarketCapabilities; loading: boolean; error?: unknown }>({ loading: true });
  const availablePairs = capabilities.data?.pairs ?? [];
  const availableTimeframes = capabilities.data?.timeframes.filter((item) => periods.includes(item)) ?? periods;
  const pairsReady = Boolean(capabilities.data && availablePairs.length > 0);
  useEffect(() => {
    let active = true;
    setCapabilities({ loading: true });
    api.marketCapabilities().then((data) => active && setCapabilities({ data, loading: false })).catch((error) => active && setCapabilities({ loading: false, error }));
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const data = capabilities.data;
    if (!data || !data.pairs.length || !data.timeframes.length) return;
    const fallbackPair = data.pairs.includes("BTCUSDT") ? "BTCUSDT" : data.pairs[0]!;
    const nextPair = data.pairs.includes(selectedPair) ? selectedPair : fallbackPair;
    const nextPanels = panels.map((panel) => ({ ...panel, pair: data.pairs.includes(panel.pair) ? panel.pair : fallbackPair, timeframe: data.timeframes.includes(panel.timeframe) ? panel.timeframe : data.timeframes[0]! }));
    if (nextPair === selectedPair && nextPanels.every((panel, index) => panel.pair === panels[index]?.pair && panel.timeframe === panels[index]?.timeframe)) return;
    onLayoutChange({ ...layout, selectedPair: nextPair, panels: nextPanels });
  }, [capabilities.data, layout, panels, selectedPair, onLayoutChange]);
  useEffect(() => { setTicks([]); setLastUpdate(undefined); }, [selectedPair]);
  const updatePanel = (id: string, pair: string, timeframe: Timeframe) => onLayoutChange({ ...layout, panels: panels.map((item) => item.id === id ? { ...item, pair, timeframe } : item) });
  const updateState = (id: string, state: string) => setStates((current) => ({ ...current, [id]: state }));
  const removePanel = (id: string) => {
    const nextPanels = panels.filter((item) => item.id !== id);
    if (!nextPanels.length) return;
    if (panels.length <= 1) return;
    onLayoutChange({ ...layout, panels: nextPanels });
    setStates((current) => { const next = { ...current }; delete next[id]; return next; });
  };
  const addTick = (tick: MarketTick) => {
    if (tick.pair !== selectedPair) return;
    setTicks((current) => recentMarketTicks([...current, tick], selectedPair));
    setLastUpdate(tick.timestamp);
  };
  const summary = (() => {
    if (!panels.length) return { label: "No active charts", tone: "paused" as const };
    if (!realtimeEnabled) return { label: "Realtime paused", tone: "paused" as const };
    if (Object.values(states).some((state) => state === "ERROR" || state === "DISCONNECTED")) return { label: "Connection error", tone: "error" as const };
    if (Object.values(states).some((state) => state === "RECONNECTING")) return { label: "Reconnecting", tone: "pending" as const };
    if (Object.values(states).some((state) => state === "CONNECTING")) return { label: "Connecting", tone: "pending" as const };
    if (Object.values(states).length > 0 && Object.values(states).every((state) => state === "CONNECTED")) return { label: "Receiving data", tone: "connected" as const };
    return { label: "Waiting for connection", tone: "pending" as const };
  })();
  const providerId = capabilities.data?.provider ?? provider;
  const providerLabel = providerId === "BINANCE" ? "Binance public market data" : providerId ? `${providerId} market data` : capabilities.loading ? "Loading provider" : "Provider unavailable";
  const addChart = (timeframe: Timeframe) => {
    if (!pairsReady || !availableTimeframes.includes(timeframe)) return;
    const nextLayout = addMarketPanel(layout, selectedPair, timeframe);
    if (nextLayout) onLayoutChange(nextLayout);
  };
  return <div className="market-screen">
    <div className="market-header"><div><h1>Realtime Chart – Đa khung thời gian</h1><p>Backend candles and authenticated WebSocket updates, with independent controls for up to four charts.</p></div><div className="market-header-actions"><span className="market-source-pill"><i />Source: {providerLabel} · {summary.label}</span><button type="button" aria-label="Help" className="market-header-action">?</button><button type="button" aria-label="Notifications" className="market-header-action">♧<i /></button></div></div>
    <section className="market-controlbar"><label className="market-pair-control">Pair / Coin<select aria-label="Market pair for next chart" value={selectedPair} disabled={!pairsReady} onChange={(event) => onLayoutChange({ ...layout, selectedPair: event.target.value })}>{(availablePairs.length ? availablePairs : [selectedPair]).map((item) => <option key={item} value={item}>{item}</option>)}</select></label><div className="market-timeframe-control"><b>Timeframe · click to add</b><div>{availableTimeframes.map((item) => <button type="button" key={item} disabled={!pairsReady || panels.length >= 4} aria-label={`Add ${item} chart`} onClick={() => addChart(item)}>{item}</button>)}</div></div><div className="market-realtime-control"><b>Realtime</b><button type="button" aria-label="Realtime toggle" aria-pressed={realtimeEnabled} className={`market-toggle ${realtimeEnabled ? "active" : ""}`} onClick={() => onLayoutChange({ ...layout, realtimeEnabled: !realtimeEnabled })}><i /></button></div><span className={`market-receiving-pill ${summary.tone}`}><i />{summary.label}</span>{panels.length >= 4 ? <span role="status" className="market-chart-limit-state">Maximum 4 charts reached</span> : null}</section>
    {capabilities.error ? <ErrorBox error={capabilities.error} /> : null}
    <div className="market-layout"><div className="market-chart-grid">{panels.length ? panels.map((panel) => <LiveChart key={panel.id} panel={panel} realtimeEnabled={realtimeEnabled} availablePairs={availablePairs} pairsReady={pairsReady} onChange={(pair, timeframe) => updatePanel(panel.id, pair, timeframe)} onRemove={() => removePanel(panel.id)} onTick={addTick} onState={(state) => updateState(panel.id, state)} onProvider={setProvider} canRemove={panels.length > 1} />) : <section className="market-empty-workspace" aria-live="polite"><span aria-hidden="true">⌁</span><h2>No charts configured</h2><p>Select a pair and timeframe above to add up to four charts.</p></section>}</div><aside className="market-sidebar"><section className="market-side-card connection-card"><div className="market-side-title"><h2>Connection status</h2><span className={`connection-pill ${summary.tone}`}><i />{summary.label}</span></div><dl><dt>Transport</dt><dd>Authenticated Socket.IO</dd><dt>Provider</dt><dd>{providerLabel}</dd><dt>Last update</dt><dd>{lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "Waiting"}</dd></dl></section><section className="market-side-card recent-ticks"><div className="market-side-title"><h2>Recent Ticks ({selectedPair})</h2></div>{ticks.length ? <table><thead><tr><th>Time</th><th>Price</th><th>Quantity</th><th>Side</th></tr></thead><tbody>{ticks.map((tick) => <tr key={`${tick.pair}-${tick.timestamp}-${tick.price}-${tick.quantity}-${tick.side}`}><td>{new Date(tick.timestamp).toLocaleTimeString()}</td><td>{tick.price.toLocaleString()}</td><td>{formatMarketQuantity(tick.quantity)}</td><td><span className={`market-tick-side ${tick.side === "BUY" ? "buy" : "sell"}`}>{tick.side}</span></td></tr>)}</tbody></table> : <div className="market-empty-side">{tickEmptyState(summary, capabilities)}</div>}</section></aside></div>
  </div>;
}
