import type { Candle, DatasetSnapshotRef, MarketPairMetadata, MarketTick, Timeframe, Pair } from "../domain/contracts";
import type { MarketSubscription } from "../api";
export interface NormalizedProviderCandleObservation { candle: Candle; source: "REALTIME_STREAM" | "HISTORICAL_SYNC"; orderKey?: string; }
export interface NormalizedProviderTickObservation { tick: MarketTick; source: "REALTIME_STREAM"; orderKey?: string; }
export interface ProviderAdapterFailure { code: "UNAVAILABLE" | "RATE_LIMITED" | "MALFORMED_RESPONSE" | "AUTHENTICATION_FAILED"; retryable: boolean; safeMessage: string; }
export interface ProviderRealtimeConnection { close(): Promise<void>; ready?: Promise<void>; }
export interface MarketDataProviderAdapter {
  readonly id: string;
  capabilities(): Promise<{ pairs: Pair[]; timeframes: Timeframe[] }>;
  fetchHistorical(command: { pair: Pair; timeframe: Timeframe; range: { from: string; to: string } }): Promise<NormalizedProviderCandleObservation[]>;
  connectRealtime(input: { subscriptions: MarketSubscription[]; onTick(observation: NormalizedProviderTickObservation): void; onCandle(observation: NormalizedProviderCandleObservation): void; onConnect?(): void; onDisconnect(error?: ProviderAdapterFailure): void }): Promise<ProviderRealtimeConnection>;
  readPairMetadata?(pair: Pair): Promise<MarketPairMetadata>;
}
export interface ProviderRegistry { getDefault?(): Promise<MarketDataProviderAdapter | undefined> | MarketDataProviderAdapter | undefined; get?(id: string): Promise<MarketDataProviderAdapter | undefined> | MarketDataProviderAdapter | undefined; defaultProvider?: MarketDataProviderAdapter; defaultProviderId?: string; }
export interface CandleRepository { read(query: { pair: Pair; timeframe: Timeframe; includeForming?: boolean }): Promise<Candle[]>; upsert(candle: Candle): Promise<void>; }
export interface SnapshotRepository { read(query: { snapshotId: string }): Promise<{ snapshot: DatasetSnapshotRef; candles: Candle[] } | undefined>; create(command: { snapshot: DatasetSnapshotRef; candles: Candle[] }): Promise<DatasetSnapshotRef>; }
export interface LatestValueCache { get?(key: string): Promise<unknown>; set?(key: string, value: unknown): Promise<void>; delete?(key: string): Promise<void>; }
export interface Clock { now(): string; }
export interface MarketDataObservability { record(event: string): void; }
export interface MarketDataModuleDependencies { providerRegistry: ProviderRegistry; candleRepository: CandleRepository; snapshotRepository: SnapshotRepository; latestValueCache: LatestValueCache; clock: Clock; observability: MarketDataObservability; }
export type _CandlePortMarker = Candle;
