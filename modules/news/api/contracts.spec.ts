import { describe, expect, it } from "vitest";
import { NEWS_READ_ORDER_V1, type NewsReadItem } from "./contracts";

describe("news public contracts", () => {
  it("freezes deterministic read order", () => {
    expect(NEWS_READ_ORDER_V1).toBe(
      "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC",
    );
  });

  it("freezes provider identity and explicit missing Sentiment", () => {
    const item: NewsReadItem = {
      id: "news-1",
      providerId: "coindesk",
      providerItemId: "provider-guid-1",
      title: "Bitcoin update",
      content: "Fixture content",
      source: "CoinDesk",
      publishedAt: "2026-01-01T00:00:00Z",
      crawledAt: "2026-01-01T00:01:00Z",
      relatedCoins: ["BTC"],
      url: "https://example.test/news-1",
      sentiment: null,
    };
    expect(item.providerItemId).toBe("provider-guid-1");
    expect(item.sentiment).toBeNull();
  });
});
