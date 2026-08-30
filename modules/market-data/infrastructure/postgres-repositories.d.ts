import type { Candle, DatasetSnapshotRef } from "../domain/contracts";
import type { CandleRepository, SnapshotRepository } from "../application/ports";
export interface MarketDataSqlClient {
    query<Row>(text: string, values: unknown[]): Promise<{
        rows: Row[];
    }>;
    connect?(): Promise<MarketDataSqlTransactionClient>;
}
export interface MarketDataSqlTransactionClient {
    query<Row>(text: string, values: unknown[]): Promise<{
        rows: Row[];
    }>;
    release(): void;
}
export declare class PostgresCandleRepository implements CandleRepository {
    private readonly client;
    private readonly clock;
    constructor(client: MarketDataSqlClient, clock?: {
        now(): string;
    });
    read(query: {
        pair: string;
        timeframe: Candle["timeframe"];
        includeForming?: boolean;
    }): Promise<Candle[]>;
    upsert(item: Candle): Promise<void>;
}
export declare class PostgresSnapshotRepository implements SnapshotRepository {
    private readonly client;
    constructor(client: MarketDataSqlClient);
    private validateContent;
    create(input: {
        snapshot: DatasetSnapshotRef;
        candles: Candle[];
    }): Promise<DatasetSnapshotRef>;
    read(query: {
        snapshotId: string;
    }): Promise<{
        snapshot: DatasetSnapshotRef;
        candles: Candle[];
    } | undefined>;
}
