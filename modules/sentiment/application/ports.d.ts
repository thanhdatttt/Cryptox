import type { CreateSentimentSnapshotCommand, SentimentDatasetSnapshotRef, SentimentInput, SentimentResult, SentimentSnapshotPoint } from "../domain/contracts";
export interface SentimentAnalysisService {
    analyze(input: SentimentInput): Promise<SentimentResult>;
}
export interface SentimentSnapshotSource {
    input: SentimentInput;
    result: SentimentResult;
}
export interface SentimentResultRepository {
    insert(result: SentimentResult, input: SentimentInput): Promise<SentimentResult>;
    readLatestForNews(newsId: string): Promise<SentimentResult | undefined>;
    readForSnapshot(command: Pick<CreateSentimentSnapshotCommand, "relatedCoin" | "range" | "modelName" | "modelVersion">): Promise<SentimentSnapshotSource[]>;
}
export interface SealedSentimentSnapshot {
    ref: SentimentDatasetSnapshotRef;
    points: SentimentSnapshotPoint[];
}
export interface SentimentSnapshotRepository {
    insertSealed(ref: SentimentDatasetSnapshotRef, points: SentimentSnapshotPoint[]): Promise<SentimentDatasetSnapshotRef>;
    getRef(snapshotId: string): Promise<SentimentDatasetSnapshotRef | undefined>;
    readSealed(snapshotId: string): Promise<SealedSentimentSnapshot | undefined>;
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
