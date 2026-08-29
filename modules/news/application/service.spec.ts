import { describe, expect, it } from "vitest";
import { createNewsModule } from "../api/bootstrap";
import type { NewsModuleDependencies, NewsSentimentPort, NormalizedNewsItemRecord } from "./ports";
import {
  createInMemoryExtractionTemplateRepository,
  createInMemoryNewsExtractionProvenanceRepository,
  createInMemoryNewsRepository,
} from "./memory";

const ORDER = "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC" as const;

function item(providerItemId: string, publishedAt: string, overrides: Partial<NormalizedNewsItemRecord> = {}): NormalizedNewsItemRecord {
  return {
    id: `fixture-${providerItemId}`,
    providerId: "fixture-provider",
    providerItemId,
    title: `Title ${providerItemId}`,
    content: `Content ${providerItemId}`,
    source: "Fixture Source",
    publishedAt,
    crawledAt: "2026-01-03T00:00:00Z",
    relatedCoins: ["BTC"],
    url: `https://example.test/${providerItemId}`,
    ...overrides,
  };
}

function result(newsId: string, score = 0.5) {
  return {
    newsId,
    label: score > 0 ? "POSITIVE" as const : "NEGATIVE" as const,
    score,
    providerId: "lexicon",
    analysisProfileId: "LEXICON_V1",
    modelName: "LEXICON_V1",
    modelVersion: "1",
    analyzedAt: "2026-01-03T00:01:00Z",
  };
}

function dependencies(
  providers: readonly { id: string; fetch: (request: { limit?: number; relatedCoins?: readonly string[]; publishedAfter?: string }) => Promise<readonly NormalizedNewsItemRecord[]> }[],
  sentiment: NewsSentimentPort,
  repository = createInMemoryNewsRepository(),
) {
  const providerFailures: Array<{ providerId: string; detail?: string }> = [];
  const sentimentFailures: Array<{ newsId: string; reason: string }> = [];
  return {
    module: createNewsModule({
      providers,
      newsRepository: repository,
      sentiment,
      sentimentTimeoutMs: 25,
      observability: {
        recordProviderFailure: (failure) => providerFailures.push(failure),
        recordSentimentFailure: (failure) => sentimentFailures.push(failure),
      },
    }),
    providerFailures,
    sentimentFailures,
    repository,
  };
}

