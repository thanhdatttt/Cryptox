import { createInMemoryNewsDependencies, createNewsModule, type NewsCollectOptions } from "../application/service";
import type { NewsReadItem } from "../domain/contracts";
import type { ExtractionTemplate } from "../domain/template-contracts";

export type { NewsItem, NewsReadItem, NewsSentimentPort, SentimentReadService } from "../domain/contracts";
export type { ExtractionTemplate, TemplateSelectors, TemplateValidationStats, SelfHealingProposal } from "../domain/template-contracts";
export type { NewsCollectOptions };

export interface NewsModulePublicApi {
  collect(options?: NewsCollectOptions, userId?: string): Promise<void>;
  readNews(userId?: string): Promise<NewsReadItem[]>;
  getTemplates(): Promise<ExtractionTemplate[]>;
  applyTemplate(domain: string, version: string): Promise<ExtractionTemplate>;
  healTemplate(domain: string, html?: string, autoApply?: boolean): Promise<ExtractionTemplate>;
}

const defaultService = createNewsModule(createInMemoryNewsDependencies());
export const collect: NewsModulePublicApi["collect"] = (options, userId) => defaultService.collect(options, userId);
export const readNews: NewsModulePublicApi["readNews"] = (userId) => defaultService.readNews(userId);
export const getTemplates: NewsModulePublicApi["getTemplates"] = () => defaultService.getTemplates();
export const applyTemplate: NewsModulePublicApi["applyTemplate"] = (domain, version) => defaultService.applyTemplate(domain, version);
export const healTemplate: NewsModulePublicApi["healTemplate"] = (domain, html, autoApply) => defaultService.healTemplate(domain, html, autoApply);
export { createInMemoryNewsDependencies, createNewsModule } from "../application/service";
