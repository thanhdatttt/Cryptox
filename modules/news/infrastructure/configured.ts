import { createHash } from "node:crypto";
import type {
  ExtractionTemplateRecord,
  ExtractionTemplateRepository,
  NewsCollectionRequest,
  NewsProvider,
  NewsProviderDocument,
  NewsUrlImportExtractor,
  NormalizedNewsItemRecord,
  SafeNewsUrlFetchPort,
} from "../application/ports";
import type { ExtractionTemplateRef } from "../api/contracts";
import {
  canonicalProviderId,
  canonicalTimestamp,
  canonicalizeNewsUrl,
  normalizeExtractionProvenance,
  normalizeNewsItem,
  requiredNewsText,
} from "../application/normalization";
import type { SafeNewsSourceConfiguration } from "./safe-fetch";

export type ConfiguredNewsSourceKind = "WEBSITE" | "CONFIGURED_WEBSITE" | "RSS" | "HTML";

export interface ConfiguredNewsSource extends SafeNewsSourceConfiguration {
  readonly kind: ConfiguredNewsSourceKind;
  readonly url: string;
  readonly displayName?: string;
  readonly defaultRelatedCoins?: readonly string[];
  readonly refreshIntervalMinutes?: number;
}

export interface ConfiguredNewsProviderOptions {
  readonly source: ConfiguredNewsSource;
  readonly safeFetcher: SafeNewsUrlFetchPort;
  readonly templateRepository?: ExtractionTemplateRepository<ExtractionTemplateRecord>;
  readonly now?: () => string;
}

export const DEFAULT_NEWS_REFRESH_INTERVAL_MINUTES = 5 as const;

export function refreshIntervalMinutes(value: unknown): number {
  const selected = value === undefined ? DEFAULT_NEWS_REFRESH_INTERVAL_MINUTES : value;
  if (typeof selected !== "number" || !Number.isSafeInteger(selected) || selected < 1 || selected > 5) {
    throw new Error("News refresh interval must be an integer between 1 and 5 minutes");
  }
  return selected;
}

export class ConfiguredNewsExtractionError extends Error {
  public readonly name = "ConfiguredNewsExtractionError";

  public constructor(message: string) {
    super(message);
  }
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/giu, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/gu, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&quot;/giu, '"')
    .replace(/&apos;/giu, "'")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&amp;/giu, "&");
}

function plainText(value: string): string {
  return decodeEntities(value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gu, "$1")
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<br\s*\/?\s*>/giu, " ")
    .replace(/<[^>]+>/gu, " "))
    .replace(/\s+/gu, " ")
    .trim();
}

function tagContents(value: string, tag: string): string[] {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return [...value.matchAll(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "giu"))]
    .map((match) => match[1] ?? "")
    .filter((candidate) => candidate.trim().length > 0);
}

function firstTagText(value: string, tags: readonly string[]): string | undefined {
  for (const tag of tags) {
    const match = tagContents(value, tag).map(plainText).find(Boolean);
    if (match) return match;
  }
  return undefined;
}

function attribute(value: string, tag: string, name: string): string | undefined {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = value.match(new RegExp(`<${escapedTag}\\b[^>]*\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1[^>]*>`, "iu"));
  return match?.[2] ? decodeEntities(match[2].trim()) : undefined;
}

function firstAttribute(value: string, tag: string, names: readonly string[]): string | undefined {
  for (const name of names) {
    const found = attribute(value, tag, name);
    if (found) return found;
  }
  return undefined;
}

function safeArticleUrl(value: string | undefined, documentUrl: string): string {
  if (!value) return documentUrl;
  try {
    const candidate = new URL(value, documentUrl);
    if (candidate.protocol !== "https:" || candidate.origin !== new URL(documentUrl).origin) return documentUrl;
    return canonicalizeNewsUrl(candidate.toString());
  } catch {
    return documentUrl;
  }
}

function deterministicId(sourceId: string, value: string): string {
  const digest = createHash("sha256").update(`${sourceId}\0${value}`, "utf8").digest("hex");
  return `document-${digest.slice(0, 32)}`;
}

function sourceKind(kind: ConfiguredNewsSourceKind): "CONFIGURED_WEBSITE" | "RSS" | "HTML" {
  return kind === "WEBSITE" || kind === "CONFIGURED_WEBSITE" ? "CONFIGURED_WEBSITE" : kind;
}

function templateRef(template: ExtractionTemplateRecord | undefined): ExtractionTemplateRef | undefined {
  if (!template) return undefined;
  if (template.status !== "APPROVED") throw new ConfiguredNewsExtractionError("only an APPROVED extraction template may be used");
  return {
    id: template.id,
    sourceId: template.sourceId,
    version: template.version,
    status: template.status,
  };
}

