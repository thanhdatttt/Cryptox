import React, { useEffect, useRef, useState } from "react";
import { ColorType, createChart, type CandlestickData, type HistogramData, type Time } from "lightweight-charts";
import { api, marketSocket, type ApiCandle, type MarketCapabilities, type MarketTick, type Timeframe } from "./api";
import { canAddChart, defaultMarketLayout, mergeCandle, nextChartId, type ChartPanelState, type MarketLayoutState } from "./state";

const periods: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];
const topPeriods: Timeframe[] = ["1m", "5m", "15m", "1h", "4h"];

const ErrorBox = ({ error }: { error: unknown }) => error ? <div className="market-error"><b>Unable to load market data</b><span>{error instanceof Error ? error.message : String(error)}</span></div> : null;

const chartTime = (timestamp: string): Time => Math.floor(Date.parse(timestamp) / 1_000) as Time;

function CandleVisual({ candles, emptyLabel }: { candles: ApiCandle[]; emptyLabel: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const candleSeriesRef = useRef<ReturnType<ReturnType<typeof createChart>["addCandlestickSeries"]>>();
  const volumeSeriesRef = useRef<ReturnType<ReturnType<typeof createChart>["addHistogramSeries"]>>();
  const chartRef = useRef<ReturnType<typeof createChart>>();
  const fittedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = createChart(container, {
      autoSize: true,
      height: 220,
      layout: { background: { type: ColorType.Solid, color: "#fcfdff" }, textColor: "#62728a", fontSize: 11 },
      grid: { vertLines: { color: "#f0f3f7" }, horzLines: { color: "#edf1f5" } },
      rightPriceScale: { borderColor: "#e6ebf2", scaleMargins: { top: 0.1, bottom: 0.26 } },
      timeScale: { borderColor: "#e6ebf2", timeVisible: true, secondsVisible: false },
    });
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#159a61",
      downColor: "#d84c61",
      borderVisible: false,
      wickUpColor: "#148e5b",
      wickDownColor: "#d54860",
      priceLineVisible: true,
      lastValueVisible: true,
    });
    const volumeSeries = chart.addHistogramSeries({
      color: "#55c994",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    return () => {
      chart.remove();
      chartRef.current = undefined;
      candleSeriesRef.current = undefined;
      volumeSeriesRef.current = undefined;
    };
  }, [candles.length > 0]);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (!candleSeries || !volumeSeries) return;
    const candleData: CandlestickData<Time>[] = candles.map((candle) => ({ time: chartTime(candle.timestamp), open: candle.open, high: candle.high, low: candle.low, close: candle.close }));
    const volumeData: HistogramData<Time>[] = candles.map((candle) => ({ time: chartTime(candle.timestamp), value: candle.volume, color: candle.close >= candle.open ? "#55c99488" : "#e58b9888" }));
    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);
    if (candleData.length && !fittedRef.current) {
      chartRef.current?.timeScale().fitContent();
      fittedRef.current = true;
    }
  }, [candles]);

  if (!candles.length) return <div className="market-empty-chart"><div className="empty-chart-grid" aria-hidden="true"><i /><i /><i /><i /></div><span className="empty-chart-icon">⌁</span><b>{emptyLabel}</b><small>The backend returned no candles for this pair/timeframe.</small></div>;
  const last = candles.at(-1)!;
  return <div className="market-candle-visual" aria-label="Backend candlestick visualization"><div ref={containerRef} className="market-lightweight-chart" role="img" aria-label="Interactive candlestick chart with volume" /><div className="market-chart-caption"><span>Historical candles: {candles.length}</span><span>Close {last.close.toLocaleString()}</span></div></div>;
}

function connectionLabel(state: string): string {
  if (state === "CONNECTED") return "Connected";
  if (state === "RECONNECTING") return "Reconnecting";
  if (state === "CONNECTING") return "Connecting";
  if (state === "PAUSED") return "Paused";
  if (state === "ERROR") return "Error";
  return state.toLowerCase();
}

