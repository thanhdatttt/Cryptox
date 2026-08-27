import { describe, expect, it } from "vitest";
import * as sentimentApi from "./index";
import { analyze } from "./index";
describe("sentiment skeleton", () => {
  it("keeps analysis as an explicit placeholder", async () => {
    await expect(
      analyze({
        newsId: "news-1",
        title: "Title",
        content: "Content",
        source: "provider-a",
        publishedAt: "2026-01-01T00:00:00Z",
        relatedCoins: ["BTC"],
      }),
    ).rejects.toThrow("NOT_IMPLEMENTED");
  });

  it("does not expose superseded snapshot operations", () => {
    expect(sentimentApi).not.toHaveProperty("createSnapshot");
    expect(sentimentApi).not.toHaveProperty("readSnapshot");
  });
});
