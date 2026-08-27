import type { SentimentAnalysisService, SentimentResult } from "@cryptox/sentiment";

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
}

export interface NewsCollectionRequest {
  relatedCoins?: readonly string[];
  publishedAfter?: string;
  limit?: number;
}

export interface NewsProvider {
  readonly id: string;
  fetch(request: NewsCollectionRequest): Promise<readonly NormalizedNewsItemRecord[]>;
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
}
export interface NewsModuleDependencies {
  providers: readonly NewsProvider[];
  newsRepository: NewsRepository;
  sentiment: NewsSentimentPort;
  sentimentTimeoutMs: number;
  observability: NewsObservability;
}
