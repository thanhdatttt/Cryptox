import { newsItemIdForProviderIdentity, normalizeNewsItem } from "../application/normalization";
import type { NewsCollectionRequest, NewsProvider, NormalizedNewsItemRecord } from "../application/ports";

export const COINDESK_PROVIDER_ID = "coindesk" as const;
const DEFAULT_BASE_URL = "https://data-api.coindesk.com";
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const MAX_PROVIDER_LIMIT = 100;

export interface CoinDeskFetchResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export type CoinDeskFetch = (
  input: string,
  init?: { signal?: AbortSignal; headers?: Record<string, string> },
) => Promise<CoinDeskFetchResponse>;

export interface CoinDeskNewsProviderOptions {
  readonly baseUrl?: string;
  readonly apiKey?: string;
  readonly requestTimeoutMs?: number;
  readonly fetch?: CoinDeskFetch;
}

interface CoinDeskArticle {
  readonly [key: string]: unknown;
}

interface CoinDeskSource {
  readonly [key: string]: unknown;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function unixTimestamp(value: unknown): string {
  const seconds = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(seconds)) throw new Error("CoinDesk article has no publication timestamp");
  const milliseconds = Math.abs(seconds) >= 1_000_000_000_000 ? seconds : seconds * 1_000;
  const result = new Date(milliseconds);
  if (!Number.isFinite(result.getTime())) throw new Error("CoinDesk article has an invalid publication timestamp");
  return result.toISOString();
}

function categoryValues(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const candidate = typeof entry === "string"
      ? entry
      : text(object(entry)?.CATEGORY)
        ?? text(object(entry)?.CATEGORY_NAME)
        ?? text(object(entry)?.NAME)
        ?? text(object(entry)?.SYMBOL)
        ?? text(object(entry)?.ID);
    return candidate ? candidate.split(/[,|]/).map((part) => part.trim()).filter(Boolean) : [];
  });
}

function articleToNormalized(article: CoinDeskArticle, crawledAt: string): NormalizedNewsItemRecord {
  const providerItemId = text(article.GUID);
  if (!providerItemId) throw new Error("CoinDesk article has no GUID");
  const title = text(article.TITLE);
  if (!title) throw new Error("CoinDesk article has no title");
  const content = text(article.BODY) ?? text(article.SUBTITLE) ?? title;
  const url = text(article.URL);
  if (!url) throw new Error("CoinDesk article has no URL");
  const sourceData = object(article.SOURCE_DATA) as CoinDeskSource | undefined;
  const source = text(sourceData?.NAME) ?? text(sourceData?.SOURCE_KEY) ?? "CoinDesk";
  const publishedAt = unixTimestamp(article.PUBLISHED_ON);
  return normalizeNewsItem({
    id: newsItemIdForProviderIdentity(COINDESK_PROVIDER_ID, providerItemId),
    providerId: COINDESK_PROVIDER_ID,
    providerItemId,
    title,
    content,
    source,
    publishedAt,
    crawledAt,
    relatedCoins: categoryValues(article.CATEGORY_DATA),
    url,
  }, COINDESK_PROVIDER_ID);
}

function requestUrl(baseUrl: string, request: NewsCollectionRequest): string {
  const url = new URL("/news/v1/article/list", baseUrl);
  url.searchParams.set("lang", "EN");
  url.searchParams.set("limit", String(Math.min(request.limit ?? 50, MAX_PROVIDER_LIMIT)));
  if (request.relatedCoins && request.relatedCoins.length > 0) {
    url.searchParams.set("categories", request.relatedCoins.join(","));
  }
  return url.toString();
}

async function fetchBounded(
  fetcher: CoinDeskFetch,
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const responsePromise = Promise.resolve().then(async () => {
    const response = await fetcher(url, { signal: controller.signal, headers });
    if (!response.ok) throw new Error(`CoinDesk request failed with HTTP ${response.status}`);
    return response.json();
  });
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("CoinDesk request timed out"));
    }, timeoutMs);
    (timer as unknown as { unref?: () => void }).unref?.();
  });
  try {
    return await Promise.race([responsePromise, timeoutPromise]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export function createCoinDeskNewsProvider(options: CoinDeskNewsProviderOptions = {}): NewsProvider {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const parsedBaseUrl = new URL(baseUrl);
  if (parsedBaseUrl.protocol !== "http:" && parsedBaseUrl.protocol !== "https:") {
    throw new Error("CoinDesk base URL must use HTTP(S)");
  }
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs < 1) {
    throw new Error("CoinDesk request timeout must be a positive safe integer");
  }
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis) as unknown as CoinDeskFetch;
  const headers: Record<string, string> = options.apiKey?.trim()
    ? { Authorization: `Apikey ${options.apiKey.trim()}`, Accept: "application/json" }
    : { Accept: "application/json" };

  return {
    id: COINDESK_PROVIDER_ID,
    async fetch(request): Promise<readonly NormalizedNewsItemRecord[]> {
      const payload = await fetchBounded(fetcher, requestUrl(baseUrl, request), headers, requestTimeoutMs);
      const articles = object(payload)?.Data;
      if (!Array.isArray(articles)) throw new Error("CoinDesk response has no Data array");
      const crawledAt = new Date().toISOString();
      const items = articles.map((value) => {
        try {
          return articleToNormalized(value as CoinDeskArticle, crawledAt);
        } catch {
          // Keep an invalid entry in the provider-neutral port so the News application
          // can reject it individually without losing valid siblings from the page.
          return value as NormalizedNewsItemRecord;
        }
      });
      if (request.publishedAfter === undefined) return items;
      const publishedAfter = Date.parse(request.publishedAfter);
      return items.filter((item) => {
        const publishedAt = typeof item.publishedAt === "string" ? Date.parse(item.publishedAt) : NaN;
        return !Number.isFinite(publishedAt) || publishedAt >= publishedAfter;
      });
    },
  };
}
