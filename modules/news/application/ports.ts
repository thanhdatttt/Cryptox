import type { NewsItem } from "../domain/contracts";
import type { SentimentAnalysisService, SentimentResult } from "@cryptox/sentiment";

export interface NewsCollectionRequest {
  relatedCoins?: readonly string[];
  publishedAfter?: string;
  limit?: number;
}

export interface NewsProvider {
  readonly id: string;
  fetch(request: NewsCollectionRequest): Promise<readonly NewsItem[]>;
}
export interface NewsRepository {
  insert(item: NewsItem): Promise<NewsItem>;
  readAll(): Promise<readonly NewsItem[]>;
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
  observability?: NewsObservability;
}
