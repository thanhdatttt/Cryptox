import { describe, expect, it } from "vitest";
import * as sentimentApi from "./index";

describe("sentiment public entrypoint", () => {
  it("runs local LEXICON_V1 analysis and excludes superseded snapshots", async () => {
    expect(Object.keys(sentimentApi).sort()).toEqual(
      [
        "LEXICON_V1",
        "LEXICON_V1_ID",
        "SENTIMENT_LABELS",
        "analyze",
        "readLatestForNews",
      ].sort(),
    );
    const input = {
      newsId: "news-public-entrypoint",
      title: "Bitcoin gains",
      content: "The market is bullish.",
      source: "provider-a",
      publishedAt: "2026-01-01T00:00:00Z",
      relatedCoins: ["BTC"],
    };
    await expect(sentimentApi.analyze(input)).resolves.toMatchObject({
      newsId: input.newsId,
      label: "POSITIVE",
      providerId: "LEXICON_V1",
      modelName: "LEXICON_V1",
      modelVersion: "1",
    });
    await expect(sentimentApi.readLatestForNews(input.newsId)).resolves.toMatchObject({
      newsId: input.newsId,
    });
    expect(sentimentApi).not.toHaveProperty("createSnapshot");
  });
});
