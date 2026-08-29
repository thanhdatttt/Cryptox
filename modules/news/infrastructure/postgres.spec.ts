import { describe, expect, it } from "vitest";
import {
  createPostgresNewsDependencies,
  type PostgresPool,
  type PostgresQueryResult,
} from "./postgres";

const row = (providerItemId: string, publishedAt: string, id: string) => ({
  id,
  provider_id: "fixture-provider",
  provider_item_id: providerItemId,
  title: `Title ${providerItemId}`,
  content: `Content ${providerItemId}`,
  source: "Fixture",
  published_at: publishedAt,
  crawled_at: "2026-01-03T00:00:00.000Z",
  related_coins: ["BTC"],
  url: `https://example.test/${providerItemId}`,
});

function fakePool(
  handler: (text: string, values: unknown[] | undefined) => Record<string, unknown>[],
) {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  const pool: PostgresPool = {
    query: async <Row extends Record<string, unknown>>(
      text: string,
      values?: unknown[],
    ): Promise<PostgresQueryResult<Row>> => ({
      rows: handler(text, values).map((value) => value as Row),
    }),
    end: async () => undefined,
  };
  return { pool, calls };
}

describe("PostgreSQL News repository (CSL-R-NW-01, CSL-R-DM-01)", () => {
  it("persists normalized records and deduplicates on provider identity", async () => {
    const persisted = row("guid-1", "2026-01-01T00:00:00.000Z", "11111111-1111-4111-8111-111111111111");
    let insert = true;
    const calls: string[] = [];
    const fake = fakePool((text) => {
      calls.push(text);
      if (text.includes("INSERT INTO news_items")) {
        if (insert) {
          insert = false;
          return [persisted];
        }
        return [];
      }
      return [persisted];
    });
    const dependencies = createPostgresNewsDependencies({ connectionString: "", pool: fake.pool });
    const item = {
      id: persisted.id,
      providerId: persisted.provider_id,
      providerItemId: persisted.provider_item_id,
      title: persisted.title,
      content: persisted.content,
      source: persisted.source,
      publishedAt: persisted.published_at,
      crawledAt: persisted.crawled_at,
      relatedCoins: ["BTC"],
      url: persisted.url,
    };

    await expect(dependencies.newsRepository.upsertByProviderIdentity(item)).resolves.toMatchObject({ inserted: true });
    await expect(dependencies.newsRepository.upsertByProviderIdentity(item)).resolves.toMatchObject({ inserted: false });
    expect(calls.filter((text) => text.includes("INSERT INTO news_items"))).toHaveLength(2);
    expect(calls.some((text) => text.includes("ON CONFLICT (provider_id, provider_item_id) DO NOTHING"))).toBe(true);
    await dependencies.close();
    await dependencies.close();
  });

  it("reads with publication bounds, related-coin filtering, and stable tuple ordering", async () => {
    const first = row("guid-a", "2026-01-02T00:00:00.000Z", "11111111-1111-4111-8111-111111111111");
    const second = row("guid-b", "2026-01-01T00:00:00.000Z", "22222222-2222-4222-8222-222222222222");
    const fake = fakePool((text) => text.includes("ORDER BY") ? [first, second] : []);
    const dependencies = createPostgresNewsDependencies({ connectionString: "", pool: fake.pool });

    const page = await dependencies.newsRepository.read({
      relatedCoins: ["BTC"],
      publishedFrom: "2026-01-01T00:00:00.000Z",
      publishedTo: "2026-01-03T00:00:00.000Z",
      limit: 1,
      order: "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC",
    });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.providerItemId).toBe("guid-a");
    expect(page.nextCursor).toBeDefined();
    await dependencies.newsRepository.read({
      limit: 1,
      cursor: page.nextCursor,
      order: "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC",
    });
    await dependencies.close();
  });
});
