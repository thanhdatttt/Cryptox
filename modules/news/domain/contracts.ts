import type { SentimentAnalysisService, SentimentInput, SentimentResult } from "modules/sentiment/api";
export interface NewsItem { id: string; title: string; content: string; source: string; publishedAt: string; crawledAt: string; relatedCoins: string[]; url: string; }
export interface NewsReadItem extends NewsItem { sentiment?: SentimentResult; }
export interface SentimentReadService { readLatestForNews(newsId: string): Promise<SentimentResult | undefined>; }
export type NewsSentimentPort = SentimentAnalysisService & SentimentReadService;
