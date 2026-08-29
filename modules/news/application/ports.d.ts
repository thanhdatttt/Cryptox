import type { NewsItem } from "../domain/contracts";
export interface HtmlNewsInterpreter {
    interpret(input: {
        sourceUrl: string;
        html: string;
    }): Promise<InterpretedNewsCandidate[]>;
}
export interface InterpretedNewsCandidate {
    title: string;
    content: string;
    source: string;
    publishedAt: string;
    relatedCoins: string[];
    canonicalUrl: string;
}
export type NewsProviderFailureStage = "FETCH" | "MODEL" | "SCHEMA" | "VALIDATION" | "PERSISTENCE";
export type NewsProviderFailureReason = "TIMEOUT" | "ERROR" | "INVALID_OUTPUT";
export interface NewsProvider {
    readonly name: string;
    fetch(): Promise<NewsItem[]>;
}
export interface NewsRepository {
    insert(item: NewsItem): Promise<NewsItem>;
    readAll(): Promise<NewsItem[]>;
}
export interface NewsObservability {
    recordProviderFailure?(input: {
        providerName: string;
        stage: NewsProviderFailureStage;
        reason: NewsProviderFailureReason;
    }): void;
    recordSentimentFailure?(input: {
        newsId: string;
        reason: "TIMEOUT" | "INFERENCE_ERROR";
    }): void;
}
export interface NewsModuleDependencies {
    providers: readonly NewsProvider[];
    newsRepository: NewsRepository;
    sentiment: import("../domain/contracts").NewsSentimentPort;
    observability?: NewsObservability;
}
