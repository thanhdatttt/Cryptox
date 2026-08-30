import type {
  ExtractionTemplateRecord,
  NewsReadRecordQuery,
  NewsRecordPage,
  NewsRepository,
  NormalizedNewsItemRecord,
  StoredNewsExtractionProvenance,
} from "../application/ports";
import { normalizeExtractionProvenance, normalizeNewsItem } from "../application/normalization";
import { createPostgresNewsMetadataDependencies } from "./extraction-postgres";
import type { PostgresNewsMetadataDependencies } from "./extraction-postgres";
import type { PostgresPool, PostgresQueryResult } from "./postgres-types";

export type { PostgresPool, PostgresQueryResult } from "./postgres-types";

export interface PostgresNewsOptions {
  readonly connectionString: string;
  readonly pool?: PostgresPool;
  readonly maxConnections?: number;
}

export interface PostgresNewsDependencies extends PostgresNewsMetadataDependencies {
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
  canonical_url?: unknown;
  normalized_content_hash?: unknown;
  normalized_retain_until?: unknown;
  extraction_source_kind?: unknown;
  extraction_canonical_url?: unknown;
  extraction_normalized_content_hash?: unknown;
  extraction_template_id?: unknown;
  extraction_template_source_id?: unknown;
  extraction_template_version?: unknown;
  extraction_template_status?: unknown;
  extraction_extracted_at?: unknown;
  extraction_normalized_retain_until?: unknown;
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
  const canonicalUrl = typeof row.canonical_url === "string" && row.canonical_url.trim() ? row.canonical_url : row.url;
  const normalizedContentHash = typeof row.normalized_content_hash === "string" && row.normalized_content_hash.trim()
    ? row.normalized_content_hash
    : undefined;
  const extractionSourceKind = row.extraction_source_kind;
  const hasExtraction = extractionSourceKind === "CONFIGURED_WEBSITE"
    || extractionSourceKind === "RSS"
    || extractionSourceKind === "HTML"
    || extractionSourceKind === "ALLOWLISTED_URL_IMPORT";
  const extraction = hasExtraction
    ? normalizeExtractionProvenance({
      sourceKind: extractionSourceKind,
      canonicalUrl: typeof row.extraction_canonical_url === "string" ? row.extraction_canonical_url : canonicalUrl,
      normalizedContentHash: typeof row.extraction_normalized_content_hash === "string"
        ? row.extraction_normalized_content_hash
        : normalizedContentHash,
      ...(typeof row.extraction_template_id === "string" && typeof row.extraction_template_source_id === "string"
        && Number.isSafeInteger(Number(row.extraction_template_version)) && typeof row.extraction_template_status === "string"
        ? {
          template: {
            id: row.extraction_template_id,
            sourceId: row.extraction_template_source_id,
            version: Number(row.extraction_template_version),
            status: row.extraction_template_status,
          },
        }
        : {}),
      extractedAt: typeof row.extraction_extracted_at === "string" ? row.extraction_extracted_at : row.crawled_at,
      normalizedRetainUntil: typeof row.extraction_normalized_retain_until === "string"
        ? row.extraction_normalized_retain_until
        : undefined,
    }, {
      canonicalUrl,
      normalizedContentHash: normalizedContentHash ?? "",
      extractedAt: row.crawled_at,
    })
    : undefined;
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
    url: canonicalUrl,
    ...(normalizedContentHash === undefined ? {} : { normalizedContentHash }),
    ...(typeof row.normalized_retain_until === "string" ? { normalizedRetainUntil: row.normalized_retain_until } : {}),
    ...(extraction === undefined ? {} : { extraction }),
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
      const normalizedItem = normalizeNewsItem(item, item.providerId);
      const values = [
        normalizedItem.id,
        normalizedItem.providerId,
        normalizedItem.providerItemId,
        normalizedItem.title,
        normalizedItem.content,
        normalizedItem.source,
        normalizedItem.publishedAt,
        normalizedItem.crawledAt,
        JSON.stringify(normalizedItem.relatedCoins),
        normalizedItem.url,
        normalizedItem.canonicalUrl ?? normalizedItem.url,
        normalizedItem.normalizedContentHash,
        normalizedItem.normalizedRetainUntil ?? new Date(Date.parse(normalizedItem.crawledAt) + 90 * 24 * 60 * 60 * 1_000).toISOString(),
      ];
      const insert = await pool.query<NewsRow>(
        `
          INSERT INTO news_items
            (id, provider_id, provider_item_id, title, content, source,
             published_at, crawled_at, related_coins, url, canonical_url,
             normalized_content_hash, normalized_retain_until)
          VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz,
             $9::jsonb, $10, $11, $12, $13::timestamptz)
          ON CONFLICT DO NOTHING
          RETURNING id::text, provider_id, provider_item_id, title, content, source,
            published_at::text, crawled_at::text, related_coins, url,
            canonical_url, normalized_content_hash, normalized_retain_until::text
        `,
        values,
      );
      if (insert.rows[0]) return { item: itemFromRow(insert.rows[0]), inserted: true };
      const existing = await pool.query<NewsRow>(
        `
          SELECT id::text, provider_id, provider_item_id, title, content, source,
            published_at::text, crawled_at::text, related_coins, url,
            canonical_url, normalized_content_hash, normalized_retain_until::text
          FROM news_items
          WHERE provider_id = $1 AND provider_item_id = $2
             OR canonical_url = $3
             OR normalized_content_hash = $4
          ORDER BY CASE WHEN provider_id = $1 AND provider_item_id = $2 THEN 0 ELSE 1 END
          LIMIT 1
        `,
        [normalizedItem.providerId, normalizedItem.providerItemId, normalizedItem.canonicalUrl ?? normalizedItem.url, normalizedItem.normalizedContentHash],
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
            published_at::text, crawled_at::text, related_coins, url,
            canonical_url, normalized_content_hash, normalized_retain_until::text,
            extraction.source_kind AS extraction_source_kind,
            extraction.canonical_url AS extraction_canonical_url,
            extraction.normalized_content_hash AS extraction_normalized_content_hash,
            extraction.template_id AS extraction_template_id,
            template.source_id AS extraction_template_source_id,
            template.version AS extraction_template_version,
            template.status AS extraction_template_status,
            extraction.extracted_at::text AS extraction_extracted_at,
            extraction.retain_until::text AS extraction_normalized_retain_until
          FROM news_items
          LEFT JOIN news_extraction_provenance extraction ON extraction.news_id = news_items.id
          LEFT JOIN extraction_templates template ON template.id = extraction.template_id
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
    async purgeExpired(now: string): Promise<number> {
      const result = await pool.query(
        `
          DELETE FROM news_items AS candidate
          WHERE candidate.normalized_retain_until IS NOT NULL
            AND candidate.normalized_retain_until <= $1::timestamptz
            AND NOT EXISTS (
              SELECT 1
              FROM sentiment_results sentiment
              WHERE sentiment.news_id = candidate.id
            )
            AND NOT EXISTS (
              SELECT 1
              FROM strategy_authoring_drafts draft
              WHERE draft.source_news_item_id = candidate.id
            )
        `,
        [now],
      );
      return result.rowCount ?? 0;
    },
  };
  const metadata = createPostgresNewsMetadataDependencies(pool);
  return {
    pool,
    newsRepository,
    ...metadata,
    close: async () => {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}
