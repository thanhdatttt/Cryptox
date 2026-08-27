import type { SentimentInput, SentimentResult } from "../domain/contracts";
export type { SentimentLabel, SentimentInput, SentimentResult } from "../domain/contracts";
export type { SentimentAnalysisService } from "../application/ports";
export interface SentimentModulePublicApi {
  analyze(input: SentimentInput): Promise<SentimentResult>;
  readLatestForNews(newsId: string): Promise<SentimentResult | undefined>;
}
const notImplemented = (): never => {
  throw new Error("NOT_IMPLEMENTED");
};
export const analyze: SentimentModulePublicApi["analyze"] = async () => notImplemented();
export const readLatestForNews: SentimentModulePublicApi["readLatestForNews"] = async () =>
  notImplemented();
