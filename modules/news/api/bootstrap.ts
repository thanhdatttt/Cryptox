export type {
  NewsCollectionRequest,
  NewsModuleDependencies,
  NewsObservability,
  NewsProvider,
  NewsRepository,
  NewsSentimentPort,
  SentimentReadService,
} from "../application/ports";
import type { NewsModuleDependencies } from "../application/ports";
import type { NewsModulePublicApi } from "./index";
import { NewsApplicationService } from "../application/service";

export function createNewsModule(deps: NewsModuleDependencies): NewsModulePublicApi {
  return new NewsApplicationService(deps);
}

export { NewsApplicationError, NewsApplicationService } from "../application/service";
export { InMemoryNewsRepository, createInMemoryNewsRepository } from "../application/memory";
export {
  COINDESK_PROVIDER_ID,
  createCoinDeskNewsProvider,
} from "../infrastructure/coindesk";
export type {
  CoinDeskFetch,
  CoinDeskFetchResponse,
  CoinDeskNewsProviderOptions,
} from "../infrastructure/coindesk";
export { createPostgresNewsDependencies } from "../infrastructure/postgres";
export type {
  PostgresNewsDependencies,
  PostgresNewsOptions,
  PostgresPool,
  PostgresQueryResult,
} from "../infrastructure/postgres";
