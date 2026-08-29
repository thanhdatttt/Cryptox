export type SentimentLabel = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export interface SentimentAnalysisInput {
  newsId: string;
  title: string;
  content: string;
  source: string;
  publishedAt: string;
  relatedCoins: readonly string[];
}

export interface SentimentStoredResult {
  newsId: string;
  label: SentimentLabel;
  score: number;
  providerId: string;
  analysisProfileId: string;
  modelName: string;
  modelVersion: string;
  analyzedAt: string;
}

export interface SentimentProviderResult {
  label: SentimentLabel;
  score: number;
  providerId: string;
  analysisProfileId: string;
  modelName: string;
  modelVersion: string;
}

export interface SentimentProvider {
  readonly id: string;
  analyze(input: SentimentAnalysisInput): Promise<SentimentProviderResult>;
}

export interface SentimentAnalysisService {
  analyze(input: SentimentAnalysisInput): Promise<SentimentStoredResult>;
}
export interface SentimentResultRepository {
  insert(result: SentimentStoredResult): Promise<SentimentStoredResult>;
  readLatestForNews(newsId: string): Promise<SentimentStoredResult | undefined>;
}
export interface Clock {
  now(): string;
}
export interface SentimentObservability {
  recordInferenceFailure(input: {
    newsId: string;
    reason: "TIMEOUT" | "INFERENCE_ERROR" | "INVALID_RESULT";
  }): void;
}
export interface SentimentModuleDependencies {
  provider: SentimentProvider;
  resultRepository: SentimentResultRepository;
  clock: Clock;
  observability: SentimentObservability;
}

/** News consumers can represent absence/degradation without fabricating a neutral score. */
export interface SentimentAvailabilityPort {
  readAvailability(newsId: string): Promise<
    | { state: "AVAILABLE"; result: SentimentStoredResult }
    | { state: "MISSING" }
    | { state: "DEGRADED"; reason: "TIMEOUT" | "INFERENCE_ERROR" | "INVALID_RESULT" }
  >;
}

/**
 * Neutral, provider-free News extraction provenance accepted at the
 * News-to-Sentiment join. It intentionally does not depend on News storage or
 * expose a provider payload.
 */
export interface NewsExtractionProvenanceInput {
  readonly sourceKind: "CONFIGURED_WEBSITE" | "RSS" | "HTML" | "ALLOWLISTED_URL_IMPORT";
  readonly canonicalUrl: string;
  readonly normalizedContentHash: string;
  readonly templateVersion?: number;
  readonly extractedAt: string;
}

export interface SentimentNewsProvenanceJoin {
  readonly newsId: string;
  readonly result: SentimentStoredResult;
  readonly newsExtraction?: NewsExtractionProvenanceInput;
}
