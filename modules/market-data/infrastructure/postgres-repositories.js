"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresSnapshotRepository = exports.PostgresCandleRepository = void 0;
const node_crypto_1 = require("node:crypto");
const errors_1 = require("../domain/errors");
const rules_1 = require("../domain/rules");
const number = (value) => typeof value === "number" ? value : Number(value);
const date = (value) => new Date(value).toISOString();
const json = (value) => typeof value === "string" ? JSON.parse(value) : value;
const candle = (row) => ({ pair: row.pair, timeframe: row.timeframe, timestamp: date(row.timestamp), open: number(row.open), high: number(row.high), low: number(row.low), close: number(row.close), volume: number(row.volume), isClosed: row.is_closed, ...(row.source === undefined ? {} : { source: row.source }) });
const snapshot = (row) => ({ id: row.id, pair: row.pair, pairMetadata: json(row.pair_metadata), timeframe: row.timeframe, range: { from: date(row.dataset_from), to: date(row.dataset_to) }, candleCount: row.candle_count, sha256: row.sha256, createdAt: date(row.created_at) });
class PostgresCandleRepository {
    client;
    clock;
    constructor(client, clock = { now: () => new Date().toISOString() }) {
        this.client = client;
        this.clock = clock;
    }
    async read(query) {
        const result = await this.client.query("SELECT pair, timeframe, timestamp, open, high, low, close, volume, is_closed, source FROM market_candles WHERE pair = $1 AND timeframe = $2 AND ($3 OR is_closed = true) ORDER BY timestamp ASC", [query.pair, query.timeframe, query.includeForming ?? false]);
        return result.rows.map(candle);
    }
    async upsert(item) { await this.client.query("INSERT INTO market_candles (pair, timeframe, timestamp, open, high, low, close, volume, is_closed, source, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (pair, timeframe, timestamp) DO UPDATE SET open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume, is_closed = EXCLUDED.is_closed, source = EXCLUDED.source, updated_at = EXCLUDED.updated_at WHERE NOT market_candles.is_closed OR EXCLUDED.is_closed", [item.pair, item.timeframe, item.timestamp, item.open, item.high, item.low, item.close, item.volume, item.isClosed, item.source ?? "UNKNOWN", this.clock.now()]); }
}
exports.PostgresCandleRepository = PostgresCandleRepository;
class PostgresSnapshotRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    validateContent(input) {
        const { snapshot: ref, candles } = input;
        const sorted = candles;
        const interval = rules_1.TIMEFRAME_SECONDS[ref.timeframe] * 1_000;
        if (!ref.id || ref.candleCount !== sorted.length || sorted.length === 0 || sorted.some((candle, index) => !candle.isClosed || candle.pair !== ref.pair || candle.timeframe !== ref.timeframe || (index > 0 && candle.timestamp <= sorted[index - 1].timestamp)) || new Set(sorted.map((candle) => candle.timestamp)).size !== sorted.length || sorted[0].timestamp !== ref.range.from || sorted.at(-1).timestamp !== new Date(Date.parse(ref.range.to) - interval).toISOString() || rules_1.missingRanges(sorted, ref.range, ref.timeframe).length > 0) {
            throw new errors_1.MarketDataException("DATASET_INTEGRITY_FAILURE", "Dataset snapshot content is incomplete or inconsistent.");
        }
        const expectedHash = (0, node_crypto_1.createHash)("sha256").update((0, rules_1.snapshotSerialization)(ref.pair, ref.timeframe, ref.range, sorted), "utf8").digest("hex");
        if (expectedHash !== ref.sha256)
            throw new errors_1.MarketDataException("DATASET_INTEGRITY_FAILURE", "Dataset snapshot content hash is invalid.");
    }
    async create(input) {
        this.validateContent(input);
        const run = async (client) => {
            const existing = await client.query("SELECT id, pair, pair_metadata, timeframe, dataset_from, dataset_to, candle_count, sha256, created_at FROM market_dataset_snapshots WHERE sha256 = $1 FOR UPDATE", [input.snapshot.sha256]);
            const saved = existing.rows[0] ? snapshot(existing.rows[0]) : input.snapshot;
            if (!existing.rows[0]) {
                await client.query("INSERT INTO market_dataset_snapshots (id, pair, pair_metadata, timeframe, dataset_from, dataset_to, candle_count, sha256, created_at) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9)", [saved.id, saved.pair, JSON.stringify(saved.pairMetadata), saved.timeframe, saved.range.from, saved.range.to, saved.candleCount, saved.sha256, saved.createdAt]);
                for (const item of input.candles)
                    await client.query("INSERT INTO market_dataset_snapshot_candles (snapshot_id, timestamp, open, high, low, close, volume, is_closed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [saved.id, item.timestamp, item.open, item.high, item.low, item.close, item.volume, item.isClosed]);
                const count = await client.query("SELECT COUNT(*)::int AS count FROM market_dataset_snapshot_candles WHERE snapshot_id = $1", [saved.id]);
                if (count.rows[0] && Number(count.rows[0].count) !== saved.candleCount)
                    throw new errors_1.MarketDataException("DATASET_INTEGRITY_FAILURE", "Dataset snapshot child count does not match metadata.");
            }
            return saved;
        };
        if (!this.client.connect)
            return run(this.client);
        const transaction = await this.client.connect();
        try {
            await transaction.query("BEGIN", []);
            const saved = await run(transaction);
            await transaction.query("COMMIT", []);
            return saved;
        }
        catch (error) {
            try {
                await transaction.query("ROLLBACK", []);
            }
            catch { /* preserve the original failure */ }
            throw error;
        }
        finally {
            transaction.release();
        }
    }
    async read(query) {
        const head = await this.client.query("SELECT id, pair, pair_metadata, timeframe, dataset_from, dataset_to, candle_count, sha256, created_at FROM market_dataset_snapshots WHERE id = $1", [query.snapshotId]);
        if (!head.rows[0])
            return undefined;
        const result = await this.client.query("SELECT $2::text AS pair, $3::text AS timeframe, timestamp, open, high, low, close, volume, is_closed FROM market_dataset_snapshot_candles WHERE snapshot_id = $1 ORDER BY timestamp ASC", [query.snapshotId, head.rows[0].pair, head.rows[0].timeframe]);
        const ref = snapshot(head.rows[0]);
        const candles = result.rows.map(candle);
        try {
            this.validateContent({ snapshot: ref, candles });
        }
        catch (error) {
            if (error instanceof errors_1.MarketDataException)
                throw error;
            throw new errors_1.MarketDataException("DATASET_INTEGRITY_FAILURE", "Dataset snapshot content is invalid.");
        }
        return { snapshot: ref, candles };
    }
}
exports.PostgresSnapshotRepository = PostgresSnapshotRepository;
