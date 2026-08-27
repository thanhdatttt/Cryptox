import type { SentimentResult } from "@cryptox/sentiment";
import type { NewsItem } from "../domain/contracts";
export type { NewsItem } from "../domain/contracts";
export type { NewsSentimentPort, SentimentReadService } from "../application/ports";
export interface NewsReadItem extends NewsItem {
  sentiment?: SentimentResult;
}
export interface NewsModulePublicApi {
  collect(): Promise<void>;
  readNews(): Promise<NewsReadItem[]>;
}
const notImplemented = (): never => {
  throw new Error("NOT_IMPLEMENTED");
};
export const collect: NewsModulePublicApi["collect"] = async () => notImplemented();
export const readNews: NewsModulePublicApi["readNews"] = async () => notImplemented();
