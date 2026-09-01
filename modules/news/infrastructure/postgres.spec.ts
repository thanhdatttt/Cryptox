import { describe, expect, it } from "vitest";
import {
  createPostgresNewsDependencies,
  type PostgresPool,
  type PostgresQueryResult,
} from "./postgres";
import { normalizedNewsContentHash } from "../application/normalization";

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
    expect(calls.some((text) => text.includes("ON CONFLICT DO NOTHING"))).toBe(true);
    await dependencies.close();
    await dependencies.close();
  });

  it("qualifies joined read columns while preserving filters, cursor, ordering, and projections", async () => {
    const firstBase = row("guid-a", "2026-01-02T00:00:00.000Z", "11111111-1111-4111-8111-111111111111");
    const firstHash = normalizedNewsContentHash(firstBase.content);
    const first = {
      ...firstBase,
      canonical_url: firstBase.url,
      normalized_content_hash: firstHash,
      normalized_retain_until: "2026-04-03T00:00:00.000Z",
      extraction_source_kind: "RSS",
      extraction_canonical_url: "https://example.test/source/guid-a",
      extraction_normalized_content_hash: firstHash,
      extraction_template_id: "33333333-3333-4333-8333-333333333333",
      extraction_template_source_id: "fixture-feed",
      extraction_template_version: 2,
      extraction_template_status: "APPROVED",
      extraction_extracted_at: "2026-01-03T00:00:00.000Z",
      extraction_normalized_retain_until: "2026-04-03T00:00:00.000Z",
    };
    const second = row("guid-b", "2026-01-01T00:00:00.000Z", "22222222-2222-4222-8222-222222222222");
    const readCalls: Array<{ text: string; values?: unknown[] }> = [];
    const fake = fakePool((text, values) => {
      if (text.includes("FROM news_items") && text.includes("LEFT JOIN news_extraction_provenance")) {
        readCalls.push({ text, values });
        return readCalls.length === 1 ? [first, second] : [second];
      }
      return [];
    });
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
    expect(page.items[0]).toMatchObject({
      id: first.id,
      providerId: first.provider_id,
      providerItemId: first.provider_item_id,
      title: first.title,
      content: first.content,
      source: first.source,
      publishedAt: first.published_at,
      crawledAt: first.crawled_at,
      relatedCoins: ["BTC"],
      url: first.url,
      canonicalUrl: first.canonical_url,
      normalizedContentHash: firstHash,
      normalizedRetainUntil: first.normalized_retain_until,
      extraction: {
        sourceKind: "RSS",
        canonicalUrl: first.extraction_canonical_url,
        normalizedContentHash: firstHash,
        template: {
          id: first.extraction_template_id,
          sourceId: first.extraction_template_source_id,
          version: 2,
          status: "APPROVED",
        },
        extractedAt: first.extraction_extracted_at,
        normalizedRetainUntil: first.extraction_normalized_retain_until,
      },
    });
    expect(page.nextCursor).toBeDefined();
    const nextPage = await dependencies.newsRepository.read({
      limit: 1,
      cursor: page.nextCursor,
      order: "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC",
    });
    expect(nextPage.items.map((item) => item.providerItemId)).toEqual(["guid-b"]);

    expect(readCalls).toHaveLength(2);
    const compact = (text: string) => text.replace(/\s+/gu, " ").trim();
    const initialReadSql = compact(readCalls[0]!.text);
    expect(initialReadSql).toContain(
      "SELECT news_items.id::text, news_items.provider_id, news_items.provider_item_id, news_items.title, news_items.content, news_items.source, news_items.published_at::text, news_items.crawled_at::text, news_items.related_coins, news_items.url, news_items.canonical_url, news_items.normalized_content_hash, news_items.normalized_retain_until::text,",
    );
    expect(initialReadSql).toContain("LEFT JOIN news_extraction_provenance extraction ON extraction.news_id = news_items.id");
    expect(initialReadSql).toContain("LEFT JOIN extraction_templates template ON template.id = extraction.template_id");
    expect(initialReadSql).toContain("news_items.related_coins ?| $1::text[]");
    expect(initialReadSql).toContain("news_items.published_at >= $2::timestamptz");
    expect(initialReadSql).toContain("news_items.published_at < $3::timestamptz");
    expect(initialReadSql).toContain("ORDER BY news_items.published_at DESC, news_items.provider_id ASC, news_items.provider_item_id ASC");
    expect(readCalls[0]!.values).toEqual([
      ["BTC"],
      "2026-01-01T00:00:00.000Z",
      "2026-01-03T00:00:00.000Z",
      2,
    ]);

    const cursorReadSql = compact(readCalls[1]!.text);
    expect(cursorReadSql).toContain("news_items.published_at < $1::timestamptz");
    expect(cursorReadSql).toContain("news_items.published_at = $1::timestamptz AND news_items.provider_id > $2");
    expect(cursorReadSql).toContain("news_items.published_at = $1::timestamptz AND news_items.provider_id = $2 AND news_items.provider_item_id > $3");
    expect(cursorReadSql).toContain("ORDER BY news_items.published_at DESC, news_items.provider_id ASC, news_items.provider_item_id ASC");
    expect(readCalls[1]!.values).toEqual([
      first.published_at,
      first.provider_id,
      first.provider_item_id,
      2,
    ]);
    await dependencies.close();
  });

  it("protects referenced extraction templates in the retention purge query", async () => {
    let purgeSql = "";
    const fake = fakePool((text) => {
      if (text.includes("DELETE FROM extraction_templates")) purgeSql = text;
      return [];
    });
    const dependencies = createPostgresNewsDependencies({ connectionString: "", pool: fake.pool });

    await expect(dependencies.extractionTemplateRepository.purgeExpired("2026-04-02T00:00:00.000Z")).resolves.toBe(0);
    expect(purgeSql).toContain("news_extraction_provenance");
    expect(purgeSql).toContain("supersedes_template_id");
    await dependencies.close();
  });

  it("protects News rows referenced by restricted downstream records", async () => {
    let purgeSql = "";
    const fake = fakePool((text) => {
      if (text.includes("DELETE FROM news_items")) purgeSql = text;
      return [];
    });
    const dependencies = createPostgresNewsDependencies({ connectionString: "", pool: fake.pool });

    await expect(dependencies.newsRepository.purgeExpired("2026-04-02T00:00:00.000Z")).resolves.toBe(0);
    expect(purgeSql).toContain("sentiment_results");
    expect(purgeSql).toContain("strategy_authoring_drafts");
    await dependencies.close();
  });
});
