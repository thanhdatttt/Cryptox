import type { SentimentDatasetSnapshotRef, SentimentInput, SentimentResult, SentimentSnapshotPoint } from "../domain/contracts";
export interface SentimentAnalysisService {
    analyze(input: SentimentInput): Promise<SentimentResult>;
}
export interface SentimentResultRepository {
    insert(result: SentimentResult): Promise<SentimentResult>;
    readLatestForNews(newsId: string): Promise<SentimentResult | undefined>;
}
export interface SentimentSnapshotRepository {
    insertSealed(ref: SentimentDatasetSnapshotRef, points: SentimentSnapshotPoint[]): Promise<SentimentDatasetSnapshotRef>;
    readAt(snapshotId: string, candleCloseTime: string): SentimentSnapshotPoint | undefined;
}
export interface Clock {
    now(): string;
}
export interface SentimentObservability {
    recordInferenceFailure(input: {
        newsId: string;
        reason: "TIMEOUT" | "INFERENCE_ERROR" | "INVALID_RESULT";
    }): void;
}
export interface SentimentModuleDependencies {
    analysis: SentimentAnalysisService;
    resultRepository: SentimentResultRepository;
    snapshotRepository: SentimentSnapshotRepository;
    clock: Clock;
    observability?: SentimentObservability;
}
