import { describe, expect, it } from "vitest";
import { createNewsModule, type NewsSentimentPort } from "../api/bootstrap";
import type {
  ExtractionTemplateRecord,
  SafeNewsUrlFetchPort,
  NormalizedNewsItemRecord,
} from "../application/ports";
import { newsItemIdForProviderIdentity } from "../application/normalization";
import {
  createInMemoryExtractionTemplateRepository,
  createInMemoryNewsExtractionProvenanceRepository,
  createInMemoryNewsRawHtmlRepository,
  createInMemoryNewsRepository,
} from "../application/memory";
import {
  DEFAULT_NEWS_REFRESH_INTERVAL_MINUTES,
  createConfiguredNewsProvider,
  createHtmlNewsProvider,
  createWebsiteNewsProvider,
  refreshIntervalMinutes,
  type ConfiguredNewsSource,
} from "./configured";

const source: ConfiguredNewsSource = {
  id: "configured-source",
  kind: "HTML",
  url: "https://news.example.test/feed",
  allowedUrlPrefixes: ["https://news.example.test/"],
  displayName: "Configured News",
  defaultRelatedCoins: ["BTC"],
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const html = `
  <html><head><title>ignored page title</title><script>secret = true</script></head>
  <body><article>
    <h1>Bitcoin gains after breakout</h1>
    <time datetime="2026-01-02T00:00:00Z"></time>
    <p>The market is bullish and strong.</p>
    <a href="/articles/breakout">Read more</a>
  </article></body></html>`;

function safeFetcher(body = html): SafeNewsUrlFetchPort {
  return {
    fetch: async () => ({
      canonicalUrl: "https://news.example.test/feed",
      body,
      contentType: "text/html; charset=utf-8",
      redirects: 0,
    }),
  };
}

function template(status: "DRAFT" | "APPROVED" | "RETIRED", version = 1): ExtractionTemplateRecord {
  return {
    id: `00000000-0000-4000-8000-00000000000${version}`,
    sourceId: source.id,
    version,
    status,
    configuration: { titleSelector: "h1", contentSelector: "p" },
    ...(version > 1 ? { supersedesTemplateId: "00000000-0000-4000-8000-000000000001" } : {}),
    diff: version > 1 ? { contentSelector: "article p" } : {},
    metrics: { precision: 0.9 },
    createdAt: `2026-01-0${version}T00:00:00.000Z`,
    ...(status === "APPROVED" ? { approvedAt: `2026-01-0${version}T00:00:00.000Z` } : {}),
    retainUntil: `2026-04-0${version}T00:00:00.000Z`,
  };
}

function sentimentFailure(): NewsSentimentPort {
  return {
    analyze: async () => { throw new Error("sentiment unavailable"); },
    readLatestForNews: async () => undefined,
  };
}

function expectStableUuidItem(item: NormalizedNewsItemRecord, repeated: NormalizedNewsItemRecord | undefined): void {
  expect(item.id).toMatch(UUID_PATTERN);
  expect(item.id).toBe(newsItemIdForProviderIdentity(item.providerId, item.providerItemId));
  expect(repeated).toMatchObject({
    id: item.id,
    providerId: item.providerId,
    providerItemId: item.providerItemId,
    title: item.title,
    content: item.content,
    publishedAt: item.publishedAt,
    url: item.url,
    extraction: {
      sourceKind: item.extraction?.sourceKind,
      canonicalUrl: item.extraction?.canonicalUrl,
      normalizedContentHash: item.extraction?.normalizedContentHash,
    },
  });
}

describe("configured Website/RSS/HTML News adapters [CSL-R-NW-02, CSL-R-RD-01]", () => {
  it("validates the bounded refresh policy and normalizes HTML with provenance", async () => {
    expect(refreshIntervalMinutes(undefined)).toBe(DEFAULT_NEWS_REFRESH_INTERVAL_MINUTES);
    expect(refreshIntervalMinutes(1)).toBe(1);
    expect(refreshIntervalMinutes(5)).toBe(5);
    expect(() => refreshIntervalMinutes(0)).toThrow();
    expect(() => refreshIntervalMinutes(6)).toThrow();

    const provider = createConfiguredNewsProvider({ source, safeFetcher: safeFetcher() });
    const document = await provider.fetchDocument({ limit: 10 });
    const repeated = await provider.fetchDocument({ limit: 10 });
    expect(document.sourceKind).toBe("HTML");
    expect(document.items).toHaveLength(1);
    expectStableUuidItem(document.items[0]!, repeated.items[0]);
    expect(document.items[0]).toMatchObject({
      providerId: source.id,
      title: "Bitcoin gains after breakout",
      content: "The market is bullish and strong.",
      publishedAt: "2026-01-02T00:00:00.000Z",
      url: "https://news.example.test/articles/breakout",
      extraction: {
        sourceKind: "HTML",
        canonicalUrl: "https://news.example.test/articles/breakout",
        normalizedContentHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      },
    });
    expect(document.items[0]?.content).not.toContain("secret");
  });

  it("maps RSS entries to the same provider-neutral record without leaking XML fields", async () => {
    const rssSource: ConfiguredNewsSource = { ...source, id: "rss-source", kind: "RSS", url: "https://news.example.test/rss" };
    const provider = createConfiguredNewsProvider({
      source: rssSource,
      safeFetcher: safeFetcher(`<?xml version="1.0"?><rss><channel><item>
        <guid>rss-guid-1</guid><title>Bitcoin update</title>
        <description><![CDATA[The market is stable.]]></description>
        <link>https://news.example.test/articles/rss-1</link>
        <pubDate>Fri, 02 Jan 2026 00:00:00 GMT</pubDate><category>BTC</category>
        <provider-secret>do-not-cross-boundary</provider-secret>
      </item></channel></rss>`),
    });
    const document = await provider.fetchDocument({ limit: 1 });
    const repeated = await provider.fetchDocument({ limit: 1 });
    expectStableUuidItem(document.items[0]!, repeated.items[0]);
    expect(document.items[0]).toMatchObject({
      providerId: "rss-source",
      providerItemId: "rss-guid-1",
      title: "Bitcoin update",
      content: "The market is stable.",
      url: "https://news.example.test/articles/rss-1",
      publishedAt: "2026-01-02T00:00:00.000Z",
      extraction: {
        sourceKind: "RSS",
        canonicalUrl: "https://news.example.test/articles/rss-1",
        normalizedContentHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      },
    });
    expect(document.items[0]).not.toHaveProperty("provider-secret");
  });

  it("supports Website and explicit HTML factory aliases with stable UUID identities", async () => {
    const variants = [
      {
        provider: createWebsiteNewsProvider({
          source: { ...source, kind: "WEBSITE" },
          safeFetcher: safeFetcher(),
        }),
        sourceKind: "CONFIGURED_WEBSITE",
      },
      {
        provider: createHtmlNewsProvider({ source, safeFetcher: safeFetcher() }),
        sourceKind: "HTML",
      },
    ] as const;

    for (const variant of variants) {
      expect(variant.provider.sourceKind).toBe(variant.sourceKind);
      expect(variant.provider.id).toBe(source.id);
      const document = await variant.provider.fetchDocument({ limit: 1 });
      const repeated = await variant.provider.fetchDocument({ limit: 1 });
      expect(document.items).toHaveLength(1);
      expectStableUuidItem(document.items[0]!, repeated.items[0]);
      expect(document.items[0]).toMatchObject({
        providerId: source.id,
        title: "Bitcoin gains after breakout",
        content: "The market is bullish and strong.",
        publishedAt: "2026-01-02T00:00:00.000Z",
        url: "https://news.example.test/articles/breakout",
        extraction: {
          sourceKind: variant.sourceKind,
          canonicalUrl: "https://news.example.test/articles/breakout",
          normalizedContentHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        },
      });
    }
  });
});

describe("News extraction lifecycle and safe import join", () => {
  it("keeps News readable when imported content reaches a failing Sentiment provider", async () => {
    const repository = createInMemoryNewsRepository();
    const provenance = createInMemoryNewsExtractionProvenanceRepository();
    const rawHtml = createInMemoryNewsRawHtmlRepository();
    const templates = createInMemoryExtractionTemplateRepository();
    const draft = template("DRAFT");
    await templates.insertDraft(draft);
    await templates.approve(draft.id);
    const provider = createConfiguredNewsProvider({ source, safeFetcher: safeFetcher(), templateRepository: templates });
    const module = createNewsModule({
      providers: [],
      newsRepository: repository,
      sentiment: sentimentFailure(),
      sentimentTimeoutMs: 25,
      observability: { recordProviderFailure: () => undefined, recordSentimentFailure: () => undefined },
      safeUrlFetcher: safeFetcher(),
      urlImportExtractor: provider,
      extractionProvenanceRepository: provenance,
      rawHtmlRepository: rawHtml,
      templateRepository: templates,
      clock: { now: () => "2026-01-02T00:00:00.000Z" },
    }) as unknown as import("../application/service").NewsApplicationService;

    const imported = await module.importUrl({ url: "https://news.example.test/feed#untrusted-fragment", sourceId: source.id });
    expect(imported).toMatchObject({ status: "FETCHED", canonicalUrl: "https://news.example.test/feed" });
    expect(imported).toHaveProperty("newsItemId");
    const page = await module.readNews({ limit: 10, order: "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC" });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      url: "https://news.example.test/feed",
      sentiment: null,
      extraction: {
        sourceKind: "ALLOWLISTED_URL_IMPORT",
        canonicalUrl: "https://news.example.test/feed",
        template: { id: draft.id, sourceId: source.id, version: 1, status: "APPROVED" },
      },
    });
    expect(page.items[0]).not.toHaveProperty("body");
    const importedId = (imported as { newsItemId: string }).newsItemId;
    await expect(provenance.readByNewsId(importedId)).resolves.toMatchObject({ newsId: importedId });
    await expect(rawHtml.readByNewsId(importedId)).resolves.toMatchObject({ newsId: importedId, body: html });
  });

  it("creates only DRAFT refinements, requires explicit approval, and supports rollback", async () => {
    const templates = createInMemoryExtractionTemplateRepository();
    const module = createNewsModule({
      providers: [],
      newsRepository: createInMemoryNewsRepository(),
      sentiment: sentimentFailure(),
      sentimentTimeoutMs: 25,
      observability: { recordProviderFailure: () => undefined, recordSentimentFailure: () => undefined },
      templateRepository: templates,
      clock: { now: () => "2026-01-02T00:00:00.000Z" },
    }) as unknown as import("../application/service").NewsApplicationService;

    const firstDraft = await module.proposeTemplate({
      sourceId: source.id,
      configuration: { titleSelector: "h1", contentSelector: "p" },
      createdAt: "2026-01-02T00:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000011",
      metrics: { precision: 0.91 },
      diff: { contentSelector: "article p" },
    });
    expect(firstDraft).toMatchObject({ status: "DRAFT", version: 1, metrics: { precision: 0.91 } });
    await expect(templates.readActive(source.id)).resolves.toBeUndefined();

    const firstApproved = await module.approveTemplate(firstDraft.id);
    expect(firstApproved).toMatchObject({ status: "APPROVED", version: 1 });
    const secondDraft = await module.selfHealTemplate({
      sourceId: source.id,
      configuration: { titleSelector: "h1", contentSelector: "article p" },
      createdAt: "2026-01-03T00:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000012",
      metrics: { precision: 0.95 },
      diff: { contentSelector: "p -> article p" },
    });
    expect(secondDraft).toMatchObject({ status: "DRAFT", version: 2, supersedesTemplateId: firstDraft.id });
    await expect(templates.readActive(source.id)).resolves.toMatchObject({ id: firstDraft.id, status: "APPROVED" });

    await module.approveTemplate(secondDraft.id);
    await expect(templates.readById(firstDraft.id)).resolves.toMatchObject({ status: "RETIRED" });
    await expect(templates.readActive(source.id)).resolves.toMatchObject({ id: secondDraft.id, status: "APPROVED" });
    await module.rollbackTemplate(source.id, firstDraft.id);
    await expect(templates.readActive(source.id)).resolves.toMatchObject({ id: firstDraft.id, status: "APPROVED" });
  });

  it("deduplicates canonical URL and normalized content identity independently of provider identity", async () => {
    const repository = createInMemoryNewsRepository();
    const first: NormalizedNewsItemRecord = {
      id: "first",
      providerId: "provider-a",
      providerItemId: "a-1",
      title: "First",
      content: "Same   normalized content",
      source: "Fixture",
      publishedAt: "2026-01-01T00:00:00Z",
      crawledAt: "2026-01-01T00:00:00Z",
      relatedCoins: ["BTC"],
      url: "https://news.example.test/a#fragment",
    };
    const sameUrl: NormalizedNewsItemRecord = { ...first, id: "second", providerId: "provider-b", providerItemId: "b-1", content: "different" };
    const sameContent: NormalizedNewsItemRecord = { ...first, id: "third", providerId: "provider-c", providerItemId: "c-1", url: "https://news.example.test/c" };
    await expect(repository.upsertByProviderIdentity(first)).resolves.toMatchObject({ inserted: true });
    await expect(repository.upsertByProviderIdentity(sameUrl)).resolves.toMatchObject({ inserted: false });
    await expect(repository.upsertByProviderIdentity(sameContent)).resolves.toMatchObject({ inserted: false });
    expect(repository.size()).toBe(1);
  });
});
