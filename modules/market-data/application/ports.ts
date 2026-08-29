import type {
  Candle,
  MarketDataConnectionStatus,
  MarketTick,
  Pair,
  ProviderId,
  Timeframe,
} from "../domain/contracts";

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
  snapshot: DatasetSnapshotRecord;
  candles: Candle[];
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
}
