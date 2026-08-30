import type {
  Candle,
  MarketDataConnectionStatus,
  MarketTick,
  Pair,
  ProviderId,
} from "../domain/contracts";

export type { Candle, MarketDataConnectionStatus, MarketTick, Pair, ProviderId } from "../domain/contracts";

export const MARKET_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
export type Timeframe = (typeof MARKET_TIMEFRAMES)[number];

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

export type MarketDataProvenanceIdentity = {
  provider: ProviderId;
  pair: Pair;
  timeframe: Timeframe;
  range: TimeRange;
};

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

/** Separate from CandleRepository/SnapshotRepository so observability cannot become market history. */
export interface EphemeralMarketObservabilityStore {
  recordTick(tick: MarketTick & { providerEventAt: string; receivedAt: string; latencyMs: number }): void;
  recordConnection(state: MarketDataConnectionStatus): void;
  read(pair: Pair): {
    pair: Pair;
    latestTicks: readonly (MarketTick & { providerEventAt: string; receivedAt: string; latencyMs: number })[];
  } | undefined;
  clearOnRestart(): void;
}

export type DatasetSnapshotRecord = {
  id: string;
  provider: ProviderId;
  pair: Pair;
  timeframe: Timeframe;
  range: { from: string; to: string };
  candleCount: number;
  version?: string;
  createdAt: string;
} & (
  | {
      replayGuarantee: "EXACT_REPLAY_AVAILABLE";
      version: string;
      replayLimitation?: never;
    }
  | { replayGuarantee: "TRACEABLE"; replayLimitation: string }
);

export interface MarketDataHistoryRequest {
  pair: Pair;
  timeframe: Timeframe;
  range: { from: string; to: string };
  limit?: number;
  cursor?: string;
  includeForming?: boolean;
}

export interface MarketDataHistoryResult {
  range: { from: string; to: string };
  candles: Candle[];
  complete: boolean;
  missingRanges: Array<{ from: string; to: string }>;
  formingIncluded: boolean;
  observedAt: string;
  nextCursor?: string;
}

export interface MarketDataProviderSubscription {
  pair: Pair;
  timeframe: Timeframe;
}

export type MarketDataProviderUpdate =
  | { kind: "TICK"; payload: MarketTick }
  | { kind: "CANDLE"; payload: Candle }
  | { kind: "CONNECTION_STATUS"; payload: MarketDataConnectionStatus };

export interface MarketDataProvider {
  readonly id: ProviderId;
  readCandles(request: MarketDataHistoryRequest): Promise<MarketDataHistoryResult>;
  subscribe(
    subscriptions: readonly MarketDataProviderSubscription[],
    sink: (update: MarketDataProviderUpdate) => void,
  ): Promise<() => Promise<void>>;
  shutdown(): Promise<void>;
}

export interface CandleRepository {
  upsertMany(candles: readonly Candle[]): Promise<void>;
  read(request: MarketDataHistoryRequest): Promise<Candle[]>;
}

export interface DatasetSnapshotCreateInput {
  provider: ProviderId;
  pair: Pair;
  timeframe: Timeframe;
  range: { from: string; to: string };
}

export interface DatasetSnapshotReadInput {
  snapshotId: string;
  cursor?: string;
  limit?: number;
}

export interface DatasetSnapshotPage {
  snapshot: DatasetSnapshotRef;
  candles: readonly Candle[];
  nextCursor?: string;
}

export interface SnapshotRepository {
  read(query: DatasetSnapshotReadInput): Promise<DatasetSnapshotPage | undefined>;
  create(command: DatasetSnapshotCreateInput): Promise<DatasetSnapshotRecord>;
}
export interface Clock {
  now(): string;
}
export interface MarketDataObservability {
  record(event: {
    type: "PROVIDER_FAILURE" | "PROVIDER_RECONNECT" | "HISTORY_GAP";
    providerId: ProviderId;
    detail?: string;
  }): void;
}
export interface MarketDataModuleDependencies {
  providers: readonly MarketDataProvider[];
  candleRepository: CandleRepository;
  snapshotRepository: SnapshotRepository;
  clock: Clock;
  observability: MarketDataObservability;
  /** Optional compatibility projection; it is never used for history or snapshots. */
  ephemeralObservability?: EphemeralMarketObservabilityStore;
}
