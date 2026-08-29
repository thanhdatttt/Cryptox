import type { NewsObservability, NewsProvider } from "../application/ports";
import type { CrawlerNewsProviderOptions } from "./crawler-provider";
export declare const COINDESK_RSS_FEED_URL = "https://www.coindesk.com/arc/outboundfeeds/rss/";
export interface CoinDeskRssProviderOptions {
    clock?: {
        now(): string;
    };
    /** Injectable only at the infrastructure boundary so tests never need live CoinDesk access. */
    fetch?: typeof globalThis.fetch;
    observability?: Pick<NewsObservability, "recordProviderFailure">;
}
export declare function createCoinDeskRssProvider(options?: CoinDeskRssProviderOptions): NewsProvider;
export declare function createConfiguredNewsProviders(input?: {
    provider?: string;
    clock?: {
        now(): string;
    };
    crawler?: CrawlerNewsProviderOptions;
    observability?: Pick<NewsObservability, "recordProviderFailure">;
}): readonly NewsProvider[];