function LiveChart({ panel, primary, realtimeEnabled, availablePairs, pairsReady, onChange, onRemove, onSelectPrimary, onTick, onState, onProvider, canRemove }: { panel: ChartPanelState; primary: boolean; realtimeEnabled: boolean; availablePairs: string[]; pairsReady: boolean; onChange: (pair: string, timeframe: Timeframe) => void; onRemove: () => void; onSelectPrimary: () => void; onTick: (tick: MarketTick) => void; onState: (state: string) => void; onProvider: (provider: string) => void; canRemove: boolean }) {
  const { pair, timeframe } = panel;
  const [candles, setCandles] = useState<ApiCandle[]>([]);
  const [state, setState] = useState("CONNECTING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const selectionRef = useRef(`${pair}|${timeframe}`);
  const reloadHistoryRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    let active = true;
    const selection = `${pair}|${timeframe}`;
    selectionRef.current = selection;
    const loadHistory = async () => {
      setLoading(true);
      try {
        const page = await api.candles(pair, timeframe);
        if (!active || selectionRef.current !== selection) return;
        setCandles(page.candles); setError(undefined);
      } catch (reason) {
        if (active && selectionRef.current === selection) setError(reason);
      } finally {
        if (active && selectionRef.current === selection) setLoading(false);
      }
    };
    reloadHistoryRef.current = () => { void loadHistory(); };
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
    }, updateState, [{ pair, timeframe }], { reconcile: loadHistory });
    void loadHistory();
    return () => { active = false; stop(); };
  }, [pair, timeframe, realtimeEnabled]);
  const last = candles.at(-1);
  const previous = candles.at(-2);
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
      <button type="button" className={`market-primary-button ${primary ? "active" : ""}`} aria-pressed={primary} onClick={onSelectPrimary}>{primary ? "Primary panel" : "Use as primary"}</button>
      <button type="button" className="market-remove" aria-label={`Remove chart ${panel.id}`} disabled={!canRemove} onClick={onRemove}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></svg><span>Remove chart</span></button>
      <span className={`market-panel-status status-${state.toLowerCase()}`}><i />{connectionLabel(state)}</span>
    </div>
    <ErrorBox error={emptyBackend ? undefined : error} />
    <div className="market-history-state">{loading ? "Loading backend history…" : last ? <><span>Historical candles: {candles.length}</span><span>{last.isClosed ? "Closed candle" : "Forming candle"}</span></> : emptyBackend ? "No backend candles are available" : "No historical candles are available"}</div>
    <CandleVisual key={`${pair}-${timeframe}`} candles={candles} emptyLabel={`No candles for ${pair} · ${timeframe}`} />
    <div className="market-card-footer"><button type="button" onClick={() => reloadHistoryRef.current()}>↻ Reload latest history</button><span><i className={state === "CONNECTED" ? "is-connected" : ""} />Live updates: {connectionLabel(state)}</span></div>
  </article>;
}

export const formatMarketQuantity = (quantity: number): string => quantity.toLocaleString("en-US", { maximumFractionDigits: 8 });
export const marketTickKey = (item: MarketTick): string => `${item.pair}|${item.timestamp}|${item.price}|${item.quantity}|${item.side}`;
export const recentMarketTicks = (ticks: MarketTick[], pair: string, limit = 8): MarketTick[] => [...new Map(ticks.filter((tick) => tick.pair === pair).map((tick) => [marketTickKey(tick), tick])).values()].sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp)).slice(0, limit);

export function tickEmptyState(summary: { tone: string; label: string }, capabilities: { loading: boolean; error?: unknown }): string {
  if (capabilities.error) return "Supported market pairs are unavailable; live trades cannot be confirmed.";
  if (summary.tone === "error") return "Live trades unavailable while the provider connection is in error.";
  if (summary.tone === "paused") return "Realtime is paused; no live trades are being received.";
  if (summary.tone === "pending") return "Waiting for authenticated live trade events.";
  if (capabilities.loading) return "Loading supported market pairs…";
  return "Connected; waiting for live trade events.";
}

