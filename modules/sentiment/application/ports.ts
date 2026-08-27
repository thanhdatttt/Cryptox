import type { SentimentInput, SentimentLabel, SentimentResult } from "../domain/contracts";

export interface SentimentProviderResult {
  label: SentimentLabel;
  score: number;
  modelName: string;
  modelVersion: string;
}

export interface SentimentProvider {
  readonly id: string;
  analyze(input: SentimentInput): Promise<SentimentProviderResult>;
}

export interface SentimentAnalysisService {
  analyze(input: SentimentInput): Promise<SentimentResult>;
}
export interface SentimentResultRepository {
  insert(result: SentimentResult): Promise<SentimentResult>;
  readLatestForNews(newsId: string): Promise<SentimentResult | undefined>;
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
  observability?: SentimentObservability;
}
