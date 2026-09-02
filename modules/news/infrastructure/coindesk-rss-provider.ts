import { createHash } from "node:crypto";
import type { NewsObservability, NewsProvider } from "../application/ports";
import type { NewsItem } from "../domain/contracts";
import { validateNewsItem } from "../domain/rules";
import type { CrawlerNewsProviderOptions } from "./crawler-provider";
import { createCrawlerNewsProvider } from "./crawler-provider";

export const COINDESK_RSS_FEED_URL = "https://www.coindesk.com/arc/outboundfeeds/rss/";
const PROVIDER_NAME = "COINDESK_RSS_V1";
const SOURCE_NAME = "COINDESK";

const XML_ATTRIBUTE = /([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const ENTRY = /<(?:[A-Za-z_][\w.-]*:)?(item|entry)\b[^>]*>[\s\S]*?<\/\s*(?:[A-Za-z_][\w.-]*:)?\1\s*>/gi;
const SCRIPT_OR_STYLE = /<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi;
const TAG = /<[^>]*>/g;

export interface CoinDeskRssProviderOptions {
  clock?: { now(): string };
  /** Injectable only at the infrastructure boundary so tests never need live CoinDesk access. */
  fetch?: typeof globalThis.fetch;
  observability?: Pick<NewsObservability, "recordProviderFailure">;
}

const decodeXmlEntities = (value: string): string => value
  .replace(/&#(x[\da-f]+|\d+);/gi, (_match, entity: string) => {
    const codePoint = entity.toLowerCase().startsWith("x") ? Number.parseInt(entity.slice(1), 16) : Number.parseInt(entity, 10);
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : "";
  })
  .replace(/&apos;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&gt;/gi, ">")
  .replace(/&lt;/gi, "<")
  .replace(/&amp;/gi, "&")
  .replace(/&nbsp;?/gi, " ");

const normalizedText = (value: string): string => decodeXmlEntities(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"))
  .replace(SCRIPT_OR_STYLE, "")
  .replace(TAG, " ")
  .replace(/\s+/g, " ")
  .trim();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const elementValues = (block: string, names: readonly string[]): string[] => {
  const pattern = new RegExp(`<(${names.map(escapeRegExp).join("|")})(?:\\s[^>]*)?>([\\s\\S]*?)<\\/\\s*\\1\\s*>`, "gi");
  return [...block.matchAll(pattern)].map((match) => match[2] ?? "");
};

const attributes = (value: string): Map<string, string> => {
  const result = new Map<string, string>();
  XML_ATTRIBUTE.lastIndex = 0;
  for (let match = XML_ATTRIBUTE.exec(value); match; match = XML_ATTRIBUTE.exec(value)) {
    result.set(match[1]!.toLowerCase(), decodeXmlEntities(match[2] ?? match[3] ?? ""));
  }
  return result;
};

const linkValues = (block: string): string[] => {
  const result: string[] = [];
  const pattern = /<(?:(?:[A-Za-z_][\w.-]*):)?link\b([^>]*?)(?:\/\s*>|>([\s\S]*?)<\/\s*(?:(?:[A-Za-z_][\w.-]*):)?link\s*>)/gi;
  for (const match of block.matchAll(pattern)) {
    const attr = attributes(match[1] ?? "");
    const value = attr.get("href") ?? match[2];
    if (value) result.push(normalizedText(value));
  }
  return result;
};

const firstText = (block: string, names: readonly string[]): string | undefined => {
  for (const value of elementValues(block, names)) {
    const normalized = normalizedText(value);
    if (normalized) return normalized;
  }
  return undefined;
};

const normalizeTimestamp = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
};

const normalizeUrl = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const candidate = value.trim();
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return undefined;
    return candidate;
  } catch {
    return undefined;
  }
};

const coinAliases = new Map([
  ["ADA", "ADA"], ["AVALANCHE", "AVAX"], ["AVAX", "AVAX"], ["BITCOIN", "BTC"],
  ["BITCOIN CASH", "BCH"], ["CARDANO", "ADA"], ["CHAINLINK", "LINK"], ["DOGECOIN", "DOGE"],
  ["DOT", "DOT"], ["ETH", "ETH"], ["ETHEREUM", "ETH"], ["LITECOIN", "LTC"], ["LINK", "LINK"],
  ["MATIC", "MATIC"], ["POLKADOT", "DOT"], ["RIPPLE", "XRP"], ["SOL", "SOL"], ["SOLANA", "SOL"],
  ["XRP", "XRP"], ["XBT", "BTC"],
]);
const categoryNoise = new Set(["ANALYSIS", "BUSINESS", "FEATURED", "FINANCE", "MARKET", "MARKETS", "NEWS", "OPINION", "POLICY", "SPONSORED", "TECHNOLOGY"]);