export interface MarketScreenProps { layout: MarketLayoutState; onLayoutChange: (layout: MarketLayoutState) => void; }

export function MarketScreen({ layout, onLayoutChange }: MarketScreenProps) {
  const { panels, realtimeEnabled, primaryPanelId } = layout;
  const [states, setStates] = useState<Record<string, string>>({});
  const [ticks, setTicks] = useState<MarketTick[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>();
  const [provider, setProvider] = useState<string>();
  const [capabilities, setCapabilities] = useState<{ data?: MarketCapabilities; loading: boolean; error?: unknown }>({ loading: true });
  const primary = panels.find((panel) => panel.id === primaryPanelId) ?? panels[0] ?? defaultMarketLayout().panels[0]!;
  const availablePairs = capabilities.data?.pairs ?? [];
  const availableTimeframes = capabilities.data?.timeframes.filter((item) => topPeriods.includes(item)) ?? topPeriods;
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
    const stale = panels.some((panel) => !data.pairs.includes(panel.pair) || !data.timeframes.includes(panel.timeframe));
    if (!stale) return;
    const fallback = defaultMarketLayout();
    const fallbackTimeframes = data.timeframes.length ? data.timeframes : periods;
    const fallbackPair = data.pairs.includes("BTCUSDT") ? "BTCUSDT" : data.pairs[0]!;
    onLayoutChange({ ...fallback, panels: fallback.panels.map((panel, index) => ({ ...panel, pair: fallbackPair, timeframe: fallbackTimeframes[index] ?? fallbackTimeframes[0]! })) });
  }, [capabilities.data, panels, onLayoutChange]);
  useEffect(() => { setTicks([]); setLastUpdate(undefined); }, [primary.pair]);
  const updatePanel = (id: string, pair: string, timeframe: Timeframe) => onLayoutChange({ ...layout, panels: panels.map((item) => item.id === id ? { ...item, pair, timeframe } : item) });
  const updateState = (id: string, state: string) => setStates((current) => ({ ...current, [id]: state }));
  const removePanel = (id: string) => {
    const nextPanels = panels.filter((item) => item.id !== id);
    if (!nextPanels.length) return;
    onLayoutChange({ ...layout, panels: nextPanels, primaryPanelId: primaryPanelId === id ? nextPanels[0]!.id : primaryPanelId });
    setStates((current) => { const next = { ...current }; delete next[id]; return next; });
  };
  const addTick = (tick: MarketTick) => {
    if (tick.pair !== primary.pair) return;
    setTicks((current) => recentMarketTicks([...current, tick], primary.pair));
    setLastUpdate(tick.timestamp);
  };
  const summary = (() => {
    if (!realtimeEnabled) return { label: "Realtime paused", tone: "paused" as const };
    if (Object.values(states).some((state) => state === "ERROR" || state === "DISCONNECTED")) return { label: "Connection error", tone: "error" as const };
    if (Object.values(states).some((state) => state === "RECONNECTING")) return { label: "Reconnecting", tone: "pending" as const };
    if (Object.values(states).some((state) => state === "CONNECTING")) return { label: "Connecting", tone: "pending" as const };
    if (Object.values(states).length > 0 && Object.values(states).every((state) => state === "CONNECTED")) return { label: "Receiving data", tone: "connected" as const };
    return { label: "Waiting for connection", tone: "pending" as const };
  })();
  const providerId = capabilities.data?.provider ?? provider;
  const providerLabel = providerId === "BINANCE" ? "Binance public market data" : providerId ? `${providerId} market data` : capabilities.loading ? "Loading provider" : "Provider unavailable";
  const updatePrimary = (pair: string, timeframe: Timeframe) => updatePanel(primary.id, pair, timeframe);
  const addChart = () => { if (!canAddChart(panels)) return; const timeframe = availableTimeframes.find((item) => !panels.some((panel) => panel.timeframe === item)) ?? availableTimeframes[0] ?? "1h"; onLayoutChange({ ...layout, panels: [...panels, { id: nextChartId(panels), pair: availablePairs[0] ?? primary.pair, timeframe }] }); };
  return <div className="market-screen">
    <div className="market-header"><div><h1>Realtime Chart – Đa khung thời gian</h1><p>Backend candles and authenticated WebSocket updates, with independent controls for up to four charts.</p></div><div className="market-header-actions"><span className="market-source-pill"><i />Source: {providerLabel} · {summary.label}</span><button type="button" aria-label="Help" className="market-header-action">?</button><button type="button" aria-label="Notifications" className="market-header-action">♧<i /></button></div></div>
    <section className="market-controlbar"><label className="market-pair-control">Pair / Coin<select aria-label="Market pair" value={primary.pair} disabled={!pairsReady} onChange={(event) => updatePrimary(event.target.value, primary.timeframe)}>{(availablePairs.length ? availablePairs : [primary.pair]).map((item) => <option key={item}>{item}</option>)}</select></label><div className="market-timeframe-control"><b>Timeframe</b><div>{availableTimeframes.map((item) => <button type="button" key={item} className={primary.timeframe === item ? "active" : ""} onClick={() => updatePrimary(primary.pair, item)}>{item}</button>)}</div></div><div className="market-realtime-control"><b>Realtime</b><button type="button" aria-label="Realtime toggle" aria-pressed={realtimeEnabled} className={`market-toggle ${realtimeEnabled ? "active" : ""}`} onClick={() => onLayoutChange({ ...layout, realtimeEnabled: !realtimeEnabled })}><i /></button></div><span className={`market-receiving-pill ${summary.tone}`}><i />{summary.label}</span><button type="button" className="market-add-chart" disabled={!canAddChart(panels)} onClick={addChart}>+ Add chart ({panels.length}/4)</button></section>
    {capabilities.error ? <ErrorBox error={capabilities.error} /> : null}
    <div className="market-layout"><div className="market-chart-grid">{panels.map((panel) => <LiveChart key={panel.id} panel={panel} primary={panel.id === primary.id} realtimeEnabled={realtimeEnabled} availablePairs={availablePairs} pairsReady={pairsReady} onChange={(pair, timeframe) => updatePanel(panel.id, pair, timeframe)} onRemove={() => removePanel(panel.id)} onSelectPrimary={() => onLayoutChange({ ...layout, primaryPanelId: panel.id })} onTick={addTick} onState={(state) => updateState(panel.id, state)} onProvider={setProvider} canRemove={panels.length > 1} />)}</div><aside className="market-sidebar"><section className="market-side-card connection-card"><div className="market-side-title"><h2>Connection status</h2><span className={`connection-pill ${summary.tone}`}><i />{summary.label}</span></div><dl><dt>Transport</dt><dd>Authenticated Socket.IO</dd><dt>Provider</dt><dd>{providerLabel}</dd><dt>Last update</dt><dd>{lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "Waiting"}</dd></dl></section><section className="market-side-card recent-ticks"><div className="market-side-title"><h2>Recent Ticks ({primary.pair})</h2></div>{ticks.length ? <table><thead><tr><th>Time</th><th>Price</th><th>Quantity</th><th>Side</th></tr></thead><tbody>{ticks.map((tick) => <tr key={`${tick.pair}-${tick.timestamp}-${tick.price}-${tick.quantity}-${tick.side}`}><td>{new Date(tick.timestamp).toLocaleTimeString()}</td><td>{tick.price.toLocaleString()}</td><td>{formatMarketQuantity(tick.quantity)}</td><td><span className={`market-tick-side ${tick.side === "BUY" ? "buy" : "sell"}`}>{tick.side}</span></td></tr>)}</tbody></table> : <div className="market-empty-side">{tickEmptyState(summary, capabilities)}</div>}</section></aside></div>
  </div>;
}
