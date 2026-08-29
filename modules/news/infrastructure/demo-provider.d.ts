import type { NewsObservability, NewsProvider } from "../application/ports";
import type { CrawlerNewsProviderOptions } from "./crawler-provider";
export declare function createDemoNewsProvider(clock?: {
    now(): string;
}): NewsProvider;
export declare function createConfiguredNewsProviders(input?: {
    provider?: string;
    clock?: {
        now(): string;
    };
    crawler?: CrawlerNewsProviderOptions;
    observability?: Pick<NewsObservability, "recordProviderFailure">;
}): readonly NewsProvider[];
