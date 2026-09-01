export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface UiCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

export interface ChartPanelState {
  id: string;
  pair: string;
  timeframe: Timeframe;
}

export const MARKET_LAYOUT_STORAGE_KEY = "cryptox.market-layout";
export const MARKET_LAYOUT_VERSION = 2;
export const SEARCH_RUN_STORAGE_KEY = "cryptox.search-run-id";
export type AppScreen = "market" | "strategy" | "backtest" | "search" | "leaderboard" | "news" | "settings";
export type AppRoute = { screen: AppScreen; resourceId?: string; register?: boolean };

export const parseAppRoute = (pathname: string): AppRoute => {
  const parts = pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
  if (parts[0] === "login") return { screen: "market" };
  if (parts[0] === "register") return { screen: "market", register: true };
  if (parts[0] === "experiments" && parts[1]) return { screen: "backtest", resourceId: parts[1] };
  if (parts[0] === "search-runs" && parts[1]) return { screen: "search", resourceId: parts[1] };
  if (["dashboard", "market", "strategy", "backtest", "search", "leaderboard", "news", "settings"].includes(parts[0] ?? "")) return { screen: (parts[0] === "dashboard" ? "market" : parts[0]) as AppScreen };
  return { screen: "market" };
};

export const appRoutePath = (route: AppRoute): string => route.register ? "/register" : route.resourceId ? `/${route.screen === "backtest" ? "experiments" : "search-runs"}/${encodeURIComponent(route.resourceId)}` : route.screen === "market" ? "/dashboard" : `/${route.screen}`;
export interface MarketLayoutState {
  version: typeof MARKET_LAYOUT_VERSION;
  panels: ChartPanelState[];
  realtimeEnabled: boolean;
  selectedPair: string;
}

export interface StrategyParameterDescriptor {
  key: string;
  label: string;
  type: "INTEGER" | "NUMBER" | "ENUM";
  required: boolean;
  defaultValue: number | string;
  minimum?: number;
  maximum?: number;
  options?: string[];
}

export const initialChartPanels: ChartPanelState[] = [
  { id: "chart-1", pair: "BTCUSDT", timeframe: "1m" },
  { id: "chart-2", pair: "BTCUSDT", timeframe: "5m" },
  { id: "chart-3", pair: "BTCUSDT", timeframe: "15m" },
  { id: "chart-4", pair: "BTCUSDT", timeframe: "1h" },
];

export const defaultMarketLayout = (): MarketLayoutState => ({ version: MARKET_LAYOUT_VERSION, panels: [], realtimeEnabled: true, selectedPair: "BTCUSDT" });

export interface MarketLayoutStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; }

export function readSearchRunId(storage: Pick<MarketLayoutStorage, "getItem"> | undefined = browserStorage()): string | undefined {
  const value = storage?.getItem(SEARCH_RUN_STORAGE_KEY)?.trim();
  return value || undefined;
}

export function persistSearchRunId(searchRunId: string | undefined, storage: MarketLayoutStorage | undefined = browserStorage()): void {
  if (!storage) return;
  try { if (searchRunId) storage.setItem(SEARCH_RUN_STORAGE_KEY, searchRunId); else storage.setItem(SEARCH_RUN_STORAGE_KEY, ""); } catch { /* localStorage can be unavailable; the mounted view remains authoritative */ }
}

const browserStorage = (): MarketLayoutStorage | undefined => typeof localStorage === "undefined" ? undefined : localStorage;
const validPair = (value: unknown): value is string => typeof value === "string" && /^[A-Z0-9][A-Z0-9_-]*$/.test(value);
const validPanelId = (value: unknown): value is string => typeof value === "string" && /^chart-[1-9][0-9]*$/.test(value);
const isTimeframe = (value: unknown): value is Timeframe => value === "1m" || value === "5m" || value === "15m" || value === "1h" || value === "4h" || value === "1d";
const validPanel = (value: unknown): value is ChartPanelState => Boolean(value) && typeof value === "object" && validPanelId((value as ChartPanelState).id) && validPair((value as ChartPanelState).pair) && isTimeframe((value as ChartPanelState).timeframe);

