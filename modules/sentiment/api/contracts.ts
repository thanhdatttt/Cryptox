export const SENTIMENT_LABELS = ["POSITIVE", "NEUTRAL", "NEGATIVE"] as const;
export type SentimentLabel = (typeof SENTIMENT_LABELS)[number];

export const LEXICON_V1_ID = "LEXICON_V1" as const;
export const LEXICON_V1 = {
  id: LEXICON_V1_ID,
  providerKind: "LOCAL_DETERMINISTIC_LEXICON",
  scoreRange: { minimum: -1, maximum: 1 },
  labels: SENTIMENT_LABELS,
  hostedInference: false,
  modelDownloadRequired: false,
} as const;

export interface SentimentInput {
  newsId: string;
  title: string;
  content: string;
  source: string;
  publishedAt: string;
  relatedCoins: readonly string[];
}

export interface SentimentResult {
  newsId: string;
  label: SentimentLabel;
  score: number;
  providerId: string;
  analysisProfileId: string;
  modelName: string;
  modelVersion: string;
  analyzedAt: string;
}

export interface SentimentAnalysisService {
  analyze(input: SentimentInput): Promise<SentimentResult>;
}

export interface SentimentModulePublicApi extends SentimentAnalysisService {
  readLatestForNews(newsId: string): Promise<SentimentResult | undefined>;
}
