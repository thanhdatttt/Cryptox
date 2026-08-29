import type {
  NewsReadRecordQuery,
  NewsRecordPage,
  NewsRepository,
  NormalizedNewsItemRecord,
} from "../application/ports";
import { normalizeNewsItem } from "../application/normalization";

export interface PostgresQueryResult<Row extends Record<string, unknown> = Record<string, unknown>> {
  readonly rows: Row[];
  readonly rowCount?: number | null;
}

export interface PostgresPool {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<PostgresQueryResult<Row>>;
  end(): Promise<void>;
}

export interface PostgresNewsOptions {
  readonly connectionString: string;
  readonly pool?: PostgresPool;
  readonly maxConnections?: number;
}

export interface PostgresNewsDependencies {
  readonly pool: PostgresPool;
  readonly newsRepository: NewsRepository;
  close(): Promise<void>;
}

interface NewsRow extends Record<string, unknown> {
  id: string;
  provider_id: string;
  provider_item_id: string;
  title: string;
  content: string;
  source: string;
  published_at: string;
  crawled_at: string;
  related_coins: unknown;
  url: string;
}

interface NewsCursor {
  publishedAt: string;
  providerId: string;
  providerItemId: string;
}

function cursor(item: Pick<NormalizedNewsItemRecord, "publishedAt" | "providerId" | "providerItemId">): string {
  return Buffer.from(JSON.stringify({
    publishedAt: item.publishedAt,
    providerId: item.providerId,
    providerItemId: item.providerItemId,
  }), "utf8").toString("base64url");
}

function cursorValue(value: string | undefined): NewsCursor | undefined {
  if (value === undefined) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<NewsCursor>;
    if (typeof parsed.publishedAt !== "string" || !Number.isFinite(Date.parse(parsed.publishedAt))) throw new Error("invalid timestamp");
    if (typeof parsed.providerId !== "string" || !parsed.providerId || typeof parsed.providerItemId !== "string" || !parsed.providerItemId) {
      throw new Error("invalid identity");
    }
    return {
      publishedAt: new Date(Date.parse(parsed.publishedAt)).toISOString(),
      providerId: parsed.providerId,
      providerItemId: parsed.providerItemId,
    };
  } catch {
    throw new Error("invalid News cursor");
  }
}

function relatedCoins(value: unknown): string[] {
  const parsed = typeof value === "string" ? JSON.parse(value) as unknown : value;
  if (!Array.isArray(parsed) || parsed.some((coin) => typeof coin !== "string")) {
    throw new Error("persistence returned invalid related coins");
  }
  return parsed;
}

function itemFromRow(row: NewsRow): NormalizedNewsItemRecord {
  return normalizeNewsItem({
    id: row.id,
    providerId: row.provider_id,
    providerItemId: row.provider_item_id,
    title: row.title,
    content: row.content,
    source: row.source,
    publishedAt: row.published_at,
    crawledAt: row.crawled_at,
    relatedCoins: relatedCoins(row.related_coins),
    url: row.url,
  }, row.provider_id);
}

function poolFromOptions(options: PostgresNewsOptions): PostgresPool {
  if (options.pool) return options.pool;
  const { Pool } = require("pg") as {
    Pool: new (config: { connectionString: string; max: number; application_name: string }) => PostgresPool;
  };
  return new Pool({
    connectionString: options.connectionString,
    max: options.maxConnections ?? 5,
    application_name: "cryptox-news",
  });
}

export function createPostgresNewsDependencies(options: PostgresNewsOptions): PostgresNewsDependencies {
  if (!options.pool && !options.connectionString.trim()) throw new Error("News PostgreSQL connection string is required");
  const pool = poolFromOptions(options);
  let closed = false;
  const newsRepository: NewsRepository = {
    async upsertByProviderIdentity(item): Promise<{ item: NormalizedNewsItemRecord; inserted: boolean }> {
      const values = [
        item.id,
        item.providerId,
        item.providerItemId,
        item.title,
        item.content,
        item.source,
        item.publishedAt,
        item.crawledAt,
        JSON.stringify(item.relatedCoins),
        item.url,
      ];
      const insert = await pool.query<NewsRow>(
        `
          INSERT INTO news_items
            (id, provider_id, provider_item_id, title, content, source,
             published_at, crawled_at, related_coins, url)
          VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz, $9::jsonb, $10)
          ON CONFLICT (provider_id, provider_item_id) DO NOTHING
          RETURNING id::text, provider_id, provider_item_id, title, content, source,
            published_at::text, crawled_at::text, related_coins, url
        `,
        values,
      );
      if (insert.rows[0]) return { item: itemFromRow(insert.rows[0]), inserted: true };
      const existing = await pool.query<NewsRow>(
        `
          SELECT id::text, provider_id, provider_item_id, title, content, source,
            published_at::text, crawled_at::text, related_coins, url
          FROM news_items
          WHERE provider_id = $1 AND provider_item_id = $2
          LIMIT 1
        `,
        [item.providerId, item.providerItemId],
      );
      const row = existing.rows[0];
      if (!row) throw new Error("News deduplication lookup returned no row");
      return { item: itemFromRow(row), inserted: false };
    },

    async read(query: NewsReadRecordQuery): Promise<NewsRecordPage> {
      if (!Number.isSafeInteger(query.limit) || query.limit < 1) throw new Error("invalid News read limit");
      const values: unknown[] = [];
      const bind = (value: unknown): string => {
        values.push(value);
        return `$${values.length}`;
      };
      const where: string[] = [];
      if (query.relatedCoins !== undefined && query.relatedCoins.length > 0) {
        const related = bind(query.relatedCoins);
        where.push(`related_coins ?| ${related}::text[]`);
      }
      if (query.publishedFrom !== undefined) where.push(`published_at >= ${bind(query.publishedFrom)}::timestamptz`);
      if (query.publishedTo !== undefined) where.push(`published_at < ${bind(query.publishedTo)}::timestamptz`);
      const after = cursorValue(query.cursor);
      if (after) {
        const publishedAt = bind(after.publishedAt);
        const providerId = bind(after.providerId);
        const providerItemId = bind(after.providerItemId);
        where.push(`(
          published_at < ${publishedAt}::timestamptz
          OR (published_at = ${publishedAt}::timestamptz AND provider_id > ${providerId})
          OR (published_at = ${publishedAt}::timestamptz AND provider_id = ${providerId} AND provider_item_id > ${providerItemId})
        )`);
      }
      const limit = bind(query.limit + 1);
      const result = await pool.query<NewsRow>(
        `
          SELECT id::text, provider_id, provider_item_id, title, content, source,
            published_at::text, crawled_at::text, related_coins, url
          FROM news_items
          ${where.length > 0 ? `WHERE ${where.join("\n            AND ")}` : ""}
          ORDER BY published_at DESC, provider_id ASC, provider_item_id ASC
          LIMIT ${limit}
        `,
        values,
      );
      const hasMore = result.rows.length > query.limit;
      const rows = hasMore ? result.rows.slice(0, query.limit) : result.rows;
      const items = rows.map(itemFromRow);
      return {
        items,
        ...(hasMore && items.length > 0 ? { nextCursor: cursor(items.at(-1)!) } : {}),
      };
    },
  };
  return {
    pool,
    newsRepository,
    close: async () => {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}
