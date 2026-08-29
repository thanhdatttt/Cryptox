import type { SentimentResult } from "@cryptox/sentiment";

export const NEWS_READ_ORDER_V1 =
  "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC" as const;

export interface NewsItem {
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
  extraction?: NewsExtractionProvenance;
}

export interface NewsReadItem extends NewsItem {
  sentiment: SentimentResult | null;
}

export interface CollectNewsCommand {
  providerIds?: readonly string[];
  relatedCoins?: readonly string[];
  publishedAfter?: string;
  limit?: number;
}

export const EXTERNAL_CONTENT_SAFETY_V1 = {
  id: "EXTERNAL_CONTENT_SAFETY_V1",
  allowedSchemes: ["https"],
  maximumRedirects: 3,
  timeoutMs: 20_000,
  maximumBodyBytes: 1_048_576,
  rawHtmlRetentionDays: 7,
  normalizedRetentionDays: 90,
  excluded: ["CREDENTIALS", "COOKIES", "ARBITRARY_URL_PERSISTENCE", "AUTOMATIC_PROMOTION"],
} as const;

export type ExtractionTemplateStatus = "DRAFT" | "APPROVED" | "RETIRED";
export interface ExtractionTemplateRef {
  id: string;
  sourceId: string;
  version: number;
  status: ExtractionTemplateStatus;
}
export interface NewsExtractionProvenance {
  sourceKind: "CONFIGURED_WEBSITE" | "RSS" | "HTML" | "ALLOWLISTED_URL_IMPORT";
  canonicalUrl: string;
  normalizedContentHash: string;
  template?: ExtractionTemplateRef;
  extractedAt: string;
  normalizedRetainUntil: string;
}
export interface ExtractionTemplateRevision extends ExtractionTemplateRef {
  supersedesTemplateId?: string;
  diff?: Readonly<Record<string, string | number | boolean>>;
  metrics?: Readonly<Record<string, number>>;
  createdAt: string;
  approvedAt?: string;
  retainUntil: string;
}

export interface SafeUrlImportRequest {
  url: string;
  sourceId: string;
}

export type SafeUrlImportState =
  | { status: "REJECTED"; reason: "NOT_HTTPS" | "NOT_ALLOWLISTED" | "UNSAFE_DESTINATION" | "REDIRECT_LIMIT" | "TIMEOUT" | "BODY_TOO_LARGE" }
  | { status: "FETCHED"; canonicalUrl: string; newsItemId?: string };

export interface NewsCollectionResult {
  fetchedCount: number;
  storedCount: number;
  duplicateCount: number;
  rejectedCount: number;
}

export interface NewsReadQuery {
  relatedCoins?: readonly string[];
  publishedFrom?: string;
  publishedTo?: string;
  limit: number;
  cursor?: string;
  order: typeof NEWS_READ_ORDER_V1;
}

export interface NewsPage {
  items: readonly NewsReadItem[];
  nextCursor?: string;
}

export interface NewsModulePublicApi {
  collect(command: CollectNewsCommand): Promise<NewsCollectionResult>;
  readNews(query: NewsReadQuery): Promise<NewsPage>;
}
