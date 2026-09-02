import { createInMemoryNewsDependencies, createNewsModule, type NewsCollectOptions } from "../application/service";
import type { NewsReadItem } from "../domain/contracts";
export type { NewsItem, NewsReadItem, NewsSentimentPort, SentimentReadService } from "../domain/contracts";
export type { NewsCollectOptions };
export interface NewsModulePublicApi { collect(options?: NewsCollectOptions): Promise<void>; readNews(): Promise<NewsReadItem[]>; }
const defaultService = createNewsModule(createInMemoryNewsDependencies());
export const collect: NewsModulePublicApi["collect"] = (options) => defaultService.collect(options);
export const readNews: NewsModulePublicApi["readNews"] = () => defaultService.readNews();
export { createInMemoryNewsDependencies, createNewsModule } from "../application/service";
