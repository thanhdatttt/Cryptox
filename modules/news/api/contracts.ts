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
