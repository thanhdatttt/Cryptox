import type { Candle, DatasetSnapshotRef } from "../domain/contracts";
export interface SnapshotRepository {
    read(query: unknown): Promise<unknown>;
    create(command: unknown): Promise<DatasetSnapshotRef>;
}
export interface Clock {
    now(): string;
}
export interface MarketDataObservability {
    record(event: string): void;
}
export interface MarketDataModuleDependencies {
    providerRegistry: unknown;
    candleRepository: unknown;
    snapshotRepository: SnapshotRepository;
    latestValueCache: unknown;
    clock: Clock;
    observability: MarketDataObservability;
}
export type _CandlePortMarker = Candle;
