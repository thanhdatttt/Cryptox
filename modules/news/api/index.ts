import { createInMemoryNewsDependencies, createNewsModule } from "../application/service";
import type { NewsReadItem } from "../domain/contracts";
export type { NewsItem, NewsReadItem, NewsSentimentPort, SentimentReadService } from "../domain/contracts";
export interface NewsModulePublicApi { collect(): Promise<void>; readNews(): Promise<NewsReadItem[]>; }
const defaultService = createNewsModule(createInMemoryNewsDependencies());
export const collect: NewsModulePublicApi["collect"] = () => defaultService.collect();
export const readNews: NewsModulePublicApi["readNews"] = () => defaultService.readNews();
export { createInMemoryNewsDependencies, createNewsModule } from "../application/service";
