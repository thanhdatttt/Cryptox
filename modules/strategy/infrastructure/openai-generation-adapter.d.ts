import type { StrategyGenerationAdapter } from "../application/ports";
export type StrategyModelErrorCode = "STRATEGY_MODEL_UNAVAILABLE" | "STRATEGY_MODEL_AUTHENTICATION_FAILED" | "STRATEGY_MODEL_RATE_LIMITED" | "STRATEGY_MODEL_TIMEOUT" | "STRATEGY_MODEL_SCHEMA_INVALID" | "STRATEGY_MODEL_ERROR";
export declare class StrategyModelError extends Error {
    readonly code: StrategyModelErrorCode;
    constructor(code: StrategyModelErrorCode);
}
export interface OpenAiStrategyGenerationOptions {
    apiKey: string;
    model: string;
    modelVersion?: string;
    endpoint?: string;
    fetch?: typeof globalThis.fetch;
    timeoutMs?: number;
    maxRetries?: number;
}
export declare function createOpenAiCompatibleStrategyGenerationAdapter(options: OpenAiStrategyGenerationOptions): StrategyGenerationAdapter;
/** @deprecated Compatibility alias; runtime configuration is provider-neutral. */
export declare function createOpenAiStrategyGenerationAdapter(options: OpenAiStrategyGenerationOptions): StrategyGenerationAdapter;
