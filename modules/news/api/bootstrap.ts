export type {
  NewsCollectionRequest,
  NewsProviderDocument,
  NewsModuleDependencies,
  NewsObservability,
  NewsProvider,
  NewsRepository,
  NewsSentimentPort,
  SentimentReadService,
  ExtractionTemplateRecord,
  NewsExtractionProvenanceRepository,
  NewsRawHtmlArtifact,
  NewsRawHtmlRepository,
  NewsUrlImportExtractor,
  SafeNewsFailureReason,
  SafeNewsUrlFetchPort,
  StoredNewsExtractionProvenance,
} from "../application/ports";
import type { NewsModuleDependencies } from "../application/ports";
import type { NewsModulePublicApi } from "./index";
import { NewsApplicationService } from "../application/service";

export function createNewsModule(deps: NewsModuleDependencies): NewsApplicationService & NewsModulePublicApi {
  return new NewsApplicationService(deps);
}

export { NewsApplicationError, NewsApplicationService } from "../application/service";
export {
  InMemoryExtractionTemplateRepository,
  InMemoryNewsExtractionProvenanceRepository,
  InMemoryNewsRawHtmlRepository,
  InMemoryNewsRepository,
  createInMemoryExtractionTemplateRepository,
  createInMemoryNewsExtractionProvenanceRepository,
  createInMemoryNewsRawHtmlRepository,
  createInMemoryNewsRepository,
} from "../application/memory";
export {
  COINDESK_PROVIDER_ID,
  createCoinDeskNewsProvider,
} from "../infrastructure/coindesk";
export type {
  CoinDeskFetch,
  CoinDeskFetchResponse,
  CoinDeskNewsProviderOptions,
} from "../infrastructure/coindesk";
export {
  ConfiguredNewsExtractionError,
  ConfiguredNewsProvider,
  DEFAULT_NEWS_REFRESH_INTERVAL_MINUTES,
  createConfiguredNewsProvider,
  createHtmlNewsProvider,
  createRssNewsProvider,
  createWebsiteNewsProvider,
  refreshIntervalMinutes,
} from "../infrastructure/configured";
export type {
  ConfiguredNewsProviderOptions,
  ConfiguredNewsSource,
  ConfiguredNewsSourceKind,
} from "../infrastructure/configured";
export {
  SAFE_FETCH_MAX_BODY_BYTES,
  SAFE_FETCH_MAX_REDIRECTS,
  SAFE_FETCH_TIMEOUT_MS,
  SafeNewsFetchError,
  SafeNewsUrlFetcher,
  createSafeNewsUrlFetcher,
} from "../infrastructure/safe-fetch";
export type {
  SafeDnsResolver,
  SafeNewsFetch,
  SafeNewsFetchHeaders,
  SafeNewsFetchInit,
  SafeNewsFetchResponse,
  SafeNewsSourceConfiguration,
  SafeNewsUrlFetcherOptions,
} from "../infrastructure/safe-fetch";
export { createPostgresNewsDependencies } from "../infrastructure/postgres";
export type {
  PostgresNewsDependencies,
  PostgresNewsOptions,
  PostgresPool,
  PostgresQueryResult,
} from "../infrastructure/postgres";
export type { PostgresNewsMetadataDependencies } from "../infrastructure/extraction-postgres";
