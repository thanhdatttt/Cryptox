import type {
  ExtractionTemplateRecord,
  ExtractionTemplateRepository,
  NewsRawHtmlArtifact,
  NewsRawHtmlRepository,
  NewsReadRecordQuery,
  NewsRecordPage,
  NewsRepository,
  NormalizedNewsItemRecord,
  NewsExtractionProvenanceRepository,
  StoredNewsExtractionProvenance,
} from "./ports";
import {
  canonicalizeNewsUrl,
  normalizedNewsContentHash,
  normalizeExtractionProvenance,
  normalizeNewsItem,
} from "./normalization";

interface NewsCursor {
  publishedAt: string;
  providerId: string;
  providerItemId: string;
}

function copy<T>(value: T): T {
  return structuredClone(value);
}

function identityKey(item: Pick<NormalizedNewsItemRecord, "providerId" | "providerItemId">): string {
  return `${item.providerId}\0${item.providerItemId}`;
}

function canonicalKey(item: Pick<NormalizedNewsItemRecord, "url" | "canonicalUrl">): string {
  return item.canonicalUrl ?? canonicalizeNewsUrl(item.url);
}

function contentHash(item: Pick<NormalizedNewsItemRecord, "content" | "normalizedContentHash">): string {
  return item.normalizedContentHash ?? normalizedNewsContentHash(item.content);
}

function compare(left: NormalizedNewsItemRecord | NewsCursor, right: NormalizedNewsItemRecord | NewsCursor): number {
  return right.publishedAt.localeCompare(left.publishedAt)
    || left.providerId.localeCompare(right.providerId)
    || left.providerItemId.localeCompare(right.providerItemId);
}

function encodeCursor(item: NormalizedNewsItemRecord): string {
  return Buffer.from(JSON.stringify({
    publishedAt: item.publishedAt,
    providerId: item.providerId,
    providerItemId: item.providerItemId,
  }), "utf8").toString("base64url");
}