const normalizeRelatedCoins = (values: readonly string[]): string[] => {
  const coins: string[] = [];
  for (const value of values.flatMap((entry) => entry.split(/[,|;]/))) {
    const normalized = normalizedText(value).toUpperCase();
    if (!normalized) continue;
    const alias = coinAliases.get(normalized);
    const candidate = alias ?? normalized.replace(/[^A-Z0-9]/g, "");
    if (!candidate || categoryNoise.has(candidate) || !/^[A-Z0-9]{2,12}$/.test(candidate)) continue;
    if (!coins.includes(candidate)) coins.push(candidate);
  }
  return coins;
};

const observeInvalidEntry = (observability: CoinDeskRssProviderOptions["observability"]): void => {
  try {
    observability?.recordProviderFailure?.({ providerName: PROVIDER_NAME, stage: "VALIDATION", reason: "INVALID_OUTPUT" });
  } catch {
    // Observability must not affect RSS collection.
  }
};

const normalizeEntry = (block: string, crawledAt: string, sourceName: string = SOURCE_NAME): NewsItem | undefined => {
  const title = firstText(block, ["title"]);
  const url = normalizeUrl(linkValues(block)[0] ?? firstText(block, ["guid", "id"]));
  const content = firstText(block, ["content:encoded", "description", "summary", "content"]);
  const publishedAt = normalizeTimestamp(firstText(block, ["pubDate", "dc:date", "published", "updated", "date"]));
  const relatedCoins = normalizeRelatedCoins(elementValues(block, ["category", "media:category", "dc:subject", "media:keywords"]).map(normalizedText));
  if (!title || !content || !url || !publishedAt) return undefined;

  try {
    return validateNewsItem({
      id: createHash("sha256").update(url, "utf8").digest("hex").slice(0, 24),
      title,
      content,
      source: sourceName,
      publishedAt,
      crawledAt,
      relatedCoins,
      url,
    });
  } catch {
    return undefined;
  }
};

const parseFeed = (xml: string, crawledAt: string, observability: CoinDeskRssProviderOptions["observability"], sourceName: string = SOURCE_NAME): NewsItem[] => {
  const items: NewsItem[] = [];
  for (const match of xml.matchAll(ENTRY)) {
    const item = normalizeEntry(match[0]!, crawledAt, sourceName);
    if (item) items.push(item);
    else observeInvalidEntry(observability);
  }
  return items;
};

export interface RssFeedProviderOptions {
  name?: string;
  sourceName?: string;
  url: string;
  clock?: { now(): string };
  fetch?: typeof globalThis.fetch;
  observability?: Pick<NewsObservability, "recordProviderFailure">;
}

export function createRssFeedProvider(options: RssFeedProviderOptions): NewsProvider {
  const clock = options.clock ?? { now: () => new Date().toISOString() };
  const client = options.fetch ?? globalThis.fetch;
  const sourceName = (options.sourceName ?? "RSS").toUpperCase();
  const providerName = options.name ?? `${sourceName}_RSS_V1`;
  return {
    name: providerName,
    async fetch(): Promise<NewsItem[]> {
      const crawledAt = normalizeTimestamp(clock.now());
      if (!crawledAt) throw new Error(`${providerName}_INVALID_CRAWL_TIME`);
      const response = await client(options.url, {
        headers: { accept: "application/rss+xml, application/xml, text/xml;q=0.9" },
      });
      if (!response.ok) throw new Error(`${providerName}_HTTP_${response.status}`);
      const xml = await response.text();
      return parseFeed(xml, crawledAt, options.observability, sourceName);
    },
  };
}

export function createCoinDeskRssProvider(options: CoinDeskRssProviderOptions = {}): NewsProvider {
  return createRssFeedProvider({
    ...options,
    name: PROVIDER_NAME,
    sourceName: SOURCE_NAME,
    url: COINDESK_RSS_FEED_URL,
  });
}

export function createConfiguredNewsProviders(input: {
  provider?: string;
  clock?: { now(): string };
  crawler?: CrawlerNewsProviderOptions;
  observability?: Pick<NewsObservability, "recordProviderFailure">;
} = {}): readonly NewsProvider[] {
  const configured = (input.provider ?? "COINDESK_RSS").trim().toUpperCase();
  if (configured === "COINDESK_RSS") {
    return [createCoinDeskRssProvider({ clock: input.clock, observability: input.observability })];
  }
  if (configured === "CRAWLER" || configured === "CRAWLER_LLM" || configured === "LLM_CRAWLER") {
    if (input.crawler) return [createCrawlerNewsProvider({ ...input.crawler, clock: input.crawler.clock ?? input.clock, observability: input.crawler.observability ?? input.observability })];
    throw new Error("MISSING_CONFIGURATION:NEWS_PROVIDER_CRAWLER");
  }
  throw new Error(`INVALID_CONFIGURATION:NEWS_PROVIDER:${configured}`);
}
