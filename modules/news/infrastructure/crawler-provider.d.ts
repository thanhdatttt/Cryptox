import type { HtmlNewsInterpreter, InterpretedNewsCandidate, NewsObservability, NewsProvider } from "../application/ports";
export interface CrawlerLimits {
    maxHtmlBytes?: number;
    maxInterpreterHtmlBytes?: number;
    maxRedirects?: number;
    timeoutMs?: number;
    maxCandidates?: number;
    maxFieldLength?: number;
}
export interface FetchedNewsPage {
    finalUrl?: string;
    url?: string;
    html: string;
    contentType?: string | null;
}
export interface CrawlerNewsProviderOptions {
    sourceUrls?: readonly string[];
    urls?: readonly string[];
    interpreter: HtmlNewsInterpreter;
    name?: string;
    clock?: {
        now(): string;
    };
    limits?: CrawlerLimits;
    maxHtmlBytes?: number;
    maxInterpreterHtmlBytes?: number;
    maxRedirects?: number;
    timeoutMs?: number;
    maxCandidates?: number;
    maxFieldLength?: number;
    fetch?: typeof globalThis.fetch;
    resolveHost?: (hostname: string) => Promise<readonly string[]>;
    fetchPage?: (sourceUrl: string, limits: Readonly<Required<CrawlerLimits>>) => Promise<FetchedNewsPage>;
    observability?: Pick<NewsObservability, "recordProviderFailure">;
}
export declare const preprocessCrawlerHtml: (rawHtml: string, sourceUrl: string, maxBytes: number) => string;
export declare function createCrawlerNewsProvider(options: CrawlerNewsProviderOptions): NewsProvider;
export type { InterpretedNewsCandidate };
