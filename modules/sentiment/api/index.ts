import type { CreateSentimentSnapshotCommand, SentimentDatasetSnapshotRef, SentimentInput, SentimentResult, SentimentSnapshotReader } from "../domain/contracts";
export type { SentimentLabel, SentimentInput, SentimentResult, SentimentDatasetSnapshotRef, SentimentSnapshotPoint, SentimentSnapshotReader } from "../domain/contracts";
export type { SentimentAnalysisService } from "../application/ports";
export interface SentimentModulePublicApi { analyze(input: SentimentInput): Promise<SentimentResult>; readLatestForNews(newsId: string): Promise<SentimentResult | undefined>; createSnapshot(command: CreateSentimentSnapshotCommand): Promise<SentimentDatasetSnapshotRef>; readSnapshot(snapshotId: string): SentimentSnapshotReader; }
const notImplemented = (): never => { throw new Error("NOT_IMPLEMENTED"); };
export const analyze: SentimentModulePublicApi["analyze"] = async () => notImplemented();
export const readLatestForNews: SentimentModulePublicApi["readLatestForNews"] = async () => notImplemented();
export const createSnapshot: SentimentModulePublicApi["createSnapshot"] = async () => notImplemented();
export const readSnapshot: SentimentModulePublicApi["readSnapshot"] = () => notImplemented();
