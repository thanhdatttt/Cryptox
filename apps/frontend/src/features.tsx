import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColorType, createChart, LineStyle, type CandlestickData, type HistogramData, type Time, type SeriesMarker } from "lightweight-charts";
import { api, type ApiCandle, type Candidate, type Composite, type DatasetSnapshotRef, type ExperimentSummary, type LeaderboardEntry, type SearchRankingEntry, type SearchRunSummary, type Scope, type StrategyDefinition, type Trade, type VisualizationMarker, type StrategyVisualizationOverlay, type Timeframe } from "./api";
import { persistSearchRunId, readSearchRunId, launchStrategyBacktest, navigateTo } from "./state";
import { chartBounds, percent } from "./visuals";

const Panel = ({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) => <section className={`panel ${className}`}>{title && <h2>{title}</h2>}{children}</section>;
const Btn = ({ children, primary, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) => <button {...props} className={`btn ${primary ? "primary" : ""}`}>{children}</button>;
function formatErrorMessage(error: unknown): string {
  if (!error) return "";
  const msg = error instanceof Error ? error.message : String(error);
  if (msg === "SNAPSHOT_INCOMPLETE") {
    return "Snapshot Incomplete (SNAPSHOT_INCOMPLETE): The selected strategy requires additional data (such as news sentiment or more warmup candles) that is not attached to this benchmark scope preset. Please choose a technical strategy (such as MA, RSI, Bollinger Bands, or Support/Resistance) that runs on price candles.";
  }
  if (msg === "BACKTEST_SCOPE_IN_USE") {
    return "Cannot delete scope preset because it is linked to existing backtests or search runs.";
  }
  if (msg.includes("HISTORY_INCOMPLETE") || msg.includes("missing candles")) {
    return "Historical Data Incomplete (HISTORY_INCOMPLETE): The requested date range extends into the future or beyond recorded historical candles. Backtesting requires closed historical price candles.";
  }
  if (msg.includes("aligned to the timeframe grid")) {
    return "Timestamp Misaligned: Selected dates must align with candle boundaries for this timeframe (e.g. 15-minute intervals for 15m).";
  }
  return msg;
}

const ErrorBox = ({ error }: { error: unknown }) => {
  if (!error) return null;
  return (
    <div className="error-box-container" style={{ margin: "10px 0" }}>
      <p className="error" role="alert" style={{ margin: 0, lineHeight: 1.5 }}>
        {formatErrorMessage(error)}
      </p>
    </div>
  );
};
const Loading = () => <p className="muted" aria-live="polite">Loading live backend data...</p>;
const Empty = ({ children }: { children: React.ReactNode }) => <p className="muted empty-state">{children}</p>;
const terminalCandidate = (status?: string) => status === "COMPLETED" || status === "FAILED" || status === "CANCELLED";
const terminalSearch = (state?: string) => state === "COMPLETED" || state === "FAILED" || state === "CANCELLED";

function overlayValues(overlays: StrategyVisualizationOverlay[]): number[] { return overlays.flatMap((overlay) => overlay.kind === "ZONE" ? overlay.points.flatMap((point) => [point.low, point.high]) : overlay.points.map((point) => point.value)); }
function pointX(time: string, candles: ApiCandle[], x: (index: number) => number): number | undefined { const index = candles.findIndex((candle) => candle.timestamp === time); return index >= 0 ? x(index) : undefined; }

export function CandleChart({ candles, overlays = [], markers = [], highlightTradeId }: { candles: ApiCandle[]; overlays?: StrategyVisualizationOverlay[]; markers?: VisualizationMarker[]; highlightTradeId?: string }) {
  const visible = candles.slice(-120); if (!visible.length) return <Empty>No backend candles are available for this view.</Empty>;
  const bounds = chartBounds(visible, overlayValues(overlays)); const maxVolume = Math.max(...visible.map((candle) => candle.volume), 1); const x = (index: number) => 16 + index * (768 / Math.max(visible.length - 1, 1)); const y = (value: number) => 16 + (bounds.max - value) / bounds.range * 190;
  const markerPosition = (time: string) => pointX(time, visible, x); const last = visible[visible.length - 1]!;
  return <div className="candle-visual" aria-label="Backend candlestick visualization"><svg viewBox="0 0 800 270" role="img" aria-label="Candlestick chart with volume and backend overlays">{[0, 1, 2, 3].map((line) => <line key={line} className="grid" x1="0" x2="800" y1={16 + line * 63} y2={16 + line * 63} />)}{overlays.map((overlay) => overlay.kind === "LINE" ? <polyline key={overlay.id} className="backend-overlay overlay-line" aria-label={overlay.label} points={overlay.points.map((point) => { const position = markerPosition(point.time); return position === undefined ? "" : `${position},${y(point.value)}`; }).filter(Boolean).join(" ")} /> : overlay.kind === "ZONE" ? <g key={overlay.id} className="backend-overlay overlay-zone" aria-label={overlay.label}>{overlay.points.map((point, index) => { const position = markerPosition(point.time); if (position === undefined) return null; const nextPosition = markerPosition(overlay.points[index + 1]?.time ?? "") ?? position + 8; return <rect key={`${overlay.id}-${point.time}`} x={position} y={y(point.high)} width={Math.max(2, nextPosition - position)} height={Math.max(1, y(point.low) - y(point.high))} />; })}</g> : <g key={overlay.id} className="backend-overlay overlay-signal" aria-label={overlay.label}>{overlay.points.map((point) => { const position = markerPosition(point.time); return position === undefined ? null : <g key={`${overlay.id}-${point.time}`}><circle cx={position} cy={y(point.value)} r="4" /><text x={position + 6} y={y(point.value) - 5}>{point.signal}</text></g>; })}</g>)}{visible.map((candle, index) => { const candleX = x(index); const bodyTop = y(Math.max(candle.open, candle.close)); const bodyHeight = Math.max(2, Math.abs(y(candle.open) - y(candle.close))); return <g key={candle.timestamp} className={candle.close >= candle.open ? "up" : "down"}><line className="wick" x1={candleX} x2={candleX} y1={y(candle.high)} y2={y(candle.low)} /><rect x={candleX - 3.5} y={bodyTop} width="7" height={bodyHeight} /><rect className={`volume-bar ${candle.close >= candle.open ? "volume-up" : "volume-down"}`} x={candleX - 3.5} y={252 - candle.volume / maxVolume * 42} width="7" height={Math.max(2, candle.volume / maxVolume * 42)} /></g>; })}{markers.map((marker) => { const position = markerPosition(marker.time); if (position === undefined) return null; const highlighted = marker.highlighted || marker.tradeId === highlightTradeId; return <g key={marker.id} className={`marker ${highlighted ? "highlighted" : ""}`}><circle cx={position} cy={y(marker.price)} r={highlighted ? 6 : 4} /><text x={position + 7} y={y(marker.price) - 5}>{marker.kind}</text></g>; })}</svg><div className="chart-legend"><span><i className="legend-up" />Positive candle</span><span><i className="legend-down" />Negative candle</span><span><i className="legend-volume" />Volume</span>{overlays.map((overlay) => <span key={overlay.id}><i className={`legend-overlay overlay-${overlay.kind.toLowerCase()}`} />{overlay.label}</span>)}{markers.length > 0 && <span><i className="legend-marker" />Backend trade marker</span>}</div><div className="market-chart-caption"><span>Historical candles: {candles.length}</span><span>Close {last.close.toLocaleString()}</span></div></div>;
}

function profitFactor(metrics: ExperimentSummary["metrics"]): string { if (metrics.profitFactor !== null && metrics.profitFactor !== undefined && Number.isFinite(metrics.profitFactor)) return metrics.profitFactor.toFixed(2); if (metrics.profitFactorStatus === "NO_LOSSES") return "∞ (NO_LOSSES)"; return metrics.profitFactorStatus ? `Unavailable (${metrics.profitFactorStatus})` : "Unavailable"; }
function displayTradeNumber(value: number | null | undefined): string { return value === null || value === undefined || !Number.isFinite(value) ? "Unavailable" : value.toLocaleString(); }
function attemptDurationMs(attempt: { durationMs?: number; startedAt?: string; completedAt?: string }): number | undefined {
  if (attempt.durationMs !== undefined && Number.isFinite(attempt.durationMs) && attempt.durationMs >= 0) return attempt.durationMs;
  if (!attempt.startedAt || !attempt.completedAt) return undefined;
  const durationMs = Date.parse(attempt.completedAt) - Date.parse(attempt.startedAt);
  return Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : undefined;
}
function formatBacktestDuration(value: number | undefined): string { return value === undefined ? "—" : `${Math.round(value)} ms`; }
function candidateDurations(candidate?: Candidate): Array<{ attemptNumber: number; durationMs: number }> {
  return (candidate?.attempts ?? []).flatMap((attempt) => { const durationMs = attemptDurationMs(attempt); return durationMs === undefined ? [] : [{ attemptNumber: attempt.attemptNumber, durationMs }]; });
}

export function ExperimentDetail({ id }: { id: string }) {
  const [highlightTradeId, setHighlightTradeId] = useState<string>(); const [tradeCursors, setTradeCursors] = useState<Array<string | undefined>>([undefined]); const [replayJobId, setReplayJobId] = useState<string>(); const currentCursor = tradeCursors[tradeCursors.length - 1];
  const summary = useQuery({ queryKey: ["experiments", id], queryFn: () => api.experiment(id) }); const trades = useQuery({ queryKey: ["experiments", id, "trades", currentCursor], queryFn: () => api.experimentTrades(id, { limit: 25, cursor: currentCursor }) }); const visual = useQuery({ queryKey: ["experiments", id, "visualization", highlightTradeId], queryFn: () => api.visualization(id, highlightTradeId ? { highlightTradeId } : {}), enabled: Boolean(summary.data) }); const replay = useMutation({ mutationFn: () => api.replay(id), onSuccess: (accepted) => setReplayJobId(accepted.replayJobId) }); const replayStatus = useQuery({ queryKey: ["replay-verifications", replayJobId], queryFn: () => api.replayStatus(replayJobId!), enabled: Boolean(replayJobId), refetchInterval: (query) => { const state = query.state.data?.status; return state === "MATCH" || state === "MISMATCH" || state === "NON_REPLAYABLE" ? false : 1500; } });
  useEffect(() => { setTradeCursors([undefined]); setHighlightTradeId(undefined); }, [id]);
  if (summary.isLoading) return <Loading />; if (summary.error) return <ErrorBox error={summary.error} />; const result = summary.data; if (!result) return <Empty>Experiment is unavailable.</Empty>; const metrics = result.metrics;
  const page = trades.data; const totalCount = page?.totalCount ?? page?.total; const rangeStart = page ? (tradeCursors.length - 1) * 25 + 1 : 0; const rangeEnd = page ? rangeStart + page.items.length - 1 : 0; const canNext = Boolean(page?.nextCursor); const nextPage = () => { if (page?.nextCursor) setTradeCursors((current) => [...current, page.nextCursor]); }; const previousPage = () => setTradeCursors((current) => current.length > 1 ? current.slice(0, -1) : current); const selectTrade = (trade: Trade) => setHighlightTradeId(trade.id);
  const replayState = replayStatus.data ?? (replayJobId ? { status: "QUEUED" as const } : undefined);
  return <Panel title={`Experiment ${id}`} className="experiment-panel"><div className="metric-grid"><div><b>Total return</b><strong>{percent(metrics.totalReturnPercent)}</strong></div><div><b>Win rate</b><strong>{percent(metrics.winRatePercent)}</strong></div><div><b>Max drawdown</b><strong>{percent(metrics.maxDrawdownPercent)}</strong></div><div><b>Trades</b><strong>{metrics.numberOfTrades ?? totalCount ?? "Unavailable"}</strong></div><div><b>Profit factor</b><strong>{profitFactor(metrics)}</strong></div><div><b>Sharpe ratio</b><strong>{metrics.sharpeRatio === undefined ? "Unavailable" : metrics.sharpeRatio.toFixed(2)}</strong></div><div><b>Rank eligibility</b><strong>{result.rankEligible ? "Eligible" : `Not eligible${result.rankEligibilityReason ? ` · ${result.rankEligibilityReason}` : ""}`}</strong></div><div><b>Total profit</b><strong>{displayTradeNumber(result.totalProfitAmount)}</strong></div><div><b>Ending equity</b><strong>{displayTradeNumber(result.endingEquity)}</strong></div><div><b>Wins / losses</b><strong>{result.wins ?? "Unavailable"} / {result.losses ?? "Unavailable"}</strong></div><div><b>Breakevens</b><strong>{result.breakevens ?? "Unavailable"}</strong></div><div><b>Drawdown amount</b><strong>{displayTradeNumber(result.maxDrawdownAmount)}</strong></div><div><b>Score</b><strong>{displayTradeNumber(result.overallScore)}</strong></div></div><p className="muted">Strategy: {result.strategyDefinitions?.map((item) => `${item.strategyName} v${item.version}`).join(", ") || "Unavailable"} · Composite: {result.compositeDefinitionId ?? "Unavailable"} · Scope: {result.leaderboardScopeId} · Formula: {result.scoreFormulaId ?? "Unavailable"}</p><div className="provenance-grid"><span><b>Execution policy</b>{result.executionPolicy?.policyId ?? "Unavailable"} · {result.executionPolicy?.sha256 ?? "No retained policy"}</span><span><b>Benchmark</b>{result.benchmark?.pair ?? result.datasetSnapshot?.pair ?? "Unavailable"} · {result.benchmark?.timeframe ?? result.datasetSnapshot?.timeframe ?? "Unavailable"}</span><span><b>Simulator</b>{result.simulatorVersion ?? "Unavailable"} · {result.simulatorSha256 ?? "Unavailable"}</span><span><b>Sentiment input</b>{result.sentimentDatasetSnapshot?.id ?? "None attached"} · {result.sentimentDatasetSnapshot?.sha256 ?? ""}</span></div><div className="toolbar"><Btn onClick={() => replay.mutate()} disabled={replay.isPending}>{replay.isPending ? "Queueing..." : "Verify replay"}</Btn></div>{replayState && <p className={replayState.status === "NON_REPLAYABLE" ? "error" : "success"}>Replay {replayState.status}{"comparedTradeCount" in replayState ? `: ${replayState.comparedTradeCount} trades compared.` : replayJobId ? ` · job ${replayJobId}` : ""}</p>}{visual.isLoading ? <Loading /> : visual.error ? <ErrorBox error={visual.error} /> : visual.data && <div className="visualization"><p className="success">Sealed visualization: {visual.data.candles.length} candles · {visual.data.overlays.length} overlays · {visual.data.markers.length} markers.</p><CandleChart candles={visual.data.candles} overlays={visual.data.overlays} markers={visual.data.markers} highlightTradeId={highlightTradeId} /></div>}<h3>Trade detail</h3>{trades.isLoading ? <Loading /> : trades.error ? <ErrorBox error={trades.error} /> : !page?.items.length ? <Empty>No trades returned by the backend.</Empty> : <><p className="muted">Showing {rangeStart}-{rangeEnd} · total {totalCount ?? "Unavailable from backend"}</p><div className="table-scroll"><table><thead><tr><th>#</th><th>Pair</th><th>Entry</th><th>Exit</th><th>Side</th><th>Market prices</th><th>SL / TP</th><th>Qty / notional</th><th>Equity before / after</th><th>Fees / slippage</th><th>Reason</th><th>Profit</th><th>Result</th><th /></tr></thead><tbody>{page.items.map((trade) => <tr key={trade.id} className={highlightTradeId === trade.id ? "selected" : ""}><td>{trade.sequence}</td><td>{trade.pair}</td><td>{trade.entryTime}<br />{displayTradeNumber(trade.entryPrice)}</td><td>{trade.exitTime}<br />{displayTradeNumber(trade.exitPrice)}</td><td><span className={trade.signal === "LONG" ? "long" : "short"}>{trade.signal}</span></td><td>{displayTradeNumber(trade.marketEntryPrice)} / {displayTradeNumber(trade.marketExitPrice)}</td><td>{trade.stopLoss ?? "Unavailable"} / {trade.takeProfit ?? "Unavailable"}</td><td>{displayTradeNumber(trade.quantity)} / {displayTradeNumber(trade.notionalEntryValue)}</td><td>{displayTradeNumber(trade.equityBeforeTrade)} / {displayTradeNumber(trade.equityAfterTrade)}</td><td>{displayTradeNumber(trade.feeAmount)} / {displayTradeNumber(trade.slippageAmount)}</td><td>{trade.exitReason ?? "Unavailable"}</td><td className={trade.profit === undefined ? "" : trade.profit >= 0 ? "positive" : "negative"}>{displayTradeNumber(trade.profit)}</td><td>{trade.result} · {displayTradeNumber(trade.resultPercent)}%</td><td><button className="link-button" onClick={() => selectTrade(trade)}>Highlight</button></td></tr>)}</tbody></table></div><div className="toolbar trade-pagination"><Btn onClick={previousPage} disabled={tradeCursors.length <= 1}>Previous</Btn><Btn onClick={nextPage} disabled={!canNext}>Next</Btn></div></>}</Panel>;
}

const chartTime = (timestamp: string): Time => Math.floor(Date.parse(timestamp) / 1_000) as Time;

function computeSMA(candles: ApiCandle[], period: number): Array<{ time: Time; value: number }> {
  const result: Array<{ time: Time; value: number }> = [];
  if (candles.length < period) return result;
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j]!.close;
    }
    result.push({
      time: chartTime(candles[i]!.timestamp),
      value: Number((sum / period).toFixed(2)),
    });
  }
  return result;
}

