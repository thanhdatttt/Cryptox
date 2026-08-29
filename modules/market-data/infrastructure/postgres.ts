import { randomUUID } from "node:crypto";
import type { Candle } from "../domain/contracts";
import type {
  CandleRepository,
  DatasetSnapshotCreateInput,
  DatasetSnapshotReadInput,
  DatasetSnapshotRecord,
  DatasetSnapshotPage,
  MarketDataHistoryRequest,
  SnapshotRepository,
} from "../application/ports";

export interface PostgresQueryResult<Row extends Record<string, unknown> = Record<string, unknown>> {
  readonly rows: Row[];
  readonly rowCount?: number | null;
}

export interface PostgresPool {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: unknown[]): Promise<PostgresQueryResult<Row>>;
  end(): Promise<void>;
}

export interface PostgresMarketDataOptions {
  readonly connectionString: string;
  readonly pool?: PostgresPool;
  readonly maxConnections?: number;
}

export interface PostgresMarketDataDependencies {
  readonly pool: PostgresPool;
  readonly candleRepository: CandleRepository;
  readonly snapshotRepository: SnapshotRepository;
  close(): Promise<void>;
}

interface CandleRow extends Record<string, unknown> {
  pair: string;
  timeframe: Candle["timeframe"];
  timestamp: string;
  open: string | number;
  high: string | number;
  low: string | number;
  close: string | number;
  volume: string | number;
  is_closed: boolean;
}

interface SnapshotRow extends Record<string, unknown> {
  id: string;
  provider_id: string;
  pair: string;
  timeframe: Candle["timeframe"];
  range_from: string;
  range_to: string;
  candle_count: string | number;
  replay_guarantee: "EXACT_REPLAY_AVAILABLE" | "TRACEABLE";
  dataset_version: string | null;
  replay_limitation: string | null;
  created_at: string;
}

function cursor(timestamp: string): string {
  return Buffer.from(JSON.stringify({ timestamp }), "utf8").toString("base64url");
}

function cursorTimestamp(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { timestamp?: unknown };
    if (typeof parsed.timestamp !== "string" || !Number.isFinite(Date.parse(parsed.timestamp))) throw new Error("invalid cursor");
    return new Date(Date.parse(parsed.timestamp)).toISOString();
  } catch {
    throw new Error("invalid dataset cursor");
  }
}

function numberColumn(value: unknown, field: string): number {
  const result = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(result)) throw new Error(`invalid market data ${field} in persistence`);
  return result;
}

function timestampColumn(value: unknown, field: string): string {
  const parsed = Date.parse(String(value));
  if (!Number.isFinite(parsed)) throw new Error(`invalid market data ${field} in persistence`);
  return new Date(parsed).toISOString();
}

function candleFromRow(row: CandleRow): Candle {
  return {
    pair: row.pair,
    timeframe: row.timeframe,
    timestamp: timestampColumn(row.timestamp, "timestamp"),
    open: numberColumn(row.open, "open"),
    high: numberColumn(row.high, "high"),
    low: numberColumn(row.low, "low"),
    close: numberColumn(row.close, "close"),
    volume: numberColumn(row.volume, "volume"),
    isClosed: row.is_closed,
  };
}

function snapshotFromRow(row: SnapshotRow): DatasetSnapshotRecord {
  const base = {
    id: row.id,
    provider: row.provider_id,
    pair: row.pair,
    timeframe: row.timeframe,
    range: { from: timestampColumn(row.range_from, "range_from"), to: timestampColumn(row.range_to, "range_to") },
    candleCount: numberColumn(row.candle_count, "candle_count"),
    createdAt: timestampColumn(row.created_at, "created_at"),
  };
  if (row.replay_guarantee === "EXACT_REPLAY_AVAILABLE" && row.dataset_version) {
    return { ...base, replayGuarantee: row.replay_guarantee, version: row.dataset_version };
  }
  if (row.replay_guarantee === "TRACEABLE" && row.replay_limitation) {
    return {
      ...base,
      replayGuarantee: row.replay_guarantee,
      ...(row.dataset_version ? { version: row.dataset_version } : {}),
      replayLimitation: row.replay_limitation,
    };
  }
  throw new Error("invalid dataset provenance in persistence");
}

function poolFromOptions(options: PostgresMarketDataOptions): PostgresPool {
  if (options.pool) return options.pool;
  const { Pool } = require("pg") as {
    Pool: new (config: { connectionString: string; max: number; application_name: string }) => PostgresPool;
  };
  return new Pool({
    connectionString: options.connectionString,
    max: options.maxConnections ?? 5,
    application_name: "cryptox-market-data",
  });
}

