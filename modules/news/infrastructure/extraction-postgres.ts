import { randomUUID } from "node:crypto";
import type {
  ExtractionTemplateRecord,
  ExtractionTemplateRepository,
  NewsExtractionProvenanceRepository,
  NewsRawHtmlArtifact,
  NewsRawHtmlRepository,
  StoredNewsExtractionProvenance,
} from "../application/ports";
import { normalizeExtractionProvenance } from "../application/normalization";
import type { PostgresPool, PostgresQueryResult } from "./postgres";

interface TemplateRow extends Record<string, unknown> {
  id: string;
  source_id: string;
  version: number;
  status: "DRAFT" | "APPROVED" | "RETIRED";
  configuration: unknown;
  supersedes_template_id?: string | null;
  refinement_diff?: unknown;
  quality_metrics?: unknown;
  created_at: string;
  approved_at?: string | null;
  retain_until: string;
}

interface ProvenanceRow extends Record<string, unknown> {
  id: string;
  news_id: string;
  source_kind: "CONFIGURED_WEBSITE" | "RSS" | "HTML" | "ALLOWLISTED_URL_IMPORT";
  canonical_url: string;
  normalized_content_hash: string;
  template_id?: string | null;
  template_source_id?: string | null;
  template_version?: number | string | null;
  template_status?: "DRAFT" | "APPROVED" | "RETIRED" | null;
  extracted_at: string;
  retain_until: string;
}

interface RawHtmlRow extends Record<string, unknown> {
  id: string;
  news_id: string;
  body: string;
  collected_at: string;
  purge_after: string;
}

function jsonObject(value: unknown, field: string): Readonly<Record<string, unknown>> {
  const parsed = typeof value === "string" ? JSON.parse(value) as unknown : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`invalid ${field} in persistence`);
  return parsed as Readonly<Record<string, unknown>>;
}

function optionalJsonObject(value: unknown, field: string): Readonly<Record<string, string | number | boolean>> | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = jsonObject(value, field);
  const entries = Object.entries(parsed);
  if (entries.some(([, entry]) => typeof entry !== "string" && typeof entry !== "number" && typeof entry !== "boolean")) {
    throw new Error(`invalid ${field} in persistence`);
  }
  return Object.fromEntries(entries) as Readonly<Record<string, string | number | boolean>>;
}

function optionalMetrics(value: unknown): Readonly<Record<string, number>> | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = jsonObject(value, "quality_metrics");
  const entries = Object.entries(parsed);
  if (entries.some(([, entry]) => typeof entry !== "number" || !Number.isFinite(entry))) {
    throw new Error("invalid quality_metrics in persistence");
  }
  return Object.fromEntries(entries) as Readonly<Record<string, number>>;
}

function templateFromRow(row: TemplateRow): ExtractionTemplateRecord {
  const diff = optionalJsonObject(row.refinement_diff, "refinement_diff");
  const metrics = optionalMetrics(row.quality_metrics);
  const template: ExtractionTemplateRecord = {
    id: row.id,
    sourceId: row.source_id,
    version: Number(row.version),
    status: row.status,
    configuration: jsonObject(row.configuration, "configuration"),
    ...(row.supersedes_template_id ? { supersedesTemplateId: row.supersedes_template_id } : {}),
    ...(diff === undefined ? {} : { diff }),
    ...(metrics === undefined ? {} : { metrics }),
    createdAt: new Date(Date.parse(row.created_at)).toISOString(),
    ...(row.approved_at ? { approvedAt: new Date(Date.parse(row.approved_at)).toISOString() } : {}),
    retainUntil: new Date(Date.parse(row.retain_until)).toISOString(),
  };
  return template;
}

function provenanceFromRow(row: ProvenanceRow): StoredNewsExtractionProvenance {
  const hasTemplate = typeof row.template_id === "string"
    && typeof row.template_source_id === "string"
    && Number.isSafeInteger(Number(row.template_version))
    && (row.template_status === "DRAFT" || row.template_status === "APPROVED" || row.template_status === "RETIRED");
  return {
    ...normalizeExtractionProvenance({
      sourceKind: row.source_kind,
      canonicalUrl: row.canonical_url,
      normalizedContentHash: row.normalized_content_hash,
      ...(hasTemplate ? {
        template: {
          id: row.template_id,
          sourceId: row.template_source_id,
          version: Number(row.template_version),
          status: row.template_status,
        },
      } : {}),
      extractedAt: row.extracted_at,
      normalizedRetainUntil: row.retain_until,
    }, {
      canonicalUrl: row.canonical_url,
      normalizedContentHash: row.normalized_content_hash,
      extractedAt: row.extracted_at,
    }),
    id: row.id,
    newsId: row.news_id,
  };
}

