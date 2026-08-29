import type {
  CollectNewsCommand,
  NewsCollectionResult,
  NewsModulePublicApi,
  NewsPage,
  NewsReadQuery,
} from "./contracts";
import { InMemoryNewsRepository } from "../application/memory";
import { NewsApplicationService } from "../application/service";

export * from "./contracts";

const defaultService = new NewsApplicationService({
  providers: [],
  newsRepository: new InMemoryNewsRepository(),
  sentiment: {
    analyze: async () => {
      throw new Error("Sentiment is not configured");
    },
    readLatestForNews: async () => undefined,
  },
  sentimentTimeoutMs: 1_000,
  observability: {
    recordProviderFailure: () => undefined,
    recordSentimentFailure: () => undefined,
  },
});

export const collect = async (command: CollectNewsCommand): Promise<NewsCollectionResult> =>
  defaultService.collect(command);
export const readNews = async (query: NewsReadQuery): Promise<NewsPage> => defaultService.readNews(query);

export type _NewsApiShape = NewsModulePublicApi;
