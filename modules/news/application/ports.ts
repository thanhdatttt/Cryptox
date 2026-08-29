import type { SentimentAnalysisService, SentimentResult } from "@cryptox/sentiment";
import type {
  ExtractionTemplateRef,
  ExtractionTemplateRevision,
  NewsExtractionProvenance,
  SafeUrlImportRequest,
} from "../api/contracts";

export interface NormalizedNewsItemRecord {
  id: string;
  providerId: string;
  providerItemId: string;
  title: string;
  content: string;
  source: string;
  publishedAt: string;
  crawledAt: string;
  relatedCoins: readonly string[];
  url: string;
  /** Canonical identity used for deduplication and safe provenance. */
  canonicalUrl?: string;
  /** SHA-256 of normalized article content, retained as internal metadata. */
  normalizedContentHash?: string;
  /** Operational retention deadline for the normalized record. */
  normalizedRetainUntil?: string;
  extraction?: NewsExtractionProvenance;
}

export interface NewsCollectionRequest {
  relatedCoins?: readonly string[];
  publishedAfter?: string;
  limit?: number;
}

export interface NewsProvider {
  readonly id: string;
  readonly sourceKind?: NewsSourceKind;
  fetch(request: NewsCollectionRequest): Promise<readonly NormalizedNewsItemRecord[]>;
  /** Optional document-aware path used to retain bounded raw/extraction provenance. */
  fetchDocument?(request: NewsCollectionRequest): Promise<NewsProviderDocument>;
}

export type NewsSourceKind =
  | "CONFIGURED_WEBSITE"
  | "RSS"
  | "HTML"
  | "ALLOWLISTED_URL_IMPORT";

export interface NewsProviderDocument {
  readonly sourceKind: NewsSourceKind;
  readonly canonicalUrl: string;
  readonly body: string;
  readonly contentType: string;
  readonly redirects: number;
  readonly extractedAt: string;
  readonly items: readonly NormalizedNewsItemRecord[];
}

export interface NewsReadRecordQuery {
  relatedCoins?: readonly string[];
  publishedFrom?: string;
  publishedTo?: string;
  limit: number;
  cursor?: string;
  order: "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC";
}

export interface NewsRecordPage {
  items: readonly NormalizedNewsItemRecord[];
  nextCursor?: string;
}
export interface NewsRepository {
  upsertByProviderIdentity(
    item: NormalizedNewsItemRecord,
  ): Promise<{ item: NormalizedNewsItemRecord; inserted: boolean }>;
  read(query: NewsReadRecordQuery): Promise<NewsRecordPage>;
  purgeExpired?(now: string): Promise<number>;
}
export interface SentimentReadService {
  readLatestForNews(newsId: string): Promise<SentimentResult | undefined>;
}
export interface NewsSentimentPort extends SentimentAnalysisService, SentimentReadService {}
export interface NewsObservability {
  recordProviderFailure(input: { providerId: string; detail?: string }): void;
  recordSentimentFailure(input: {
    newsId: string;
    reason: "TIMEOUT" | "INFERENCE_ERROR" | "INVALID_RESULT";
  }): void;
  recordExternalContentFailure?(input: {
    sourceId: string;
    reason: SafeNewsFailureReason;
  }): void;
  recordExtractionFailure?(input: {
    sourceId: string;
    detail?: string;
  }): void;
}
export interface NewsModuleDependencies {
  providers: readonly NewsProvider[];
  newsRepository: NewsRepository;
  sentiment: NewsSentimentPort;
  sentimentTimeoutMs: number;
  observability: NewsObservability;
  safeUrlFetcher?: SafeNewsUrlFetchPort;
  urlImportExtractor?: NewsUrlImportExtractor;
  templateRepository?: ExtractionTemplateRepository<ExtractionTemplateRecord>;
  extractionProvenanceRepository?: NewsExtractionProvenanceRepository<StoredNewsExtractionProvenance>;
  rawHtmlRepository?: NewsRawHtmlRepository;
  clock?: Clock;
}

/** Backend-only safe-fetch boundary. No cookies, credentials, or arbitrary URL persistence are modeled. */
export interface SafeNewsUrlFetchPort {
  fetch(input: { url: string; sourceId: string; timeoutMs: 20_000; maximumRedirects: 3; maximumBodyBytes: 1_048_576 }): Promise<{
    canonicalUrl: string;
    body: string;
    contentType: string;
    redirects: number;
  }>;
}

export type SafeNewsFailureReason =
  | "NOT_HTTPS"
  | "NOT_ALLOWLISTED"
  | "UNSAFE_DESTINATION"
  | "REDIRECT_LIMIT"
  | "TIMEOUT"
  | "BODY_TOO_LARGE"
  | "DNS_FAILURE"
  | "HTTP_ERROR"
  | "INVALID_RESPONSE";

export interface NewsUrlImportExtractor {
  extract(input: {
    request: SafeUrlImportRequest;
    canonicalUrl: string;
    body: string;
    contentType: string;
    redirects: number;
    extractedAt: string;
  }): Promise<NewsProviderDocument>;
}

export interface Clock {
  now(): string;
}

export interface ExtractionTemplateRecord extends ExtractionTemplateRevision {
  readonly configuration: Readonly<Record<string, unknown>>;
}

export interface StoredNewsExtractionProvenance extends NewsExtractionProvenance {
  readonly id: string;
  readonly newsId: string;
}

export interface NewsRawHtmlArtifact {
  readonly id: string;
  readonly newsId: string;
  readonly body: string;
  readonly collectedAt: string;
  readonly purgeAfter: string;
}

export interface NewsRawHtmlRepository {
  insert(artifact: NewsRawHtmlArtifact): Promise<NewsRawHtmlArtifact>;
  purgeExpired(now: string): Promise<number>;
}

export interface ExtractionTemplateRepository<TTemplate> {
  insertDraft(template: TTemplate): Promise<TTemplate>;
  approve(templateId: string): Promise<TTemplate | undefined>;
  readActive(sourceId: string): Promise<TTemplate | undefined>;
  purgeExpired(now: string, protectedTemplateIds?: readonly string[]): Promise<number>;
}

export interface NewsExtractionProvenanceRepository<TProvenance> {
  insert(provenance: TProvenance): Promise<TProvenance>;
  purgeExpired(now: string): Promise<number>;
  readLiveTemplateIds?(now: string): Promise<readonly string[]>;
}
