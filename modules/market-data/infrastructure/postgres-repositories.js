"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresSnapshotRepository = exports.PostgresCandleRepository = void 0;
const number = (value) => typeof value === "number" ? value : Number(value);
const date = (value) => new Date(value).toISOString();
const json = (value) => typeof value === "string" ? JSON.parse(value) : value;
const candle = (row) => ({ pair: row.pair, timeframe: row.timeframe, timestamp: date(row.timestamp), open: number(row.open), high: number(row.high), low: number(row.low), close: number(row.close), volume: number(row.volume), isClosed: row.is_closed });
const snapshot = (row) => ({ id: row.id, pair: row.pair, pairMetadata: json(row.pair_metadata), timeframe: row.timeframe, range: { from: date(row.dataset_from), to: date(row.dataset_to) }, candleCount: row.candle_count, sha256: row.sha256, createdAt: date(row.created_at) });
class PostgresCandleRepository {
    client;
    clock;
    constructor(client, clock = { now: () => new Date().toISOString() }) {
        this.client = client;
        this.clock = clock;
    }
    async read(query) {
        const result = await this.client.query("SELECT pair, timeframe, timestamp, open, high, low, close, volume, is_closed FROM market_candles WHERE pair = $1 AND timeframe = $2 AND ($3 OR is_closed = true) ORDER BY timestamp ASC", [query.pair, query.timeframe, query.includeForming ?? false]);
        return result.rows.map(candle);
    }
    async upsert(item) { await this.client.query("INSERT INTO market_candles (pair, timeframe, timestamp, open, high, low, close, volume, is_closed, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (pair, timeframe, timestamp) DO UPDATE SET open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume, is_closed = EXCLUDED.is_closed, updated_at = EXCLUDED.updated_at", [item.pair, item.timeframe, item.timestamp, item.open, item.high, item.low, item.close, item.volume, item.isClosed, this.clock.now()]); }
}
exports.PostgresCandleRepository = PostgresCandleRepository;
class PostgresSnapshotRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async create(input) {
        const existing = await this.client.query("SELECT id, pair, pair_metadata, timeframe, dataset_from, dataset_to, candle_count, sha256, created_at FROM market_dataset_snapshots WHERE sha256 = $1", [input.snapshot.sha256]);
        const saved = existing.rows[0] ? snapshot(existing.rows[0]) : input.snapshot;
        if (!existing.rows[0])
            await this.client.query("INSERT INTO market_dataset_snapshots (id, pair, pair_metadata, timeframe, dataset_from, dataset_to, candle_count, sha256, created_at) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9)", [saved.id, saved.pair, JSON.stringify(saved.pairMetadata), saved.timeframe, saved.range.from, saved.range.to, saved.candleCount, saved.sha256, saved.createdAt]);
        for (const item of input.candles)
            await this.client.query("INSERT INTO market_dataset_snapshot_candles (snapshot_id, timestamp, open, high, low, close, volume, is_closed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (snapshot_id, timestamp) DO NOTHING", [saved.id, item.timestamp, item.open, item.high, item.low, item.close, item.volume, item.isClosed]);
        return saved;
    }
    async read(query) {
        const head = await this.client.query("SELECT id, pair, pair_metadata, timeframe, dataset_from, dataset_to, candle_count, sha256, created_at FROM market_dataset_snapshots WHERE id = $1", [query.snapshotId]);
        if (!head.rows[0])
            return undefined;
        const result = await this.client.query("SELECT $2::text AS pair, $3::text AS timeframe, timestamp, open, high, low, close, volume, is_closed FROM market_dataset_snapshot_candles WHERE snapshot_id = $1 ORDER BY timestamp ASC", [query.snapshotId, head.rows[0].pair, head.rows[0].timeframe]);
        return { snapshot: snapshot(head.rows[0]), candles: result.rows.map(candle) };
    }
}
exports.PostgresSnapshotRepository = PostgresSnapshotRepository;