function findNearestCandleTime(timeStr: string, candles: ApiCandle[]): Time {
  const targetSec = Math.floor(Date.parse(timeStr) / 1_000);
  if (!candles.length) return targetSec as Time;
  let closest = candles[0]!;
  let minDiff = Math.abs(Math.floor(Date.parse(closest.timestamp) / 1_000) - targetSec);
  for (let i = 1; i < candles.length; i++) {
    const cSec = Math.floor(Date.parse(candles[i]!.timestamp) / 1_000);
    const diff = Math.abs(cSec - targetSec);
    if (diff < minDiff) {
      minDiff = diff;
      closest = candles[i]!;
    }
  }
  return Math.floor(Date.parse(closest.timestamp) / 1_000) as Time;
}

export function BacktestCandleChart({
  candles,
  pair,
  timeframe,
  trades = [],
  overlays = [],
  highlightTradeId,
  isBacktestResult,
  isRunning,
  onClear,
}: {
  candles: ApiCandle[];
  pair: string;
  timeframe: string;
  trades?: Trade[];
  overlays?: StrategyVisualizationOverlay[];
  highlightTradeId?: string;
  isBacktestResult: boolean;
  isRunning?: boolean;
  onClear?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart>>();
  const candleSeriesRef = useRef<ReturnType<ReturnType<typeof createChart>["addCandlestickSeries"]>>();
  const volumeSeriesRef = useRef<ReturnType<ReturnType<typeof createChart>["addHistogramSeries"]>>();
  const ma20SeriesRef = useRef<ReturnType<ReturnType<typeof createChart>["addLineSeries"]>>();
  const ma50SeriesRef = useRef<ReturnType<ReturnType<typeof createChart>["addLineSeries"]>>();
  const priceLinesRef = useRef<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Indicators for badges
  const ma20Data = React.useMemo(() => computeSMA(candles, 20), [candles]);
  const ma50Data = React.useMemo(() => computeSMA(candles, 50), [candles]);
  const latestMa20 = ma20Data.length ? ma20Data[ma20Data.length - 1]!.value : null;
  const latestMa50 = ma50Data.length ? ma50Data[ma50Data.length - 1]!.value : null;

  const { supportPrice, resistancePrice } = React.useMemo(() => {
    if (!candles.length) return { supportPrice: null, resistancePrice: null };
    const slice = candles.slice(-80);
    const minLow = Math.min(...slice.map((c) => c.low));
    const maxHigh = Math.max(...slice.map((c) => c.high));
    return { supportPrice: minLow, resistancePrice: maxHigh };
  }, [candles]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      height: 330,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#64748b",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#f1f5f9" },
        horzLines: { color: "#f1f5f9" },
      },
      rightPriceScale: {
        borderColor: "#e2e8f0",
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor: "#e2e8f0",
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: Time, tickMarkType: number) => {
          const timestamp = typeof time === "number" ? time * 1000 : new Date(time as string).getTime();
          // Display in UTC+7 (Vietnam Time)
          const date = new Date(timestamp + 7 * 3600 * 1000);
          const day = date.getUTCDate();
          const month = date.getUTCMonth() + 1;
          const hours = String(date.getUTCHours()).padStart(2, "0");
          const minutes = String(date.getUTCMinutes()).padStart(2, "0");

          // TickMarkType: 0 = Year, 1 = Month, 2 = DayOfMonth
          if (tickMarkType <= 2) {
            return `${day}/${month}`;
          }
          return `${hours}:${minutes}`;
        },
      },
      localization: {
        timeFormatter: (time: number) => {
          const d = new Date(time * 1000 + 7 * 3600 * 1000);
          const day = d.getUTCDate();
          const month = d.getUTCMonth() + 1;
          const hours = String(d.getUTCHours()).padStart(2, "0");
          const minutes = String(d.getUTCMinutes()).padStart(2, "0");
          return `${day}/${month} ${hours}:${minutes}`;
        },
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderVisible: false,
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
      priceLineVisible: true,
      lastValueVisible: true,
    });

    const volumeSeries = chart.addHistogramSeries({
      color: "#10b981",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const ma20Series = chart.addLineSeries({
      color: "#2563eb",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ma50Series = chart.addLineSeries({
      color: "#f59e0b",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    ma20SeriesRef.current = ma20Series;
    ma50SeriesRef.current = ma50Series;
    priceLinesRef.current = [];

    return () => {
      chart.remove();
      chartRef.current = undefined;
      candleSeriesRef.current = undefined;
      volumeSeriesRef.current = undefined;
      ma20SeriesRef.current = undefined;
      ma50SeriesRef.current = undefined;
      priceLinesRef.current = [];
    };
  }, []);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const ma20Series = ma20SeriesRef.current;
    const ma50Series = ma50SeriesRef.current;
    const chart = chartRef.current;
    if (!candleSeries || !volumeSeries || !ma20Series || !ma50Series || !chart) return;

    if (!candles.length) {
      candleSeries.setData([]);
      volumeSeries.setData([]);
      ma20Series.setData([]);
      ma50Series.setData([]);
      return;
    }

    const candleData: CandlestickData<Time>[] = candles.map((c) => ({
      time: chartTime(c.timestamp),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData: HistogramData<Time>[] = candles.map((c) => ({
      time: chartTime(c.timestamp),
      value: c.volume,
      color: c.close >= c.open ? "rgba(22, 163, 74, 0.45)" : "rgba(220, 38, 38, 0.45)",
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);
    ma20Series.setData(ma20Data);
    ma50Series.setData(ma50Data);

    // Clean previous price lines
    priceLinesRef.current.forEach((line) => {
      try {
        candleSeries.removePriceLine(line);
      } catch {
        // Line already cleared
      }
    });
    priceLinesRef.current = [];

    // Support and resistance lines
    if (supportPrice !== null && resistancePrice !== null) {
      try {
        const sLine = candleSeries.createPriceLine({
          price: supportPrice,
          color: "#16a34a",
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `Support: ${supportPrice.toLocaleString()}`,
        });
        const rLine = candleSeries.createPriceLine({
          price: resistancePrice,
          color: "#dc2626",
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `Resistance: ${resistancePrice.toLocaleString()}`,
        });
        priceLinesRef.current.push(sLine, rLine);
      } catch {
        // Ignore price line creation error
      }
    }

    // Trade markers (LONG entry, SHORT entry, Exit)
    if (trades.length > 0) {
      const markers: SeriesMarker<Time>[] = [];
      trades.forEach((trade) => {
        if (!trade.entryTime) return;
        const entryT = findNearestCandleTime(trade.entryTime, candles);
        const isSelected = highlightTradeId === trade.id;

        if (trade.signal === "LONG") {
          markers.push({
            time: entryT,
            position: "belowBar",
            color: isSelected ? "#047857" : "#16a34a",
            shape: "arrowUp",
            text: isSelected ? `★ LONG #${trade.sequence} ($${trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : "",
            size: isSelected ? 2 : 1,
          });
          if (trade.exitTime) {
            const exitT = findNearestCandleTime(trade.exitTime, candles);
            markers.push({
              time: exitT,
              position: "aboveBar",
              color: isSelected ? "#1d4ed8" : "#3b82f6",
              shape: "circle",
              text: isSelected ? `★ Exit #${trade.sequence} (${(trade.profit ?? 0) >= 0 ? "+" : ""}${(trade.profit ?? 0).toFixed(2)})` : "",
              size: isSelected ? 2 : 1,
            });
          }
        } else {
          markers.push({
            time: entryT,
            position: "aboveBar",
            color: isSelected ? "#991b1b" : "#dc2626",
            shape: "arrowDown",
            text: isSelected ? `★ SHORT #${trade.sequence} ($${trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : "",
            size: isSelected ? 2 : 1,
          });
          if (trade.exitTime) {
            const exitT = findNearestCandleTime(trade.exitTime, candles);
            markers.push({
              time: exitT,
              position: "belowBar",
              color: isSelected ? "#1d4ed8" : "#3b82f6",
              shape: "circle",
              text: isSelected ? `★ Exit #${trade.sequence} (${(trade.profit ?? 0) >= 0 ? "+" : ""}${(trade.profit ?? 0).toFixed(2)})` : "",
              size: isSelected ? 2 : 1,
            });
          }
        }
      });

      markers.sort((a, b) => Number(a.time) - Number(b.time));
      candleSeries.setMarkers(markers);
    } else {
      candleSeries.setMarkers([]);
    }

    // Highlight specific trade TP/SL price lines
    if (highlightTradeId) {
      const targetTrade = trades.find((t) => t.id === highlightTradeId);
      if (targetTrade) {
        if (targetTrade.stopLoss) {
          const slLine = candleSeries.createPriceLine({
            price: targetTrade.stopLoss,
            color: "#dc2626",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `SL: ${targetTrade.stopLoss.toLocaleString()}`,
          });
          priceLinesRef.current.push(slLine);
        }
        if (targetTrade.takeProfit) {
          const tpLine = candleSeries.createPriceLine({
            price: targetTrade.takeProfit,
            color: "#16a34a",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `TP: ${targetTrade.takeProfit.toLocaleString()}`,
          });
          priceLinesRef.current.push(tpLine);
        }
      }
    }

    chart.timeScale().fitContent();
  }, [candles, ma20Data, ma50Data, supportPrice, resistancePrice, trades, highlightTradeId]);

  return (
    <article className={`backtest-chart-card ${isFullscreen ? "is-fullscreen" : ""}`}>
      <div className="backtest-card-header">
        <div className="backtest-card-title-group">
          <h3>Backtest Chart{isBacktestResult ? ` (${pair || "Pair"} · ${timeframe || "Timeframe"})` : ""}</h3>
        </div>
        <div className="backtest-chart-badges">
          {isBacktestResult && latestMa20 !== null && (
            <span className="chart-badge ma20">MA(20) {latestMa20.toLocaleString()}</span>
          )}
          {isBacktestResult && latestMa50 !== null && (
            <span className="chart-badge ma50">MA(50) {latestMa50.toLocaleString()}</span>
          )}
          {isBacktestResult && supportPrice !== null && (
            <span className="chart-badge support">Support {supportPrice.toLocaleString()}</span>
          )}
          {isBacktestResult && resistancePrice !== null && (
            <span className="chart-badge resistance">Resistance {resistancePrice.toLocaleString()}</span>
          )}
          {isBacktestResult && onClear && (
            <button
              type="button"
              className="btn-chart-clear"
              title="Clear backtest graph and results"
              onClick={onClear}
            >
              ✕ Clear Graph
            </button>
          )}
          <button
            type="button"
            className="btn-chart-action"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? "✕" : "⛶"}
          </button>
        </div>
      </div>

      <div className="backtest-chart-body">
        <div ref={containerRef} className="backtest-lightweight-container" />
        {isRunning ? (
          <div className="chart-empty-overlay">
            <span style={{ fontSize: "32px" }}>⚡</span>
            <b style={{ fontSize: "14px", color: "#1e293b", margin: "6px 0 2px" }}>Simulating Backtest Run...</b>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", maxWidth: "320px", lineHeight: "1.4" }}>
              Backend worker is simulating ticks and strategy orders. Graph will plot automatically on completion.
            </p>
          </div>
        ) : !candles.length ? (
          <div className="chart-empty-overlay">
            <span style={{ fontSize: "32px" }}>📊</span>
            <b style={{ fontSize: "14px", color: "#1e293b", margin: "6px 0 2px" }}>No Backtest Data Loaded</b>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", maxWidth: "320px", lineHeight: "1.4" }}>
              Configure your strategy above and click <b>🚀 Run Backtest</b> to simulate orders and generate the graph.
            </p>
          </div>
        ) : null}
      </div>

      <div className="backtest-chart-footer">
        <span>{isBacktestResult ? `Historical Candles: ${candles.length}` : "No Active Run"}</span>
        <span>
          {isBacktestResult
            ? `✓ Showing Backtest Simulation (${trades.length} Executed Trades)`
            : isRunning
            ? "⚡ Worker Simulating..."
            : "Run a backtest to display simulation graph"}
        </span>
      </div>
    </article>
  );
}

function getPaginationRange(current: number, total: number): Array<number | "..."> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export function BacktestTradesTableCard({
  trades,
  totalCount,
  highlightTradeId,
  onSelectTrade,
  pageSize,
  onPageSizeChange,
  pageIndex,
  totalPages,
  onGoToPage,
  onNextPage,
  onPrevPage,
  isLoading,
}: {
  trades: Trade[];
  totalCount?: number;
  highlightTradeId?: string;
  onSelectTrade: (trade: Trade) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  pageIndex: number;
  totalPages: number;
  onGoToPage: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  isLoading?: boolean;
}) {
  const displayTotal = totalCount ?? trades.length;
  const startIdx = displayTotal > 0 ? pageIndex * pageSize + 1 : 0;
  const endIdx = displayTotal > 0 ? Math.min(startIdx + trades.length - 1, displayTotal) : 0;

  return (
    <article className="backtest-trades-card">
      <div className="backtest-card-header">
        <div className="backtest-card-title-group">
          <h3>Trade Execution List</h3>
        </div>
        <span className="muted" style={{ fontSize: "11.5px" }}>
          {displayTotal > 0 ? `${displayTotal} Total Trades` : "No trades"}
        </span>
      </div>

      <div className="trades-table-wrap">
        {isLoading ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p className="muted">Loading trade executions...</p>
          </div>
        ) : !trades.length ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <span style={{ fontSize: "28px" }}>📋</span>
            <p style={{ margin: "10px 0 4px", fontWeight: 700, color: "#1e293b", fontSize: "13px" }}>
              No Trade Executions Yet
            </p>
            <p className="muted" style={{ fontSize: "12px", maxWidth: "280px", margin: "0 auto" }}>
              Run a backtest using the controls above to populate simulated strategy entries, exits, and PnL.
            </p>
          </div>
        ) : (
          <table className="backtest-trades-table">
            <thead>
              <tr>
                <th style={{ width: "30px" }}>#</th>
                <th>Time</th>
                <th>Side</th>
                <th>Entry Price</th>
                <th>Stop Loss</th>
                <th>Take Profit</th>
                <th>Exit Price</th>
                <th>Delta</th>
                <th>Profit (USD)</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const isSelected = highlightTradeId === trade.id;
                const profit = trade.profit ?? 0;
                const isPositive = profit >= 0;
                // Delta is price difference directional to position
                const delta = (trade.exitPrice - trade.entryPrice) * (trade.signal === "LONG" ? 1 : -1);
                const isDeltaPositive = delta >= 0;

                // Format trade entry time in UTC+7 (Vietnam Time)
                const tradeLocal = new Date(new Date(trade.entryTime).getTime() + 7 * 3600 * 1000);
                const tradeTimeStr = `${String(tradeLocal.getUTCMonth() + 1).padStart(2, "0")}-${String(tradeLocal.getUTCDate()).padStart(2, "0")} ${String(tradeLocal.getUTCHours()).padStart(2, "0")}:${String(tradeLocal.getUTCMinutes()).padStart(2, "0")}`;

                return (
                  <tr
                    key={trade.id}
                    className={isSelected ? "selected" : ""}
                    onClick={() => onSelectTrade(trade)}
                    title="Click to highlight trade on chart"
                  >
                    <td><b>{trade.sequence}</b></td>
                    <td>{tradeTimeStr}</td>
                    <td>
                      <span className={`trade-side-pill ${trade.signal === "LONG" ? "long" : "short"}`}>
                        {trade.signal}
                      </span>
                    </td>
                    <td>{trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{trade.stopLoss ? trade.stopLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</td>
                    <td>{trade.takeProfit ? trade.takeProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</td>
                    <td>{trade.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>
                      <span className={`trade-profit-val ${isDeltaPositive ? "positive" : "negative"}`}>
                        {isDeltaPositive ? "+" : ""}{delta.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span className={`trade-profit-val ${isPositive ? "positive" : "negative"}`}>
                        {isPositive ? "+" : ""}{profit.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="trades-pagination-footer">
        <div className="pagination-left">
          <span>Show</span>
          <select
            className="pagination-size-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>{displayTotal > 0 ? `${startIdx}–${endIdx} of ${displayTotal} trades` : "0 trades"}</span>
        </div>

        <div className="pagination-right">
          <button
            type="button"
            className="btn-page-nav"
            disabled={pageIndex === 0}
            onClick={onPrevPage}
            title="Previous Page"
          >
            ‹
          </button>
          {getPaginationRange(pageIndex + 1, totalPages).map((item, idx) =>
            item === "..." ? (
              <span key={`ellipsis-${idx}`} className="pagination-ellipsis">…</span>
            ) : (
              <button
                key={item}
                type="button"
                className={`btn-page-nav ${item === pageIndex + 1 ? "active" : ""}`}
                onClick={() => onGoToPage(item - 1)}
              >
                {item}
              </button>
            )
          )}
          <button
            type="button"
            className="btn-page-nav"
            disabled={pageIndex >= totalPages - 1}
            onClick={onNextPage}
            title="Next Page"
          >
            ›
          </button>
        </div>
      </div>
    </article>
  );
}

function MiniWinrateGauge({ winrate }: { winrate: number }) {
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, winrate));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <svg width={22} height={22} viewBox="0 0 22 22" className="winrate-mini-gauge">
      <circle
        cx={11}
        cy={11}
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={3}
      />
      {clamped > 0 && (
        <circle
          cx={11}
          cy={11}
          r={radius}
          fill="none"
          stroke="#16a34a"
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 11 11)"
        />
      )}
    </svg>
  );
}

function MiniEquitySparkline({ trades, isProfit }: { trades?: Trade[]; isProfit: boolean }) {
  const width = 48;
  const height = 18;

  if (!trades || trades.length < 2) {
    const color = isProfit ? "#86efac" : "#fca5a5";
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="stat-mini-sparkline">
        <line x1="2" y1={height / 2} x2={width - 2} y2={height / 2} stroke={color} strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round" />
      </svg>
    );
  }

  let sum = 0;
  const pts = [0];
  for (const t of trades.slice(0, 30)) {
    sum += t.profit ?? 0;
    pts.push(sum);
  }

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;

  const pathD = pts
    .map((val, idx) => {
      const x = 2 + (idx / (pts.length - 1)) * (width - 4);
      const y = height - 2 - ((val - min) / range) * (height - 4);
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const color = isProfit ? "#16a34a" : "#dc2626";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="stat-mini-sparkline">
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MiniTradesBarGraphic({ count }: { count: number }) {
  const heights = [4, 7, 11, 8, 14, 10, 14];
  return (
    <div className="stat-mini-bars">
      {heights.map((h, i) => (
        <div
          key={i}
          className="stat-mini-bar-col"
          style={{ height: `${h}px`, opacity: count > 0 ? 0.4 + (i / heights.length) * 0.6 : 0.25 }}
        />
      ))}
    </div>
  );
}

export function BacktestStatsGrid({
  summary,
  trades = [],
  candidate,
}: {
  summary?: ExperimentSummary;
  trades?: Trade[];
  candidate?: Candidate;
}) {
  const metrics = summary?.metrics;
  const winrate = metrics?.winRatePercent ?? 0;
  const wins = summary?.wins ?? 0;
  const losses = summary?.losses ?? 0;
  const totalTrades = metrics?.numberOfTrades ?? (wins + losses + (summary?.breakevens ?? 0));
  const totalProfit = summary?.totalProfitAmount ?? 0;
  const totalReturn = metrics?.totalReturnPercent ?? 0;
  const maxDrawdownAmount = summary?.maxDrawdownAmount ?? 0;
  const maxDrawdownPercent = metrics?.maxDrawdownPercent ?? 0;
  const latestDuration = candidateDurations(candidate).at(-1)?.durationMs;

  const isProfitPositive = totalProfit >= 0;

  return (
    <div className="backtest-stats-grid">
      {/* 1. Winrate */}
      <div className="backtest-stat-card">
        <span className="stat-card-title">Winrate</span>
        <span className="stat-card-value">
          {summary ? `${winrate.toFixed(2)}%` : "0.00%"}
        </span>
        <div className="stat-card-footer">
          <span className="stat-card-subtext">{wins} / {totalTrades}</span>
          <MiniWinrateGauge winrate={winrate} />
        </div>
      </div>

      {/* 2. Wins */}
      <div className="backtest-stat-card">
        <span className="stat-card-title">Wins</span>
        <span className="stat-card-value green">{wins}</span>
        <div className="stat-card-footer">
          <span className="stat-card-subtext">Total winning trades</span>
        </div>
      </div>

      {/* 3. Losses */}
      <div className="backtest-stat-card">
        <span className="stat-card-title">Losses</span>
        <span className="stat-card-value red">{losses}</span>
        <div className="stat-card-footer">
          <span className="stat-card-subtext">Total losing trades</span>
        </div>
      </div>

      {/* 4. Total Profit */}
      <div className="backtest-stat-card">
        <span className="stat-card-title">Total Profit</span>
        <span className={`stat-card-value ${isProfitPositive ? "green" : "red"}`}>
          {summary
            ? `${isProfitPositive ? "+" : ""}${Number(totalProfit.toFixed(2)).toLocaleString()} USD`
            : "+0.00 USD"}
        </span>
        <div className="stat-card-footer">
          <span className={`stat-card-subtext ${isProfitPositive ? "green" : "red"}`}>
            {isProfitPositive ? "+" : ""}{totalReturn.toFixed(2)}%
          </span>
          <MiniEquitySparkline trades={trades} isProfit={isProfitPositive} />
        </div>
      </div>

      {/* 5. Max Drawdown */}
      <div className="backtest-stat-card">
        <span className="stat-card-title">Max Drawdown</span>
        <span className="stat-card-value red">
          {summary ? `-${Math.abs(maxDrawdownAmount).toFixed(2)} USD` : "-0.00 USD"}
        </span>
        <div className="stat-card-footer">
          <span className="stat-card-subtext red">
            -{Math.abs(maxDrawdownPercent).toFixed(2)}%
          </span>
          <MiniEquitySparkline trades={trades} isProfit={false} />
        </div>
      </div>

      {/* 6. Total Trades */}
      <div className="backtest-stat-card">
        <span className="stat-card-title">Total Trades</span>
        <span className="stat-card-value">{totalTrades}</span>
        <div className="stat-card-footer">
          <span className="stat-card-subtext">100% Executed</span>
          <MiniTradesBarGraphic count={totalTrades} />
        </div>
      </div>

      {/* 7. Backtest duration */}
      <div className="backtest-stat-card">
        <span className="stat-card-title">Backtest Duration</span>
        <span className="stat-card-value">{formatBacktestDuration(latestDuration)}</span>
        <div className="stat-card-footer">
          <span className="stat-card-subtext">Latest completed attempt</span>
        </div>
      </div>
    </div>
  );
}

function DeleteScopeModal({
  scope,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: {
  scope: Scope;
  isDeleting: boolean;
  error?: unknown;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isDeleting]);

  return (
    <div className="cryptox-modal-overlay" onClick={() => !isDeleting && onClose()}>
      <div className="cryptox-delete-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <div className="delete-modal-icon-badge">
            <span>🗑️</span>
          </div>
          <div className="delete-modal-title-group">
            <h3>Delete Scope Preset</h3>
            <span className="delete-type-pill badge-scope">Scope Preset</span>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            disabled={isDeleting}
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="delete-modal-body">
          {Boolean(error) && (
            <div className="delete-modal-error-banner">
              <span className="error-banner-icon">🔒</span>
              <div className="error-banner-text">
                <strong>Cannot Delete Preset</strong>
                <p>
                  This benchmark scope preset is locked because it is linked to completed backtest runs or leaderboard results. To preserve immutable audit history and leaderboard ranking integrity, presets with existing backtests cannot be deleted.
                </p>
              </div>
            </div>
          )}
          <p className="delete-warning-text">
            Are you sure you want to delete <b className="delete-target-highlight">"{scope.name || scope.id}"</b>?
          </p>
          <p className="delete-meta-info">
            {scope.pair} · {scope.timeframe} · Initial Capital: ${Number(scope.initialCapital).toLocaleString()} · Fee: {scope.feeRatePercent}% · Slippage: {scope.slippageBps} bps
          </p>
          <div className="delete-notice-box">
            <span className="notice-icon">⚠️</span>
            <span>
              This will permanently delete this benchmark scope preset along with its linked backtest runs, experiments, and leaderboard entries.
            </span>
          </div>
        </div>

        <div className="delete-modal-footer">
          <button
            type="button"
            className="btn-modal-cancel"
            disabled={isDeleting}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-modal-confirm-delete"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? "⏳ Deleting..." : "🗑️ Yes, Delete Preset"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SaveScopeModal({
  defaultName,
  strategyName,
  pair,
  timeframe,
  from,
  to,
  capital,
  fee,
  slippage,
  isSaving,
  onClose,
  onConfirm,
}: {
  defaultName: string;
  strategyName?: string;
  pair: string;
  timeframe: string;
  from: string;
  to: string;
  capital: string;
  fee: string;
  slippage: string;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}) {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSaving]);

  return (
    <div className="cryptox-modal-overlay" onClick={() => !isSaving && onClose()}>
      <div className="cryptox-delete-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <div className="delete-modal-icon-badge" style={{ background: "#dbeafe", borderColor: "#bfdbfe" }}>
            <span>💾</span>
          </div>
          <div className="delete-modal-title-group">
            <h3>Save Scope Preset</h3>
            <span className="delete-type-pill badge-scope">New Preset</span>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            disabled={isSaving}
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onConfirm(name.trim());
          }}
        >
          <div className="delete-modal-body">
            <div className="scope-modal-input-group">
              <label className="scope-modal-input-label">Preset Name</label>
              <input
                type="text"
                className="scope-modal-text-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. BTC 1h 2026 Q3 Benchmark"
                autoFocus
                required
              />
            </div>
            <p className="delete-meta-info">
              {strategyName ? <span><b>Strategy:</b> {strategyName} · </span> : null}
              {pair} · {timeframe} · From: {from.replace("T", " ")} · To: {to.replace("T", " ")} · Capital: ${Number(capital).toLocaleString()} · Fee: {fee}% · Slippage: {slippage} bps
            </p>
          </div>

          <div className="delete-modal-footer">
            <button
              type="button"
              className="btn-modal-cancel"
              disabled={isSaving}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-modal-confirm-save"
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? "⏳ Saving..." : "💾 Save Preset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function toUtc7InputString(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() + 7 * 3600 * 1000);
  return local.toISOString().slice(0, 16);
}

function fromUtc7InputDate(value: string): Date {
  const clean = value.trim();
  if (!clean) return new Date(NaN);
  const [d, t] = clean.split("T");
  if (!d || !t) return new Date(NaN);
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  const utcMs = Date.UTC(y, m - 1, day, hh - 7, mm);
  return new Date(utcMs);
}

export function BacktestLive({ definitions, composites, scopes }: { definitions: StrategyDefinition[]; composites: Composite[]; scopes: Scope[] }) {
  const client = useQueryClient();
  const capabilities = useQuery({ queryKey: ["market", "capabilities"], queryFn: api.marketCapabilities });
  const [pair, setPair] = useState("");
  const [timeframe, setTimeframe] = useState<Timeframe | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [capital, setCapital] = useState("");
  const [feeRatePercent, setFeeRatePercent] = useState("");
  const [slippageBps, setSlippageBps] = useState("");
  const [scopeId, setScopeId] = useState("");
  const [definitionId, setDefinitionId] = useState("");
  const [compositeId, setCompositeId] = useState("");
  const [candidateId, setCandidateId] = useState<string>();
  const [error, setError] = useState<unknown>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingScope, setIsCreatingScope] = useState(false);
  const [isDeletingScope, setIsDeletingScope] = useState(false);
  const [scopeSuccessMessage, setScopeSuccessMessage] = useState<string | null>(null);
  const [scopeToDelete, setScopeToDelete] = useState<Scope | null>(null);
  const [deleteModalError, setDeleteModalError] = useState<unknown>();
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [activeExperimentId, setActiveExperimentId] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem("cryptox_latest_backtest_experiment_id") || undefined;
    } catch {
      return undefined;
    }
  });
  const [highlightTradeId, setHighlightTradeId] = useState<string | undefined>();
  const [pageSize, setPageSize] = useState<number>(10);
  const [tradePageIndex, setTradePageIndex] = useState<number>(0);
  const [tradeCursorStack, setTradeCursorStack] = useState<Array<string | undefined>>([undefined]);

  const customNamesMap: Record<string, string> = React.useMemo(() => {
    try {
      const raw = localStorage.getItem("cryptox_strategy_custom_names_v1");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [definitions, composites]);

  const newsQuery = useQuery({ queryKey: ["news"], queryFn: api.news });
  const selectedSingle = definitions.find((d) => d.id === definitionId);
  const selectedComposite = composites.find((c) => c.id === compositeId);
  const currentSelectedStratName = definitionId
    ? (customNamesMap[definitionId] ?? selectedSingle?.familyName ?? selectedSingle?.strategyName ?? "Strategy")
    : compositeId
    ? (customNamesMap[compositeId] ?? (selectedComposite?.method === "MAJORITY_VOTE" ? "Majority Vote Ensemble" : "Weighted Scoring Ensemble"))
    : undefined;
  const requiresSentiment = Boolean(
    (selectedSingle && (selectedSingle.strategyName === "SENTIMENT" || selectedSingle.familyName?.toLowerCase().includes("sentiment"))) ||
    (selectedComposite && selectedComposite.components.some((comp) => {
      const def = definitions.find((d) => d.id === comp.strategyDefinitionId);
      return def && (def.strategyName === "SENTIMENT" || def.familyName?.toLowerCase().includes("sentiment"));
    }))
  );

  const baseAsset = pair ? pair.replace(/(USDT|BUSD|USDC|USD|EUR)$/i, "").trim().toUpperCase() : "";

  const sentimentCoverage = React.useMemo(() => {
    if (!newsQuery.data || !baseAsset) return null;
    const matchingNews = newsQuery.data.filter((item) => {
      const coins = item.relatedCoins ?? [];
      const matchesCoin = coins.includes(baseAsset) || item.title.toUpperCase().includes(baseAsset);
      return matchesCoin && item.sentiment;
    });
    if (matchingNews.length === 0) return null;
    const timestamps = matchingNews
      .map((item) => new Date(item.publishedAt).getTime())
      .filter((t) => !isNaN(t))
      .sort((a, b) => a - b);
    if (timestamps.length === 0) return null;
    const minTime = timestamps[0]!;
    const maxTime = timestamps[timestamps.length - 1]!;
    return {
      count: matchingNews.length,
      fromIso: new Date(minTime).toISOString(),
      toIso: new Date(maxTime).toISOString(),
    };
  }, [newsQuery.data, baseAsset]);

  useEffect(() => {
    if (capabilities.data) {
      setPair((current) => capabilities.data!.pairs.includes(current) ? current : capabilities.data!.pairs[0] ?? "");
      setTimeframe((current) => capabilities.data!.timeframes.includes(current as Timeframe) ? current : capabilities.data!.timeframes[0] ?? "");
      const defaults = capabilities.data.policyDefaults;
      if (defaults) {
        setCapital((current) => current || String(defaults.initialCapital ?? "10000"));
        setFeeRatePercent((current) => current || String(defaults.feeRatePercent ?? "0.1"));
        setSlippageBps((current) => current || String(defaults.slippageBps ?? "5"));
      }
    }
  }, [capabilities.data]);

  useEffect(() => {
    if (!scopeId && scopes.length > 0 && !from && !to) {
      const first = scopes[0]!;
      setScopeId(first.id);
      setPair(first.pair);
      setTimeframe(first.timeframe);
      if (first.datasetRange?.from) setFrom(toUtc7InputString(first.datasetRange.from));
      if (first.datasetRange?.to) setTo(toUtc7InputString(first.datasetRange.to));
      setCapital(String(first.initialCapital));
      setFeeRatePercent(String(first.feeRatePercent));
      setSlippageBps(String(first.slippageBps));
    }
  }, [scopes, scopeId, from, to]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("cryptox_selected_backtest_strategy");
      if (stored) {
        sessionStorage.removeItem("cryptox_selected_backtest_strategy");
        const parsed = JSON.parse(stored) as { type: "single" | "composite"; id: string };
        if (parsed.type === "single") {
          setDefinitionId(parsed.id);
          setCompositeId("");
          return;
        } else if (parsed.type === "composite") {
          setCompositeId(parsed.id);
          setDefinitionId("");
          return;
        }
      }
    } catch {
      // ignore
    }

    if (!definitionId && !compositeId) {
      if (definitions.length) {
        setDefinitionId(definitions[0]!.id);
      } else if (composites.length) {
        setCompositeId(composites[0]!.id);
      }
    }
  }, [definitions, composites, definitionId, compositeId]);

  useEffect(() => {
    const handleSelectStrat = (e: Event) => {
      const detail = (e as CustomEvent<{ type: "single" | "composite"; id: string }>).detail;
      if (detail?.type === "single") {
        setDefinitionId(detail.id);
        setCompositeId("");
      } else if (detail?.type === "composite") {
        setCompositeId(detail.id);
        setDefinitionId("");
      }
    };
    window.addEventListener("cryptox:select-backtest-strategy", handleSelectStrat);
    return () => window.removeEventListener("cryptox:select-backtest-strategy", handleSelectStrat);
  }, []);

  const cancel = useMutation({
    mutationFn: () => candidateId ? api.cancelBacktest(candidateId) : Promise.reject(new Error("No manual candidate is active.")),
    onSuccess: () => {
      if (candidateId) void client.invalidateQueries({ queryKey: ["backtests", candidateId] });
    },
    onError: setError,
  });

  const candidate = useQuery({
    queryKey: ["backtests", candidateId],
    queryFn: () => api.candidate(candidateId!),
    enabled: Boolean(candidateId),
    refetchInterval: (query) => terminalCandidate(query.state.data?.status) ? false : 1500,
  });
  const currentCandidate = candidate.data;

  // Automatically bind experimentResultId when candidate completes
  useEffect(() => {
    if (currentCandidate?.status === "COMPLETED" && currentCandidate.experimentResultId) {
      setActiveExperimentId(currentCandidate.experimentResultId);
      try {
        localStorage.setItem("cryptox_latest_backtest_experiment_id", currentCandidate.experimentResultId);
      } catch {}
      setTradePageIndex(0);
      setTradeCursorStack([undefined]);
      setHighlightTradeId(undefined);
    }
  }, [currentCandidate?.status, currentCandidate?.experimentResultId]);

  const handleClearGraph = () => {
    setActiveExperimentId(undefined);
    setCandidateId(undefined);
    setHighlightTradeId(undefined);
    setTradePageIndex(0);
    setTradeCursorStack([undefined]);
    try {
      localStorage.removeItem("cryptox_latest_backtest_experiment_id");
    } catch {}
  };

  // Query experiment summary
  const experimentSummary = useQuery({
    queryKey: ["experiments", activeExperimentId],
    queryFn: () => api.experiment(activeExperimentId!),
    enabled: Boolean(activeExperimentId),
  });

  // Query all experiment trades with pagination
  const experimentTrades = useQuery({
    queryKey: ["experiments", activeExperimentId, "trades-all"],
    queryFn: async () => {
      let items: Trade[] = [];
      let cursor: string | undefined = undefined;
      let total = 0;
      let pageCount = 0;
      do {
        pageCount++;
        const res = await api.experimentTrades(activeExperimentId!, { limit: 100, cursor });
        if (!res.items || res.items.length === 0) break;
        items = items.concat(res.items);
        total = res.totalCount ?? res.total ?? items.length;
        cursor = res.nextCursor;
      } while (cursor && items.length < total && pageCount < 20);
      return { items, totalCount: total };
    },
    enabled: Boolean(activeExperimentId),
    retry: 2,
  });

  // Query experiment visualization across the full backtest scope range
  const experimentVisual = useQuery({
    queryKey: ["experiments", activeExperimentId, "visualization", highlightTradeId],
    queryFn: async () => {
      let allCandles: ApiCandle[] = [];
      let allOverlays: StrategyVisualizationOverlay[] = [];
      let allMarkers: VisualizationMarker[] = [];
      let cursor: string | undefined = undefined;
      let datasetSnapshot: DatasetSnapshotRef | undefined = undefined;
      let pageCount = 0;

      do {
        pageCount++;
        const res = await api.visualization(activeExperimentId!, {
          limit: 2000,
          cursor,
          ...(highlightTradeId ? { highlightTradeId } : {}),
        });
        datasetSnapshot = res.datasetSnapshot || datasetSnapshot;
        if (res.candles && res.candles.length > 0) {
          allCandles = allCandles.concat(res.candles);
        }
        if (pageCount === 1) {
          allOverlays = res.overlays || [];
          allMarkers = res.markers || [];
        }
        cursor = res.nextCursor;
      } while (cursor && pageCount < 10);

      // Sort and deduplicate candles by timestamp for lightweight-charts stability
      allCandles.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const seenTimes = new Set<number>();
      const dedupedCandles: ApiCandle[] = [];
      for (const c of allCandles) {
        const sec = Math.floor(new Date(c.timestamp).getTime() / 1000);
        if (!seenTimes.has(sec)) {
          seenTimes.add(sec);
          dedupedCandles.push(c);
        }
      }

      return {
        experimentId: activeExperimentId!,
        datasetSnapshot,
        candles: dedupedCandles,
        overlays: allOverlays,
        markers: allMarkers,
      };
    },
    enabled: Boolean(activeExperimentId),
  });

  const displayedCandles = activeExperimentId ? (experimentVisual.data?.candles ?? []) : [];

  const allTrades = experimentTrades.data?.items ?? [];
  const totalTradesCount = experimentTrades.data?.totalCount ?? allTrades.length;
  const totalPages = Math.max(1, Math.ceil(totalTradesCount / pageSize));
  const displayedTrades = allTrades.slice(tradePageIndex * pageSize, (tradePageIndex + 1) * pageSize);

  const handleNextTradePage = () => {
    if (tradePageIndex < totalPages - 1) {
      setTradePageIndex((prev) => prev + 1);
      setHighlightTradeId(undefined);
    }
  };

  const handlePrevTradePage = () => {
    if (tradePageIndex > 0) {
      setTradePageIndex((prev) => prev - 1);
      setHighlightTradeId(undefined);
    }
  };

  const handleGoToTradePage = (targetPage: number) => {
    const clamped = Math.max(0, Math.min(targetPage, totalPages - 1));
    setTradePageIndex(clamped);
    setHighlightTradeId(undefined);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setTradePageIndex(0);
    setHighlightTradeId(undefined);
  };

  const pairs = capabilities.data?.pairs ?? [];
  const timeframes = capabilities.data?.timeframes ?? [];

  const handleOpenSavePresetModal = () => {
    setError(undefined);
    setScopeSuccessMessage(null);
    try {
      if (!pair || !pair.trim()) throw new Error("Please select a trading pair.");
      if (!timeframe || !timeframe.trim()) throw new Error("Please select a timeframe.");
      if (!from || !from.trim()) throw new Error("Please specify a start date and time (From).");
      if (!to || !to.trim()) throw new Error("Please specify an end date and time (To).");
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (isNaN(fromDate.getTime())) throw new Error("The specified From date/time is invalid.");
      if (isNaN(toDate.getTime())) throw new Error("The specified To date/time is invalid.");
      if (fromDate.getTime() >= toDate.getTime()) throw new Error("The start date (From) must be before the end date (To).");
      const numCapital = Number(capital);
      if (!capital || !capital.trim() || isNaN(numCapital) || numCapital <= 0) throw new Error("Initial Capital must be a positive number greater than 0.");
      if (!definitionId && !compositeId) throw new Error("Please select a strategy or composite ensemble before saving a preset.");
      const numFee = Number(feeRatePercent);
      if (feeRatePercent === "" || isNaN(numFee) || numFee < 0) throw new Error("Transaction Cost (%) must be a valid number 0 or greater.");
      const numSlippage = Number(slippageBps);
      if (slippageBps === "" || isNaN(numSlippage) || !Number.isInteger(numSlippage) || numSlippage < 0) throw new Error("Slippage must be a non-negative whole number in basis points (e.g. 5 bps).");

      setIsSaveModalOpen(true);
    } catch (err) {
      setError(err);
    }
  };

  const handleExecuteSaveScope = async (presetName: string) => {
    setError(undefined);
    setScopeSuccessMessage(null);
    setIsCreatingScope(true);
    try {
      if (!definitionId && !compositeId) throw new Error("Please select a strategy or composite ensemble before saving a preset.");
      const fromDate = fromUtc7InputDate(from);
      const toDate = fromUtc7InputDate(to);
      const numCapital = Number(capital);
      const numFee = Number(feeRatePercent);
      const numSlippage = Number(slippageBps);

      const market = await api.candles(pair, timeframe as Timeframe);
      if (!market.candles.length) throw new Error(`No market data candles available for ${pair} (${timeframe}).`);

      const TIMEFRAME_MS: Record<string, number> = {
        "1m": 60 * 1000,
        "5m": 5 * 60 * 1000,
        "15m": 15 * 60 * 1000,
        "1h": 60 * 60 * 1000,
        "4h": 4 * 60 * 60 * 1000,
        "1d": 24 * 60 * 60 * 1000,
      };
      const intervalMs = TIMEFRAME_MS[timeframe] || 60 * 1000;
      const alignedFromMs = Math.floor(fromDate.getTime() / intervalMs) * intervalMs;
      let alignedToMs = Math.floor(toDate.getTime() / intervalMs) * intervalMs;
      if (toDate.getTime() % intervalMs !== 0) {
        const ceiledToMs = Math.ceil(toDate.getTime() / intervalMs) * intervalMs;
        if (ceiledToMs <= Date.now()) {
          alignedToMs = ceiledToMs;
        }
      }
      if (alignedToMs <= alignedFromMs) {
        alignedToMs = alignedFromMs + intervalMs;
      }
      const fromIso = new Date(alignedFromMs).toISOString();
      const toIso = new Date(alignedToMs).toISOString();

      const created = await api.createScope({
        name: presetName,
        pair,
        timeframe,
        from: fromIso,
        to: toIso,
        initialCapital: numCapital,
        feeRatePercent: numFee,
        slippageBps: numSlippage,
      });
      setScopeId(created.id);
      setIsSaveModalOpen(false);
      void client.invalidateQueries({ queryKey: ["scopes"] });
      setScopeSuccessMessage(`Scope preset "${created.name || created.id}" created successfully.`);
    } catch (err) {
      setError(err);
    } finally {
      setIsCreatingScope(false);
    }
  };

  const handleConfirmDeleteScope = async () => {
    if (!scopeToDelete) return;
    setError(undefined);
    setDeleteModalError(undefined);
    setScopeSuccessMessage(null);
    setIsDeletingScope(true);
    try {
      await api.deleteScope(scopeToDelete.id);
      setScopeId("");
      const deletedName = scopeToDelete.name || scopeToDelete.id;
      setScopeToDelete(null);
      handleClearGraph();
      void client.invalidateQueries({ queryKey: ["scopes"] });
      void client.invalidateQueries({ queryKey: ["experiments"] });
      setScopeSuccessMessage(`Scope preset "${deletedName}" and its linked runs deleted successfully.`);
    } catch (err) {
      setDeleteModalError(err);
    } finally {
      setIsDeletingScope(false);
    }
  };

  const handleRunBacktest = async () => {
    setError(undefined);
    setScopeSuccessMessage(null);
    setIsProcessing(true);
    try {
      if (!definitionId && !compositeId) {
        throw new Error("Please select a strategy or composite ensemble to test.");
      }

      let activeScopeId = scopeId;

      // If no scope preset is chosen (Auto-Create / Custom), validate fields and create scope
      if (!activeScopeId) {
        if (!pair || !pair.trim()) throw new Error("Please select a trading pair.");
        if (!timeframe || !timeframe.trim()) throw new Error("Please select a timeframe.");
        if (!from || !from.trim() || !to || !to.trim()) throw new Error("Please specify both From and To dates.");
        const fromDate = fromUtc7InputDate(from);
        const toDate = fromUtc7InputDate(to);
        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) throw new Error("The specified date range is invalid.");
        if (fromDate.getTime() >= toDate.getTime()) throw new Error("The start date (From) must be before the end date (To).");
        if (toDate.getTime() > Date.now()) throw new Error("The 'To date' cannot be in the future. Backtesting requires recorded historical market candles.");
        const initialCapital = Number(capital);
        if (!capital || isNaN(initialCapital) || initialCapital <= 0) throw new Error("Initial Capital must be a positive number greater than 0.");
        const fee = Number(feeRatePercent);
        if (feeRatePercent === "" || isNaN(fee) || fee < 0) throw new Error("Transaction cost (%) must be 0 or greater.");
        const slippage = Number(slippageBps);
        if (slippageBps === "" || isNaN(slippage) || !Number.isInteger(slippage) || slippage < 0) throw new Error("Slippage must be a non-negative whole number.");

        const market = await api.candles(pair, timeframe as Timeframe);
        if (!market.candles.length) throw new Error(`No market data candles available for ${pair} (${timeframe}).`);
        // Automatically snap/align timestamps to the timeframe grid so user never suffers from minute misalignment
        const TIMEFRAME_MS: Record<string, number> = {
          "1m": 60 * 1000,
          "5m": 5 * 60 * 1000,
          "15m": 15 * 60 * 1000,
          "1h": 60 * 60 * 1000,
          "4h": 4 * 60 * 60 * 1000,
          "1d": 24 * 60 * 60 * 1000,
        };
        const intervalMs = TIMEFRAME_MS[timeframe] || 60 * 1000;
        const alignedFromMs = Math.floor(fromDate.getTime() / intervalMs) * intervalMs;
        let alignedToMs = Math.floor(toDate.getTime() / intervalMs) * intervalMs;
        if (toDate.getTime() % intervalMs !== 0) {
          const ceiledToMs = Math.ceil(toDate.getTime() / intervalMs) * intervalMs;
          if (ceiledToMs <= Date.now()) {
            alignedToMs = ceiledToMs;
          }
        }
        if (alignedToMs <= alignedFromMs) {
          alignedToMs = alignedFromMs + intervalMs;
        }

        const fromIso = new Date(alignedFromMs).toISOString();
        const toIso = new Date(alignedToMs).toISOString();

        // Ensure unique name to avoid Postgres unique constraint collision
        const baseName = `${pair} ${timeframe} ${fromIso.slice(0, 10)}`;
        let uniqueName = baseName;
        let suffix = 2;
        while (scopes.some((s) => s.name === uniqueName)) {
          uniqueName = `${baseName} (${suffix++})`;
        }

        const created = await api.createScope({
          name: uniqueName,
          pair,
          timeframe,
          from: fromIso,
          to: toIso,
          initialCapital,
          feeRatePercent: fee,
          slippageBps: slippage,
        });
        activeScopeId = created.id;
        setScopeId(created.id);
        void client.invalidateQueries({ queryKey: ["scopes"] });
      }

      const selectedComposite = composites.find((item) => item.id === compositeId);
      const selectedDefinition = definitions.find((item) => item.id === definitionId);

      let candidateResult: Candidate;
      if (selectedDefinition) {
        candidateResult = await api.startBacktest({
          leaderboardScopeId: activeScopeId,
          strategyDefinitionIds: [selectedDefinition.id],
          selectionMode: "SINGLE",
          maxAttempts: capabilities.data?.policyDefaults?.maxAttempts,
        });
      } else {
        const ids = selectedComposite!.components.map((c) => c.strategyDefinitionId);
        candidateResult = await api.startBacktest({
          leaderboardScopeId: activeScopeId,
          strategyDefinitionIds: ids,
          selectionMode: "COMPOSITE",
          compositeDefinitionId: selectedComposite!.id,
          maxAttempts: capabilities.data?.policyDefaults?.maxAttempts,
        });
      }
      setCandidateId(candidateResult.candidateId);
    } catch (err) {
      setError(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentScope = scopes.find((s) => s.id === scopeId);

  return (
    <>
      <div className="heading">
        <div>
          <h1>Backtest &amp; Trade Results</h1>
          <p>Select coin, test period, capital, strategy and evaluate performance</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="status">
            <i />
            Data source: Binance API + WebSocket
          </span>
        </div>
      </div>

      {capabilities.isLoading ? <Loading /> : capabilities.error ? <ErrorBox error={capabilities.error} /> : null}

      {/* Top Clean Control Bar (matching reference layout) */}
      <div className="backtest-top-bar">
        <div className="backtest-controls-row">
          {/* 1. Pair / Coin */}
          <div className="backtest-field-item field-pair">
            <label className="backtest-label">Pair / Coin</label>
            <div className="backtest-select-wrapper">
              <span className="coin-icon">
                {pair.startsWith("BTC") ? "₿" : pair.startsWith("ETH") ? "Ξ" : pair.startsWith("SOL") ? "◎" : "🪙"}
              </span>
              <select
                value={pair}
                onChange={(e) => {
                  setPair(e.target.value);
                  if (scopeId) setScopeId("");
                }}
              >
                {pairs.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Timeframe */}
          <div className="backtest-field-item field-timeframe">
            <label className="backtest-label">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => {
                setTimeframe(e.target.value as Timeframe);
                if (scopeId) setScopeId("");
              }}
            >
              {timeframes.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          {/* 3. From date */}
          <div className="backtest-field-item field-date">
            <label className="backtest-label">From date (UTC)</label>
            <input
              type="datetime-local"
              max={new Date().toISOString().slice(0, 16)}
              value={from ? (from.length === 10 ? `${from}T00:00` : from.slice(0, 16)) : ""}
              onChange={(e) => {
                setFrom(e.target.value);
                if (scopeId) setScopeId("");
              }}
            />
          </div>

          {/* 4. To date */}
          <div className="backtest-field-item field-date">
            <label className="backtest-label">To date (UTC)</label>
            <input
              type="datetime-local"
              max={new Date().toISOString().slice(0, 16)}
              value={to ? (to.length === 10 ? `${to}T23:59` : to.slice(0, 16)) : ""}
              onChange={(e) => {
                setTo(e.target.value);
                if (scopeId) setScopeId("");
              }}
            />
          </div>

          {/* 5. Capital (USD) */}
          <div className="backtest-field-item field-capital">
            <label className="backtest-label">Capital (USD)</label>
            <div className="backtest-input-with-suffix">
              <input
                type="number"
                min="1"
                step="any"
                value={capital}
                onChange={(e) => {
                  setCapital(e.target.value);
                  if (scopeId) setScopeId("");
                }}
                placeholder="10000"
              />
              <span className="input-suffix">USD</span>
            </div>
          </div>

          {/* 6. Strategy */}
          <div className="backtest-field-item field-strategy">
            <label className="backtest-label">Strategy</label>
            <select
              value={definitionId ? `single:${definitionId}` : compositeId ? `composite:${compositeId}` : ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith("single:")) {
                  setDefinitionId(val.replace("single:", ""));
                  setCompositeId("");
                } else if (val.startsWith("composite:")) {
                  setCompositeId(val.replace("composite:", ""));
                  setDefinitionId("");
                } else {
                  setDefinitionId("");
                  setCompositeId("");
                }
              }}
            >
              <option value="">Select strategy...</option>
              {definitions.length > 0 && (
                <optgroup label="Single Strategies">
                  {definitions.map((d) => (
                    <option key={d.id} value={`single:${d.id}`}>
                      {customNamesMap[d.id] ?? d.familyName ?? d.strategyName} (v{d.version})
                    </option>
                  ))}
                </optgroup>
              )}
              {composites.length > 0 && (
                <optgroup label="Composite Ensembles">
                  {composites.map((c) => (
                    <option key={c.id} value={`composite:${c.id}`}>
                      🔀 {customNamesMap[c.id] ?? (c.method === "MAJORITY_VOTE" ? "Majority Vote Ensemble" : "Weighted Scoring Ensemble")} ({c.components.length} components)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* 7. Transaction Cost */}
          <div className="backtest-field-item field-fee">
            <label className="backtest-label">Transaction Cost</label>
            <div className="backtest-input-with-suffix">
              <input
                type="number"
                min="0"
                step="any"
                value={feeRatePercent}
                onChange={(e) => {
                  setFeeRatePercent(e.target.value);
                  if (scopeId) setScopeId("");
                }}
                placeholder="0.1"
              />
              <span className="input-suffix">%</span>
            </div>
          </div>

          {/* 8. Slippage */}
          <div className="backtest-field-item field-slippage">
            <label className="backtest-label">Slippage</label>
            <div className="backtest-input-with-suffix">
              <input
                type="number"
                min="0"
                step="1"
                value={slippageBps}
                onChange={(e) => {
                  setSlippageBps(e.target.value);
                  if (scopeId) setScopeId("");
                }}
                placeholder="5"
              />
              <span className="input-suffix">bps</span>
            </div>
          </div>
        </div>

        {/* Sentiment Strategy Range Guidance Banner */}
        {requiresSentiment && (
          <div className="sentiment-guidance-banner">
            <div className="sentiment-guidance-info">
              <span className="sentiment-guidance-icon">📰</span>
              <div>
                <strong>News Sentiment Strategy Active:</strong> Requires recorded news sentiment for <b>{baseAsset || "this asset"}</b>.
                {sentimentCoverage ? (
                  <span> Available in database: <b>{toUtc7InputString(sentimentCoverage.fromIso).replace("T", " ")}</b> to <b>{toUtc7InputString(sentimentCoverage.toIso).replace("T", " ")}</b> ({sentimentCoverage.count} evaluated articles).</span>
                ) : (
                  <span className="sentiment-coverage-warning"> No evaluated news found for {baseAsset}. Please crawl news for this coin in the News tab first.</span>
                )}
              </div>
            </div>
            {sentimentCoverage && (
              <button
                type="button"
                className="btn-align-sentiment-range"
                onClick={() => {
                  setFrom(toUtc7InputString(sentimentCoverage.fromIso));
                  setTo(toUtc7InputString(sentimentCoverage.toIso));
                  if (scopeId) setScopeId("");
                }}
                title="Align start and end dates to match the available news window"
              >
                📅 Align to Available News
              </button>
            )}
          </div>
        )}

        {/* Sub-bar: Scope Preset selector + Run Button */}
        <div className="backtest-sub-bar">
          <div className="scope-preset-group">
            <span className="scope-preset-label">Scope Preset:</span>
            <select
              className="scope-preset-select"
              value={scopeId}
              onChange={(e) => {
                const selectedId = e.target.value;
                setScopeId(selectedId);
                setScopeSuccessMessage(null);
                setError(undefined);
                const found = scopes.find((s) => s.id === selectedId);
                if (found) {
                  setPair(found.pair);
                  setTimeframe(found.timeframe);
                  if (found.datasetRange?.from) setFrom(toUtc7InputString(found.datasetRange.from));
                  if (found.datasetRange?.to) setTo(toUtc7InputString(found.datasetRange.to));
                  setCapital(String(found.initialCapital));
                  setFeeRatePercent(String(found.feeRatePercent));
                  setSlippageBps(String(found.slippageBps));
                }
              }}
            >
              <option value="">⚙️ Auto-Create / Custom</option>
              {scopes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || `${s.pair} · ${s.timeframe} · $${s.initialCapital}`}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-create-scope-preset"
              disabled={isCreatingScope || isProcessing || isDeletingScope || (!definitionId && !compositeId)}
              onClick={handleOpenSavePresetModal}
              title={(!definitionId && !compositeId) ? "Please select a strategy first before saving a preset" : "Save current top-bar parameters as a new scope preset"}
            >
              {isCreatingScope ? "⏳ Saving..." : "＋ Save as Preset"}
            </button>
            {scopeId && currentScope && (
              <button
                type="button"
                className="btn-delete-scope-preset"
                disabled={isDeletingScope || isProcessing || isCreatingScope}
                onClick={() => setScopeToDelete(currentScope)}
                title="Delete the currently selected preset"
              >
                {isDeletingScope ? "⏳ Deleting..." : "🗑️ Delete Preset"}
              </button>
            )}
            {scopeSuccessMessage && (
              <span className="scope-active-pill" style={{ background: "#dcfce7", borderColor: "#86efac", color: "#15803d" }}>
                ✓ {scopeSuccessMessage}
              </span>
            )}
            {!scopeSuccessMessage && currentScope && (
              <span className="scope-active-pill">
                ✓ Loaded: {currentScope.name || `${currentScope.pair} · ${currentScope.timeframe}`}
              </span>
            )}
          </div>

          <div className="backtest-actions-cluster">
            <button
              type="button"
              className="btn-run-backtest-primary"
              disabled={isProcessing || (!definitionId && !compositeId)}
              onClick={() => void handleRunBacktest()}
            >
              {isProcessing ? "⏳ Running..." : "🚀 Run Backtest"}
            </button>
          </div>
        </div>
      </div>

      <ErrorBox error={error} />

      {/* Candidate Status & Experiment Detail */}
      {candidateId && (
        <div className="backtest-status-card">
          {candidate.isLoading ? (
            <Loading />
          ) : currentCandidate ? (
            <>
              <div className="lifecycle-header">
                <div className="lifecycle-id-group">
                  <span className="lifecycle-title">Manual Run: <b>{currentCandidate.candidateId}</b></span>
                  <span className={`status-badge-pill badge-${currentCandidate.status.toLowerCase()}`}>
                    {currentCandidate.status === "QUEUED" ? "⏳ Queued" : currentCandidate.status === "BACKTESTING" ? "⚡ Running" : currentCandidate.status === "COMPLETED" ? "✓ Completed" : currentCandidate.status}
                  </span>
                </div>
                {!terminalCandidate(currentCandidate.status) && (
                  <button
                    type="button"
                    className="btn-cancel-backtest"
                    onClick={() => cancel.mutate()}
                    disabled={cancel.isPending}
                  >
                    {cancel.isPending ? "Cancelling..." : "Cancel Run"}
                  </button>
                )}
              </div>

              <div className="lifecycle">
                <span className={currentCandidate.status === "QUEUED" ? "active" : ""}>Queued in Redis</span>
                <span className={currentCandidate.status === "BACKTESTING" ? "active" : ""}>Worker Simulating</span>
                <span className={currentCandidate.status === "COMPLETED" ? "active success-text" : ""}>Completed &amp; Sealed</span>
                {currentCandidate.status === "FAILED" && <span className="active error-text">Failed</span>}
                {currentCandidate.status === "CANCELLED" && <span className="active error-text">Cancelled</span>}
              </div>

              {currentCandidate.status === "COMPLETED" && currentCandidate.experimentResultId ? (
                <p className="success" style={{ margin: "10px 0 0", fontSize: "12.5px" }}>
                  ✓ Candidate run complete and sealed as Experiment <b>{currentCandidate.experimentResultId}</b>
                </p>
              ) : !terminalCandidate(currentCandidate.status) ? (
                <p className="muted" style={{ textAlign: "center", margin: "14px 0" }}>
                  Backend worker is processing this candidate tick-by-tick...
                </p>
              ) : (
                <div style={{ marginTop: "12px" }}>
                  <p className="error">{currentCandidate.lastError || currentCandidate.failureCode || `Candidate ended ${currentCandidate.status}.`}</p>
                  <small className="muted">The backend retained the audit result; no failed run was promoted to an Experiment.</small>
                </div>
              )}
            </>
          ) : candidate.error ? (
            <ErrorBox error={candidate.error} />
          ) : null}
        </div>
      )}

      {/* Middle Section: Chart & Trade Execution List */}
      <div className="backtest-main-section">
        <BacktestCandleChart
          candles={displayedCandles}
          pair={activeExperimentId ? (experimentVisual.data?.datasetSnapshot?.pair || pair) : pair}
          timeframe={activeExperimentId ? (experimentVisual.data?.datasetSnapshot?.timeframe || timeframe) : timeframe}
          trades={allTrades}
          overlays={experimentVisual.data?.overlays}
          highlightTradeId={highlightTradeId}
          isBacktestResult={Boolean(activeExperimentId)}
          isRunning={Boolean(candidateId && !terminalCandidate(currentCandidate?.status))}
          onClear={handleClearGraph}
        />
        <BacktestTradesTableCard
          trades={displayedTrades}
          totalCount={totalTradesCount}
          highlightTradeId={highlightTradeId}
          onSelectTrade={(trade) => setHighlightTradeId(trade.id === highlightTradeId ? undefined : trade.id)}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          pageIndex={tradePageIndex}
          totalPages={totalPages}
          onGoToPage={handleGoToTradePage}
          onNextPage={handleNextTradePage}
          onPrevPage={handlePrevTradePage}
          isLoading={experimentTrades.isLoading}
        />
      </div>

      {/* Bottom Section: 6 Backtest Stats Cards */}
      <BacktestStatsGrid
        summary={experimentSummary.data}
        trades={allTrades}
        candidate={currentCandidate}
      />

      {scopeToDelete && (
        <DeleteScopeModal
          scope={scopeToDelete}
          isDeleting={isDeletingScope}
          error={deleteModalError}
          onClose={() => {
            setScopeToDelete(null);
            setDeleteModalError(undefined);
          }}
          onConfirm={() => void handleConfirmDeleteScope()}
        />
      )}

      {isSaveModalOpen && (
        <SaveScopeModal
          defaultName={`${pair} ${timeframe} ${currentSelectedStratName ? `${currentSelectedStratName} ` : ""}${from ? from.slice(0, 10) : ""}`.trim()}
          strategyName={currentSelectedStratName}
          pair={pair}
          timeframe={timeframe}
          from={from}
          to={to}
          capital={capital}
          fee={feeRatePercent}
          slippage={slippageBps}
          isSaving={isCreatingScope}
          onClose={() => setIsSaveModalOpen(false)}
          onConfirm={(name) => void handleExecuteSaveScope(name)}
        />
      )}
    </>
  );
}

function getIndicatorEmoji(name: string): string {
  const n = name.toUpperCase();
  if (n.includes("RSI")) return "⚡";
  if (n.includes("BOLLINGER") || n.includes("BB")) return "🌊";
  if (n.includes("SENTIMENT") || n.includes("NEWS")) return "📰";
  if (n.includes("SUPPORT") || n.includes("RESISTANCE")) return "🧱";
  if (n.includes("MA") || n.includes("AVERAGE") || n.includes("EMA") || n.includes("SMA")) return "📈";
  return "⚙️";
}

function getParamSnippet(params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) return "Default config";
  return Object.entries(params)
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

function formatCandidateParams(params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) return "Default parameters";
  return Object.entries(params)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

function formatSimplifiedParams(params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) return "";
  return Object.entries(params)
    .map(([k, v]) => {
      const label = k.replace("Threshold", "").replace("Period", "");
      const val = typeof v === "number" && !Number.isInteger(v) ? v.toFixed(1) : v;
      return `${label}: ${val}`;
    })
    .join(" · ");
}

export function RankingTable({ rows }: { rows: SearchRankingEntry[] }) {
  const details = useQueries({
    queries: rows.map((row) => ({
      queryKey: ["experiments", row.experimentResultId],
      queryFn: () => api.experiment(row.experimentResultId),
      enabled: Boolean(row.experimentResultId),
    })),
  });

  return (
    <div className="table-scroll">
      <table className="candidate-history-table">
        <thead>
          <tr>
            <th style={{ width: "65px" }}>Rank</th>
            <th className="col-strategy">Discovered Strategy</th>
            <th>Total Return</th>
            <th>Win Rate</th>
            <th>Max Drawdown</th>
            <th>Trades</th>
            <th>Score</th>
            <th>Status</th>
            <th style={{ width: "95px" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const detail = details[index]?.data as ExperimentSummary | undefined;
            const metrics = detail?.metrics ?? {};
            const defs = detail?.strategyDefinitions ?? [];
            const strategy =
              defs.map((item) => item.strategyName).join(" + ") ||
              row.candidateId ||
              row.experimentResultId;
            const singleDefId = defs.length === 1 ? defs[0]?.id : undefined;
            const compositeId = detail?.compositeDefinition?.id ?? detail?.compositeDefinitionId;

            return (
              <tr key={row.id ?? row.candidateId ?? row.experimentResultId}>
                <td>
                  <span
                    style={{
                      fontWeight: 800,
                      color:
                        row.rank === 1 ? "#d97706" : row.rank === 2 ? "#64748b" : row.rank === 3 ? "#b45309" : "#0f172a",
                    }}
                  >
                    {row.rank === 1 ? "🥇 #1" : row.rank === 2 ? "🥈 #2" : row.rank === 3 ? "🥉 #3" : `#${row.rank ?? "-"}`}
                  </span>
                </td>
                <td className="col-strategy">
                  {defs.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      {defs.map((def, idx) => {
                        const emoji = getIndicatorEmoji(def.strategyName);
                        const name = def.familyName ?? def.strategyName;
                        const paramStr = formatSimplifiedParams(def.parameters);
                        return (
                          <div key={def.id || idx} style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "12.5px" }}>
                              {emoji} {name}
                            </span>
                            {paramStr && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "#334155",
                                  background: "#f1f5f9",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  border: "1px solid #e2e8f0",
                                  fontFamily: "monospace",
                                }}
                              >
                                {paramStr}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <b>{strategy}</b>
                  )}
                </td>
                <td style={{ color: (metrics.totalReturnPercent ?? 0) >= 0 ? "#10b981" : "#ef4444", fontWeight: 700 }}>
                  {percent(metrics.totalReturnPercent)}
                </td>
                <td>{percent(metrics.winRatePercent)}</td>
                <td style={{ color: "#f59e0b" }}>{percent(metrics.maxDrawdownPercent)}</td>
                <td>{metrics.numberOfTrades ?? "—"}</td>
                <td>
                  <strong style={{ color: "#2563eb" }}>{Number.isFinite(row.score) ? row.score.toFixed(4) : "—"}</strong>
                </td>
                <td>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 700,
                      background: detail?.rankEligible === false ? "#f1f5f9" : "#ecfdf5",
                      color: detail?.rankEligible === false ? "#64748b" : "#059669",
                    }}
                  >
                    {detail?.rankEligible === false ? "Not eligible" : "QUALIFIED"}
                  </span>
                </td>
                <td>
                  {singleDefId ? (
                    <button
                      type="button"
                      className="btn-table-backtest"
                      style={{ padding: "4px 10px", fontSize: "11.5px" }}
                      onClick={() => launchStrategyBacktest("single", singleDefId)}
                      title="Run full interactive backtest with this strategy"
                    >
                      🚀 Backtest
                    </button>
                  ) : compositeId ? (
                    <button
                      type="button"
                      className="btn-table-backtest"
                      style={{ padding: "4px 10px", fontSize: "11.5px" }}
                      onClick={() => launchStrategyBacktest("composite", compositeId)}
                      title="Run full interactive backtest with this composite strategy"
                    >
                      🚀 Backtest
                    </button>
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: "11px" }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatLeaderboardDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

export function PersistentLeaderboardTable({ rows }: { rows: LeaderboardEntry[] }) {
  const details = useQueries({
    queries: rows.map((row) => ({
      queryKey: ["experiments", row.experimentResultId],
      queryFn: () => api.experiment(row.experimentResultId),
      enabled: Boolean(row.experimentResultId),
    })),
  });

  return (
    <div className="leaderboard-table-container">
      <table className="candidate-history-table">
        <thead>
          <tr>
            <th style={{ width: "70px" }}>Rank</th>
            <th className="col-strategy">Strategy & Parameters</th>
            <th>Total Return</th>
            <th>Win Rate</th>
            <th>Max Drawdown</th>
            <th>Trades</th>
            <th>Score</th>
            <th>Admitted</th>
            <th>Status</th>
            <th style={{ width: "160px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const detail = details[index]?.data as ExperimentSummary | undefined;
            const metrics = detail?.metrics ?? {};
            const defs = detail?.strategyDefinitions ?? [];
            const strategy =
              defs.map((item) => item.strategyName).join(" + ") || row.experimentResultId;
            const singleDefId = defs.length === 1 ? defs[0]?.id : undefined;
            const compositeId = detail?.compositeDefinition?.id ?? detail?.compositeDefinitionId;

            return (
              <tr key={row.id}>
                <td>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      background:
                        row.rank === 1 ? "#fef3c7" : row.rank === 2 ? "#f1f5f9" : row.rank === 3 ? "#ffedd5" : "transparent",
                      border:
                        row.rank === 1 ? "1px solid #fde68a" : row.rank === 2 ? "1px solid #e2e8f0" : row.rank === 3 ? "1px solid #fed7aa" : "none",
                      color:
                        row.rank === 1 ? "#d97706" : row.rank === 2 ? "#475569" : row.rank === 3 ? "#b45309" : "#0f172a",
                    }}
                  >
                    {row.rank === 1 ? "🥇 #1" : row.rank === 2 ? "🥈 #2" : row.rank === 3 ? "🥉 #3" : `#${row.rank ?? index + 1}`}
                  </span>
                </td>
                <td className="col-strategy">
                  {defs.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {compositeId && defs.length > 1 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 700,
                              color: "#4f46e5",
                              background: "#eef2ff",
                              border: "1px solid #c7d2fe",
                              borderRadius: "4px",
                              padding: "1px 6px",
                            }}
                          >
                            🔀 Composite · {detail?.compositeDefinition?.method === "MAJORITY_VOTE" ? "Majority Vote" : "Weighted"}
                          </span>
                        </div>
                      )}
                      {defs.map((def, idx) => {
                        const emoji = getIndicatorEmoji(def.strategyName);
                        const name = def.familyName ?? def.strategyName;
                        const paramStr = formatSimplifiedParams(def.parameters);
                        return (
                          <div key={def.id || idx} style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "12.5px" }}>
                              {emoji} {name}
                            </span>
                            {paramStr && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "#334155",
                                  background: "#f1f5f9",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  border: "1px solid #e2e8f0",
                                  fontFamily: "monospace",
                                }}
                              >
                                {paramStr}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : details[index]?.isLoading ? (
                    <span style={{ color: "#94a3b8", fontSize: "12px" }}>Loading strategy details...</span>
                  ) : (
                    <b style={{ fontSize: "12px", color: "#1e293b" }}>{strategy}</b>
                  )}
                </td>
                <td style={{ color: (metrics.totalReturnPercent ?? 0) >= 0 ? "#10b981" : "#ef4444", fontWeight: 700 }}>
                  {metrics.totalReturnPercent !== undefined ? percent(metrics.totalReturnPercent) : "—"}
                </td>
                <td>{metrics.winRatePercent !== undefined ? percent(metrics.winRatePercent) : "—"}</td>
                <td style={{ color: "#f59e0b", fontWeight: 600 }}>
                  {metrics.maxDrawdownPercent !== undefined ? percent(metrics.maxDrawdownPercent) : "—"}
                </td>
                <td>{metrics.numberOfTrades ?? "—"}</td>
                <td>
                  <strong style={{ color: "#2563eb", fontSize: "13px", fontWeight: 800 }}>
                    {Number.isFinite(row.score) ? row.score.toFixed(4) : "—"}
                  </strong>
                </td>
                <td title={row.addedAt} style={{ fontSize: "11.5px", color: "#64748b", whiteSpace: "nowrap" }}>
                  {formatLeaderboardDate(row.addedAt)}
                </td>
                <td>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 700,
                      background: "#ecfdf5",
                      color: "#059669",
                      border: "1px solid #a7f3d0",
                      whiteSpace: "nowrap",
                    }}
                  >
                    QUALIFIED
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    {singleDefId ? (
                      <button
                        type="button"
                        className="btn-table-backtest"
                        style={{ padding: "4px 9px", fontSize: "11px", whiteSpace: "nowrap" }}
                        onClick={() => launchStrategyBacktest("single", singleDefId)}
                        title="Run full interactive backtest with this strategy"
                      >
                        🚀 Backtest
                      </button>
                    ) : compositeId ? (
                      <button
                        type="button"
                        className="btn-table-backtest"
                        style={{ padding: "4px 9px", fontSize: "11px", whiteSpace: "nowrap" }}
                        onClick={() => launchStrategyBacktest("composite", compositeId)}
                        title="Run full interactive backtest with this composite strategy"
                      >
                        🚀 Backtest
                      </button>
                    ) : null}
                    {detail?.searchRunId && (
                      <button
                        type="button"
                        className="btn-table-search-run"
                        style={{
                          padding: "4px 9px",
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: "5px",
                          color: "#1d4ed8",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onClick={() => navigateTo("search", detail.searchRunId)}
                        title={`View originating Search Run (${detail.searchRunId})`}
                      >
                        ⌕ Search Run
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CandidateTable({ candidates }: { candidates: Candidate[] }) {
  return (
    <div className="table-scroll">
      <table className="candidate-history-table">
        <thead>
          <tr>
            <th style={{ width: "55px" }}>Iter</th>
            <th className="col-strategy">Strategy Name & Parameters</th>
            <th>Mode</th>
            <th>Status</th>
            <th>Attempts</th>
            <th>Duration</th>
            <th>Reason / Outcome</th>
            <th style={{ width: "95px" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => {
            const defs = candidate.strategyDefinitions ?? [];
            const singleDefId = defs.length === 1 ? defs[0]?.id : undefined;
            const compositeId = candidate.compositeDefinition?.id;
            const durations = candidateDurations(candidate);

            return (
              <tr key={candidate.candidateId}>
                <td>
                  <span style={{ fontWeight: 700, color: "#64748b", fontSize: "12px" }}>
                    #{candidate.iterationNumber ?? "—"}
                  </span>
                </td>
                <td className="col-strategy">
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {defs.length > 0 ? (
                      defs.map((def, idx) => {
                        const emoji = getIndicatorEmoji(def.strategyName);
                        const name = def.familyName ?? def.strategyName;
                        const paramStr = formatCandidateParams(def.parameters);
                        return (
                          <div
                            key={def.id || idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                              {emoji} {name}
                            </span>
                            <span
                              style={{
                                fontSize: "11.5px",
                                color: "#1e293b",
                                background: "#f8fafc",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                border: "1px solid #cbd5e1",
                                fontFamily: "monospace",
                                fontWeight: 500,
                              }}
                            >
                              {paramStr}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>
                        {candidate.selectionMode === "SINGLE" ? "Single Indicator" : "Composite Strategy"}
                      </span>
                    )}
                    <div style={{ fontSize: "10.5px", color: "#94a3b8", fontFamily: "monospace" }}>
                      ID: {candidate.candidateId}
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 700,
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      color: "#475569",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {candidate.strategyDefinitions && candidate.strategyDefinitions.length === 1
                      ? "SINGLE"
                      : candidate.selectionMode ?? "COMPOSITE"}
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 700,
                      background:
                        candidate.status === "COMPLETED"
                          ? "#ecfdf5"
                          : candidate.status === "FAILED"
                          ? "#fef2f2"
                          : "#eff6ff",
                      color:
                        candidate.status === "COMPLETED"
                          ? "#059669"
                          : candidate.status === "FAILED"
                          ? "#dc2626"
                          : "#1d4ed8",
                    }}
                  >
                    {candidate.status}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: 700, color: "#334155", fontSize: "13px" }}>
                    {candidate.attempts?.length ?? 1}
                  </span>
                </td>
                <td title={durations.map((item) => `Attempt ${item.attemptNumber}: ${formatBacktestDuration(item.durationMs)}`).join(" · ")}>
                  {durations.length === 0
                    ? "—"
                    : durations.map((item) => `${item.attemptNumber > 1 ? `#${item.attemptNumber} ` : ""}${formatBacktestDuration(item.durationMs)}`).join(" · ")}
                </td>
                <td>
                  {candidate.lastError || candidate.failureCode ? (
                    <span
                      style={{
                        color: "#dc2626",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: "#fef2f2",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        border: "1px solid #fecaca",
                        display: "inline-block",
                        maxWidth: "140px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={candidate.lastError || candidate.failureCode}
                    >
                      {candidate.lastError || candidate.failureCode}
                    </span>
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: "14px" }}>—</span>
                  )}
                </td>
                <td>
                  {singleDefId ? (
                    <button
                      type="button"
                      className="btn-table-backtest"
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                      onClick={() => launchStrategyBacktest("single", singleDefId)}
                      title="Run full interactive backtest with this strategy"
                    >
                      🚀 Backtest
                    </button>
                  ) : compositeId ? (
                    <button
                      type="button"
                      className="btn-table-backtest"
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                      onClick={() => launchStrategyBacktest("composite", compositeId)}
                      title="Run full interactive backtest with this composite"
                    >
                      🚀 Backtest
                    </button>
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: "11px" }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SearchSummaryCards({ current }: { current: import("./api").LoopStatus }) {
  return (
    <div className="search-dashboard-grid">
      <div className="search-stat-card">
        <div className="search-stat-top">
          <span>🔄 Run Status</span>
          <span
            style={{
              fontSize: "10px",
              padding: "1px 6px",
              borderRadius: "4px",
              background:
                current.state === "RUNNING"
                  ? "#ecfdf5"
                  : current.state === "PAUSED"
                  ? "#fef3c7"
                  : "#f1f5f9",
              color:
                current.state === "RUNNING"
                  ? "#047857"
                  : current.state === "PAUSED"
                  ? "#b45309"
                  : "#475569",
              fontWeight: 800,
            }}
          >
            {current.state}
          </span>
        </div>
        <div className="search-stat-val highlight">{current.state}</div>
      </div>

      <div className="search-stat-card">
        <div className="search-stat-top">
          <span>🧪 Candidates Tested</span>
        </div>
        <div className="search-stat-val">{current.candidatesTested}</div>
      </div>

      <div className="search-stat-card">
        <div className="search-stat-top">
          <span>⏳ Queued / Active</span>
        </div>
        <div className="search-stat-val">
          {current.queuedCount} <small style={{ fontSize: "12px", color: "#64748b" }}>queued</small> · {current.runningCount} <small style={{ fontSize: "12px", color: "#64748b" }}>running</small>
        </div>
      </div>

      <div className="search-stat-card">
        <div className="search-stat-top">
          <span>🏆 Top Discovered Score</span>
        </div>
        <div className="search-stat-val success">
          {current.currentTopEntry ? `#${current.currentTopEntry.rank} (${current.currentTopEntry.score.toFixed(4)})` : "Pending..."}
        </div>
      </div>

      <div className="search-stat-card">
        <div className="search-stat-top">
          <span>⏱️ Avg Test Duration</span>
        </div>
        <div className="search-stat-val">
          {current.averageBacktestDurationMs === null || current.averageBacktestDurationMs === undefined
            ? "—"
            : `${Math.round(current.averageBacktestDurationMs)} ms`}
        </div>
      </div>

      <div className="search-stat-card">
        <div className="search-stat-top">
          <span>⚠️ Failures</span>
        </div>
        <div className="search-stat-val" style={{ color: current.failedCandidateCount > 0 ? "#ef4444" : "#64748b" }}>
          {current.failedCandidateCount}
        </div>
      </div>

      <div className="search-stat-card">
        <div className="search-stat-top">
          <span>🛑 Stop Trigger</span>
        </div>
        <div
          className="search-stat-val"
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: current.state === "FAILED" ? "#dc2626" : "#475569",
          }}
          title={current.lastError}
        >
          {current.state === "FAILED" && current.lastError
            ? `${current.stopReason ?? "ERROR"}: ${current.lastError}`
            : (current.stopReason ?? "Running until limit")}
        </div>
      </div>

      <div className="search-stat-card">
        <div className="search-stat-top">
          <span>🆔 Run ID</span>
        </div>
        <div className="search-stat-val" style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis" }}>
          {current.searchRunId}
        </div>
      </div>
    </div>
  );
}

export interface SearchValidationInput {
  scopeId: string;
  selectedIds: string[];
  maxInFlight: string | number;
  maxComponents: string | number;
  stopType: "maxCandidates" | "maxDurationSeconds" | "noImprovementAfterIterations";
  stopValue: string | number;
  generatorType: import("./api").GeneratorType;
  requiredCategories?: import("./api").StrategyCategory[];
  allowedCategories?: import("./api").StrategyCategory[];
  forbiddenCategories?: import("./api").StrategyCategory[];
  definitions?: import("./api").StrategyDefinition[];
  categoryFor?: (definition: import("./api").StrategyDefinition) => import("./api").StrategyCategory | undefined;
}

export function validateSearchParameters(input: SearchValidationInput): {
  leaderboardScopeId: string;
  strategyDefinitionIds: string[];
  generatorType: import("./api").GeneratorType;
  maxInFlight: number;
  maxComponents: number;
  stopCondition: { maxCandidates?: number; maxDurationSeconds?: number; noImprovementAfterIterations?: number };
  domainRules?: import("./api").DomainRules;
} {
  const {
    scopeId,
    selectedIds,
    maxInFlight,
    maxComponents,
    stopType,
    stopValue,
    generatorType,
    requiredCategories = [],
    allowedCategories = [],
    forbiddenCategories = [],
    definitions = [],
    categoryFor = () => undefined,
  } = input;

  if (!scopeId || typeof scopeId !== "string" || !scopeId.trim()) {
    throw new Error("Please select a benchmark dataset scope.");
  }
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
    throw new Error("Please select at least one strategy definition for the search pool.");
  }

  const concurrency = Number(maxInFlight);
  if (!Number.isInteger(concurrency) || concurrency <= 0) {
    throw new Error("Max in-flight concurrency must be a positive integer (e.g. 1, 2).");
  }

  const components = Number(maxComponents);
  if (!Number.isInteger(components) || components <= 0) {
    throw new Error("Max components must be a positive integer (e.g. 1 for single, 2+ for combinations).");
  }
  if (components >= 2 && selectedIds.length < 2) {
    throw new Error(
      `Ensemble Size (Max Components) is set to ${components}, but only ${selectedIds.length} strategy is selected. Please select at least 2 strategies to discover multi-indicator ensembles, or set Ensemble Size to 1.`
    );
  }

  const value = Number(stopValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Stop limit must be a positive whole number (e.g. 5 candidates, 60 seconds).");
  }

  const stopCondition =
    stopType === "maxCandidates"
      ? { maxCandidates: value }
      : stopType === "maxDurationSeconds"
      ? { maxDurationSeconds: value }
      : { noImprovementAfterIterations: value };

  let domainRules: import("./api").DomainRules | undefined;
  if (generatorType === "DOMAIN_GUIDED") {
    const required = [...new Set(requiredCategories)];
    const allowed = [...new Set(allowedCategories)];
    const forbidden = [...new Set(forbiddenCategories)];

    if (required.some((category) => forbidden.includes(category))) {
      throw new Error("A category cannot be both required and forbidden.");
    }
    if (allowed.length > 0 && required.some((category) => !allowed.includes(category))) {
      throw new Error("Required categories must be allowed.");
    }
    if (allowed.length > 0 && forbidden.some((category) => allowed.includes(category))) {
      throw new Error("Forbidden categories must be excluded from allowed categories.");
    }

    const selected = definitions.filter((definition) => selectedIds.includes(definition.id));
    const eligible = selected.filter((definition) => {
      const category = categoryFor(definition);
      return (
        (!allowed.length || (category !== undefined && allowed.includes(category))) &&
        (category === undefined || !forbidden.includes(category))
      );
    });

    if (eligible.length === 0) {
      throw new Error("The selected domain rules leave no eligible strategy definitions in the pool.");
    }
    if (components >= 2 && eligible.length < 2) {
      throw new Error(
        `Ensemble Size (Max Components) is set to ${components}, but only ${eligible.length} eligible strategy remains after domain filtering. Please select at least 2 eligible strategies or set Ensemble Size to 1.`
      );
    }
    if (required.length > components) {
      throw new Error(`Max components (${components}) must be at least the count of required categories (${required.length}).`);
    }
    if (required.some((category) => !eligible.some((definition) => categoryFor(definition) === category))) {
      throw new Error("Every required category needs an eligible selected definition in your pool.");
    }

    domainRules = {
      ...(required.length ? { requiredCategories: required } : {}),
      ...(allowed.length ? { allowedCategories: allowed } : {}),
      ...(forbidden.length ? { forbiddenCategories: forbidden } : {}),
    };
  }

  return {
    leaderboardScopeId: scopeId,
    strategyDefinitionIds: selectedIds,
    generatorType,
    maxInFlight: concurrency,
    maxComponents: components,
    stopCondition,
    ...(domainRules ? { domainRules } : {}),
  };
}

export function SearchLive({
  definitions,
  scopes,
  strategies = [],
  initialRunId,
}: {
  definitions: StrategyDefinition[];
  scopes: Scope[];
  strategies?: import("./api").StrategyDescriptor[];
  initialRunId?: string;
}) {
  const client = useQueryClient();
  const [scopeId, setScopeId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => definitions.map((d) => d.id));
  const [generatorType, setGeneratorType] = useState<import("./api").GeneratorType>("RANDOM");
  const [requiredCategories, setRequiredCategories] = useState<import("./api").StrategyCategory[]>([]);
  const [allowedCategories, setAllowedCategories] = useState<import("./api").StrategyCategory[]>([]);
  const [forbiddenCategories, setForbiddenCategories] = useState<import("./api").StrategyCategory[]>([]);
  const [maxComponents, setMaxComponents] = useState("2");
  const [maxInFlight, setMaxInFlight] = useState("1");
  const [stopType, setStopType] = useState<"maxCandidates" | "maxDurationSeconds" | "noImprovementAfterIterations">("maxCandidates");
  const [stopValue, setStopValue] = useState("5");
  const [runId, setRunId] = useState<string | undefined>(() => initialRunId ?? readSearchRunId());
  const [candidateCursors, setCandidateCursors] = useState<Array<string | undefined>>([undefined]);
  const [error, setError] = useState<unknown>();
  const candidateCursor = candidateCursors[candidateCursors.length - 1];

  const categories = Array.from(
    new Set(strategies.map((strategy) => strategy.category.trim()).filter(Boolean))
  ).sort() as import("./api").StrategyCategory[];

  const categoryFor = (definition: StrategyDefinition): import("./api").StrategyCategory | undefined =>
    strategies.find(
      (strategy) =>
        strategy.name === definition.strategyName && strategy.implementationSha256 === definition.implementationSha256
    )?.category as import("./api").StrategyCategory | undefined;

  const setupScope = scopes.find((s) => s.id === scopeId);

  // Auto conflict prevention
  const handleToggleRequired = (category: import("./api").StrategyCategory) => {
    setRequiredCategories((prev) => {
      const next = prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category];
      if (next.includes(category)) {
        setForbiddenCategories((f) => f.filter((c) => c !== category));
        setAllowedCategories((a) => (a.length > 0 && !a.includes(category) ? [...a, category] : a));
      }
      return next;
    });
  };

  const handleToggleAllowed = (category: import("./api").StrategyCategory) => {
    setAllowedCategories((prev) => {
      const next = prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category];
      if (!next.includes(category) && next.length > 0) {
        setRequiredCategories((r) => r.filter((c) => c !== category));
      }
      return next;
    });
  };

  const handleToggleForbidden = (category: import("./api").StrategyCategory) => {
    setForbiddenCategories((prev) => {
      const next = prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category];
      if (next.includes(category)) {
        setRequiredCategories((r) => r.filter((c) => c !== category));
        setAllowedCategories((a) => a.filter((c) => c !== category));
      }
      return next;
    });
  };

  const toggleDefinition = (id: string) =>
    setSelectedIds((currentIds) =>
      currentIds.includes(id) ? currentIds.filter((currentId) => currentId !== id) : [...currentIds, id]
    );

  const handleSelectAll = () => setSelectedIds(definitions.map((d) => d.id));
  const handleDeselectAll = () => setSelectedIds([]);

  const [candidateSearchQuery, setCandidateSearchQuery] = useState("");
  const [candidateCategoryTab, setCandidateCategoryTab] = useState<string>("ALL");

  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { ALL: definitions.length };
    definitions.forEach((d) => {
      const cat = categoryFor(d) ?? "TREND";
      counts[cat] = (counts[cat] ?? 0) + 1;
    });
    return counts;
  }, [definitions, strategies]);

  const availableCategories = React.useMemo(() => {
    const set = new Set<string>();
    definitions.forEach((d) => {
      const cat = categoryFor(d);
      if (cat) set.add(cat);
    });
    categories.forEach((c) => set.add(c));
    return Array.from(set).sort();
  }, [definitions, categories]);

  const customNamesMap: Record<string, string> = React.useMemo(() => {
    try {
      const raw = localStorage.getItem("cryptox_strategy_custom_names_v1");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [definitions]);

  const filteredDefinitions = React.useMemo(() => {
    const query = candidateSearchQuery.trim().toLowerCase();
    return definitions.filter((def) => {
      const cat = categoryFor(def) ?? "TREND";
      if (candidateCategoryTab !== "ALL" && cat !== candidateCategoryTab) {
        return false;
      }
      if (query) {
        const customName = (customNamesMap[def.id] ?? def.familyName ?? def.strategyName).toLowerCase();
        const stratName = def.strategyName.toLowerCase();
        const paramStr = JSON.stringify(def.parameters).toLowerCase();
        const catStr = cat.toLowerCase();
        return (
          customName.includes(query) ||
          stratName.includes(query) ||
          paramStr.includes(query) ||
          catStr.includes(query)
        );
      }
      return true;
    });
  }, [definitions, candidateSearchQuery, candidateCategoryTab, customNamesMap, strategies]);

  const handleSelectFiltered = () => {
    const filteredIds = filteredDefinitions.map((d) => d.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleDeselectFiltered = () => {
    const filteredIdSet = new Set(filteredDefinitions.map((d) => d.id));
    setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
  };

  // Domain Guidance Eligibility
  const isDefinitionEligible = React.useCallback(
    (def: StrategyDefinition): boolean => {
      if (generatorType !== "DOMAIN_GUIDED") return true;
      const cat = categoryFor(def);
      if (allowedCategories.length > 0 && (!cat || !allowedCategories.includes(cat))) return false;
      if (cat && forbiddenCategories.includes(cat)) return false;
      return true;
    },
    [generatorType, categoryFor, allowedCategories, forbiddenCategories]
  );

  const selectedEligibleIds = React.useMemo(
    () =>
      selectedIds.filter((id) => {
        const def = definitions.find((d) => d.id === id);
        return def ? isDefinitionEligible(def) : false;
      }),
    [selectedIds, definitions, isDefinitionEligible]
  );

  const selectedExcludedCount = selectedIds.length - selectedEligibleIds.length;

  // Domain rule edge case checks
  const domainValidationErrors = React.useMemo(() => {
    const errors: string[] = [];
    const numComponents = Math.max(1, parseInt(maxComponents, 10) || 1);

    // Stop user if max components >= 2 but fewer than 2 strategies are available
    if (numComponents >= 2) {
      if (generatorType === "DOMAIN_GUIDED") {
        if (selectedEligibleIds.length < 2 && selectedIds.length > 0) {
          errors.push(
            `Ensemble Size (Max Components) is set to ${numComponents}, but only ${selectedEligibleIds.length} eligible strategy is selected. Please select at least 2 strategies to discover multi-indicator ensembles, or reduce Ensemble Size to 1.`
          );
        }
      } else {
        if (selectedIds.length === 1) {
          errors.push(
            `Ensemble Size (Max Components) is set to ${numComponents}, but only 1 strategy is selected. Please select at least 2 strategies to discover multi-indicator ensembles, or reduce Ensemble Size to 1.`
          );
        }
      }
    }

    // Incompatible Sentiment Strategy check: scope has no sentiment dataset snapshot
    if (setupScope && !setupScope.sentimentDatasetSnapshot) {
      const selectedSentimentDefs = selectedIds
        .map((id) => definitions.find((d) => d.id === id))
        .filter(
          (d): d is StrategyDefinition =>
            Boolean(
              d &&
                (categoryFor(d) === "INFORMATION" ||
                  d.strategyName === "SENTIMENT" ||
                  d.familyName?.toLowerCase().includes("sentiment"))
            )
        );
      if (selectedSentimentDefs.length > 0) {
        errors.push(
          `Scope Incompatible: Benchmark scope "${setupScope.name}" contains only price candles and has no news sentiment data attached. The selected News Sentiment strategy ("${selectedSentimentDefs.map((s) => s.familyName ?? s.strategyName).join('", "')}") will fail candidate evaluation with SNAPSHOT_INCOMPLETE. Please deselect it from your Candidate Pool or select a scope that includes news sentiment.`
        );
      }
    }

    if (generatorType !== "DOMAIN_GUIDED") return errors;

    // Edge Case 4: Required count > max components
    if (requiredCategories.length > numComponents) {
      errors.push(
        `Required categories count (${requiredCategories.length}) exceeds Ensemble Size (${numComponents}). Increase Ensemble Size or remove some required categories.`
      );
    }

    // Edge Case 3: Required category has 0 selected eligible strategies
    const missingRequired = requiredCategories.filter(
      (cat) =>
        !selectedEligibleIds.some((id) => {
          const def = definitions.find((d) => d.id === id);
          return def && categoryFor(def) === cat;
        })
    );
    if (missingRequired.length > 0) {
      errors.push(
        `Required category "${missingRequired.join(
          ", "
        )}" has no eligible strategy selected in the Candidate Pool.`
      );
    }

    // Edge Case 2: Zero eligible strategies remain in pool
    if (selectedIds.length > 0 && selectedEligibleIds.length === 0) {
      errors.push(
        `All ${selectedIds.length} selected strategies are excluded by your Domain Rules. Please select at least one eligible strategy or adjust your Allowed/Forbidden categories.`
      );
    }

    return errors;
  }, [
    generatorType,
    maxComponents,
    requiredCategories,
    selectedEligibleIds,
    definitions,
    categoryFor,
    selectedIds,
    setupScope,
  ]);

  const domainValidationWarnings = React.useMemo(() => {
    if (generatorType !== "DOMAIN_GUIDED") return [];
    const warnings: string[] = [];

    // Edge Case 1: Some selected strategies are excluded
    if (selectedExcludedCount > 0 && selectedEligibleIds.length > 0) {
      warnings.push(
        `${selectedExcludedCount} of your ${selectedIds.length} selected strategies are excluded by your Domain Rules and will be ignored during candidate generation.`
      );
    }

    return warnings;
  }, [
    generatorType,
    selectedExcludedCount,
    selectedIds.length,
    selectedEligibleIds.length,
  ]);

  const status = useQuery({
    queryKey: ["search", runId, "status"],
    queryFn: () => api.searchStatus(runId!),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return terminalSearch(state) || state === "PAUSED" ? false : 1500;
    },
  });

  const candidates = useQuery({
    queryKey: ["search", runId, "candidates", candidateCursor],
    queryFn: () => api.searchCandidates(runId!, { limit: 10, cursor: candidateCursor }),
    enabled: Boolean(runId),
    refetchInterval: status.data?.state === "RUNNING" ? 1500 : false,
  });

  const ranking = useQuery({
    queryKey: ["search", runId, "leaderboard"],
    queryFn: () => api.searchLeaderboard(runId!),
    enabled: Boolean(runId),
    refetchInterval: status.data?.state === "RUNNING" ? 1500 : false,
  });

  const start = useMutation({
    mutationFn: () => {
      const payload = validateSearchParameters({
        scopeId,
        selectedIds,
        maxInFlight,
        maxComponents,
        stopType,
        stopValue,
        generatorType,
        requiredCategories,
        allowedCategories,
        forbiddenCategories,
        definitions,
        categoryFor,
      });
      return api.startSearch(payload);
    },
    onSuccess: (started) => {
      handleSelectRun(started.searchRunId);
      void client.invalidateQueries({ queryKey: ["searchRuns"] });
      void client.invalidateQueries({ queryKey: ["search", started.searchRunId] });
    },
    onError: setError,
  });

  const control = useMutation({
    mutationFn: (action: "pause" | "resume" | "cancel") => api.controlSearch(runId!, action),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["searchRuns"] });
      void client.invalidateQueries({ queryKey: ["search", runId] });
    },
    onError: setError,
  });

  const runsQuery = useQuery({
    queryKey: ["searchRuns"],
    queryFn: () => api.listSearchRuns(50),
    refetchInterval: 4000,
  });
  const searchRuns = runsQuery.data ?? [];
  const activeRunSummary = searchRuns.find((r) => r.searchRunId === runId);

  const current = status.data;
  useEffect(() => {
    if (scopes.length && !scopeId) setScopeId(scopes[0]!.id);
  }, [scopes, scopeId]);

  useEffect(() => {
    if (initialRunId) {
      setRunId(initialRunId);
      persistSearchRunId(initialRunId);
      setCandidateCursors([undefined]);
    }
  }, [initialRunId]);

  const clearRun = () => {
    setRunId(undefined);
    persistSearchRunId(undefined);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/search");
    }
  };

  const handleSelectRun = (selectedId: string) => {
    if (!selectedId) {
      clearRun();
      return;
    }
    setRunId(selectedId);
    persistSearchRunId(selectedId);
    setCandidateCursors([undefined]);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", `/search-runs/${selectedId}`);
    }
  };

  const selectedScope = scopes.find((s) => s.id === (activeRunSummary?.leaderboardScopeId ?? scopeId));

  return (
    <div className="search-studio-container">
      {/* Hero Header */}
      <div className="search-header-hero">
        <div className="search-hero-title">
          <h1>🔍 Strategy Search & Discovery Studio</h1>
          <p>
            Automated Quantitative Exploration — select your base indicators, pick an exploration engine, and discover high-performing trading algorithms.
          </p>
        </div>
        <div className="search-status-badge">
          <i />
          <span>Engine: {generatorType}</span>
        </div>
      </div>

      {/* Active & Past Runs Switcher Card */}
      <div className="search-run-switcher-card">
        <div className="search-run-switcher-info">
          <span className="search-run-switcher-title">
            🕒 Active & Past Exploration Runs:
          </span>
          <select
            className="search-run-dropdown"
            value={runId ?? ""}
            onChange={(e) => handleSelectRun(e.target.value)}
          >
            <option value="">➕ New Discovery Run (Configure & Launch)</option>
            {searchRuns.map((r) => {
              const statusEmoji =
                r.state === "RUNNING"
                  ? "🟢"
                  : r.state === "PAUSED"
                  ? "⏸️"
                  : r.state === "COMPLETED"
                  ? "✅"
                  : r.state === "FAILED"
                  ? "❌"
                  : "⏹️";
              const dateStr = new Date(r.createdAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              // Live best score: for the active run, sync with live ranking query data
              const liveBestScore =
                r.searchRunId === runId && ranking.data !== undefined
                  ? (ranking.data.length > 0 ? ranking.data[0]?.score : undefined)
                  : r.bestScore;
              const scoreStr =
                liveBestScore !== undefined && Number.isFinite(liveBestScore)
                  ? ` · Best: ${liveBestScore.toFixed(3)}`
                  : "";
              const iterStr = r.nextIteration > 1 ? ` · Iter #${r.nextIteration - 1}` : "";
              return (
                <option key={r.searchRunId} value={r.searchRunId}>
                  {statusEmoji} [{r.state}] {r.generatorType} · #{r.searchRunId.slice(0, 8)} ({dateStr}){iterStr}{scoreStr}
                </option>
              );
            })}
          </select>
        </div>

        <div className="search-run-switcher-actions">
          {runId ? (
            <button
              type="button"
              className="btn-new-run-toggle"
              onClick={clearRun}
              title="Return to setup form to configure and launch another search run"
            >
              ➕ Configure New Run
            </button>
          ) : (
            <span className="search-run-setup-badge">
              ⚙️ Setup Mode Active
            </span>
          )}
        </div>
      </div>

      {/* Active Run Action & Status Bar (When inspecting a run) */}
      {runId && current && (
        <div className="search-active-run-bar">
          <div className="search-active-run-details">
            <span className={`search-status-tag ${current.state.toLowerCase()}`}>
              {current.state === "RUNNING" ? "🟢 RUNNING" : current.state === "PAUSED" ? "⏸️ PAUSED" : current.state === "COMPLETED" ? "✅ COMPLETED" : current.state === "FAILED" ? "❌ FAILED" : "⏹️ CANCELLED"}
            </span>
            <span className="search-active-chip">Engine: <b>{activeRunSummary?.generatorType ?? generatorType}</b></span>
            <span className="search-active-chip">Scope: <b>{selectedScope ? `${selectedScope.name} (${selectedScope.timeframe})` : "Benchmark Dataset"}</b></span>
            {current.stopReason && (
              <span
                className={`search-active-chip-subtle ${current.state === "FAILED" ? "chip-error" : ""}`}
                title={current.lastError}
              >
                Stop: <b>{current.stopReason}{current.lastError ? ` (${current.lastError})` : ""}</b>
              </span>
            )}
          </div>

          <div className="search-active-run-actions">
            {current.state === "RUNNING" && (
              <button
                type="button"
                className="btn-search-control"
                disabled={control.isPending}
                onClick={() => control.mutate("pause")}
              >
                ⏸️ Pause
              </button>
            )}
            {current.state === "PAUSED" && (
              <button
                type="button"
                className="btn-search-control"
                disabled={control.isPending}
                onClick={() => control.mutate("resume")}
              >
                ▶️ Resume
              </button>
            )}
            {!terminalSearch(current.state) && (
              <button
                type="button"
                className="btn-search-control danger"
                disabled={control.isPending}
                onClick={() => control.mutate("cancel")}
              >
                ⏹️ Stop
              </button>
            )}
            <button
              type="button"
              className="btn-search-control"
              onClick={clearRun}
              title="Return to setup mode to launch another search run"
            >
              🗑️ Clear Run
            </button>
          </div>
        </div>
      )}

      {/* Setup Steps 1, 2, 3: Only shown in Setup Mode (!runId) */}
      {!runId && (
        <>
      {/* Step 1: Benchmark Dataset & Generator Algorithm */}
      <div className="search-step-card">
        <div className="search-step-header">
          <div className="search-step-badge">1</div>
          <div className="search-step-title">
            <h3>Choose Exploration Engine & Benchmark Dataset</h3>
            <p>Select which algorithm explores strategy variations and what historical market data to test against.</p>
          </div>
        </div>

        {/* 3 Generator Cards */}
        <div className="generator-cards-grid">
          <button
            type="button"
            className={`generator-card ${generatorType === "RANDOM" ? "active" : ""}`}
            onClick={() => setGeneratorType("RANDOM")}
          >
            <div className="generator-card-top">
              <div className="generator-card-meta">
                <span className="generator-card-icon">🎲</span>
                <span className="generator-card-name">Random Mutation</span>
              </div>
              <div className="generator-card-check">✓</div>
            </div>
            <p className="generator-card-desc">
              Fast parameter search. Randomly shuffles indicators and mutates numerical thresholds to explore nearby parameter variations.
            </p>
          </button>

          <button
            type="button"
            className={`generator-card ${generatorType === "GENETIC" ? "active" : ""}`}
            onClick={() => setGeneratorType("GENETIC")}
          >
            <div className="generator-card-top">
              <div className="generator-card-meta">
                <span className="generator-card-icon">🧬</span>
                <span className="generator-card-name">Genetic Evolution</span>
              </div>
              <div className="generator-card-check">✓</div>
            </div>
            <p className="generator-card-desc">
              Evolutionary optimization. Pairs parent strategies, crosses over indicator components, and applies structural mutations across generations.
            </p>
          </button>

          <button
            type="button"
            className={`generator-card ${generatorType === "DOMAIN_GUIDED" ? "active" : ""}`}
            onClick={() => setGeneratorType("DOMAIN_GUIDED")}
          >
            <div className="generator-card-top">
              <div className="generator-card-meta">
                <span className="generator-card-icon">🎯</span>
                <span className="generator-card-name">Domain-Guided Rules</span>
              </div>
              <div className="generator-card-check">✓</div>
            </div>
            <p className="generator-card-desc">
              Constrained discovery. Enforces strict rules on category combinations (e.g. Trend + Momentum only) while banning unwanted indicator types.
            </p>
          </button>
        </div>

        {/* Dataset Scope Selector */}
        <div className="search-field-box" style={{ marginTop: "4px" }}>
          <label className="search-field-label">
            <span>📊 Benchmark Market Scope (Historical Test Dataset)</span>
          </label>
          <select
            className="search-field-control"
            value={scopeId}
            onChange={(event) => setScopeId(event.target.value)}
          >
            <option value="">-- Select Benchmark Scope --</option>
            {scopes.map((scope) => (
              <option key={scope.id} value={scope.id}>
                {scope.name} · {scope.pair} ({scope.timeframe})
              </option>
            ))}
          </select>
          <small className="search-field-hint">
            All generated strategies will be automatically backtested on this exact market data so their scores can be compared fairly.
          </small>
        </div>
      </div>

      {/* Step 2: Engine Tuning & Limits */}
      <div className="search-step-card">
        <div className="search-step-header">
          <div className="search-step-badge">2</div>
          <div className="search-step-title">
            <h3>Configure Exploration Limits & Stop Condition</h3>
            <p>Control ensemble sizing, concurrency, and how long the automated discovery loop runs.</p>
          </div>
        </div>

        <div className="search-config-grid-clean">
          {/* Max Components */}
          <div className="search-field-box">
            <label className="search-field-label">
              <span>🧩 Ensemble Size (Max Components)</span>
            </label>
            <input
              type="number"
              className="search-field-control"
              min="1"
              max="5"
              step="1"
              value={maxComponents}
              onChange={(event) => setMaxComponents(event.target.value)}
            />
            <div className="component-preset-row">
              <button
                type="button"
                className={`btn-component-pill ${maxComponents === "1" ? "active" : ""}`}
                onClick={() => setMaxComponents("1")}
                title="1 = single indicator only"
              >
                1 (Single Only)
              </button>
              <button
                type="button"
                className={`btn-component-pill ${maxComponents === "2" ? "active" : ""}`}
                onClick={() => setMaxComponents("2")}
                title="2 = allows dual indicator combinations"
              >
                2 (Dual)
              </button>
              <button
                type="button"
                className={`btn-component-pill ${maxComponents === "3" ? "active" : ""}`}
                onClick={() => setMaxComponents("3")}
                title="3 = allows up to 3 indicator combinations"
              >
                3 (Triple)
              </button>
            </div>
            <small className="search-field-hint">
              1 = Only tests single indicators. 2+ = Combines indicators into multi-signal voting ensembles.
            </small>
          </div>

          {/* Max In-Flight */}
          <div className="search-field-box">
            <label className="search-field-label">
              <span>⚡ Concurrent Backtests (In-Flight)</span>
            </label>
            <input
              type="number"
              className="search-field-control"
              min="1"
              max="4"
              step="1"
              value={maxInFlight}
              onChange={(event) => setMaxInFlight(event.target.value)}
            />
            <small className="search-field-hint">
              How many backtest jobs execute simultaneously on the backend worker queue (1 is recommended).
            </small>
          </div>

          {/* Stop Condition Type */}
          <div className="search-field-box">
            <label className="search-field-label">
              <span>🛑 Automatic Stop Trigger</span>
            </label>
            <select
              className="search-field-control"
              value={stopType}
              onChange={(event) => setStopType(event.target.value as typeof stopType)}
            >
              <option value="maxCandidates">🎯 Max candidates tested</option>
              <option value="maxDurationSeconds">⏱️ Max duration (seconds)</option>
              <option value="noImprovementAfterIterations">🛑 Plateau (No improvement)</option>
            </select>
            <small className="search-field-hint">
              Safeguard trigger to automatically conclude the search run when the target is reached.
            </small>
          </div>

          {/* Stop Value Limit */}
          <div className="search-field-box">
            <label className="search-field-label">
              <span>
                {stopType === "maxCandidates"
                  ? "🎯 Target Candidates Count"
                  : stopType === "maxDurationSeconds"
                  ? "⏱️ Target Seconds Limit"
                  : "🛑 Plateau Iterations Count"}
              </span>
            </label>
            <input
              type="number"
              className="search-field-control"
              min="1"
              step="1"
              value={stopValue}
              onChange={(event) => setStopValue(event.target.value)}
            />
            <small className="search-field-hint">
              {stopType === "maxCandidates"
                ? `Will stop after testing exactly ${stopValue || 0} strategy candidates.`
                : stopType === "maxDurationSeconds"
                ? `Will stop after running for ${stopValue || 0} seconds.`
                : `Will stop if score does not improve for ${stopValue || 0} iterations.`}
            </small>
          </div>
        </div>
      </div>

      {/* Step 3 (Conditional): Domain Category Rules */}
      {generatorType === "DOMAIN_GUIDED" && (
        <div className="search-step-card">
          <div className="search-step-header">
            <div className="search-step-badge">★</div>
            <div className="search-step-title">
              <h3>🎯 Domain Category Rules (Rule-Constrained Search)</h3>
              <p>Configure which indicator types are mandatory, allowed, or strictly prohibited.</p>
            </div>
          </div>

          <div className="domain-rules-card">
            <div className="domain-rules-header">
              <h4>📋 Indicator Category Governance</h4>
              <small>Auto-synchronized: selecting a category as Required automatically permits it.</small>
            </div>

            {/* Required Categories */}
            <div className="domain-rule-row">
              <div className="domain-rule-row-title">
                <b>📌 Required Categories:</b>
                <span>Every generated strategy MUST contain at least one indicator from these categories</span>
              </div>
              <div className="domain-chips-grid">
                {categories.map((cat) => {
                  const isChecked = requiredCategories.includes(cat);
                  return (
                    <button
                      type="button"
                      key={`req-${cat}`}
                      className={`domain-chip-btn ${isChecked ? "checked-required" : ""}`}
                      onClick={() => handleToggleRequired(cat)}
                    >
                      <span>{isChecked ? "✓" : "+"}</span>
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Allowed Categories */}
            <div className="domain-rule-row">
              <div className="domain-rule-row-title">
                <b>🟢 Allowed Categories:</b>
                <span>Permitted pool of indicator types (leave all unselected to allow all available categories)</span>
              </div>
              <div className="domain-chips-grid">
                {categories.map((cat) => {
                  const isChecked = allowedCategories.includes(cat);
                  return (
                    <button
                      type="button"
                      key={`allow-${cat}`}
                      className={`domain-chip-btn ${isChecked ? "checked-allowed" : ""}`}
                      onClick={() => handleToggleAllowed(cat)}
                    >
                      <span>{isChecked ? "✓" : "+"}</span>
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Forbidden Categories */}
            <div className="domain-rule-row">
              <div className="domain-rule-row-title">
                <b>🚫 Forbidden Categories:</b>
                <span>Categories that are strictly BANNED and will never appear in any candidate</span>
              </div>
              <div className="domain-chips-grid">
                {categories.map((cat) => {
                  const isChecked = forbiddenCategories.includes(cat);
                  return (
                    <button
                      type="button"
                      key={`forb-${cat}`}
                      className={`domain-chip-btn ${isChecked ? "checked-forbidden" : ""}`}
                      onClick={() => handleToggleForbidden(cat)}
                    >
                      <span>{isChecked ? "✕" : "+"}</span>
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Candidate Pool (Search Space) */}
      <div className="search-step-card">
        <div className="search-step-header search-space-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="search-step-badge">{generatorType === "DOMAIN_GUIDED" ? "3" : "3"}</div>
            <div className="search-step-title">
              <h3>📦 Select Candidate Pool (Search Space)</h3>
              <p>Check the base strategies the algorithm is allowed to mutate and combine.</p>
            </div>
          </div>
          <div className="search-space-actions">
            <span className="search-selection-badge">
              ✓ {selectedIds.length} of {definitions.length} selected
              {generatorType === "DOMAIN_GUIDED" && selectedExcludedCount > 0 ? (
                <span style={{ color: "#b45309", marginLeft: "5px", fontWeight: 600 }}>
                  ({selectedEligibleIds.length} eligible · {selectedExcludedCount} excluded)
                </span>
              ) : (
                filteredDefinitions.length !== definitions.length && (
                  <span style={{ opacity: 0.85, marginLeft: "4px" }}>
                    ({filteredDefinitions.filter((d) => selectedIds.includes(d.id)).length} in view)
                  </span>
                )
              )}
            </span>
            {filteredDefinitions.length < definitions.length ? (
              <>
                <button type="button" className="btn-space-quick" onClick={handleSelectFiltered}>
                  ✓ Select View ({filteredDefinitions.length})
                </button>
                <button type="button" className="btn-space-quick" onClick={handleDeselectFiltered}>
                  ✕ Deselect View
                </button>
                <button type="button" className="btn-space-quick" onClick={handleSelectAll} title="Select all strategies in database">
                  All ({definitions.length})
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn-space-quick" onClick={handleSelectAll}>
                  ✓ Select All
                </button>
                <button type="button" className="btn-space-quick" onClick={handleDeselectAll}>
                  ✕ Deselect All
                </button>
              </>
            )}
          </div>
        </div>

        {/* Candidate Pool Filter Toolbar */}
        <div className="search-pool-toolbar">
          {/* Search Input Field */}
          <div className="search-pool-search-box">
            <span className="search-pool-search-icon">🔍</span>
            <input
              type="text"
              className="search-pool-search-input"
              placeholder="Search indicators by name or parameters (e.g. RSI, period, Bollinger, moving average)..."
              value={candidateSearchQuery}
              onChange={(e) => setCandidateSearchQuery(e.target.value)}
            />
            {candidateSearchQuery && (
              <button
                type="button"
                className="search-pool-clear-btn"
                onClick={() => setCandidateSearchQuery("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Tabs */}
          <div className="search-pool-category-tabs">
            <button
              type="button"
              className={`search-pool-tab ${candidateCategoryTab === "ALL" ? "active" : ""}`}
              onClick={() => setCandidateCategoryTab("ALL")}
            >
              <span>🌐 All</span>
              <span className="tab-count">{definitions.length}</span>
            </button>
            {availableCategories.map((cat) => {
              const count = categoryCounts[cat] ?? 0;
              const emoji =
                cat === "MOMENTUM"
                  ? "⚡"
                  : cat === "TREND"
                  ? "📈"
                  : cat === "VOLATILITY"
                  ? "🌊"
                  : cat === "STRUCTURE"
                  ? "🧱"
                  : cat === "INFORMATION"
                  ? "📰"
                  : "🏷️";
              return (
                <button
                  type="button"
                  key={cat}
                  className={`search-pool-tab cat-${cat.toLowerCase()} ${candidateCategoryTab === cat ? "active" : ""}`}
                  onClick={() => setCandidateCategoryTab(cat)}
                >
                  <span>{emoji} {cat}</span>
                  <span className="tab-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="search-space-cards-grid">
          {filteredDefinitions.length ? (
            filteredDefinitions.map((def) => {
              const isSelected = selectedIds.includes(def.id);
              const isEligible = isDefinitionEligible(def);
              const customName = customNamesMap[def.id] ?? def.familyName ?? def.strategyName;
              const cat = categoryFor(def) ?? "TREND";
              const emoji = getIndicatorEmoji(def.strategyName);
              const isSentimentStrat = cat === "INFORMATION" || def.strategyName === "SENTIMENT" || def.familyName?.toLowerCase().includes("sentiment");
              const isIncompatibleSentiment = setupScope && !Boolean(setupScope.sentimentDatasetSnapshot) && isSentimentStrat;

              return (
                <div
                  key={def.id}
                  className={`strategy-pool-card ${isSelected ? "selected" : ""} ${!isEligible ? "domain-excluded" : ""}`}
                  onClick={() => toggleDefinition(def.id)}
                  title={!isEligible ? `Excluded by rules: Category "${cat}" is not allowed in active Domain Rules.` : undefined}
                >
                  <input
                    type="checkbox"
                    className="strategy-pool-checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                  />
                  <div className="strategy-pool-info">
                    <div className="strategy-pool-name-row">
                      <span className="strategy-pool-name" title={customName}>
                        {emoji} {customName}
                      </span>
                      <div className="strategy-pool-badges">
                        {isIncompatibleSentiment && (
                          <span className="domain-excluded-badge" style={{ background: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" }} title="The selected benchmark scope has no news sentiment attached. Candidates using this strategy will fail with SNAPSHOT_INCOMPLETE.">
                            ⚠️ No Sentiment in Scope
                          </span>
                        )}
                        {!isEligible && (
                          <span className="domain-excluded-badge" title="This strategy will be excluded by your active Domain Rules">
                            🚫 Excluded
                          </span>
                        )}
                        <span className="strategy-pool-ver">v{def.version}</span>
                      </div>
                    </div>
                    <div className="strategy-pool-meta">
                      <span className={`category-badge cat-${cat.toLowerCase()}`} style={{ fontSize: "10px", padding: "1px 6px" }}>
                        {cat}
                      </span>
                      <span className="strategy-pool-params" title={getParamSnippet(def.parameters)}>
                        {getParamSnippet(def.parameters)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : definitions.length ? (
            <div className="search-pool-empty">
              <p>
                🔍 No strategy indicators found matching "<b>{candidateSearchQuery}</b>"
                {candidateCategoryTab !== "ALL" && ` in category ${candidateCategoryTab}`}.
              </p>
              <button
                type="button"
                className="btn-reset-filters"
                onClick={() => {
                  setCandidateSearchQuery("");
                  setCandidateCategoryTab("ALL");
                }}
              >
                Reset Search & Filters
              </button>
            </div>
          ) : (
            <Empty>No saved strategy definitions found in your database library.</Empty>
          )}
        </div>
      </div>

      {/* Pre-flight Alerts (Full-width stacked above action bar) */}
      {(domainValidationErrors.length > 0 || domainValidationWarnings.length > 0) && (
        <div className="search-preflight-alerts-box">
          {domainValidationErrors.map((err, idx) => (
            <div key={`err-${idx}`} className="search-preflight-alert error">
              <span className="alert-icon">🛑</span>
              <div className="alert-text">
                <b>Rule Conflict:</b> {err}
              </div>
            </div>
          ))}
          {domainValidationWarnings.map((warn, idx) => (
            <div key={`warn-${idx}`} className="search-preflight-alert warning">
              <span className="alert-icon">⚠️</span>
              <div className="alert-text">
                <b>Domain Rule Notice:</b> {warn}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pre-flight Action Bar */}
      <div className="search-action-bar">
        <div className="search-preflight-summary">
          <span>🚀 Launch Configuration:</span>
          <span className="search-preflight-chip">
            <b>{generatorType}</b>
          </span>
          <span>on</span>
          <span className="search-preflight-chip">
            {selectedScope ? `${selectedScope.name} (${selectedScope.timeframe})` : "No dataset selected"}
          </span>
          <span>·</span>
          <span>
            Target: <b>{stopValue} {stopType === "maxCandidates" ? "candidates" : stopType === "maxDurationSeconds" ? "seconds" : "iterations"}</b>
          </span>
          <span>·</span>
          <span>
            Pool: <b>{selectedIds.length} indicators</b>
            {generatorType === "DOMAIN_GUIDED" && selectedExcludedCount > 0 && (
              <span style={{ color: "#b45309", marginLeft: "4px", fontWeight: 700 }}>
                ({selectedEligibleIds.length} eligible)
              </span>
            )}
          </span>
        </div>

        <div className="search-action-buttons">
          <button
            type="button"
            className="btn-start-discovery"
            disabled={
              start.isPending ||
              !scopeId ||
              selectedIds.length === 0 ||
              domainValidationErrors.length > 0
            }
            onClick={() => start.mutate()}
          >
            {start.isPending ? "⏳ Starting Discovery..." : "🚀 Start Strategy Discovery"}
          </button>
        </div>
      </div>
    </>
  )}

      <ErrorBox error={error ?? start.error ?? control.error ?? status.error} />

      {/* Live Monitoring & Results Section */}
      {!runId ? (
        <div className="search-empty-prompt">
          <div className="search-empty-icon">🔭</div>
          <h3 className="search-empty-title">Ready for Automated Exploration</h3>
          <p className="search-empty-desc">
            Configure your dataset and candidate pool above, then click <b>"Start Strategy Discovery"</b>. The algorithm will automatically mutate, backtest, and rank high-performing trading strategies on the leaderboard.
          </p>
        </div>
      ) : status.isLoading ? (
        <Loading />
      ) : current ? (
        <div className="search-studio-container" style={{ gap: "16px" }}>
          {/* Run Failure Alert Banner */}
          {current.state === "FAILED" && (
            <div className="search-run-failure-banner">
              <div className="failure-banner-icon">🛑</div>
              <div className="failure-banner-body">
                <div className="failure-banner-head">
                  <h4 className="failure-banner-title">Search Run Terminated with Error</h4>
                  <span className="failure-banner-badge">Stop Trigger: {current.stopReason || "ERROR"}</span>
                </div>
                <p className="failure-banner-desc">
                  {formatErrorMessage(current.lastError || "An unexpected error occurred during candidate evaluation.")}
                </p>
                {current.lastError === "SNAPSHOT_INCOMPLETE" && (
                  <div className="failure-banner-tip">
                    💡 <b>Why this happened:</b> A candidate generated during this exploration run required news sentiment data or exceeded candle warmup limits. The benchmark scope <b>{selectedScope?.name ? `"${selectedScope.name}"` : ""}</b> only contains price candles without news sentiment. To prevent this, exclude <b>News Sentiment (SENTIMENT)</b> from your Candidate Pool when exploring candle-only datasets.
                  </div>
                )}
                {current.lastError && (
                  <div className="failure-banner-raw">
                    Backend Error Code: <code>{current.lastError}</code>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live Metric Tiles */}
          <SearchSummaryCards current={current} />

          {/* Candidate History Table */}
          <Panel title="📋 Discovered Candidate History">
            {candidates.isLoading ? (
              <Loading />
            ) : candidates.error ? (
              <ErrorBox error={candidates.error} />
            ) : candidates.data?.items.length ? (
              <>
                <CandidateTable candidates={candidates.data.items} />
                {(candidateCursors.length > 1 || Boolean(candidates.data?.nextCursor)) && (
                  <div className="toolbar" style={{ marginTop: "12px", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Page {candidateCursors.length}
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Btn
                        onClick={() =>
                          setCandidateCursors((cursorStack) =>
                            cursorStack.length > 1 ? cursorStack.slice(0, -1) : cursorStack
                          )
                        }
                        disabled={candidateCursors.length <= 1}
                      >
                        ← Previous candidates
                      </Btn>
                      <Btn
                        onClick={() =>
                          candidates.data?.nextCursor &&
                          setCandidateCursors((cursorStack) => [...cursorStack, candidates.data!.nextCursor])
                        }
                        disabled={!candidates.data?.nextCursor}
                      >
                        Next candidates →
                      </Btn>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Empty>No candidates evaluated yet. Starting generation loop...</Empty>
            )}
          </Panel>

          {/* Leaderboard Ranking Table */}
          <Panel title="🏆 Discovery Leaderboard (Top Performing Candidates)">
            {ranking.isLoading ? (
              <Loading />
            ) : ranking.error ? (
              <ErrorBox error={ranking.error} />
            ) : ranking.data?.length ? (
              <RankingTable rows={ranking.data} />
            ) : (
              <Empty>No qualified ranking entries yet. Candidates will appear as backtests complete.</Empty>
            )}
          </Panel>
        </div>
      ) : (
        <Empty>Saved Search Run is unavailable or has expired.</Empty>
      )}
    </div>
  );
}

function useResources() {
  const definitions = useQuery({ queryKey: ["strategies", "definitions"], queryFn: api.definitions });
  const composites = useQuery({ queryKey: ["strategies", "composites"], queryFn: api.composites });
  const scopes = useQuery({ queryKey: ["scopes"], queryFn: api.scopes });
  const deletedIds = React.useMemo(() => {
    try {
      const raw = localStorage.getItem("cryptox_deleted_strategies_v1");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }, []);
  const visibleDefinitions = React.useMemo(() => (definitions.data ?? []).filter((d) => !deletedIds.includes(d.id)), [definitions.data, deletedIds]);
  const visibleComposites = React.useMemo(() => (composites.data ?? []).filter((c) => !deletedIds.includes(c.id)), [composites.data, deletedIds]);
  return { definitions: visibleDefinitions, composites: visibleComposites, scopes: scopes.data ?? [], loading: definitions.isLoading || composites.isLoading || scopes.isLoading, error: definitions.error ?? composites.error ?? scopes.error };
}
export function BacktestScreen() { const resources = useResources(); if (resources.loading) return <Loading />; if (resources.error) return <ErrorBox error={resources.error} />; return <BacktestLive {...resources} />; }
export function SearchScreen({ initialRunId }: { initialRunId?: string } = {}) { const resources = useResources(); const strategies = useQuery({ queryKey: ["strategies", "catalog"], queryFn: api.strategies }); if (resources.loading || strategies.isLoading) return <Loading />; if (resources.error) return <ErrorBox error={resources.error} />; if (strategies.error) return <ErrorBox error={strategies.error} />; return <SearchLive definitions={resources.definitions} scopes={resources.scopes} strategies={strategies.data ?? []} initialRunId={initialRunId} />; }

export function GenerationPanel() { return <Panel title="Create strategy from prompt / URL"><p className="muted">Use the Strategy Library screen for authenticated generation and review.</p></Panel>; }
