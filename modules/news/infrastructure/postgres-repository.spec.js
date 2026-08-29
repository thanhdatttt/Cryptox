"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const postgres_repository_1 = require("./postgres-repository");
(0, vitest_1.describe)("PostgresNewsRepository", () => {
    (0, vitest_1.it)("uses URL-based durable deduplication and parameterized values", async () => {
        const calls = [];
        const row = { id: "news-1", title: "Headline", content: "Body", source: "COINDESK", published_at: "2025-01-01T00:00:00.000Z", crawled_at: "2025-01-01T00:01:00.000Z", related_coins: ["BTC"], url: "https://www.coindesk.com/news/1" };
        const repository = new postgres_repository_1.PostgresNewsRepository({ query: async (text, values) => { calls.push({ text, values }); return { rows: (text.startsWith("INSERT") ? [row] : []) }; } });
        await (0, vitest_1.expect)(repository.insert({ id: row.id, title: row.title, content: row.content, source: row.source, publishedAt: row.published_at, crawledAt: row.crawled_at, relatedCoins: ["BTC"], url: row.url })).resolves.toMatchObject({ url: row.url });
        (0, vitest_1.expect)(calls[0].text).toContain("ON CONFLICT (url)");
        (0, vitest_1.expect)(calls[0].values).toContain(row.url);
    });
});
