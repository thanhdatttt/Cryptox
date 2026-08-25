import { describe, expect, it } from "vitest";
import { PostgresNewsRepository } from "./postgres-repository";

describe("PostgresNewsRepository", () => {
  it("uses URL-based durable deduplication and parameterized values", async () => {
    const calls: Array<{ text: string; values: unknown[] }> = [];
    const row = { id: "news-1", title: "Headline", content: "Body", source: "LOCAL_DEMO", published_at: "2025-01-01T00:00:00.000Z", crawled_at: "2025-01-01T00:01:00.000Z", related_coins: ["BTC"], url: "https://local.cryptox.demo/news/1" };
    const repository = new PostgresNewsRepository({ query: async <Row>(text: string, values: unknown[]) => { calls.push({ text, values }); return { rows: (text.startsWith("INSERT") ? [row] : []) as Row[] }; } });
    await expect(repository.insert({ id: row.id, title: row.title, content: row.content, source: row.source, publishedAt: row.published_at, crawledAt: row.crawled_at, relatedCoins: ["BTC"], url: row.url })).resolves.toMatchObject({ url: row.url });
    expect(calls[0]!.text).toContain("ON CONFLICT (url)");
    expect(calls[0]!.values).toContain(row.url);
  });
});
