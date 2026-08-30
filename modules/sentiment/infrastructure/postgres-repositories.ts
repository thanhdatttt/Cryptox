import { createHash } from "node:crypto";
import type { CreateSentimentSnapshotCommand, SentimentDatasetSnapshotRef, SentimentInput, SentimentLabel, SentimentResult, SentimentSnapshotPoint } from "../domain/contracts";
import type { SealedSentimentSnapshot, SentimentResultRepository, SentimentSnapshotRepository } from "../application/ports";
import { sentimentSnapshotSerialization, validateSnapshotCommand, validateSnapshotPoint } from "../domain/rules";

export interface SentimentSqlTransactionClient { query<Row>(text: string, values: unknown[]): Promise<{ rows: Row[] }>; release(): void; }
export interface SentimentSqlClient { query<Row>(text: string, values: unknown[]): Promise<{ rows: Row[] }>; connect?(): Promise<SentimentSqlTransactionClient>; }
const date = (value: Date | string): string => new Date(value).toISOString();
const number = (value: number | string): number => typeof value === "number" ? value : Number(value);
const strings = (value: string[] | string): string[] => typeof value === "string" ? JSON.parse(value) as string[] : [...value];

interface ResultRow { news_id: string; label: SentimentLabel; score: number | string; model_name: string; model_version: string; analyzed_at: Date | string; title?: string; content?: string; source?: string; published_at?: Date | string; related_coins?: string[] | string; }
interface SnapshotRow { id: string; related_coin: string; dataset_from: Date | string; dataset_to: Date | string; aggregation_window_seconds: number; model_name: string; model_version: string; model_sha256: string; point_count: number; sha256: string; created_at: Date | string; }
interface PointRow { timestamp: Date | string; label: SentimentLabel; average_score: number | string; }

const result = (row: ResultRow): SentimentResult => ({ newsId: row.news_id, label: row.label, score: number(row.score), modelName: row.model_name, modelVersion: row.model_version, analyzedAt: date(row.analyzed_at) });
const snapshot = (row: SnapshotRow): SentimentDatasetSnapshotRef => ({ id: row.id, relatedCoin: row.related_coin, range: { from: date(row.dataset_from), to: date(row.dataset_to) }, aggregationWindowSeconds: row.aggregation_window_seconds, modelName: row.model_name, modelVersion: row.model_version, modelSha256: row.model_sha256, pointCount: row.point_count, sha256: row.sha256, createdAt: date(row.created_at) });

export class PostgresSentimentResultRepository implements SentimentResultRepository {
  constructor(private readonly client: SentimentSqlClient) {}
  async insert(value: SentimentResult, input: SentimentInput): Promise<SentimentResult> {
    const inserted = await this.client.query<ResultRow>("INSERT INTO sentiment_results (news_id, label, score, model_name, model_version, analyzed_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (news_id, model_name, model_version) DO NOTHING RETURNING news_id, label, score, model_name, model_version, analyzed_at", [value.newsId, value.label, value.score, value.modelName, value.modelVersion, value.analyzedAt]);
    if (inserted.rows[0]) return result(inserted.rows[0]);
    const existing = await this.client.query<ResultRow>("SELECT news_id, label, score, model_name, model_version, analyzed_at FROM sentiment_results WHERE news_id = $1 AND model_name = $2 AND model_version = $3", [input.newsId, value.modelName, value.modelVersion]);
    if (!existing.rows[0]) throw new Error("SENTIMENT_PERSISTENCE_INTEGRITY_ERROR");
    return result(existing.rows[0]);
  }
  async readLatestForNews(newsId: string): Promise<SentimentResult | undefined> { const rows = await this.client.query<ResultRow>("SELECT news_id, label, score, model_name, model_version, analyzed_at FROM sentiment_results WHERE news_id = $1 ORDER BY analyzed_at DESC, id DESC LIMIT 1", [newsId]); return rows.rows[0] ? result(rows.rows[0]) : undefined; }
  async readForSnapshot(command: Pick<CreateSentimentSnapshotCommand, "relatedCoin" | "range" | "modelName" | "modelVersion">) {
    const rows = await this.client.query<ResultRow>("SELECT s.news_id, s.label, s.score, s.model_name, s.model_version, s.analyzed_at, n.title, n.content, n.source, n.published_at, n.related_coins FROM sentiment_results s JOIN news_items n ON n.id = s.news_id WHERE s.model_name = $1 AND s.model_version = $2 AND n.published_at >= $3 AND n.published_at < $4 ORDER BY n.published_at ASC, s.id ASC", [command.modelName, command.modelVersion, command.range.from, command.range.to]);
    return rows.rows.filter((row) => strings(row.related_coins ?? []).includes(command.relatedCoin)).map((row) => ({ input: { newsId: row.news_id, title: row.title!, content: row.content!, source: row.source!, publishedAt: date(row.published_at!), relatedCoins: strings(row.related_coins!) }, result: result(row) }));
  }
}

