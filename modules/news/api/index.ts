import type { NewsReadItem } from "../domain/contracts";
export type { NewsItem, NewsReadItem, NewsSentimentPort, SentimentReadService } from "../domain/contracts";
export interface NewsModulePublicApi { collect(): Promise<void>; readNews(): Promise<NewsReadItem[]>; }
const notImplemented = (): never => { throw new Error("NOT_IMPLEMENTED"); };
export const collect: NewsModulePublicApi["collect"] = async () => notImplemented();
export const readNews: NewsModulePublicApi["readNews"] = async () => notImplemented();