function decodeCursor(value: string | undefined): NewsCursor | undefined {
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

function relatedCoinMatches(item: NormalizedNewsItemRecord, relatedCoins: readonly string[] | undefined): boolean {
  return relatedCoins === undefined || relatedCoins.length === 0 || relatedCoins.some((coin) => item.relatedCoins.includes(coin));
}

export class InMemoryNewsRepository implements NewsRepository {
  private readonly items = new Map<string, NormalizedNewsItemRecord>();
  private readonly canonicalUrls = new Map<string, string>();
  private readonly contentHashes = new Map<string, string>();

  public async upsertByProviderIdentity(
    item: NormalizedNewsItemRecord,
  ): Promise<{ item: NormalizedNewsItemRecord; inserted: boolean }> {
    const identity = identityKey(item);
    const canonicalUrl = canonicalKey(item);
    const normalizedContentHash = contentHash(item);
    const existingKey = this.items.has(identity)
      ? identity
      : this.canonicalUrls.get(canonicalUrl) ?? this.contentHashes.get(normalizedContentHash);
    const existing = existingKey === undefined ? undefined : this.items.get(existingKey);
    if (existing) return { item: copy(existing), inserted: false };
    const normalized = normalizeNewsItem({
      ...item,
      canonicalUrl,
      normalizedContentHash,
    }, item.providerId);
    const stored = copy(normalized);
    this.items.set(identity, stored);
    this.canonicalUrls.set(canonicalUrl, identity);
    this.contentHashes.set(normalizedContentHash, identity);
    return { item: copy(stored), inserted: true };
  }

  public async read(query: NewsReadRecordQuery): Promise<NewsRecordPage> {
    const cursor = decodeCursor(query.cursor);
    const from = query.publishedFrom === undefined ? undefined : Date.parse(query.publishedFrom);
    const to = query.publishedTo === undefined ? undefined : Date.parse(query.publishedTo);
    const filtered = [...this.items.values()]
      .filter((item) => relatedCoinMatches(item, query.relatedCoins))
      .filter((item) => {
        const publishedAt = Date.parse(item.publishedAt);
        return (from === undefined || publishedAt >= from) && (to === undefined || publishedAt < to);
      })
      .sort(compare)
      .filter((item) => cursor === undefined || compare(item, cursor) > 0);
    const items = filtered.slice(0, query.limit).map(copy);
    return {
      items,
      ...(filtered.length > items.length && items.length > 0 ? { nextCursor: encodeCursor(items.at(-1)!) } : {}),
    };
  }

  public size(): number {
    return this.items.size;
  }

  public async purgeExpired(now: string): Promise<number> {
    const timestamp = Date.parse(now);
    if (!Number.isFinite(timestamp)) throw new Error("invalid News retention timestamp");
    let purged = 0;
    for (const [identity, item] of this.items) {
      if (Date.parse(item.normalizedRetainUntil ?? "") > timestamp) continue;
      this.items.delete(identity);
      this.canonicalUrls.delete(canonicalKey(item));
      this.contentHashes.delete(contentHash(item));
      purged += 1;
    }
    return purged;
  }
}

export function createInMemoryNewsRepository(): InMemoryNewsRepository {
  return new InMemoryNewsRepository();
}

function timestamp(value: string, field: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field} must be an ISO timestamp`);
  return new Date(parsed).toISOString();
}

function addDays(value: string, days: number): string {
  return new Date(Date.parse(value) + days * 24 * 60 * 60 * 1_000).toISOString();
}

function copyTemplate(template: ExtractionTemplateRecord): ExtractionTemplateRecord {
  return structuredClone(template);
}

function copyProvenance(provenance: StoredNewsExtractionProvenance): StoredNewsExtractionProvenance {
  return structuredClone(provenance);
}

function copyArtifact(artifact: NewsRawHtmlArtifact): NewsRawHtmlArtifact {
  return structuredClone(artifact);
}

function validateTemplate(template: ExtractionTemplateRecord): ExtractionTemplateRecord {
  if (!template || typeof template !== "object") throw new Error("extraction template is required");
  if (typeof template.id !== "string" || !template.id.trim()) throw new Error("extraction template id is required");
  if (typeof template.sourceId !== "string" || !template.sourceId.trim()) throw new Error("extraction template source is required");
  if (!Number.isSafeInteger(template.version) || template.version < 1) throw new Error("extraction template version is invalid");
  if (template.status !== "DRAFT" && template.status !== "APPROVED" && template.status !== "RETIRED") {
    throw new Error("extraction template status is invalid");
  }
  const createdAt = timestamp(template.createdAt, "createdAt");
  const retainUntil = timestamp(template.retainUntil, "retainUntil");
  if (retainUntil !== addDays(createdAt, 90)) throw new Error("extraction template retention must be 90 days");
  if (template.status === "APPROVED" && !template.approvedAt) throw new Error("approved template requires approvedAt");
  if (template.status !== "APPROVED" && template.approvedAt !== undefined) throw new Error("non-approved template cannot have approvedAt");
  if (!template.configuration || typeof template.configuration !== "object" || Array.isArray(template.configuration)) {
    throw new Error("extraction template configuration must be an object");
  }
  return copyTemplate({
    ...template,
    createdAt,
    retainUntil,
    ...(template.approvedAt === undefined ? {} : { approvedAt: timestamp(template.approvedAt, "approvedAt") }),
  });
}

function validateProvenance(value: StoredNewsExtractionProvenance): StoredNewsExtractionProvenance {
  if (!value || typeof value !== "object") throw new Error("News extraction provenance is required");
  if (typeof value.id !== "string" || !value.id.trim() || typeof value.newsId !== "string" || !value.newsId.trim()) {
    throw new Error("News extraction provenance identity is invalid");
  }
  return copyProvenance({
    ...normalizeExtractionProvenance(value, {
      canonicalUrl: value.canonicalUrl,
      normalizedContentHash: value.normalizedContentHash,
      extractedAt: value.extractedAt,
    }),
    id: value.id,
    newsId: value.newsId,
  });
}

function validateArtifact(value: NewsRawHtmlArtifact): NewsRawHtmlArtifact {
  if (!value || typeof value !== "object") throw new Error("raw HTML artifact is required");
  if (typeof value.id !== "string" || !value.id.trim() || typeof value.newsId !== "string" || !value.newsId.trim()) {
    throw new Error("raw HTML artifact identity is invalid");
  }
  if (typeof value.body !== "string") throw new Error("raw HTML artifact body is invalid");
  const collectedAt = timestamp(value.collectedAt, "collectedAt");
  const purgeAfter = timestamp(value.purgeAfter, "purgeAfter");
  if (purgeAfter !== addDays(collectedAt, 7)) throw new Error("raw HTML retention must be 7 days");
  return copyArtifact({ ...value, collectedAt, purgeAfter });
}

export class InMemoryExtractionTemplateRepository implements ExtractionTemplateRepository<ExtractionTemplateRecord> {
  private readonly templates = new Map<string, ExtractionTemplateRecord>();

  public async insertDraft(template: ExtractionTemplateRecord): Promise<ExtractionTemplateRecord> {
    const validated = validateTemplate(template);
    if (validated.status !== "DRAFT") throw new Error("only DRAFT templates may be inserted");
    if ([...this.templates.values()].some((candidate) => candidate.sourceId === validated.sourceId && candidate.version === validated.version)) {
      throw new Error("extraction template version already exists");
    }
    this.templates.set(validated.id, validated);
    return copyTemplate(validated);
  }

  public async approve(templateId: string): Promise<ExtractionTemplateRecord | undefined> {
    const current = this.templates.get(templateId);
    if (!current || current.status !== "DRAFT") return undefined;
    const approvedAt = current.createdAt;
    for (const [id, candidate] of this.templates) {
      if (candidate.sourceId === current.sourceId && candidate.status === "APPROVED") {
        this.templates.set(id, { ...candidate, status: "RETIRED", approvedAt: undefined });
      }
    }
    const approved = { ...current, status: "APPROVED" as const, approvedAt };
    this.templates.set(templateId, approved);
    return copyTemplate(approved);
  }

  public async rollback(sourceId: string, templateId: string): Promise<ExtractionTemplateRecord | undefined> {
    const target = this.templates.get(templateId);
    if (!target || target.sourceId !== sourceId || target.status === "DRAFT") return undefined;
    for (const [id, candidate] of this.templates) {
      if (candidate.sourceId !== sourceId || candidate.status !== "APPROVED") continue;
      this.templates.set(id, { ...candidate, status: "RETIRED", approvedAt: undefined });
    }
    const approved = { ...target, status: "APPROVED" as const, approvedAt: target.approvedAt ?? target.createdAt };
    this.templates.set(templateId, approved);
    return copyTemplate(approved);
  }

  public async readActive(sourceId: string): Promise<ExtractionTemplateRecord | undefined> {
    const active = [...this.templates.values()]
      .filter((template) => template.sourceId === sourceId && template.status === "APPROVED")
      .sort((left, right) => right.version - left.version)[0];
    return active ? copyTemplate(active) : undefined;
  }

  public async readById(templateId: string): Promise<ExtractionTemplateRecord | undefined> {
    const template = this.templates.get(templateId);
    return template ? copyTemplate(template) : undefined;
  }

  public async nextVersion(sourceId: string): Promise<number> {
    return [...this.templates.values()]
      .filter((template) => template.sourceId === sourceId)
      .reduce((version, template) => Math.max(version, template.version), 0) + 1;
  }

  public async list(sourceId?: string): Promise<readonly ExtractionTemplateRecord[]> {
    return [...this.templates.values()]
      .filter((template) => sourceId === undefined || template.sourceId === sourceId)
      .sort((left, right) => left.sourceId.localeCompare(right.sourceId) || left.version - right.version)
      .map(copyTemplate);
  }

  public async purgeExpired(now: string, protectedTemplateIds: readonly string[] = []): Promise<number> {
    const timestampValue = Date.parse(now);
    if (!Number.isFinite(timestampValue)) throw new Error("invalid extraction template retention timestamp");
    const protectedIds = new Set(protectedTemplateIds);
    let purged = 0;
    for (const [id, template] of this.templates) {
      if (Date.parse(template.retainUntil) > timestampValue) continue;
      if (protectedIds.has(id)) continue;
      if ([...this.templates.values()].some((candidate) => candidate.supersedesTemplateId === id)) continue;
      this.templates.delete(id);
      purged += 1;
    }
    return purged;
  }
}

export function createInMemoryExtractionTemplateRepository(): InMemoryExtractionTemplateRepository {
  return new InMemoryExtractionTemplateRepository();
}

export class InMemoryNewsExtractionProvenanceRepository
  implements NewsExtractionProvenanceRepository<StoredNewsExtractionProvenance> {
  private readonly records = new Map<string, StoredNewsExtractionProvenance>();

  public async insert(provenance: StoredNewsExtractionProvenance): Promise<StoredNewsExtractionProvenance> {
    const validated = validateProvenance(provenance);
    const existing = this.records.get(validated.newsId);
    if (existing) return copyProvenance(existing);
    this.records.set(validated.newsId, validated);
    return copyProvenance(validated);
  }

  public async readByNewsId(newsId: string): Promise<StoredNewsExtractionProvenance | undefined> {
    const record = this.records.get(newsId);
    return record ? copyProvenance(record) : undefined;
  }

  public async purgeExpired(now: string): Promise<number> {
    const timestampValue = Date.parse(now);
    if (!Number.isFinite(timestampValue)) throw new Error("invalid extraction provenance retention timestamp");
    let purged = 0;
    for (const [newsId, record] of this.records) {
      if (Date.parse(record.normalizedRetainUntil) > timestampValue) continue;
      this.records.delete(newsId);
      purged += 1;
    }
    return purged;
  }

  public async readLiveTemplateIds(now: string): Promise<readonly string[]> {
    const timestampValue = Date.parse(now);
    if (!Number.isFinite(timestampValue)) throw new Error("invalid extraction provenance retention timestamp");
    return [...new Set([...this.records.values()]
      .filter((record) => Date.parse(record.normalizedRetainUntil) > timestampValue)
      .map((record) => record.template?.id)
      .filter((templateId): templateId is string => templateId !== undefined))].sort();
  }
}

export function createInMemoryNewsExtractionProvenanceRepository(): InMemoryNewsExtractionProvenanceRepository {
  return new InMemoryNewsExtractionProvenanceRepository();
}

export class InMemoryNewsRawHtmlRepository implements NewsRawHtmlRepository {
  private readonly artifacts = new Map<string, NewsRawHtmlArtifact>();

  public async insert(artifact: NewsRawHtmlArtifact): Promise<NewsRawHtmlArtifact> {
    const validated = validateArtifact(artifact);
    const existing = this.artifacts.get(validated.newsId);
    if (existing) return copyArtifact(existing);
    this.artifacts.set(validated.newsId, validated);
    return copyArtifact(validated);
  }

  public async readByNewsId(newsId: string): Promise<NewsRawHtmlArtifact | undefined> {
    const artifact = this.artifacts.get(newsId);
    return artifact ? copyArtifact(artifact) : undefined;
  }

  public async purgeExpired(now: string): Promise<number> {
    const timestampValue = Date.parse(now);
    if (!Number.isFinite(timestampValue)) throw new Error("invalid raw HTML retention timestamp");
    let purged = 0;
    for (const [newsId, artifact] of this.artifacts) {
      if (Date.parse(artifact.purgeAfter) > timestampValue) continue;
      this.artifacts.delete(newsId);
      purged += 1;
    }
    return purged;
  }
}

export function createInMemoryNewsRawHtmlRepository(): InMemoryNewsRawHtmlRepository {
  return new InMemoryNewsRawHtmlRepository();
}
