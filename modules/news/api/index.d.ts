import type { NewsReadItem } from "../domain/contracts";
export type { NewsItem, NewsReadItem, NewsSentimentPort, SentimentReadService } from "../domain/contracts";
export interface NewsModulePublicApi {
    collect(): Promise<void>;
    readNews(): Promise<NewsReadItem[]>;
}
export declare const collect: NewsModulePublicApi["collect"];
export declare const readNews: NewsModulePublicApi["readNews"];
export { createInMemoryNewsDependencies, createNewsModule } from "../application/service";
