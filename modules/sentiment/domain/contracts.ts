export type SentimentLabel = "POSITIVE" | "NEUTRAL" | "NEGATIVE";
export interface SentimentInput {
  newsId: string;
  title: string;
  content: string;
  source: string;
  publishedAt: string;
  relatedCoins: string[];
}
export interface SentimentResult {
  newsId: string;
  label: SentimentLabel;
  score: number;
  modelName: string;
  modelVersion: string;
  analyzedAt: string;
}
export interface CreateSentimentSnapshotCommand {
  relatedCoin: string;
  range: { from: string; to: string };
  aggregationWindowSeconds: number;
  modelName: string;
  modelVersion: string;
  modelSha256: string;
}
export interface SentimentDatasetSnapshotRef {
  id: string;
  relatedCoin: string;
  range: { from: string; to: string };
  aggregationWindowSeconds: number;
  modelName: string;
  modelVersion: string;
  modelSha256: string;
  pointCount: number;
  sha256: string;
  createdAt: string;
}
export interface SentimentSnapshotPoint {
  timestamp: string;
  label: SentimentLabel;
  averageScore: number;
}
export interface SentimentSnapshotReader {
  readAt(snapshotId: string, candleCloseTime: string): SentimentSnapshotPoint | undefined;
}
