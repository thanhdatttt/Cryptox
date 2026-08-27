import { describe, expect, it } from "vitest";
import type { SentimentInput } from "@cryptox/sentiment";
import type {
  NewsProvider,
  NewsSentimentPort,
  NormalizedNewsItemRecord,
} from "./ports";

function newsItem(id: string, source: string): NormalizedNewsItemRecord {
  return {
    id,
    providerId: source,
    providerItemId: id,
    title: `Title ${id}`,
    content: `Content ${id}`,
    source,
    publishedAt: "2026-01-01T00:00:00Z",
    crawledAt: "2026-01-01T00:01:00Z",
    relatedCoins: ["BTC"],
    url: `https://example.test/${id}`,
  };
}

function fakeProvider(id: string): NewsProvider {
  return {
    id,
    fetch: async () => [newsItem(id, id)],
  };
}

describe("News application ports", () => {
  it("allows normalized news providers to be substituted", async () => {
    const first = await fakeProvider("provider-a").fetch({ limit: 1 });
    const second = await fakeProvider("provider-b").fetch({ limit: 1 });

    expect(first[0]).toMatchObject({ id: "provider-a", source: "provider-a" });
    expect(second[0]).toMatchObject({ id: "provider-b", source: "provider-b" });
  });

  it("keeps sentiment collaboration on an application port", async () => {
    const sentiment: NewsSentimentPort = {
      analyze: async (input: SentimentInput) => ({
        newsId: input.newsId,
        label: "POSITIVE",
        score: 0.75,
        providerId: "fake-provider",
        analysisProfileId: "fake-profile",
        modelName: "fake-model",
        modelVersion: "1",
        analyzedAt: "2026-01-01T00:02:00Z",
      }),
      readLatestForNews: async () => undefined,
    };

    const result = await sentiment.analyze({
      newsId: "news-1",
      title: "Title",
      content: "Content",
      source: "provider-a",
      publishedAt: "2026-01-01T00:00:00Z",
      relatedCoins: ["BTC"],
    });

    expect(result).toMatchObject({ newsId: "news-1", modelName: "fake-model" });
  });
});
