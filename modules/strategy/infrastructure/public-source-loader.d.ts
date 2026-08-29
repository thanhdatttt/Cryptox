import type { StrategySourceLoader } from "../application/ports";
export interface PublicStrategySourceLoaderOptions {
    fetch?: typeof globalThis.fetch;
    lookup?: (hostname: string, options: {
        all: true;
        verbatim: true;
    }) => Promise<Array<{
        address: string;
        family?: number;
    }>>;
    timeoutMs?: number;
    maxRedirects?: number;
    maxResponseBytes?: number;
    maxExtractedTextCharacters?: number;
}
export declare function createPublicStrategySourceLoader(options?: PublicStrategySourceLoaderOptions): StrategySourceLoader;
