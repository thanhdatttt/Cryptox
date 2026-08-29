import { describe, expect, it } from "vitest";
import * as newsApi from "./index";

describe("news public entrypoint", () => {
  it("allowlists collection and deterministic reads", async () => {
    expect(Object.keys(newsApi).sort()).toEqual([
      "NEWS_READ_ORDER_V1",
      "collect",
      "readNews",
    ]);
    await expect(
      newsApi.readNews({
        limit: 10,
        order: "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC",
      }),
    ).resolves.toEqual({ items: [] });
  });
});
