import React, { useEffect, useState } from "react";
import { api, marketSocket, type ApiCandle, type Timeframe } from "./api";
import { initialChartPanels, marketConnectionSummary, mergeCandle, type ChartPanelState } from "./state";
import { chartBounds } from "./visuals";

const periods: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];
const topPeriods: Timeframe[] = ["1m", "5m", "15m", "1h", "4h"];
type MarketTick = { pair: string; price: number; timestamp: string };

const ErrorBox = ({ error }: { error: unknown }) => error ? <div className="market-error"><b>Unable to load market data</b><span>{error instanceof Error ? error.message : String(error)}</span></div> : null;

function CandleVisual({ candles, emptyLabel }: { candles: ApiCandle[]; emptyLabel: string }) {
  const visible = candles.slice(-80);
  if (!visible.length) return <div className="market-empty-chart"><div className="empty-chart-grid" aria-hidden="true"><i /><i /><i /><i /></div><span className="empty-chart-icon">⌁</span><b>{emptyLabel}</b><small>The backend returned no candles for this pair/timeframe.</small></div>;
  const bounds = chartBounds(visible);
  const maxVolume = Math.max(...visible.map((candle) => candle.volume), 1);
  const x = (index: number) => 26 + index * (748 / Math.max(visible.length - 1, 1));
  const y = (value: number) => 14 + (bounds.max - value) / bounds.range * 142;
  const last = visible[visible.length - 1];
  return <div className="market-candle-visual" aria-label="Backend candlestick visualization"><svg viewBox="0 0 800 230" role="img" aria-label="Candlestick chart with volume">{[0, 1, 2, 3].map((line) => <line key={line} className="market-grid-line" x1="0" x2="800" y1={14 + line * 45} y2={14 + line * 45} />)}{visible.map((candle, index) => { const candleX = x(index); const rising = candle.close >= candle.open; const bodyTop = y(Math.max(candle.open, candle.close)); const bodyHeight = Math.max(2, Math.abs(y(candle.open) - y(candle.close))); const volumeHeight = candle.volume / maxVolume * 38; return <g key={candle.timestamp} className={rising ? "market-candle-up" : "market-candle-down"}><line x1={candleX} x2={candleX} y1={y(candle.high)} y2={y(candle.low)} /><rect x={candleX - 3.5} y={bodyTop} width="7" height={bodyHeight} /><rect className="market-volume-bar" x={candleX - 3.5} y={184 - volumeHeight} width="7" height={Math.max(2, volumeHeight)} /></g>; })}<line className="market-last-price-line" x1="0" x2="800" y1={y(last.close)} y2={y(last.close)} /><rect className="market-last-price" x="720" y={y(last.close) - 9} width="78" height="18" rx="4" /><text className="market-last-price-text" x="759" y={y(last.close) + 3}>{last.close.toLocaleString()}</text><text className="market-axis-label" x="4" y="215">Volume</text></svg><div className="market-chart-caption"><span>Historical candles: {visible.length}</span><span>Close {last.close.toLocaleString()}</span></div></div>;
}

function connectionLabel(state: string): string {
  if (state === "CONNECTED") return "Connected";
  if (state === "RECONNECTING") return "Reconnecting";
  if (state === "CONNECTING") return "Connecting";
  if (state === "PAUSED") return "Paused";
  if (state === "ERROR") return "Error";
  return state.toLowerCase();
}

