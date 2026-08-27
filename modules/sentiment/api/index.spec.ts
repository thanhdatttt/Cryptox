import { describe, expect, it } from "vitest";
import * as sentimentApi from "./index";

describe("sentiment public entrypoint", () => {
  it("allowlists model-neutral analysis and excludes superseded snapshots", async () => {
    expect(Object.keys(sentimentApi).sort()).toEqual(
      [
        "LEXICON_V1",
        "LEXICON_V1_ID",
        "SENTIMENT_LABELS",
        "analyze",
        "readLatestForNews",
      ].sort(),
    );
    await expect(
      sentimentApi.analyze({
        newsId: "news-1",
        title: "Title",
        content: "Content",
        source: "provider-a",
        publishedAt: "2026-01-01T00:00:00Z",
        relatedCoins: ["BTC"],
      }),
    ).rejects.toThrow("NOT_IMPLEMENTED");
    expect(sentimentApi).not.toHaveProperty("createSnapshot");
  });
});
