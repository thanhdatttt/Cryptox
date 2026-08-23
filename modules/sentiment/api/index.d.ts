import type { SentimentModuleDependencies } from "./bootstrap";
import type { CreateSentimentSnapshotCommand, SentimentDatasetSnapshotRef, SentimentInput, SentimentResult, SentimentSnapshotReader } from "../domain/contracts";
export type { SentimentLabel, SentimentInput, SentimentResult, SentimentDatasetSnapshotRef, SentimentSnapshotPoint, SentimentSnapshotReader } from "../domain/contracts";
export type { SentimentAnalysisService } from "../application/ports";
export interface SentimentModulePublicApi {
    analyze(input: SentimentInput): Promise<SentimentResult>;
    readLatestForNews(newsId: string): Promise<SentimentResult | undefined>;
    createSnapshot(command: CreateSentimentSnapshotCommand): Promise<SentimentDatasetSnapshotRef>;
    readSnapshot(snapshotId: string): SentimentSnapshotReader;
}
export declare const analyze: SentimentModulePublicApi["analyze"];
export declare const readLatestForNews: SentimentModulePublicApi["readLatestForNews"];
export declare const createSnapshot: SentimentModulePublicApi["createSnapshot"];
export declare const readSnapshot: SentimentModulePublicApi["readSnapshot"];
export declare function createSentimentModule(_deps: SentimentModuleDependencies): SentimentModulePublicApi;
