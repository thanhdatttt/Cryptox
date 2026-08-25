import type { NewsProvider } from "../application/ports";
export declare function createDemoNewsProvider(clock?: {
    now(): string;
}): NewsProvider;
export declare function createConfiguredNewsProviders(input?: {
    provider?: string;
    clock?: {
        now(): string;
    };
}): readonly NewsProvider[];
