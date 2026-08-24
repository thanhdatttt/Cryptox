export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h";

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

export const mergeCandle = (history: UiCandle[], incoming: UiCandle): UiCandle[] => {
  const index = history.findIndex((candle) => candle.timestamp === incoming.timestamp);
  if (index === -1) return [...history, incoming].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  const current = history[index];
  const replacement = current.isClosed && !incoming.isClosed ? current : incoming;
  return history.map((candle, candleIndex) => candleIndex === index ? replacement : candle);
};

export const parameterDefaults = (descriptors: StrategyParameterDescriptor[]): Record<string, number | string> => Object.fromEntries(descriptors.map((descriptor) => [descriptor.key, descriptor.defaultValue]));

export const canAddChart = (panels: ChartPanelState[]): boolean => panels.length < 4;
