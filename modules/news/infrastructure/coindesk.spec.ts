import { describe, expect, it } from "vitest";
import { createCoinDeskNewsProvider } from "./coindesk";

function response(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

describe("CoinDesk News provider", () => {
  it("maps the Data API article shape to normalized News without leaking raw fields", async () => {
    let requestedUrl = "";
    let requestedHeaders: Record<string, string> | undefined;
    const provider = createCoinDeskNewsProvider({
      apiKey: "test-key",
      requestTimeoutMs: 100,
      fetch: async (url, init) => {
        requestedUrl = url;
        requestedHeaders = init?.headers;
        return response({
          Data: [{
            ID: 42,
            GUID: "coindesk-guid-42",
            PUBLISHED_ON: 1_767_225_600,
            TITLE: "Bitcoin market update",
            SUBTITLE: "A short summary",
            BODY: "The market moved today.",
            URL: "https://www.coindesk.com/markets/bitcoin-market-update",
            SOURCE_DATA: { SOURCE_KEY: "coindesk", NAME: "CoinDesk" },
            CATEGORY_DATA: [{ CATEGORY: "BTC" }, { CATEGORY: "ETH" }],
            PROVIDER_ONLY_FIELD: "must not cross the boundary",
          }],
        });
      },
    });

    const items = await provider.fetch({ relatedCoins: ["BTC", "ETH"], limit: 500 });
    expect(new URL(requestedUrl).pathname).toBe("/news/v1/article/list");
    expect(new URL(requestedUrl).searchParams.get("categories")).toBe("BTC,ETH");
    expect(new URL(requestedUrl).searchParams.get("limit")).toBe("100");
    expect(requestedHeaders).toMatchObject({ Authorization: "Apikey test-key" });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      providerId: "coindesk",
      providerItemId: "coindesk-guid-42",
      title: "Bitcoin market update",
      content: "The market moved today.",
      source: "CoinDesk",
      publishedAt: "2026-01-01T00:00:00.000Z",
      relatedCoins: ["BTC", "ETH"],
    });
    expect(items[0]).not.toHaveProperty("PROVIDER_ONLY_FIELD");
    expect(items[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("keeps valid siblings when one raw article is malformed", async () => {
    const provider = createCoinDeskNewsProvider({
      requestTimeoutMs: 100,
      fetch: async () => response({
        Data: [
          {
            GUID: "valid-guid",
            PUBLISHED_ON: 1_767_225_600,
            TITLE: "Valid",
            BODY: "Valid body",
            URL: "https://example.test/valid",
          },
          { GUID: "malformed-guid", TITLE: "Missing publication and URL" },
        ],
      }),
    });

    const items = await provider.fetch({ limit: 2 });
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ providerItemId: "valid-guid" });
    expect(items[1]).not.toHaveProperty("providerItemId");
  });

  it("fails a provider lookup at its configured deadline", async () => {
    let aborted = false;
    const provider = createCoinDeskNewsProvider({
      requestTimeoutMs: 5,
      fetch: async (_url, init) => new Promise<never>((resolve) => {
        init?.signal?.addEventListener("abort", () => { aborted = true; });
        void resolve;
      }),
    });

    await expect(provider.fetch({ limit: 1 })).rejects.toThrow("timed out");
    expect(aborted).toBe(true);
  });

  it("surfaces provider HTTP failures for the News application to isolate", async () => {
    const provider = createCoinDeskNewsProvider({
      requestTimeoutMs: 100,
      fetch: async () => response({ Err: { message: "unavailable" } }, 503),
    });

    await expect(provider.fetch({ limit: 1 })).rejects.toThrow("HTTP 503");
  });
});
