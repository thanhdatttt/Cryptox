import type { NewsItem } from "../domain/contracts";
export interface NewsProvider { readonly name: string; fetch(): Promise<NewsItem[]>; }
export interface NewsRepository { insert(item: NewsItem): Promise<NewsItem>; readAll(): Promise<NewsItem[]>; }
export interface NewsObservability { recordSentimentFailure(input: { newsId: string; reason: "TIMEOUT" | "INFERENCE_ERROR" }): void; }
export interface NewsModuleDependencies { providers: readonly NewsProvider[]; newsRepository: NewsRepository; sentiment: import("../domain/contracts").NewsSentimentPort; observability?: NewsObservability; }