export class PostgresSentimentSnapshotRepository implements SentimentSnapshotRepository {
  constructor(private readonly client: SentimentSqlClient) {}
  private validateSealed(ref: SentimentDatasetSnapshotRef, points: SentimentSnapshotPoint[]): void {
    const command: CreateSentimentSnapshotCommand = validateSnapshotCommand({ relatedCoin: ref.relatedCoin, range: ref.range, aggregationWindowSeconds: ref.aggregationWindowSeconds, modelName: ref.modelName, modelVersion: ref.modelVersion, modelSha256: ref.modelSha256 });
    const windowMs = command.aggregationWindowSeconds * 1_000;
    const from = Date.parse(command.range.from);
    const to = Date.parse(command.range.to);
    if (!/^[a-f0-9]{64}$/i.test(ref.sha256) || ref.pointCount !== points.length || points.length === 0 || points.some((point, index) => {
      const validated = validateSnapshotPoint(point);
      const timestamp = Date.parse(validated.timestamp);
      return !Number.isFinite(timestamp) || timestamp <= from || timestamp > to || (timestamp - from) % windowMs !== 0 || (index > 0 && timestamp <= Date.parse(points[index - 1]!.timestamp));
    })) throw new Error("SENTIMENT_SNAPSHOT_INTEGRITY_FAILURE");
    const expectedHash = createHash("sha256").update(sentimentSnapshotSerialization(command, points), "utf8").digest("hex");
    if (expectedHash !== ref.sha256.toLowerCase()) throw new Error("SENTIMENT_SNAPSHOT_INTEGRITY_FAILURE");
  }
  async insertSealed(ref: SentimentDatasetSnapshotRef, points: SentimentSnapshotPoint[]): Promise<SentimentDatasetSnapshotRef> {
    this.validateSealed(ref, points);
    const run = async (client: SentimentSqlClient | SentimentSqlTransactionClient): Promise<SentimentDatasetSnapshotRef> => {
      const existing = await client.query<SnapshotRow>("SELECT id, related_coin, dataset_from, dataset_to, aggregation_window_seconds, model_name, model_version, model_sha256, point_count, sha256, created_at FROM sentiment_dataset_snapshots WHERE sha256 = $1 FOR UPDATE", [ref.sha256]);
      const saved = existing.rows[0] ? snapshot(existing.rows[0]) : ref;
      if (!existing.rows[0]) {
        await client.query("INSERT INTO sentiment_dataset_snapshots (id, related_coin, dataset_from, dataset_to, aggregation_window_seconds, model_name, model_version, model_sha256, point_count, sha256, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)", [saved.id, saved.relatedCoin, saved.range.from, saved.range.to, saved.aggregationWindowSeconds, saved.modelName, saved.modelVersion, saved.modelSha256, saved.pointCount, saved.sha256, saved.createdAt]);
        for (const point of points) await client.query("INSERT INTO sentiment_dataset_snapshot_points (snapshot_id, timestamp, label, average_score) VALUES ($1, $2, $3, $4)", [saved.id, point.timestamp, point.label, point.averageScore]);
        const count = await client.query<{ count: number | string }>("SELECT COUNT(*)::int AS count FROM sentiment_dataset_snapshot_points WHERE snapshot_id = $1", [saved.id]);
        if (count.rows[0] && Number(count.rows[0].count) !== saved.pointCount) throw new Error("SENTIMENT_SNAPSHOT_INTEGRITY_FAILURE");
      }
      return saved;
    };
    if (!this.client.connect) return run(this.client);
    const transaction = await this.client.connect();
    try {
      await transaction.query("BEGIN", []);
      const saved = await run(transaction);
      await transaction.query("COMMIT", []);
      return saved;
    } catch (error) {
      try { await transaction.query("ROLLBACK", []); } catch { /* preserve the original failure */ }
      throw error;
    } finally { transaction.release(); }
  }
  async getRef(snapshotId: string): Promise<SentimentDatasetSnapshotRef | undefined> { const rows = await this.client.query<SnapshotRow>("SELECT id, related_coin, dataset_from, dataset_to, aggregation_window_seconds, model_name, model_version, model_sha256, point_count, sha256, created_at FROM sentiment_dataset_snapshots WHERE id = $1", [snapshotId]); return rows.rows[0] ? snapshot(rows.rows[0]) : undefined; }
  async readSealed(snapshotId: string): Promise<SealedSentimentSnapshot | undefined> { const ref = await this.getRef(snapshotId); if (!ref) return undefined; const rows = await this.client.query<PointRow>("SELECT timestamp, label, average_score FROM sentiment_dataset_snapshot_points WHERE snapshot_id = $1 ORDER BY timestamp ASC", [snapshotId]); const points = rows.rows.map((row) => ({ timestamp: date(row.timestamp), label: row.label, averageScore: number(row.average_score) })); this.validateSealed(ref, points); return { ref, points }; }
}