describe("NewsApplicationService (CSL-R-NW-01, CSL-R-SN-01)", () => {
  it("normalizes records, deduplicates provider GUIDs, and isolates malformed/provider failures", async () => {
    const analyzed: string[] = [];
    const sentiment: NewsSentimentPort = {
      analyze: async (input) => {
        analyzed.push(input.newsId);
        return result(input.newsId);
      },
      readLatestForNews: async (newsId) => result(newsId),
    };
    const fixtureProvider = {
      id: "fixture-provider",
      fetch: async () => [
        item("guid-2", "2026-01-02T00:00:00+00:00", { relatedCoins: ["eth", "BTC", "BTC"] }),
        item("guid-1", "2026-01-01T00:00:00Z"),
        { ...item("bad", "2026-01-01T00:00:00Z"), title: "" },
      ],
    };
    const duplicateProvider = {
      id: "fixture-provider",
      fetch: async () => [item("guid-2", "2026-01-02T00:00:00Z", { title: "A later duplicate" })],
    };
    const unavailableProvider = {
      id: "unavailable-provider",
      fetch: async () => { throw new Error("provider unavailable"); },
    };
    const { module, providerFailures, sentimentFailures } = dependencies(
      [fixtureProvider, duplicateProvider, unavailableProvider],
      sentiment,
    );

    await expect(module.collect({ limit: 10 })).resolves.toEqual({
      fetchedCount: 4,
      storedCount: 2,
      duplicateCount: 1,
      rejectedCount: 1,
    });
    expect(analyzed).toHaveLength(2);
    expect(sentimentFailures).toEqual([]);
    expect(providerFailures.some((failure) => failure.providerId === "unavailable-provider" && failure.detail === "provider fetch failed")).toBe(true);
    expect(providerFailures.some((failure) => failure.detail?.includes("malformed provider item rejected"))).toBe(true);

    const page = await module.readNews({ limit: 10, order: ORDER });
    expect(page.items.map(({ providerItemId }) => providerItemId)).toEqual(["guid-2", "guid-1"]);
    expect(page.items[0]).toMatchObject({
      publishedAt: "2026-01-02T00:00:00.000Z",
      relatedCoins: ["BTC", "ETH"],
      sentiment: { newsId: "fixture-guid-2", label: "POSITIVE" },
    });
  });

  it("returns deterministic owner-independent pages with a stable cursor", async () => {
    const sentiment: NewsSentimentPort = {
      analyze: async (input) => result(input.newsId),
      readLatestForNews: async () => undefined,
    };
    const provider = {
      id: "provider-a",
      fetch: async () => [
        item("guid-b", "2026-01-01T00:00:00Z", { providerId: "provider-a" }),
        item("guid-a", "2026-01-01T00:00:00Z", { providerId: "provider-a" }),
        item("guid-c", "2026-01-02T00:00:00Z", { providerId: "provider-a" }),
      ],
    };
    const secondProvider = {
      id: "provider-b",
      fetch: async () => [item("guid-d", "2026-01-01T00:00:00Z", { providerId: "provider-b" })],
    };
    const { module } = dependencies([provider, secondProvider], sentiment);
    await module.collect({ limit: 10 });

    const query = { limit: 2, order: ORDER } as const;
    const first = await module.readNews(query);
    const repeatedFirst = await module.readNews(query);
    const second = await module.readNews({ ...query, cursor: first.nextCursor });

    expect(first).toEqual(repeatedFirst);
    expect(first.items.map(({ providerItemId }) => providerItemId)).toEqual(["guid-c", "guid-a"]);
    expect(second.items.map(({ providerItemId }) => providerItemId)).toEqual(["guid-b", "guid-d"]);
    expect(second.nextCursor).toBeUndefined();
  });

  it("keeps News readable when Sentiment times out, throws, or returns an invalid result", async () => {
    const timeoutFailures: Array<{ newsId: string; reason: string }> = [];
    const repository = createInMemoryNewsRepository();
    const timeout = dependencies([
      { id: "timeout-provider", fetch: async () => [item("timeout", "2026-01-01T00:00:00Z", { providerId: "timeout-provider" })] },
    ], {
      analyze: async () => new Promise<never>(() => undefined),
      readLatestForNews: async () => undefined,
    }, repository);
    await timeout.module.collect({ limit: 1 });
    timeoutFailures.push(...timeout.sentimentFailures);
    expect(timeoutFailures).toContainEqual({ newsId: "fixture-timeout", reason: "TIMEOUT" });
    await expect(timeout.module.readNews({ limit: 1, order: ORDER })).resolves.toMatchObject({
      items: [{ providerItemId: "timeout", sentiment: null }],
    });

    const throwing = dependencies([
      { id: "throwing-provider", fetch: async () => [item("throwing", "2026-01-01T00:00:00Z", { providerId: "throwing-provider" })] },
    ], {
      analyze: async () => { throw new Error("Sentiment unavailable"); },
      readLatestForNews: async () => { throw new Error("Sentiment read unavailable"); },
    });
    await throwing.module.collect({ limit: 1 });
    await expect(throwing.module.readNews({ limit: 1, order: ORDER })).resolves.toMatchObject({
      items: [{ providerItemId: "throwing", sentiment: null }],
    });
    expect(throwing.sentimentFailures).toEqual([
      { newsId: "fixture-throwing", reason: "INFERENCE_ERROR" },
      { newsId: "fixture-throwing", reason: "INFERENCE_ERROR" },
    ]);

    const invalid = dependencies([
      { id: "invalid-provider", fetch: async () => [item("invalid", "2026-01-01T00:00:00Z", { providerId: "invalid-provider" })] },
    ], {
      analyze: async (input) => ({ ...result(input.newsId), score: Number.NaN }),
      readLatestForNews: async () => undefined,
    });
    await invalid.module.collect({ limit: 1 });
    expect(invalid.sentimentFailures).toEqual([{ newsId: "fixture-invalid", reason: "INVALID_RESULT" }]);
    await expect(invalid.module.readNews({ limit: 1, order: ORDER })).resolves.toMatchObject({
      items: [{ providerItemId: "invalid", sentiment: null }],
    });
  });

  it("purges retention children and references before restricted News parents", async () => {
    const calls: string[] = [];
    const repository = createInMemoryNewsRepository();
    const newsRepository: NewsModuleDependencies["newsRepository"] = {
      upsertByProviderIdentity: repository.upsertByProviderIdentity.bind(repository),
      read: repository.read.bind(repository),
      purgeExpired: async () => {
        calls.push("news");
        return 1;
      },
    };
    const rawHtmlRepository: NonNullable<NewsModuleDependencies["rawHtmlRepository"]> = {
      insert: async (artifact) => artifact,
      purgeExpired: async () => {
        calls.push("raw-html");
        return 1;
      },
    };
    const extractionProvenanceRepository: NonNullable<NewsModuleDependencies["extractionProvenanceRepository"]> = {
      insert: async (provenance) => provenance,
      purgeExpired: async () => {
        calls.push("provenance");
        return 1;
      },
    };
    const templateRepository: NonNullable<NewsModuleDependencies["templateRepository"]> = {
      insertDraft: async (template) => template,
      approve: async () => undefined,
      readActive: async () => undefined,
      purgeExpired: async () => {
        calls.push("templates");
        return 1;
      },
    };
    const module = createNewsModule({
      providers: [],
      newsRepository,
      sentiment: {
        analyze: async () => { throw new Error("not used"); },
        readLatestForNews: async () => undefined,
      },
      sentimentTimeoutMs: 25,
      observability: { recordProviderFailure: () => undefined, recordSentimentFailure: () => undefined },
      rawHtmlRepository,
      extractionProvenanceRepository,
      templateRepository,
    });

    await expect(module.purgeRetention("2026-05-01T00:00:00.000Z")).resolves.toEqual({
      normalizedNewsItems: 1,
      rawHtmlArtifacts: 1,
      extractionProvenance: 1,
      templates: 1,
    });
    expect(calls).toEqual(["raw-html", "provenance", "templates", "news"]);
  });

  it("retains an expired template while live provenance still references it", async () => {
    const templates = createInMemoryExtractionTemplateRepository();
    const provenance = createInMemoryNewsExtractionProvenanceRepository();
    await templates.insertDraft({
      id: "template-1",
      sourceId: "fixture-provider",
      version: 1,
      status: "DRAFT",
      configuration: { titleSelector: "h1" },
      createdAt: "2026-01-01T00:00:00.000Z",
      retainUntil: "2026-04-01T00:00:00.000Z",
    });
    await templates.approve("template-1");
    await provenance.insert({
      id: "provenance-1",
      newsId: "news-1",
      sourceKind: "HTML",
      canonicalUrl: "https://example.test/article",
      normalizedContentHash: "a".repeat(64),
      template: { id: "template-1", sourceId: "fixture-provider", version: 1, status: "APPROVED" },
      extractedAt: "2026-02-01T00:00:00.000Z",
      normalizedRetainUntil: "2026-05-02T00:00:00.000Z",
    });
    const module = createNewsModule({
      providers: [],
      newsRepository: createInMemoryNewsRepository(),
      sentiment: { analyze: async () => { throw new Error("not used"); }, readLatestForNews: async () => undefined },
      sentimentTimeoutMs: 25,
      observability: { recordProviderFailure: () => undefined, recordSentimentFailure: () => undefined },
      extractionProvenanceRepository: provenance,
      templateRepository: templates,
    });

    await expect(module.purgeRetention("2026-04-02T00:00:00.000Z")).resolves.toMatchObject({
      extractionProvenance: 0,
      templates: 0,
    });
    await expect(templates.readById("template-1")).resolves.toMatchObject({ status: "APPROVED" });
    await expect(provenance.readByNewsId("news-1")).resolves.toBeDefined();

    await expect(module.purgeRetention("2026-05-03T00:00:00.000Z")).resolves.toMatchObject({
      extractionProvenance: 1,
      templates: 1,
    });
    await expect(templates.readById("template-1")).resolves.toBeUndefined();
  });
});
