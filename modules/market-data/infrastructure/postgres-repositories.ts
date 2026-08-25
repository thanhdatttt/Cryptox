import type { Candle, DatasetSnapshotRef, MarketPairMetadata } from "../domain/contracts";
import type { CandleRepository, SnapshotRepository } from "../application/ports";

export interface MarketDataSqlClient { query<Row>(text: string, values: unknown[]): Promise<{ rows: Row[] }>; }

const number = (value: number | string): number => typeof value === "number" ? value : Number(value);
const date = (value: Date | string): string => new Date(value).toISOString();
const json = <T>(value: T | string): T => typeof value === "string" ? JSON.parse(value) as T : value;

interface CandleRow { pair: string; timeframe: Candle["timeframe"]; timestamp: Date | string; open: number | string; high: number | string; low: number | string; close: number | string; volume: number | string; is_closed: boolean; source?: string; }
interface SnapshotRow { id: string; pair: string; pair_metadata: MarketPairMetadata | string; timeframe: DatasetSnapshotRef["timeframe"]; dataset_from: Date | string; dataset_to: Date | string; candle_count: number; sha256: string; created_at: Date | string; }

const candle = (row: CandleRow): Candle => ({ pair: row.pair, timeframe: row.timeframe, timestamp: date(row.timestamp), open: number(row.open), high: number(row.high), low: number(row.low), close: number(row.close), volume: number(row.volume), isClosed: row.is_closed, ...(row.source === undefined ? {} : { source: row.source }) });
const snapshot = (row: SnapshotRow): DatasetSnapshotRef => ({ id: row.id, pair: row.pair, pairMetadata: json<MarketPairMetadata>(row.pair_metadata), timeframe: row.timeframe, range: { from: date(row.dataset_from), to: date(row.dataset_to) }, candleCount: row.candle_count, sha256: row.sha256, createdAt: date(row.created_at) });

export class PostgresCandleRepository implements CandleRepository {
  constructor(private readonly client: MarketDataSqlClient, private readonly clock: { now(): string } = { now: () => new Date().toISOString() }) {}
  async read(query: { pair: string; timeframe: Candle["timeframe"]; includeForming?: boolean }): Promise<Candle[]> {
    const result = await this.client.query<CandleRow>("SELECT pair, timeframe, timestamp, open, high, low, close, volume, is_closed, source FROM market_candles WHERE pair = $1 AND timeframe = $2 AND ($3 OR is_closed = true) ORDER BY timestamp ASC", [query.pair, query.timeframe, query.includeForming ?? false]);
    return result.rows.map(candle);
  }
  async upsert(item: Candle): Promise<void> { await this.client.query("INSERT INTO market_candles (pair, timeframe, timestamp, open, high, low, close, volume, is_closed, source, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (pair, timeframe, timestamp) DO UPDATE SET open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume, is_closed = EXCLUDED.is_closed, source = EXCLUDED.source, updated_at = EXCLUDED.updated_at", [item.pair, item.timeframe, item.timestamp, item.open, item.high, item.low, item.close, item.volume, item.isClosed, item.source ?? "UNKNOWN", this.clock.now()]); }
}

export class PostgresSnapshotRepository implements SnapshotRepository {
  constructor(private readonly client: MarketDataSqlClient) {}
  async create(input: { snapshot: DatasetSnapshotRef; candles: Candle[] }): Promise<DatasetSnapshotRef> {
    const existing = await this.client.query<SnapshotRow>("SELECT id, pair, pair_metadata, timeframe, dataset_from, dataset_to, candle_count, sha256, created_at FROM market_dataset_snapshots WHERE sha256 = $1", [input.snapshot.sha256]);
    const saved = existing.rows[0] ? snapshot(existing.rows[0]) : input.snapshot;
    if (!existing.rows[0]) await this.client.query("INSERT INTO market_dataset_snapshots (id, pair, pair_metadata, timeframe, dataset_from, dataset_to, candle_count, sha256, created_at) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9)", [saved.id, saved.pair, JSON.stringify(saved.pairMetadata), saved.timeframe, saved.range.from, saved.range.to, saved.candleCount, saved.sha256, saved.createdAt]);
    for (const item of input.candles) await this.client.query("INSERT INTO market_dataset_snapshot_candles (snapshot_id, timestamp, open, high, low, close, volume, is_closed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (snapshot_id, timestamp) DO NOTHING", [saved.id, item.timestamp, item.open, item.high, item.low, item.close, item.volume, item.isClosed]);
    return saved;
  }
  async read(query: { snapshotId: string }): Promise<{ snapshot: DatasetSnapshotRef; candles: Candle[] } | undefined> {
    const head = await this.client.query<SnapshotRow>("SELECT id, pair, pair_metadata, timeframe, dataset_from, dataset_to, candle_count, sha256, created_at FROM market_dataset_snapshots WHERE id = $1", [query.snapshotId]);
    if (!head.rows[0]) return undefined;
    const result = await this.client.query<CandleRow>("SELECT $2::text AS pair, $3::text AS timeframe, timestamp, open, high, low, close, volume, is_closed FROM market_dataset_snapshot_candles WHERE snapshot_id = $1 ORDER BY timestamp ASC", [query.snapshotId, head.rows[0].pair, head.rows[0].timeframe]);
    return { snapshot: snapshot(head.rows[0]), candles: result.rows.map(candle) };
  }
}