function rawHtmlFromRow(row: RawHtmlRow): NewsRawHtmlArtifact {
  return {
    id: row.id,
    newsId: row.news_id,
    body: row.body,
    collectedAt: new Date(Date.parse(row.collected_at)).toISOString(),
    purgeAfter: new Date(Date.parse(row.purge_after)).toISOString(),
  };
}

export interface PostgresNewsMetadataDependencies {
  readonly extractionTemplateRepository: ExtractionTemplateRepository<ExtractionTemplateRecord> & {
    rollback(sourceId: string, templateId: string): Promise<ExtractionTemplateRecord | undefined>;
    readById(templateId: string): Promise<ExtractionTemplateRecord | undefined>;
    nextVersion(sourceId: string): Promise<number>;
    list(sourceId?: string): Promise<readonly ExtractionTemplateRecord[]>;
  };
  readonly extractionProvenanceRepository: NewsExtractionProvenanceRepository<StoredNewsExtractionProvenance> & {
    readByNewsId(newsId: string): Promise<StoredNewsExtractionProvenance | undefined>;
  };
  readonly rawHtmlRepository: NewsRawHtmlRepository & {
    readByNewsId(newsId: string): Promise<NewsRawHtmlArtifact | undefined>;
  };
}

export function createPostgresNewsMetadataDependencies(pool: PostgresPool): PostgresNewsMetadataDependencies {
  const extractionTemplateRepository = {
    async insertDraft(template: ExtractionTemplateRecord): Promise<ExtractionTemplateRecord> {
      if (template.status !== "DRAFT") throw new Error("only DRAFT templates may be inserted");
      const result = await pool.query<TemplateRow>(
        `
          INSERT INTO extraction_templates
            (id, source_id, version, status, configuration, supersedes_template_id,
             refinement_diff, quality_metrics, created_at, retain_until)
          VALUES ($1::uuid, $2, $3, 'DRAFT', $4::jsonb, $5::uuid, $6::jsonb, $7::jsonb,
             $8::timestamptz, $9::timestamptz)
          RETURNING id::text, source_id, version, status, configuration,
            supersedes_template_id::text, refinement_diff, quality_metrics,
            created_at::text, approved_at::text, retain_until::text
        `,
        [
          template.id,
          template.sourceId,
          template.version,
          JSON.stringify(template.configuration),
          template.supersedesTemplateId ?? null,
          template.diff === undefined ? null : JSON.stringify(template.diff),
          template.metrics === undefined ? null : JSON.stringify(template.metrics),
          template.createdAt,
          template.retainUntil,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("extraction template insert returned no row");
      return templateFromRow(row);
    },

    async approve(templateId: string): Promise<ExtractionTemplateRecord | undefined> {
      const current = await pool.query<TemplateRow>(
        `
          SELECT id::text, source_id, version, status, configuration,
            supersedes_template_id::text, refinement_diff, quality_metrics,
            created_at::text, approved_at::text, retain_until::text
          FROM extraction_templates
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [templateId],
      );
      const draft = current.rows[0];
      if (!draft || draft.status !== "DRAFT") return undefined;
      await pool.query(
        "UPDATE extraction_templates SET status = 'RETIRED', approved_at = NULL WHERE source_id = $1 AND status = 'APPROVED'",
        [draft.source_id],
      );
      const promoted = await pool.query<TemplateRow>(
        `
          UPDATE extraction_templates
          SET status = 'APPROVED', approved_at = created_at
          WHERE id = $1::uuid AND status = 'DRAFT'
          RETURNING id::text, source_id, version, status, configuration,
            supersedes_template_id::text, refinement_diff, quality_metrics,
            created_at::text, approved_at::text, retain_until::text
        `,
        [templateId],
      );
      return promoted.rows[0] ? templateFromRow(promoted.rows[0]) : undefined;
    },

    async rollback(sourceId: string, templateId: string): Promise<ExtractionTemplateRecord | undefined> {
      const target = await pool.query<TemplateRow>(
        `
          SELECT id::text, source_id, version, status, configuration,
            supersedes_template_id::text, refinement_diff, quality_metrics,
            created_at::text, approved_at::text, retain_until::text
          FROM extraction_templates
          WHERE id = $1::uuid AND source_id = $2
          LIMIT 1
        `,
        [templateId, sourceId],
      );
      if (!target.rows[0] || target.rows[0].status === "DRAFT") return undefined;
      await pool.query(
        "UPDATE extraction_templates SET status = 'RETIRED', approved_at = NULL WHERE source_id = $1 AND status = 'APPROVED'",
        [sourceId],
      );
      const promoted = await pool.query<TemplateRow>(
        `
          UPDATE extraction_templates
          SET status = 'APPROVED', approved_at = COALESCE(approved_at, created_at)
          WHERE id = $1::uuid AND source_id = $2 AND status = 'RETIRED'
          RETURNING id::text, source_id, version, status, configuration,
            supersedes_template_id::text, refinement_diff, quality_metrics,
            created_at::text, approved_at::text, retain_until::text
        `,
        [templateId, sourceId],
      );
      return promoted.rows[0] ? templateFromRow(promoted.rows[0]) : undefined;
    },

    async readActive(sourceId: string): Promise<ExtractionTemplateRecord | undefined> {
      const result = await pool.query<TemplateRow>(
        `
          SELECT id::text, source_id, version, status, configuration,
            supersedes_template_id::text, refinement_diff, quality_metrics,
            created_at::text, approved_at::text, retain_until::text
          FROM extraction_templates
          WHERE source_id = $1 AND status = 'APPROVED'
          ORDER BY version DESC
          LIMIT 1
        `,
        [sourceId],
      );
      return result.rows[0] ? templateFromRow(result.rows[0]) : undefined;
    },

    async readById(templateId: string): Promise<ExtractionTemplateRecord | undefined> {
      const result = await pool.query<TemplateRow>(
        `
          SELECT id::text, source_id, version, status, configuration,
            supersedes_template_id::text, refinement_diff, quality_metrics,
            created_at::text, approved_at::text, retain_until::text
          FROM extraction_templates
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [templateId],
      );
      return result.rows[0] ? templateFromRow(result.rows[0]) : undefined;
    },

    async nextVersion(sourceId: string): Promise<number> {
      const result = await pool.query<{ next_version: number }>(
        "SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM extraction_templates WHERE source_id = $1",
        [sourceId],
      );
      return Number(result.rows[0]?.next_version ?? 1);
    },

    async list(sourceId?: string): Promise<readonly ExtractionTemplateRecord[]> {
      const result = await pool.query<TemplateRow>(
        `
          SELECT id::text, source_id, version, status, configuration,
            supersedes_template_id::text, refinement_diff, quality_metrics,
            created_at::text, approved_at::text, retain_until::text
          FROM extraction_templates
          ${sourceId === undefined ? "" : "WHERE source_id = $1"}
          ORDER BY source_id ASC, version ASC
        `,
        sourceId === undefined ? [] : [sourceId],
      );
      return result.rows.map(templateFromRow);
    },

    async purgeExpired(now: string, _protectedTemplateIds?: readonly string[]): Promise<number> {
      const result = await pool.query(
        `
          DELETE FROM extraction_templates AS candidate
          WHERE candidate.retain_until <= $1::timestamptz
            AND NOT EXISTS (
              SELECT 1
              FROM news_extraction_provenance provenance
              WHERE provenance.template_id = candidate.id
            )
            AND NOT EXISTS (
              SELECT 1
              FROM extraction_templates successor
              WHERE successor.supersedes_template_id = candidate.id
            )
        `,
        [now],
      );
      return result.rowCount ?? 0;
    },
  } satisfies PostgresNewsMetadataDependencies["extractionTemplateRepository"];

  const extractionProvenanceRepository = {
    async insert(provenance: StoredNewsExtractionProvenance): Promise<StoredNewsExtractionProvenance> {
      const result = await pool.query<ProvenanceRow>(
        `
          INSERT INTO news_extraction_provenance
            (id, news_id, source_kind, canonical_url, normalized_content_hash,
             template_id, extracted_at, retain_until)
          VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::uuid, $7::timestamptz, $8::timestamptz)
          ON CONFLICT (news_id) DO NOTHING
          RETURNING id::text, news_id::text, source_kind, canonical_url,
            normalized_content_hash, template_id::text, extracted_at::text,
            retain_until::text
        `,
        [
          provenance.id,
          provenance.newsId,
          provenance.sourceKind,
          provenance.canonicalUrl,
          provenance.normalizedContentHash,
          provenance.template?.id ?? null,
          provenance.extractedAt,
          provenance.normalizedRetainUntil,
        ],
      );
      if (result.rows[0]) return provenanceFromRow(result.rows[0]);
      const existing = await extractionProvenanceRepository.readByNewsId(provenance.newsId);
      if (!existing) throw new Error("News extraction provenance insert returned no row");
      return existing;
    },

    async readByNewsId(newsId: string): Promise<StoredNewsExtractionProvenance | undefined> {
      const result = await pool.query<ProvenanceRow>(
        `
          SELECT id::text, news_id::text, source_kind, canonical_url,
            normalized_content_hash, template_id::text,
            template.source_id AS template_source_id,
            template.version AS template_version,
            template.status AS template_status,
            extracted_at::text, retain_until::text
          FROM news_extraction_provenance
          LEFT JOIN extraction_templates template ON template.id = news_extraction_provenance.template_id
          WHERE news_id = $1::uuid
          LIMIT 1
        `,
        [newsId],
      );
      return result.rows[0] ? provenanceFromRow(result.rows[0]) : undefined;
    },

    async purgeExpired(now: string): Promise<number> {
      const result = await pool.query(
        "DELETE FROM news_extraction_provenance WHERE retain_until <= $1::timestamptz",
        [now],
      );
      return result.rowCount ?? 0;
    },

    async readLiveTemplateIds(now: string): Promise<readonly string[]> {
      const result = await pool.query<{ template_id: string }>(
        `
          SELECT DISTINCT template_id::text
          FROM news_extraction_provenance
          WHERE template_id IS NOT NULL AND retain_until > $1::timestamptz
          ORDER BY template_id::text ASC
        `,
        [now],
      );
      return result.rows.map((row) => row.template_id);
    },
  } satisfies PostgresNewsMetadataDependencies["extractionProvenanceRepository"];

  const rawHtmlRepository = {
    async insert(artifact: NewsRawHtmlArtifact): Promise<NewsRawHtmlArtifact> {
      const collectedAt = Date.parse(artifact.collectedAt);
      const purgeAfter = Date.parse(artifact.purgeAfter);
      if (!Number.isFinite(collectedAt) || !Number.isFinite(purgeAfter)
        || purgeAfter !== collectedAt + 7 * 24 * 60 * 60 * 1_000
        || Buffer.byteLength(artifact.body, "utf8") > 1_048_576) {
        throw new Error("invalid raw HTML artifact retention or body limit");
      }
      const result = await pool.query<RawHtmlRow>(
        `
          INSERT INTO news_raw_html_artifacts
            (id, news_id, body, collected_at, purge_after)
          VALUES ($1::uuid, $2::uuid, $3, $4::timestamptz, $5::timestamptz)
          ON CONFLICT (news_id) DO NOTHING
          RETURNING id::text, news_id::text, body, collected_at::text, purge_after::text
        `,
        [artifact.id, artifact.newsId, artifact.body, artifact.collectedAt, artifact.purgeAfter],
      );
      if (result.rows[0]) return rawHtmlFromRow(result.rows[0]);
      const existing = await rawHtmlRepository.readByNewsId(artifact.newsId);
      if (!existing) throw new Error("raw HTML artifact insert returned no row");
      return existing;
    },

    async readByNewsId(newsId: string): Promise<NewsRawHtmlArtifact | undefined> {
      const result = await pool.query<RawHtmlRow>(
        `
          SELECT id::text, news_id::text, body, collected_at::text, purge_after::text
          FROM news_raw_html_artifacts
          WHERE news_id = $1::uuid
          LIMIT 1
        `,
        [newsId],
      );
      return result.rows[0] ? rawHtmlFromRow(result.rows[0]) : undefined;
    },

    async purgeExpired(now: string): Promise<number> {
      const result = await pool.query(
        "DELETE FROM news_raw_html_artifacts WHERE purge_after <= $1::timestamptz",
        [now],
      );
      return result.rowCount ?? 0;
    },
  } satisfies PostgresNewsMetadataDependencies["rawHtmlRepository"];

  return { extractionTemplateRepository, extractionProvenanceRepository, rawHtmlRepository };
}
