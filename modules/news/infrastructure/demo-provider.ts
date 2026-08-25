import { createHash } from "node:crypto";
import type { NewsProvider } from "../application/ports";
import type { NewsItem } from "../domain/contracts";

const makeId = (url: string): string => createHash("sha256").update(url, "utf8").digest("hex").slice(0, 24);
const stamp = (now: string, offsetMinutes: number): string => new Date(Date.parse(now) - offsetMinutes * 60_000).toISOString();

export function createDemoNewsProvider(clock: { now(): string } = { now: () => new Date().toISOString() }): NewsProvider {
  return {
    name: "LOCAL_DEMO_V1",
    async fetch(): Promise<NewsItem[]> {
      const crawledAt = clock.now();
      const drafts = [
        { url: "https://local.cryptox.demo/news/bitcoin-etf-inflow", title: "Bitcoin ETF inflows support market confidence", content: "A local demonstration report describes positive institutional inflows and stable Bitcoin demand.", relatedCoins: ["BTC"] },
        { url: "https://local.cryptox.demo/news/ethereum-upgrade", title: "Ethereum upgrade testing continues", content: "A local demonstration report describes neutral Ethereum network upgrade testing progress.", relatedCoins: ["ETH"] },
      ];
      return drafts.map((draft, index) => ({ id: makeId(draft.url), title: draft.title, content: draft.content, source: "LOCAL_DEMO", publishedAt: stamp(crawledAt, (index + 1) * 5), crawledAt, relatedCoins: draft.relatedCoins, url: draft.url }));
    },
  };
}

export function createConfiguredNewsProviders(input: { provider?: string; clock?: { now(): string } } = {}): readonly NewsProvider[] {
  const configured = (input.provider ?? "DEMO").trim().toUpperCase();
  if (configured === "DEMO" || configured === "LOCAL_DEMO") return [createDemoNewsProvider(input.clock)];
  return [{ name: configured, fetch: async () => { throw new Error(`NEWS_PROVIDER_${configured}_NOT_CONFIGURED`); } }];
}