function LiveChart({ panel, realtimeEnabled, onChange, onRemove, onTick, onState }: { panel: ChartPanelState; realtimeEnabled: boolean; onChange: (pair: string, timeframe: Timeframe) => void; onRemove: () => void; onTick: (tick: MarketTick) => void; onState: (state: string) => void }) {
  const { pair, timeframe } = panel;
  const [candles, setCandles] = useState<ApiCandle[]>([]);
  const [state, setState] = useState("CONNECTING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const loadHistory = async () => {
    setLoading(true);
    try {
      const page = await api.candles(pair, timeframe, 1000);
      setCandles(page.candles);
      setError(undefined);
    } catch (reason) {
      setError(reason);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    setCandles([]);
    setError(undefined);
    setLoading(true);
    const updateState = (next: string) => {
      if (!active) return;
      setState(next);
      onState(next);
    };
    if (!realtimeEnabled) {
      updateState("PAUSED");
      void loadHistory();
      return () => { active = false; };
    }
    const stop = marketSocket((message) => {
      if (message.type === "ERROR" && message.payload?.pair === pair) setError(new Error(message.payload.message));
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
  return <article className="market-chart-card">
    <div className="market-card-heading">
      <div><h2>{pair} · {timeframe} <i className={`market-live-dot ${state === "CONNECTED" ? "is-connected" : ""}`} /></h2><small>{connectionLabel(state)}</small></div>
      <div className="market-card-price">{last ? <><strong>{last.close.toLocaleString()}</strong><em className={change !== undefined && change < 0 ? "is-negative" : ""}>{change === undefined ? "Unavailable" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}</em></> : <span>Waiting for price</span>}</div>
      <span className="market-signal unavailable">Signal unavailable</span>
    </div>
    <div className="market-panel-controls">
      <label>Pair<input aria-label={`Pair ${panel.id}`} value={pair} onChange={(event) => onChange(event.target.value.toUpperCase(), timeframe)} /></label>
      <label>Timeframe<select aria-label={`Timeframe ${panel.id}`} value={timeframe} onChange={(event) => onChange(pair, event.target.value as Timeframe)}>{periods.map((item) => <option key={item}>{item}</option>)}</select></label>
      <button className="market-remove" onClick={onRemove}>Remove</button>
      <span className={`market-panel-status status-${state.toLowerCase()}`}><i />{connectionLabel(state)}</span>
    </div>
    <ErrorBox error={emptyBackend ? undefined : error} />
    <div className="market-history-state">{loading ? "Loading backend history…" : last ? <><span>Historical candles: {visible.length}</span><span>{last.isClosed ? "Closed candle" : "Forming candle"}</span></> : emptyBackend ? "No backend candles are available" : "No historical candles are available"}</div>
    <CandleVisual candles={visible} emptyLabel={`No candles for ${pair} · ${timeframe}`} />
    <div className="market-card-footer"><button onClick={() => void loadHistory()}>↻ Load 1000 historical candles</button><span><i className={state === "CONNECTED" ? "is-connected" : ""} />Live updates: {connectionLabel(state)}</span></div>
  </article>;
}

function MiniCandleGroup({ closed }: { closed?: boolean }) { return <div className={`mini-candle-group ${closed ? "closed" : "forming"}`}><i /><i /><i /><i /></div>; }

function UpdateLogic() {
  return <section className="market-side-card update-logic"><div className="market-side-title"><h2>Candle update logic</h2><span>ⓘ</span></div><div className="update-rule"><b>Forming candle → Update candle</b><div className="update-diagram"><MiniCandleGroup /><strong>→</strong><MiniCandleGroup /></div><p>Repeated timestamps update the existing candle.</p></div><div className="update-rule"><b>Closed candle → Append candle</b><div className="update-diagram"><MiniCandleGroup /><strong>→</strong><MiniCandleGroup closed /></div><p>A new timestamp appends a new candle.</p></div></section>;
}

export function MarketScreen() {
  const [panels, setPanels] = useState<ChartPanelState[]>(initialChartPanels);
  const [nextId, setNextId] = useState(5);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [states, setStates] = useState<Record<string, string>>({});
  const [ticks, setTicks] = useState<MarketTick[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>();
  const updatePanel = (id: string, pair: string, timeframe: Timeframe) => setPanels((items) => items.map((item) => item.id === id ? { ...item, pair, timeframe } : item));
  const updateState = (id: string, state: string) => setStates((current) => ({ ...current, [id]: state }));
  const addTick = (tick: MarketTick) => { setTicks((current) => [tick, ...current.filter((item) => item.timestamp !== tick.timestamp)].slice(0, 5)); setLastUpdate(tick.timestamp); };
  const summary = marketConnectionSummary(Object.values(states), realtimeEnabled);
  const primary = panels[0] ?? initialChartPanels[0];
  const applyPrimaryPair = (pair: string) => updatePanel(primary.id, pair.toUpperCase(), primary.timeframe);
  const applyPrimaryTimeframe = (timeframe: Timeframe) => updatePanel(primary.id, primary.pair, timeframe);
  return <div className="market-screen">
    <div className="market-header"><div><h1>Realtime Chart – Đa khung thời gian</h1><p>Backend candles and authenticated WebSocket updates, with independent controls for up to four charts.</p></div><div className="market-header-actions"><span className="market-source-pill"><i />Source: Backend API + WebSocket</span><button aria-label="Help" className="market-header-action">?</button><button aria-label="Notifications" className="market-header-action">♧<i /></button></div></div>
    <section className="market-controlbar"><label className="market-pair-control">Pair / Coin<input aria-label="Market pair" value={primary.pair} onChange={(event) => applyPrimaryPair(event.target.value)} /></label><div className="market-timeframe-control"><b>Timeframe</b><div>{topPeriods.map((item) => <button key={item} className={primary.timeframe === item ? "active" : ""} onClick={() => applyPrimaryTimeframe(item)}>{item}</button>)}</div></div><div className="market-realtime-control"><b>Realtime</b><button aria-label="Realtime toggle" aria-pressed={realtimeEnabled} className={`market-toggle ${realtimeEnabled ? "active" : ""}`} onClick={() => setRealtimeEnabled((value) => !value)}><i /></button></div><span className={`market-receiving-pill ${summary.tone}`}><i />{summary.label}</span><button className="market-add-chart" disabled={panels.length >= 4} onClick={() => { setPanels((items) => [...items, { id: `chart-${nextId}`, pair: "BTCUSDT", timeframe: periods[items.length] ?? "1h" }]); setNextId((id) => id + 1); }}>+ Add chart ({panels.length}/4)</button></section>
    <div className="market-layout"><div className="market-chart-grid">{panels.map((panel) => <LiveChart key={panel.id} panel={panel} realtimeEnabled={realtimeEnabled} onChange={(pair, timeframe) => updatePanel(panel.id, pair, timeframe)} onRemove={() => setPanels((items) => items.filter((item) => item.id !== panel.id))} onTick={addTick} onState={(state) => updateState(panel.id, state)} />)}</div><aside className="market-sidebar"><UpdateLogic /><section className="market-side-card connection-card"><div className="market-side-title"><h2>Connection status</h2><span className={`connection-pill ${summary.tone}`}><i />{summary.label}</span></div><dl><dt>Transport</dt><dd>Authenticated Socket.IO</dd><dt>Source</dt><dd>Backend market API</dd><dt>Last update</dt><dd>{lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "Waiting"}</dd></dl></section><section className="market-side-card recent-ticks"><div className="market-side-title"><h2>Recent Ticks ({primary.pair})</h2></div>{ticks.length ? <table><thead><tr><th>Time</th><th>Price</th><th>Volume</th><th>Side</th></tr></thead><tbody>{ticks.map((tick) => <tr key={`${tick.timestamp}-${tick.price}`}><td>{new Date(tick.timestamp).toLocaleTimeString()}</td><td>{tick.price.toLocaleString()}</td><td>—</td><td>—</td></tr>)}</tbody></table> : <div className="market-empty-side">Waiting for backend tick events.</div>}</section><section className="market-side-card market-legend"><div className="market-side-title"><h2>Legend</h2></div><p><i className="legend-up" />Positive candle <span>Close &gt; Open</span></p><p><i className="legend-down" />Negative candle <span>Close &lt; Open</span></p><p><i className="legend-volume" />Volume <span>Backend OHLCV</span></p><p className="legend-unavailable">Indicator overlays unavailable in the public market contract.</p></section></aside></div>
  </div>;
}
