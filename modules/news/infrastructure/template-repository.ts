import type { ExtractionTemplate } from "../domain/template-contracts";

export interface TemplateSqlClient {
  query<Row>(text: string, values: unknown[]): Promise<{ rows: Row[] }>;
}

export interface NewsTemplateRepository {
  findActiveByDomain(domain: string): Promise<ExtractionTemplate | undefined>;
  findAllByDomain(domain: string): Promise<ExtractionTemplate[]>;
  findAll(): Promise<ExtractionTemplate[]>;
  save(template: ExtractionTemplate): Promise<ExtractionTemplate>;
  setActiveVersion(domain: string, version: string): Promise<ExtractionTemplate>;
}

interface TemplateRow {
  id: string;
  domain: string;
  version: string;
  selectors: string | Record<string, unknown>;
  sample_html_snippet: string | null;
  confidence: number | string;
  defect_rate: number | string;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

const mapRow = (row: TemplateRow): ExtractionTemplate => ({
  id: row.id,
  domain: row.domain,
  version: row.version,
  selectors: typeof row.selectors === "string" ? JSON.parse(row.selectors) : row.selectors as any,
  sampleHtmlSnippet: row.sample_html_snippet ?? undefined,
  confidence: Number(row.confidence) || 0.85,
  defectRate: Number(row.defect_rate) || 0.0,
  isActive: Boolean(row.is_active),
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

const columns = "id, domain, version, selectors, sample_html_snippet, confidence, defect_rate, is_active, created_at, updated_at";

export class PostgresNewsTemplateRepository implements NewsTemplateRepository {
  constructor(private readonly client: TemplateSqlClient) {}

  async findActiveByDomain(domain: string): Promise<ExtractionTemplate | undefined> {
    const result = await this.client.query<TemplateRow>(
      `SELECT ${columns} FROM news_extraction_templates WHERE domain = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
      [domain.toLowerCase().trim()],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : undefined;
  }

  async findAllByDomain(domain: string): Promise<ExtractionTemplate[]> {
    const result = await this.client.query<TemplateRow>(
      `SELECT ${columns} FROM news_extraction_templates WHERE domain = $1 ORDER BY version DESC, created_at DESC`,
      [domain.toLowerCase().trim()],
    );
    return result.rows.map(mapRow);
  }

  async findAll(): Promise<ExtractionTemplate[]> {
    const result = await this.client.query<TemplateRow>(
      `SELECT ${columns} FROM news_extraction_templates ORDER BY domain ASC, is_active DESC, version DESC`,
      [],
    );
    return result.rows.map(mapRow);
  }

  async save(template: ExtractionTemplate): Promise<ExtractionTemplate> {
    // If setting as active, deactivate other versions for this domain first
    if (template.isActive) {
      await this.client.query(
        `UPDATE news_extraction_templates SET is_active = false WHERE domain = $1 AND version != $2`,
        [template.domain.toLowerCase().trim(), template.version],
      );
    }

    const result = await this.client.query<TemplateRow>(
      `INSERT INTO news_extraction_templates (${columns})
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (domain, version) DO UPDATE SET
         selectors = EXCLUDED.selectors,
         sample_html_snippet = EXCLUDED.sample_html_snippet,
         confidence = EXCLUDED.confidence,
         defect_rate = EXCLUDED.defect_rate,
         is_active = EXCLUDED.is_active,
         updated_at = EXCLUDED.updated_at
       RETURNING ${columns}`,
      [
        template.id,
        template.domain.toLowerCase().trim(),
        template.version,
        JSON.stringify(template.selectors),
        template.sampleHtmlSnippet ?? null,
        template.confidence,
        template.defectRate,
        template.isActive,
        template.createdAt,
        template.updatedAt,
      ],
    );

    if (!result.rows[0]) throw new Error("TEMPLATE_PERSISTENCE_ERROR");
    return mapRow(result.rows[0]);
  }

  async setActiveVersion(domain: string, version: string): Promise<ExtractionTemplate> {
    const normalizedDomain = domain.toLowerCase().trim();
    // 1. Deactivate all versions for domain
    await this.client.query(
      `UPDATE news_extraction_templates SET is_active = false, updated_at = NOW() WHERE domain = $1`,
      [normalizedDomain],
    );
    // 2. Activate requested version
    const result = await this.client.query<TemplateRow>(
      `UPDATE news_extraction_templates SET is_active = true, updated_at = NOW() WHERE domain = $1 AND version = $2 RETURNING ${columns}`,
      [normalizedDomain, version],
    );
    if (!result.rows[0]) throw new Error(`TEMPLATE_NOT_FOUND:${domain}:${version}`);
    return mapRow(result.rows[0]);
  }
}

export class InMemoryNewsTemplateRepository implements NewsTemplateRepository {
  private templates: Map<string, ExtractionTemplate> = new Map();

  async findActiveByDomain(domain: string): Promise<ExtractionTemplate | undefined> {
    const normalized = domain.toLowerCase().trim();
    return Array.from(this.templates.values()).find((t) => t.domain.toLowerCase() === normalized && t.isActive);
  }

  async findAllByDomain(domain: string): Promise<ExtractionTemplate[]> {
    const normalized = domain.toLowerCase().trim();
    return Array.from(this.templates.values()).filter((t) => t.domain.toLowerCase() === normalized);
  }

  async findAll(): Promise<ExtractionTemplate[]> {
    return Array.from(this.templates.values());
  }

  async save(template: ExtractionTemplate): Promise<ExtractionTemplate> {
    const normalized = template.domain.toLowerCase().trim();
    if (template.isActive) {
      for (const t of this.templates.values()) {
        if (t.domain.toLowerCase() === normalized && t.version !== template.version) {
          t.isActive = false;
        }
      }
    }
    const key = `${normalized}:${template.version}`;
    this.templates.set(key, { ...template, domain: normalized });
    return template;
  }

  async setActiveVersion(domain: string, version: string): Promise<ExtractionTemplate> {
    const normalized = domain.toLowerCase().trim();
    let activated: ExtractionTemplate | undefined;
    for (const t of this.templates.values()) {
      if (t.domain.toLowerCase() === normalized) {
        if (t.version === version) {
          t.isActive = true;
          t.updatedAt = new Date().toISOString();
          activated = t;
        } else {
          t.isActive = false;
        }
      }
    }
    if (!activated) throw new Error(`TEMPLATE_NOT_FOUND:${domain}:${version}`);
    return activated;
  }
}