function relatedCoins(source: ConfiguredNewsSource, value: string | undefined): string[] {
  const configured = source.defaultRelatedCoins ?? [];
  const embedded = value?.match(/\b[A-Z]{2,10}\b/gu) ?? [];
  return [...new Set([...configured, ...embedded].map((coin) => coin.trim().toUpperCase()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

function dateOrFallback(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  try {
    return canonicalTimestamp(value, "publishedAt");
  } catch {
    return fallback;
  }
}

interface RawExtractedItem {
  readonly providerItemId: string;
  readonly title: string;
  readonly content: string;
  readonly publishedAt: string;
  readonly url: string;
  readonly relatedCoins?: readonly string[];
}

function parseHtml(body: string, documentUrl: string, source: ConfiguredNewsSource, extractedAt: string): RawExtractedItem[] {
  const articleBlocks = tagContents(body, "article");
  const blocks = articleBlocks.length > 0 ? articleBlocks : [body];
  const canonicalDocumentUrl = canonicalizeNewsUrl(documentUrl);
  return blocks.map((block, index) => {
    const title = firstTagText(block, ["h1", "h2", "h3", "title"])
      ?? firstAttribute(block, "meta", ["content"])
      ?? source.displayName
      ?? source.id;
    const paragraphs = tagContents(block, "p").map(plainText).filter(Boolean);
    const content = paragraphs.join(" ") || plainText(block) || title;
    const published = firstAttribute(block, "time", ["datetime"])
      ?? firstAttribute(block, "meta", ["content"]);
    const url = safeArticleUrl(
      firstAttribute(block, "link", ["href"]) ?? firstAttribute(block, "a", ["href"]),
      canonicalDocumentUrl,
    );
    const identity = `${url}\0${title}\0${index}`;
    return {
      providerItemId: deterministicId(source.id, identity),
      title,
      content,
      publishedAt: dateOrFallback(published, extractedAt),
      url,
      relatedCoins: relatedCoins(source, `${title} ${content}`),
    };
  });
}

function parseRss(body: string, documentUrl: string, source: ConfiguredNewsSource, extractedAt: string): RawExtractedItem[] {
  const blocks = [...tagContents(body, "item"), ...tagContents(body, "entry")];
  const entries = blocks.length > 0 ? blocks : [body];
  const canonicalDocumentUrl = canonicalizeNewsUrl(documentUrl);
  return entries.map((block, index) => {
    const title = firstTagText(block, ["title"]) ?? source.displayName ?? source.id;
    const description = firstTagText(block, ["content:encoded", "encoded", "description", "summary", "content"]);
    const link = firstTagText(block, ["link"])
      ?? attribute(block, "link", "href")
      ?? canonicalDocumentUrl;
    const guid = firstTagText(block, ["guid", "id"]);
    const published = firstTagText(block, ["pubDate", "published", "updated", "dc:date"]);
    const categories = tagContents(block, "category").map(plainText).filter(Boolean);
    const identity = guid ?? safeArticleUrl(link, canonicalDocumentUrl);
    return {
      providerItemId: requiredNewsText(identity, "providerItemId"),
      title,
      content: description ? plainText(description) : title,
      publishedAt: dateOrFallback(published, extractedAt),
      url: safeArticleUrl(link, canonicalDocumentUrl),
      relatedCoins: relatedCoins(source, `${title} ${description ?? ""} ${categories.join(" ")}`),
    };
  }).map((item, index) => item.providerItemId
    ? item
    : { ...item, providerItemId: deterministicId(source.id, `${item.url}\0${index}`) });
}

function filteredItems(
  items: readonly NormalizedNewsItemRecord[],
  request: NewsCollectionRequest,
): readonly NormalizedNewsItemRecord[] {
  const publishedAfter = request.publishedAfter === undefined ? undefined : Date.parse(request.publishedAfter);
  const coins = request.relatedCoins?.map((coin) => coin.toUpperCase());
  return items
    .filter((item) => publishedAfter === undefined || Date.parse(item.publishedAt) >= publishedAfter)
    .filter((item) => coins === undefined || coins.length === 0 || coins.some((coin) => item.relatedCoins.includes(coin)))
    .slice(0, request.limit ?? 50);
}

export class ConfiguredNewsProvider implements NewsProvider, NewsUrlImportExtractor {
  public readonly id: string;
  public readonly sourceKind: "CONFIGURED_WEBSITE" | "RSS" | "HTML";
  private readonly source: ConfiguredNewsSource;
  private readonly safeFetcher: SafeNewsUrlFetchPort;
  private readonly templateRepository?: ExtractionTemplateRepository<ExtractionTemplateRecord>;
  private readonly now: () => string;
  public readonly refreshIntervalMinutes: number;

  public constructor(options: ConfiguredNewsProviderOptions) {
    this.source = {
      ...options.source,
      id: canonicalProviderId(options.source.id),
      refreshIntervalMinutes: refreshIntervalMinutes(options.source.refreshIntervalMinutes),
      url: secureConfiguredUrl(options.source.url),
    };
    this.id = this.source.id;
    this.sourceKind = sourceKind(this.source.kind);
    this.safeFetcher = options.safeFetcher;
    this.templateRepository = options.templateRepository;
    this.now = options.now ?? (() => new Date().toISOString());
    this.refreshIntervalMinutes = this.source.refreshIntervalMinutes!;
    if (this.source.kind !== "WEBSITE" && this.source.kind !== "CONFIGURED_WEBSITE"
      && this.source.kind !== "RSS" && this.source.kind !== "HTML") {
      throw new Error("unsupported configured News source kind");
    }
  }

  public async fetch(request: NewsCollectionRequest): Promise<readonly NormalizedNewsItemRecord[]> {
    const document = await this.fetchDocument(request);
    return document.items;
  }

  public async fetchDocument(request: NewsCollectionRequest): Promise<NewsProviderDocument> {
    const fetched = await this.safeFetcher.fetch({
      url: this.source.url,
      sourceId: this.source.id,
      timeoutMs: 20_000,
      maximumRedirects: 3,
      maximumBodyBytes: 1_048_576,
    });
    const canonicalFetchedUrl = secureConfiguredUrl(fetched.canonicalUrl);
    return this.extractDocument({
      request,
      canonicalUrl: canonicalFetchedUrl,
      body: fetched.body,
      contentType: fetched.contentType,
      redirects: fetched.redirects,
      extractedAt: this.now(),
      sourceKind: this.sourceKind,
    });
  }

  public async extract(input: {
    request: { url: string; sourceId: string };
    canonicalUrl: string;
    body: string;
    contentType: string;
    redirects: number;
    extractedAt: string;
  }): Promise<NewsProviderDocument> {
    if (canonicalProviderId(input.request.sourceId) !== this.id) {
      throw new ConfiguredNewsExtractionError("URL import source is not configured");
    }
    const canonicalUrl = secureConfiguredUrl(input.canonicalUrl);
    return this.extractDocument({
      request: {},
      canonicalUrl,
      body: input.body,
      contentType: input.contentType,
      redirects: input.redirects,
      extractedAt: input.extractedAt,
      sourceKind: "ALLOWLISTED_URL_IMPORT",
    });
  }

  private async extractDocument(input: {
    request: NewsCollectionRequest;
    canonicalUrl: string;
    body: string;
    contentType: string;
    redirects: number;
    extractedAt: string;
    sourceKind: "CONFIGURED_WEBSITE" | "RSS" | "HTML" | "ALLOWLISTED_URL_IMPORT";
  }): Promise<NewsProviderDocument> {
    const template = await this.templateRepository?.readActive(this.source.id);
    const ref = templateRef(template);
    const rawItems = this.source.kind === "RSS"
      ? parseRss(input.body, input.canonicalUrl, this.source, input.extractedAt)
      : parseHtml(input.body, input.canonicalUrl, this.source, input.extractedAt);
    const items = filteredItems(rawItems.map((raw) => {
      const normalized = normalizeNewsItem({
        id: deterministicId(this.source.id, raw.providerItemId),
        providerId: this.source.id,
        providerItemId: raw.providerItemId,
        title: raw.title,
        content: raw.content,
        source: this.source.displayName ?? this.source.id,
        publishedAt: raw.publishedAt,
        crawledAt: input.extractedAt,
        relatedCoins: raw.relatedCoins ?? this.source.defaultRelatedCoins ?? [],
        url: raw.url,
      }, this.source.id);
      return normalizeNewsItem({
        ...normalized,
        extraction: normalizeExtractionProvenance({
          sourceKind: input.sourceKind,
          canonicalUrl: normalized.canonicalUrl ?? normalized.url,
          normalizedContentHash: normalized.normalizedContentHash,
          template: ref,
          extractedAt: input.extractedAt,
          normalizedRetainUntil: addDays(input.extractedAt, 90),
        }, {
          canonicalUrl: normalized.canonicalUrl ?? normalized.url,
          normalizedContentHash: normalized.normalizedContentHash ?? "",
          extractedAt: input.extractedAt,
        }),
      }, this.source.id);
    }), input.request);
    return {
      sourceKind: input.sourceKind,
      canonicalUrl: canonicalizeNewsUrl(input.canonicalUrl),
      body: input.body,
      contentType: input.contentType,
      redirects: input.redirects,
      extractedAt: canonicalTimestamp(input.extractedAt, "extractedAt"),
      items,
    };
  }
}

function secureConfiguredUrl(value: string): string {
  const url = new URL(requiredNewsText(value, "source.url"));
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("configured News source must be credential-free HTTPS");
  return canonicalizeNewsUrl(url.toString());
}

function addDays(value: string, days: number): string {
  return new Date(Date.parse(value) + days * 24 * 60 * 60 * 1_000).toISOString();
}

export function createConfiguredNewsProvider(options: ConfiguredNewsProviderOptions): ConfiguredNewsProvider {
  return new ConfiguredNewsProvider(options);
}

export function createWebsiteNewsProvider(options: ConfiguredNewsProviderOptions): ConfiguredNewsProvider {
  return createConfiguredNewsProvider({ ...options, source: { ...options.source, kind: "WEBSITE" } });
}

export function createRssNewsProvider(options: ConfiguredNewsProviderOptions): ConfiguredNewsProvider {
  return createConfiguredNewsProvider({ ...options, source: { ...options.source, kind: "RSS" } });
}

export function createHtmlNewsProvider(options: ConfiguredNewsProviderOptions): ConfiguredNewsProvider {
  return createConfiguredNewsProvider({ ...options, source: { ...options.source, kind: "HTML" } });
}
