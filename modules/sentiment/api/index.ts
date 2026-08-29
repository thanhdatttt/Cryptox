import type { SentimentInput, SentimentModulePublicApi, SentimentResult } from "./contracts";
import { createInMemorySentimentDependencies } from "../application/memory";
import { createSentimentApplication } from "../application/service";

export * from "./contracts";

const defaultSentimentApplication = createSentimentApplication(
  createInMemorySentimentDependencies(),
);

export const analyze = (input: SentimentInput): Promise<SentimentResult> =>
  defaultSentimentApplication.analyze(input);
export const readLatestForNews: SentimentModulePublicApi["readLatestForNews"] = (newsId) =>
  defaultSentimentApplication.readLatestForNews(newsId);
