import type { CreateSentimentSnapshotCommand, SentimentDatasetSnapshotRef, SentimentInput, SentimentResult, SentimentSnapshotReader } from "../domain/contracts";
import type { SentimentModuleDependencies } from "./ports";
type InternalDependencies = Partial<SentimentModuleDependencies>;
export interface SentimentModuleRuntime {
    analyze(input: SentimentInput): Promise<SentimentResult>;
    readLatestForNews(newsId: string): Promise<SentimentResult | undefined>;
    createSnapshot(command: CreateSentimentSnapshotCommand): Promise<SentimentDatasetSnapshotRef>;
    getSnapshotRef(snapshotId: string): Promise<SentimentDatasetSnapshotRef>;
    readSnapshot(snapshotId: string): Promise<SentimentSnapshotReader>;
}
export declare function createInMemorySentimentDependencies(): SentimentModuleDependencies;
export declare function createSentimentModule(dependencies?: InternalDependencies): SentimentModuleRuntime;
export {};
