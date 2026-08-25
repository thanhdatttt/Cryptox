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
export const MARKET_LAYOUT_VERSION = 1;
export interface MarketLayoutState {
  version: typeof MARKET_LAYOUT_VERSION;
  panels: ChartPanelState[];
  realtimeEnabled: boolean;
  primaryPanelId: string;
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

export const defaultMarketLayout = (): MarketLayoutState => ({ version: MARKET_LAYOUT_VERSION, panels: initialChartPanels.map((panel) => ({ ...panel })), realtimeEnabled: true, primaryPanelId: initialChartPanels[0]!.id });

export interface MarketLayoutStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; }

const browserStorage = (): MarketLayoutStorage | undefined => typeof localStorage === "undefined" ? undefined : localStorage;
const validPair = (value: unknown): value is string => typeof value === "string" && /^[A-Z0-9][A-Z0-9_-]*$/.test(value);
const validPanelId = (value: unknown): value is string => typeof value === "string" && /^chart-[1-9][0-9]*$/.test(value);
const isTimeframe = (value: unknown): value is Timeframe => value === "1m" || value === "5m" || value === "15m" || value === "1h" || value === "4h" || value === "1d";
const validPanel = (value: unknown): value is ChartPanelState => Boolean(value) && typeof value === "object" && validPanelId((value as ChartPanelState).id) && validPair((value as ChartPanelState).pair) && isTimeframe((value as ChartPanelState).timeframe);

export const validateMarketLayout = (value: unknown): MarketLayoutState | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<MarketLayoutState>;
  if (candidate.version !== MARKET_LAYOUT_VERSION || !Array.isArray(candidate.panels) || candidate.panels.length < 1 || candidate.panels.length > 4 || typeof candidate.realtimeEnabled !== "boolean" || typeof candidate.primaryPanelId !== "string") return undefined;
  if (!candidate.panels.every(validPanel)) return undefined;
  const ids = candidate.panels.map((panel) => panel.id);
  if (new Set(ids).size !== ids.length || !ids.includes(candidate.primaryPanelId)) return undefined;
  return { version: MARKET_LAYOUT_VERSION, panels: candidate.panels.map((panel) => ({ id: panel.id, pair: panel.pair, timeframe: panel.timeframe })), realtimeEnabled: candidate.realtimeEnabled, primaryPanelId: candidate.primaryPanelId };
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