export function createPostgresMarketDataDependencies(options: PostgresMarketDataOptions): PostgresMarketDataDependencies {
  if (!options.connectionString.trim() && !options.pool) throw new Error("Market Data PostgreSQL connection string is required");
  const pool = poolFromOptions(options);
  let closed = false;

  const candleRepository: CandleRepository = {
    async upsertMany(candles): Promise<void> {
      for (const candle of candles) {
        await pool.query(
          `
            INSERT INTO market_candles
              (pair, timeframe, timestamp, open, high, low, close, volume, is_closed)
            VALUES ($1, $2, $3::timestamptz, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (pair, timeframe, timestamp) DO UPDATE SET
              open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
              close = EXCLUDED.close, volume = EXCLUDED.volume,
              is_closed = market_candles.is_closed OR EXCLUDED.is_closed
          `,
          [candle.pair, candle.timeframe, candle.timestamp, candle.open, candle.high, candle.low, candle.close, candle.volume, candle.isClosed],
        );
      }
    },
    async read(request): Promise<Candle[]> {
      const after = cursorTimestamp(request.cursor);
      const values: unknown[] = [request.pair, request.timeframe, request.range.from, request.range.to];
      const cursorClause = after ? `AND timestamp > $5::timestamptz` : "";
      if (after) values.push(after);
      const limit = request.limit ?? 1_000;
      values.push(limit);
      const result = await pool.query<CandleRow>(
        `
          SELECT pair, timeframe, timestamp::text, open, high, low, close, volume, is_closed
          FROM market_candles
          WHERE pair = $1 AND timeframe = $2
            AND timestamp >= $3::timestamptz AND timestamp < $4::timestamptz
            ${cursorClause}
          ORDER BY timestamp ASC
          LIMIT $${values.length}
        `,
        values,
      );
      return result.rows.map(candleFromRow);
    },
  };

  const snapshotRepository: SnapshotRepository = {
    async create(command: DatasetSnapshotCreateInput): Promise<DatasetSnapshotRecord> {
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      const version = "1";
      await pool.query("BEGIN");
      try {
        const countResult = await pool.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM market_candles WHERE pair = $1 AND timeframe = $2 AND timestamp >= $3::timestamptz AND timestamp < $4::timestamptz`,
          [command.pair, command.timeframe, command.range.from, command.range.to],
        );
        const candleCount = Number(countResult.rows[0]?.count ?? 0);
        const result = await pool.query<SnapshotRow>(
          `
            INSERT INTO market_dataset_snapshots
              (id, provider_id, pair, timeframe, range_from, range_to, candle_count,
               replay_guarantee, dataset_version, replay_limitation, created_at)
            VALUES ($1::uuid, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7,
                    'EXACT_REPLAY_AVAILABLE', $8, NULL, $9::timestamptz)
            RETURNING id::text, provider_id, pair, timeframe, range_from::text,
              range_to::text, candle_count, replay_guarantee, dataset_version,
              replay_limitation, created_at::text
          `,
          [id, command.provider, command.pair, command.timeframe, command.range.from, command.range.to, candleCount, version, createdAt],
        );
        await pool.query(
          `
            INSERT INTO market_dataset_snapshot_candles
              (snapshot_id, timestamp, open, high, low, close, volume, is_closed)
            SELECT $1::uuid, timestamp, open, high, low, close, volume, is_closed
            FROM market_candles
            WHERE pair = $2 AND timeframe = $3
              AND timestamp >= $4::timestamptz AND timestamp < $5::timestamptz
          `,
          [id, command.pair, command.timeframe, command.range.from, command.range.to],
        );
        await pool.query("COMMIT");
        const row = result.rows[0];
        if (!row) throw new Error("dataset snapshot insert returned no row");
        return snapshotFromRow(row);
      } catch (error) {
        await pool.query("ROLLBACK").catch(() => undefined);
        throw error;
      }
    },
    async read(query: DatasetSnapshotReadInput): Promise<DatasetSnapshotPage | undefined> {
      const snapshotResult = await pool.query<SnapshotRow>(
        `
          SELECT id::text, provider_id, pair, timeframe, range_from::text,
            range_to::text, candle_count, replay_guarantee, dataset_version,
            replay_limitation, created_at::text
          FROM market_dataset_snapshots
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [query.snapshotId],
      );
      const snapshotRow = snapshotResult.rows[0];
      if (!snapshotRow) return undefined;
      const snapshot = snapshotFromRow(snapshotRow);
      const after = cursorTimestamp(query.cursor);
      const limit = query.limit ?? 1_000;
      const values: unknown[] = [query.snapshotId];
      const cursorClause = after ? "AND timestamp > $2::timestamptz" : "";
      if (after) values.push(after);
      values.push(limit + 1);
      const result = await pool.query<CandleRow>(
        `
          SELECT timestamp::text, open, high, low, close, volume, is_closed
          FROM market_dataset_snapshot_candles
          WHERE snapshot_id = $1::uuid ${cursorClause}
          ORDER BY timestamp ASC
          LIMIT $${values.length}
        `,
        values,
      );
      const hasMore = result.rows.length > limit;
      const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
      return {
        snapshot,
        candles: rows.map((row) => candleFromRow({ ...row, pair: snapshot.pair, timeframe: snapshot.timeframe })),
        ...(hasMore && rows.at(-1) ? { nextCursor: cursor(rows.at(-1)!.timestamp) } : {}),
      };
    },
  };

  return {
    pool,
    candleRepository,
    snapshotRepository,
    close: async () => {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}
