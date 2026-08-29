export const MARKET_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
export type Timeframe = (typeof MARKET_TIMEFRAMES)[number];
export type Pair = string;
export type ProviderId = string;
export const MARKET_DEMO_DEFAULTS_V1 = {
  pair: "BTCUSDT",
  timeframes: ["5m", "15m", "1h", "4h"],
  historyDays: 30,
  maximumCharts: 4,
} as const;

export interface TimeRange {
  from: string;
  to: string;
}

export interface Candle {
  pair: Pair;
  timeframe: Timeframe;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

export interface MarketTick {
  pair: Pair;
  price: number;
  timestamp: string;
}

export interface MarketDataConnectionStatus {
  provider: ProviderId;
  status: "CONNECTED" | "RECONNECTING" | "DISCONNECTED";
  lastEventAt: string;
}

/** Delivery-only state: never a historical, snapshot, backtest, or replay input. */
export const MARKET_OBSERVABILITY_V1 = {
  id: "MARKET_OBSERVABILITY_V1",
  persistence: "EPHEMERAL_IN_MEMORY_ONLY",
  tickBufferPerPair: 100,
  excludedFrom: ["HISTORICAL_INPUT", "DATASET_SNAPSHOT", "BACKTEST", "REPLAY"],
} as const;

export interface MarketObservedTick extends MarketTick {
  providerEventAt: string;
  receivedAt: string;
  latencyMs: number;
}

export interface MarketObservabilityState {
  profileId: typeof MARKET_OBSERVABILITY_V1.id;
  pair: Pair;
  connection: MarketDataConnectionStatus;
  lastLatencyMs: number | null;
  latestTicks: readonly MarketObservedTick[];
  persistence: typeof MARKET_OBSERVABILITY_V1.persistence;
}

export interface MarketObservabilityReader {
  readObservability(pair: Pair): Promise<MarketObservabilityState | undefined>;
}

export interface MarketDataProvenanceIdentity {
  provider: ProviderId;
  pair: Pair;
  timeframe: Timeframe;
  range: TimeRange;
}

export type MarketDataReplayAvailability =
  | {
      replayGuarantee: "EXACT_REPLAY_AVAILABLE";
      datasetId: string;
      datasetVersion: string;
      replayLimitation?: never;
    }
  | {
      replayGuarantee: "TRACEABLE";
      datasetId?: string;
      datasetVersion?: string;
      replayLimitation: string;
    };

export type MarketDataProvenance = MarketDataProvenanceIdentity & MarketDataReplayAvailability;

export type DatasetSnapshotRef = MarketDataProvenanceIdentity & {
  id: string;
  candleCount: number;
  createdAt: string;
} &
  (
    | {
        replayGuarantee: "EXACT_REPLAY_AVAILABLE";
        version: string;
        replayLimitation?: never;
      }
    | { replayGuarantee: "TRACEABLE"; version?: string; replayLimitation: string }
  );

export interface HistoricalCandleQuery {
  pair: Pair;
  timeframe: Timeframe;
  range: TimeRange;
  limit?: number;
  cursor?: string;
  includeForming?: boolean;
  completeness?: "ALLOW_PARTIAL" | "REQUIRE_COMPLETE";
}

export interface HistoricalCandlePage {
  pair: Pair;
  timeframe: Timeframe;
  range: TimeRange;
  candles: readonly Candle[];
  complete: boolean;
  missingRanges: readonly TimeRange[];
  formingIncluded: boolean;
  asOf: string;
  provenance: MarketDataProvenance;
  nextCursor?: string;
}

export interface DatasetSnapshotCreateCommand {
  pair: Pair;
  timeframe: Timeframe;
  range: TimeRange;
}

export interface DatasetSnapshotPage {
  snapshot: DatasetSnapshotRef;
  candles: readonly Candle[];
  nextCursor?: string;
}

export interface DatasetSnapshotReadQuery {
  snapshotId: string;
  cursor?: string;
  limit?: number;
}

export interface MarketSubscription {
  pair: Pair;
  timeframe: Timeframe;
}

export type MarketDataUpdate =
  | { kind: "TICK"; payload: MarketTick }
  | { kind: "CANDLE"; payload: Candle }
  | { kind: "CONNECTION_STATUS"; payload: MarketDataConnectionStatus };

export type MarketDataErrorCode =
  | "INVALID_PAIR"
  | "INVALID_TIMEFRAME"
  | "INVALID_RANGE"
  | "RANGE_TOO_LARGE"
  | "INVALID_CURSOR"
  | "INCOMPLETE_HISTORY"
  | "PROVIDER_UNAVAILABLE";

export interface MarketDataError {
  code: MarketDataErrorCode;
  message: string;
}

export interface MarketDataModulePublicApi {
  readCandles(query: HistoricalCandleQuery): Promise<HistoricalCandlePage>;
  createDatasetSnapshot(command: DatasetSnapshotCreateCommand): Promise<DatasetSnapshotRef>;
  readDatasetSnapshot(query: DatasetSnapshotReadQuery): Promise<DatasetSnapshotPage>;
  subscribeMarketData(
    subscriptions: readonly MarketSubscription[],
    sink: (update: MarketDataUpdate) => void,
  ): Promise<() => Promise<void>>;
  shutdown(): Promise<void>;
}

export type MarketDataSnapshotReader = Pick<MarketDataModulePublicApi, "readDatasetSnapshot">;
