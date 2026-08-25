"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresNewsRepository = void 0;
const item = (row) => ({ id: row.id, title: row.title, content: row.content, source: row.source, publishedAt: new Date(row.published_at).toISOString(), crawledAt: new Date(row.crawled_at).toISOString(), relatedCoins: typeof row.related_coins === "string" ? JSON.parse(row.related_coins) : [...row.related_coins], url: row.url });
const columns = "id, title, content, source, published_at, crawled_at, related_coins, url";
class PostgresNewsRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async insert(value) {
        const result = await this.client.query(`INSERT INTO news_items (${columns}) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8) ON CONFLICT (url) DO UPDATE SET url = EXCLUDED.url RETURNING ${columns}`, [value.id, value.title, value.content, value.source, value.publishedAt, value.crawledAt, JSON.stringify(value.relatedCoins), value.url]);
        if (!result.rows[0])
            throw new Error("NEWS_PERSISTENCE_INTEGRITY_ERROR");
        return item(result.rows[0]);
    }
    async readAll() { const result = await this.client.query(`SELECT ${columns} FROM news_items ORDER BY published_at DESC, id ASC`, []); return result.rows.map(item); }
}
exports.PostgresNewsRepository = PostgresNewsRepository;
