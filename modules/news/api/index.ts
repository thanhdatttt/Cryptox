import type {
  CollectNewsCommand,
  NewsCollectionResult,
  NewsModulePublicApi,
  NewsPage,
  NewsReadQuery,
} from "./contracts";

export * from "./contracts";

const notImplemented = (): never => {
  throw new Error("NOT_IMPLEMENTED");
};

export const collect = async (_command: CollectNewsCommand): Promise<NewsCollectionResult> =>
  notImplemented();
export const readNews = async (_query: NewsReadQuery): Promise<NewsPage> => notImplemented();

export type _NewsApiShape = NewsModulePublicApi;
