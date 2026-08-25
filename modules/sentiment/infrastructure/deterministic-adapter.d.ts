import type { SentimentAnalysisService } from "../application/ports";
export declare const LOCAL_SENTIMENT_MODEL_NAME = "LOCAL_LEXICON";
export declare const LOCAL_SENTIMENT_MODEL_VERSION = "1.0.0";
export declare const LOCAL_SENTIMENT_MODEL_SHA256: string;
export declare function createDeterministicSentimentAdapter(clock?: {
    now(): string;
}): SentimentAnalysisService;
