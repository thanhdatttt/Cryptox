"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresSentimentSnapshotRepository = exports.PostgresSentimentResultRepository = void 0;
const date = (value) => new Date(value).toISOString();
const number = (value) => typeof value === "number" ? value : Number(value);
const strings = (value) => typeof value === "string" ? JSON.parse(value) : [...value];
const result = (row) => ({ newsId: row.news_id, label: row.label, score: number(row.score), modelName: row.model_name, modelVersion: row.model_version, analyzedAt: date(row.analyzed_at) });
const snapshot = (row) => ({ id: row.id, relatedCoin: row.related_coin, range: { from: date(row.dataset_from), to: date(row.dataset_to) }, aggregationWindowSeconds: row.aggregation_window_seconds, modelName: row.model_name, modelVersion: row.model_version, modelSha256: row.model_sha256, pointCount: row.point_count, sha256: row.sha256, createdAt: date(row.created_at) });
class PostgresSentimentResultRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async insert(value, input) {
        const inserted = await this.client.query("INSERT INTO sentiment_results (news_id, label, score, model_name, model_version, analyzed_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (news_id, model_name, model_version) DO NOTHING RETURNING news_id, label, score, model_name, model_version, analyzed_at", [value.newsId, value.label, value.score, value.modelName, value.modelVersion, value.analyzedAt]);
        if (inserted.rows[0])
            return result(inserted.rows[0]);
        const existing = await this.client.query("SELECT news_id, label, score, model_name, model_version, analyzed_at FROM sentiment_results WHERE news_id = $1 AND model_name = $2 AND model_version = $3", [input.newsId, value.modelName, value.modelVersion]);
        if (!existing.rows[0])
            throw new Error("SENTIMENT_PERSISTENCE_INTEGRITY_ERROR");
        return result(existing.rows[0]);
    }
    async readLatestForNews(newsId) { const rows = await this.client.query("SELECT news_id, label, score, model_name, model_version, analyzed_at FROM sentiment_results WHERE news_id = $1 ORDER BY analyzed_at DESC, id DESC LIMIT 1", [newsId]); return rows.rows[0] ? result(rows.rows[0]) : undefined; }
    async readForSnapshot(command) {
        const rows = await this.client.query("SELECT s.news_id, s.label, s.score, s.model_name, s.model_version, s.analyzed_at, n.title, n.content, n.source, n.published_at, n.related_coins FROM sentiment_results s JOIN news_items n ON n.id = s.news_id WHERE s.model_name = $1 AND s.model_version = $2 AND n.published_at >= $3 AND n.published_at < $4 ORDER BY n.published_at ASC, s.id ASC", [command.modelName, command.modelVersion, command.range.from, command.range.to]);
        return rows.rows.filter((row) => strings(row.related_coins ?? []).includes(command.relatedCoin)).map((row) => ({ input: { newsId: row.news_id, title: row.title, content: row.content, source: row.source, publishedAt: date(row.published_at), relatedCoins: strings(row.related_coins) }, result: result(row) }));
    }
}
exports.PostgresSentimentResultRepository = PostgresSentimentResultRepository;
class PostgresSentimentSnapshotRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async insertSealed(ref, points) {
        const existing = await this.client.query("SELECT id, related_coin, dataset_from, dataset_to, aggregation_window_seconds, model_name, model_version, model_sha256, point_count, sha256, created_at FROM sentiment_dataset_snapshots WHERE sha256 = $1", [ref.sha256]);
        const saved = existing.rows[0] ? snapshot(existing.rows[0]) : ref;
        if (!existing.rows[0])
            await this.client.query("INSERT INTO sentiment_dataset_snapshots (id, related_coin, dataset_from, dataset_to, aggregation_window_seconds, model_name, model_version, model_sha256, point_count, sha256, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)", [saved.id, saved.relatedCoin, saved.range.from, saved.range.to, saved.aggregationWindowSeconds, saved.modelName, saved.modelVersion, saved.modelSha256, saved.pointCount, saved.sha256, saved.createdAt]);
        for (const point of points)
            await this.client.query("INSERT INTO sentiment_dataset_snapshot_points (snapshot_id, timestamp, label, average_score) VALUES ($1, $2, $3, $4) ON CONFLICT (snapshot_id, timestamp) DO NOTHING", [saved.id, point.timestamp, point.label, point.averageScore]);
        return saved;
    }
    async getRef(snapshotId) { const rows = await this.client.query("SELECT id, related_coin, dataset_from, dataset_to, aggregation_window_seconds, model_name, model_version, model_sha256, point_count, sha256, created_at FROM sentiment_dataset_snapshots WHERE id = $1", [snapshotId]); return rows.rows[0] ? snapshot(rows.rows[0]) : undefined; }
    async readSealed(snapshotId) { const ref = await this.getRef(snapshotId); if (!ref)
        return undefined; const rows = await this.client.query("SELECT timestamp, label, average_score FROM sentiment_dataset_snapshot_points WHERE snapshot_id = $1 ORDER BY timestamp ASC", [snapshotId]); return { ref, points: rows.rows.map((row) => ({ timestamp: date(row.timestamp), label: row.label, averageScore: number(row.average_score) })) }; }
}
exports.PostgresSentimentSnapshotRepository = PostgresSentimentSnapshotRepository;
