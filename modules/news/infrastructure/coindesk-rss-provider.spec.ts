import { describe, expect, it, vi } from "vitest";
import { COINDESK_RSS_FEED_URL, createCoinDeskRssProvider } from "./coindesk-rss-provider";

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>CoinDesk</title>
    <item>
      <title>Bitcoin &amp; Ethereum rally</title>
      <link>https://www.coindesk.com/markets/2026/08/30/bitcoin-ethereum-rally/</link>
      <guid isPermaLink="true">https://www.coindesk.com/markets/2026/08/30/bitcoin-ethereum-rally/</guid>
      <description><![CDATA[<p>Bitcoin and Ethereum gained as digital asset markets strengthened.</p><p>Analysts cited improving demand.</p>]]></description>
      <content:encoded><![CDATA[<p>Bitcoin and Ethereum gained as digital asset markets strengthened.</p><p>Analysts cited improving demand.</p>]]></content:encoded>
      <pubDate>Sun, 30 Aug 2026 05:06:07 GMT</pubDate>
      <category>Bitcoin</category>
      <category>Ethereum</category>
    </item>
    <item>
      <title>Malformed entry without a URL</title>
      <description>It must not cross the provider boundary.</description>
      <pubDate>Sun, 30 Aug 2026 05:07:07 GMT</pubDate>
    </item>
  </channel>
</rss>`;

describe("createCoinDeskRssProvider", () => {
  it("fetches the official feed and normalizes valid RSS entries into NewsItem", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(feed, { status: 200, headers: { "content-type": "application/rss+xml" } }));
    const provider = createCoinDeskRssProvider({ fetch, clock: { now: () => "2026-08-30T06:00:00+07:00" } });

    await expect(provider.fetch()).resolves.toEqual([expect.objectContaining({
      id: expect.any(String),
      title: "Bitcoin & Ethereum rally",
      content: "Bitcoin and Ethereum gained as digital asset markets strengthened. Analysts cited improving demand.",
      source: "COINDESK",
      publishedAt: "2026-08-30T05:06:07.000Z",
      crawledAt: "2026-08-29T23:00:00.000Z",
      relatedCoins: ["BTC", "ETH"],
      url: "https://www.coindesk.com/markets/2026/08/30/bitcoin-ethereum-rally/",
    })]);
    expect(fetch).toHaveBeenCalledWith(COINDESK_RSS_FEED_URL, { headers: { accept: "application/rss+xml, application/xml, text/xml;q=0.9" } });
  });

  it("skips malformed entries and observes validation failures without discarding valid entries", async () => {
    const failures: Array<{ providerName: string; stage: string; reason: string }> = [];
    const provider = createCoinDeskRssProvider({
      fetch: async () => new Response(feed, { status: 200 }),
      observability: { recordProviderFailure: (failure) => failures.push(failure) },
    });

    const items = await provider.fetch();

    expect(items).toHaveLength(1);
    expect(failures).toEqual([{ providerName: "COINDESK_RSS_V1", stage: "VALIDATION", reason: "INVALID_OUTPUT" }]);
  });

  it("propagates network failures to the existing collector boundary", async () => {
    const provider = createCoinDeskRssProvider({ fetch: async () => { throw new Error("network unavailable"); } });

    await expect(provider.fetch()).rejects.toThrow("network unavailable");
  });
});
