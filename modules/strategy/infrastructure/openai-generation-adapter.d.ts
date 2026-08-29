import type { StrategyGenerationAdapter } from "../application/ports";
export interface OpenAiStrategyGenerationOptions {
    apiKey: string;
    model: string;
    modelVersion?: string;
    endpoint?: string;
    fetch?: typeof globalThis.fetch;
}
export declare function createOpenAiStrategyGenerationAdapter(options: OpenAiStrategyGenerationOptions): StrategyGenerationAdapter;