export const validateMarketLayout = (value: unknown): MarketLayoutState | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<MarketLayoutState>;
  if (candidate.version !== MARKET_LAYOUT_VERSION || !Array.isArray(candidate.panels) || candidate.panels.length > 4 || typeof candidate.realtimeEnabled !== "boolean" || !validPair(candidate.selectedPair)) return undefined;
  if (!candidate.panels.every(validPanel)) return undefined;
  const ids = candidate.panels.map((panel) => panel.id);
  if (new Set(ids).size !== ids.length) return undefined;
  return { version: MARKET_LAYOUT_VERSION, panels: candidate.panels.map((panel) => ({ id: panel.id, pair: panel.pair, timeframe: panel.timeframe })), realtimeEnabled: candidate.realtimeEnabled, selectedPair: candidate.selectedPair };
};

export const readMarketLayout = (storage: MarketLayoutStorage | undefined = browserStorage()): MarketLayoutState => {
  if (!storage) return defaultMarketLayout();
  try { const parsed = JSON.parse(storage.getItem(MARKET_LAYOUT_STORAGE_KEY) ?? ""); return validateMarketLayout(parsed) ?? defaultMarketLayout(); } catch { return defaultMarketLayout(); }
};

export const persistMarketLayout = (layout: MarketLayoutState, storage: MarketLayoutStorage | undefined = browserStorage()): void => {
  if (!storage) return;
  try { storage.setItem(MARKET_LAYOUT_STORAGE_KEY, JSON.stringify(validateMarketLayout(layout) ?? defaultMarketLayout())); } catch { /* localStorage can be unavailable or full; memory state remains authoritative */ }
};

export const nextChartId = (panels: ChartPanelState[]): string => {
  const used = new Set(panels.map((panel) => panel.id));
  let number = 1;
  while (used.has(`chart-${number}`)) number += 1;
  return `chart-${number}`;
};

export const addMarketPanel = (layout: MarketLayoutState, pair: string, timeframe: Timeframe): MarketLayoutState | undefined => {
  if (layout.panels.length >= 4 || !validPair(pair) || !isTimeframe(timeframe)) return undefined;
  return { ...layout, selectedPair: pair, panels: [...layout.panels, { id: nextChartId(layout.panels), pair, timeframe }] };
};

export const mergeCandle = <T extends UiCandle>(history: T[], incoming: T): T[] => {
  const index = history.findIndex((candle) => candle.timestamp === incoming.timestamp);
  if (index === -1) return [...history, incoming].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  const current = history[index];
  const replacement = current.isClosed && !incoming.isClosed ? current : incoming;
  return history.map((candle, candleIndex) => candleIndex === index ? replacement : candle);
};

export const parameterDefaults = (descriptors: StrategyParameterDescriptor[]): Record<string, number | string> => Object.fromEntries(descriptors.map((descriptor) => [descriptor.key, descriptor.defaultValue]));

export const equalWeights = (ids: string[]): Record<string, number> => Object.fromEntries(ids.map((id) => [id, 1 / ids.length]));

export type MarketConnectionSummary = { label: string; tone: "connected" | "pending" | "error" | "paused" };

export const marketConnectionSummary = (states: string[], realtimeEnabled: boolean): MarketConnectionSummary => {
  if (!realtimeEnabled) return { label: "Realtime paused", tone: "paused" };
  if (states.some((state) => state === "ERROR" || state === "DISCONNECTED")) return { label: "Connection error", tone: "error" };
  if (states.some((state) => state === "RECONNECTING")) return { label: "Reconnecting", tone: "pending" };
  if (states.some((state) => state === "CONNECTING")) return { label: "Connecting", tone: "pending" };
  if (states.length > 0 && states.every((state) => state === "CONNECTED")) return { label: "Receiving data", tone: "connected" };
  return { label: "Waiting for connection", tone: "pending" };
};

export const canAddChart = (panels: ChartPanelState[]): boolean => panels.length < 4;
