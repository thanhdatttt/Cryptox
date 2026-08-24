import { createInMemorySentimentDependencies, createSentimentModule } from "../application/service";
import type { CreateSentimentSnapshotCommand, SentimentDatasetSnapshotRef, SentimentInput, SentimentResult, SentimentSnapshotReader } from "../domain/contracts";
export type { SentimentLabel, SentimentInput, SentimentResult, SentimentDatasetSnapshotRef, SentimentSnapshotPoint, SentimentSnapshotReader } from "../domain/contracts";
export type { SentimentAnalysisService } from "../application/ports";
export interface SentimentModulePublicApi { analyze(input: SentimentInput): Promise<SentimentResult>; readLatestForNews(newsId: string): Promise<SentimentResult | undefined>; createSnapshot(command: CreateSentimentSnapshotCommand): Promise<SentimentDatasetSnapshotRef>; getSnapshotRef(snapshotId: string): Promise<SentimentDatasetSnapshotRef>; readSnapshot(snapshotId: string): Promise<SentimentSnapshotReader>; }
const defaultService = createSentimentModule(createInMemorySentimentDependencies());
export const analyze: SentimentModulePublicApi["analyze"] = (input) => defaultService.analyze(input);
export const readLatestForNews: SentimentModulePublicApi["readLatestForNews"] = (newsId) => defaultService.readLatestForNews(newsId);
export const createSnapshot: SentimentModulePublicApi["createSnapshot"] = (command) => defaultService.createSnapshot(command);
export const getSnapshotRef: SentimentModulePublicApi["getSnapshotRef"] = (snapshotId) => defaultService.getSnapshotRef(snapshotId);
export const readSnapshot: SentimentModulePublicApi["readSnapshot"] = (snapshotId) => defaultService.readSnapshot(snapshotId);
export { createInMemorySentimentDependencies, createSentimentModule } from "../application/service";
