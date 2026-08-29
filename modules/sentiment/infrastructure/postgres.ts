import { randomUUID } from "node:crypto";
import { SENTIMENT_LABELS, type SentimentLabel } from "../api/contracts";
import type { SentimentResultRepository, SentimentStoredResult } from "../application/ports";

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

export interface PostgresSentimentOptions {
  readonly connectionString: string;
  readonly pool?: PostgresPool;
  readonly maxConnections?: number;
}

export interface PostgresSentimentDependencies {
  readonly pool: PostgresPool;
  readonly resultRepository: SentimentResultRepository;
  close(): Promise<void>;
}

interface SentimentRow extends Record<string, unknown> {
  news_id: string;
  label: string;
  score: string | number;
  provider_id: string;
  analysis_profile_id: string;
  model_name: string;
  model_version: string;
  analyzed_at: string;
}

function textColumn(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`invalid sentiment ${field} in persistence`);
  }
  return value;
}

function timestampColumn(value: unknown, field: string): string {
  const parsed = Date.parse(String(value));
  if (!Number.isFinite(parsed)) throw new Error(`invalid sentiment ${field} in persistence`);
  return new Date(parsed).toISOString();
}

function scoreColumn(value: unknown): number {
  const score = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(score) || score < -1 || score > 1) {
    throw new Error("invalid sentiment score in persistence");
  }
  return score;
}

function resultFromRow(row: SentimentRow): SentimentStoredResult {
  const label = textColumn(row.label, "label") as SentimentLabel;
  if (!SENTIMENT_LABELS.includes(label)) throw new Error("invalid sentiment label in persistence");
  return {
    newsId: textColumn(row.news_id, "news_id"),
    label,
    score: scoreColumn(row.score),
    providerId: textColumn(row.provider_id, "provider_id"),
    analysisProfileId: textColumn(row.analysis_profile_id, "analysis_profile_id"),
    modelName: textColumn(row.model_name, "model_name"),
    modelVersion: textColumn(row.model_version, "model_version"),
    analyzedAt: timestampColumn(row.analyzed_at, "analyzed_at"),
  };
}

function poolFromOptions(options: PostgresSentimentOptions): PostgresPool {
  if (options.pool) return options.pool;
  const { Pool } = require("pg") as {
    Pool: new (config: { connectionString: string; max: number; application_name: string }) => PostgresPool;
  };
  return new Pool({
    connectionString: options.connectionString,
    max: options.maxConnections ?? 5,
    application_name: "cryptox-sentiment",
  });
}

export function createPostgresSentimentDependencies(
  options: PostgresSentimentOptions,
): PostgresSentimentDependencies {
  if (!options.connectionString.trim() && !options.pool) {
    throw new Error("Sentiment PostgreSQL connection string is required");
  }
  const pool = poolFromOptions(options);
  let closed = false;

  const resultRepository: SentimentResultRepository = {
    async insert(result): Promise<SentimentStoredResult> {
      const persisted = await pool.query<SentimentRow>(
        `
          INSERT INTO sentiment_results
            (id, news_id, label, score, provider_id, analysis_profile_id,
             model_name, model_version, analyzed_at)
          VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9::timestamptz)
          ON CONFLICT (news_id, model_name, model_version) DO UPDATE SET
            label = EXCLUDED.label,
            score = EXCLUDED.score,
            provider_id = EXCLUDED.provider_id,
            analysis_profile_id = EXCLUDED.analysis_profile_id,
            analyzed_at = EXCLUDED.analyzed_at
          RETURNING news_id::text, label, score, provider_id, analysis_profile_id,
            model_name, model_version, analyzed_at::text
        `,
        [
          randomUUID(),
          result.newsId,
          result.label,
          result.score,
          result.providerId,
          result.analysisProfileId,
          result.modelName,
          result.modelVersion,
          result.analyzedAt,
        ],
      );
      const row = persisted.rows[0];
      if (!row) throw new Error("sentiment result insert returned no row");
      return resultFromRow(row);
    },

    async readLatestForNews(newsId): Promise<SentimentStoredResult | undefined> {
      const result = await pool.query<SentimentRow>(
        `
          SELECT news_id::text, label, score, provider_id, analysis_profile_id,
            model_name, model_version, analyzed_at::text
          FROM sentiment_results
          WHERE news_id = $1::uuid
          ORDER BY analyzed_at DESC, id DESC
          LIMIT 1
        `,
        [newsId],
      );
      return result.rows[0] ? resultFromRow(result.rows[0]) : undefined;
    },
  };

  return {
    pool,
    resultRepository,
    close: async () => {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}

