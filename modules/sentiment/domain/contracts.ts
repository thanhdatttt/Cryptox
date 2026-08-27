export type SentimentLabel = "POSITIVE" | "NEUTRAL" | "NEGATIVE";
export interface SentimentInput {
  newsId: string;
  title: string;
  content: string;
  source: string;
  publishedAt: string;
  relatedCoins: string[];
}
export interface SentimentResult {
  newsId: string;
  label: SentimentLabel;
  score: number;
  modelName: string;
  modelVersion: string;
  analyzedAt: string;
}
