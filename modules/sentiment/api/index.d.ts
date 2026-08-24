import type { CreateSentimentSnapshotCommand, SentimentDatasetSnapshotRef, SentimentInput, SentimentResult, SentimentSnapshotReader } from "../domain/contracts";
export type { SentimentLabel, SentimentInput, SentimentResult, SentimentDatasetSnapshotRef, SentimentSnapshotPoint, SentimentSnapshotReader } from "../domain/contracts";
export type { SentimentAnalysisService } from "../application/ports";
export interface SentimentModulePublicApi {
    analyze(input: SentimentInput): Promise<SentimentResult>;
    readLatestForNews(newsId: string): Promise<SentimentResult | undefined>;
    createSnapshot(command: CreateSentimentSnapshotCommand): Promise<SentimentDatasetSnapshotRef>;
    getSnapshotRef(snapshotId: string): Promise<SentimentDatasetSnapshotRef>;
    readSnapshot(snapshotId: string): Promise<SentimentSnapshotReader>;
}
export declare const analyze: SentimentModulePublicApi["analyze"];
export declare const readLatestForNews: SentimentModulePublicApi["readLatestForNews"];
export declare const createSnapshot: SentimentModulePublicApi["createSnapshot"];
export declare const getSnapshotRef: SentimentModulePublicApi["getSnapshotRef"];
export declare const readSnapshot: SentimentModulePublicApi["readSnapshot"];
export { createInMemorySentimentDependencies, createSentimentModule } from "../application/service";
