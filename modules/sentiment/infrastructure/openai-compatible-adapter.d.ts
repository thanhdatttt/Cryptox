import type { SentimentAnalysisService } from "../application/ports";
export type SentimentModelErrorCode = "SENTIMENT_MODEL_UNAVAILABLE" | "SENTIMENT_MODEL_AUTHENTICATION_FAILED" | "SENTIMENT_MODEL_RATE_LIMITED" | "SENTIMENT_MODEL_TIMEOUT" | "SENTIMENT_MODEL_SCHEMA_INVALID" | "SENTIMENT_MODEL_ERROR";
export declare class SentimentModelError extends Error {
    readonly code: SentimentModelErrorCode;
    constructor(code: SentimentModelErrorCode);
}
export interface OpenAiCompatibleSentimentOptions {
    apiKey: string;
    model: string;
    modelVersion?: string;
    endpoint?: string;
    fetch?: typeof globalThis.fetch;
    timeoutMs?: number;
    maxRetries?: number;
    clock?: {
        now(): string;
    };
}
export declare function createOpenAiCompatibleSentimentAdapter(options: OpenAiCompatibleSentimentOptions): SentimentAnalysisService;
