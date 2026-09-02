export type { NewsModuleDependencies } from "../application/ports";
export type { HtmlNewsInterpreter, InterpretedNewsCandidate, NewsObservability, NewsProvider, NewsProviderFailureReason, NewsProviderFailureStage, NewsRepository } from "../application/ports";
import type { NewsModuleDependencies } from "../application/ports";
import type { NewsModulePublicApi } from "./index";
import { createNewsModule as createRuntime } from "../application/service";
export function createNewsModule(deps?: Partial<NewsModuleDependencies>): NewsModulePublicApi { return createRuntime(deps); }
export { PostgresNewsRepository } from "../infrastructure/postgres-repository";
export type { NewsSqlClient } from "../infrastructure/postgres-repository";
export { COINDESK_RSS_FEED_URL, createCoinDeskRssProvider, createRssFeedProvider, createConfiguredNewsProviders } from "../infrastructure/coindesk-rss-provider";
export type { CoinDeskRssProviderOptions, RssFeedProviderOptions } from "../infrastructure/coindesk-rss-provider";
export { createCrawlerNewsProvider } from "../infrastructure/crawler-provider";
export type { CrawlerNewsProviderOptions, CrawlerLimits, FetchedNewsPage } from "../infrastructure/crawler-provider";
export { createOpenAiCompatibleHtmlNewsInterpreter, HtmlNewsInterpreterError } from "../infrastructure/openai-html-news-interpreter";
export type { HtmlNewsInterpreterErrorCode, OpenAiCompatibleHtmlNewsInterpreterOptions } from "../infrastructure/openai-html-news-interpreter";
