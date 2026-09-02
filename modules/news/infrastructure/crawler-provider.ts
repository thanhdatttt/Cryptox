import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type {
  HtmlNewsInterpreter,
  InterpretedNewsCandidate,
  NewsObservability,
  NewsProvider,
  NewsProviderFailureReason,
  NewsProviderFailureStage,
} from "../application/ports";
import type { NewsItem } from "../domain/contracts";
import { validateNewsItem } from "../domain/rules";

const DEFAULT_LIMITS = {
  maxHtmlBytes: 1_000_000,
  maxInterpreterHtmlBytes: 64_000,
  maxRedirects: 3,
  timeoutMs: 10_000,
  maxCandidates: 8,
  maxFieldLength: 50_000,
};

const ALLOWED_TAGS = new Set([
  "a", "article", "blockquote", "body", "br", "div", "em", "footer", "h1", "h2", "h3", "h4", "h5", "h6",
  "head", "header", "html", "li", "link", "main", "meta", "ol", "p", "section", "span", "strong", "time", "title", "ul",
]);
const VOID_TAGS = new Set(["br", "link", "meta"]);
const BLOCKED_ELEMENT = /<(script|style|noscript|iframe|object|embed|svg|canvas|template|form)\b[^>]*>[\s\S]*?(?:<\/\s*\1\s*>|$)/gi;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const TAG = /<\/?[A-Za-z][^>]*>/g;
const ATTRIBUTE = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const SIGNIFICANT_TOKEN = /[\p{L}\p{N}]{4,}/gu;

export interface CrawlerLimits {
  maxHtmlBytes?: number;
  maxInterpreterHtmlBytes?: number;
  maxRedirects?: number;
  timeoutMs?: number;
  maxCandidates?: number;
  maxFieldLength?: number;
}

export interface FetchedNewsPage {
  /** The URL after following any redirects. */
  finalUrl?: string;
  /** Alias accepted by the test/composition seam. */
  url?: string;
  html: string;
  contentType?: string | null;
}

export interface CrawlerNewsProviderOptions {
  sourceUrls?: readonly string[];
  urls?: readonly string[];
  interpreter: HtmlNewsInterpreter;
  name?: string;
  clock?: { now(): string };
  limits?: CrawlerLimits;
  maxHtmlBytes?: number;
  maxInterpreterHtmlBytes?: number;
  maxRedirects?: number;
  timeoutMs?: number;
  maxCandidates?: number;
  maxFieldLength?: number;
  /** Injectable only at the infrastructure boundary; the default is global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Injectable DNS resolution keeps the public-destination check testable. */
  resolveHost?: (hostname: string) => Promise<readonly string[]>;
  /** Injectable page fetch seam for adapter tests; returned HTML is still bounded and cleaned. */
  fetchPage?: (sourceUrl: string, limits: Readonly<Required<CrawlerLimits>>) => Promise<FetchedNewsPage>;
  observability?: Pick<NewsObservability, "recordProviderFailure">;
}

type ResolvedCrawlerLimits = Readonly<Required<CrawlerLimits>>;

class CrawlerFailure extends Error {
  constructor(readonly stage: NewsProviderFailureStage, readonly reason: NewsProviderFailureReason) {
    super("crawler operation failed");
    this.name = "CrawlerFailure";
  }
}

const byteLength = (value: string): number => Buffer.byteLength(value, "utf8");

const failureReason = (error: unknown): NewsProviderFailureReason =>
  /timeout|abort/i.test(error instanceof Error ? `${error.name} ${error.message}` : String(error)) ? "TIMEOUT" : "ERROR";

const observe = (
  observability: Pick<NewsObservability, "recordProviderFailure"> | undefined,
  providerName: string,
  stage: NewsProviderFailureStage,
  reason: NewsProviderFailureReason,
): void => {
  try { observability?.recordProviderFailure?.({ providerName, stage, reason }); } catch { /* Observability is isolated from crawling. */ }
};

const resolvedLimits = (options: CrawlerNewsProviderOptions): ResolvedCrawlerLimits => ({
  ...DEFAULT_LIMITS,
  ...(options.limits ?? {}),
  ...(options.maxHtmlBytes === undefined ? {} : { maxHtmlBytes: options.maxHtmlBytes }),
  ...(options.maxInterpreterHtmlBytes === undefined ? {} : { maxInterpreterHtmlBytes: options.maxInterpreterHtmlBytes }),
  ...(options.maxRedirects === undefined ? {} : { maxRedirects: options.maxRedirects }),
  ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  ...(options.maxCandidates === undefined ? {} : { maxCandidates: options.maxCandidates }),
  ...(options.maxFieldLength === undefined ? {} : { maxFieldLength: options.maxFieldLength }),
});

const assertLimit = (value: number, name: string): void => {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
};

const validateLimits = (limits: ResolvedCrawlerLimits): void => {
  assertLimit(limits.maxHtmlBytes, "maxHtmlBytes");
  assertLimit(limits.maxInterpreterHtmlBytes, "maxInterpreterHtmlBytes");
  if (!Number.isInteger(limits.maxRedirects) || limits.maxRedirects < 0) throw new Error("maxRedirects must be a non-negative integer");
  assertLimit(limits.timeoutMs, "timeoutMs");
  assertLimit(limits.maxCandidates, "maxCandidates");
  assertLimit(limits.maxFieldLength, "maxFieldLength");
};

const parseHttpUrl = (value: string): URL => {
  let url: URL;
  try { url = new URL(value); } catch { throw new CrawlerFailure("FETCH", "ERROR"); }
  if (!(["http:", "https:"].includes(url.protocol)) || !url.hostname || url.username || url.password) {
    throw new CrawlerFailure("FETCH", "ERROR");
  }
  return url;
};

const ipv4Parts = (value: string): number[] | undefined => {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) return undefined;
  const numbers = parts.map(Number);
  return numbers.every((part) => part >= 0 && part <= 255) ? numbers : undefined;
};

const isPrivateAddress = (value: string): boolean => {
  const address = value.toLowerCase().split("%")[0];
  const ipv4 = ipv4Parts(address) ?? (address.startsWith("::ffff:") ? ipv4Parts(address.slice(7)) : undefined);
  if (ipv4) {
    const [first, second] = ipv4;
    return first === 0 || first === 10 || first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 0) ||
      (first === 192 && second === 168) ||
      (first === 198 && second >= 18 && second <= 19) ||
      (first >= 224);
  }
  return isIP(address) === 6 && (
    address === "::" || address === "::1" || address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe8") || address.startsWith("fe9") || address.startsWith("fea") || address.startsWith("feb")
  );
};

const isPrivateHostname = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return normalized === "localhost" || normalized.endsWith(".localhost") || normalized.endsWith(".local") || normalized.endsWith(".internal") || normalized === "metadata.google.internal";
};

const defaultResolveHost = async (hostname: string): Promise<readonly string[]> => (await lookup(hostname, { all: true, verbatim: true })).map((entry) => entry.address);

const assertPublicUrl = async (value: string, resolveHost: ((hostname: string) => Promise<readonly string[]>) | undefined): Promise<URL> => {
  const url = parseHttpUrl(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (isPrivateHostname(hostname)) throw new CrawlerFailure("FETCH", "ERROR");
  if (isPrivateAddress(hostname)) throw new CrawlerFailure("FETCH", "ERROR");
  if (resolveHost) {
    let addresses: readonly string[];
    try { addresses = await resolveHost(hostname); } catch { throw new CrawlerFailure("FETCH", "ERROR"); }
    if (!addresses.length || addresses.some(isPrivateAddress)) throw new CrawlerFailure("FETCH", "ERROR");
  }
  return url;
};

const contentTypeIsHtml = (contentType: string | null | undefined): boolean => {
  if (!contentType) return false;
  const normalized = contentType.split(";", 1)[0]!.trim().toLowerCase();
  return normalized === "text/html" || normalized === "application/xhtml+xml";
};

const readResponseText = async (response: Response, maxBytes: number): Promise<string> => {
  const length = response.headers.get("content-length");
  if (length && Number.isFinite(Number(length)) && Number(length) > maxBytes) throw new CrawlerFailure("FETCH", "ERROR");
  if (!response.body) {
    const value = await response.text();
    if (byteLength(value) > maxBytes) throw new CrawlerFailure("FETCH", "ERROR");
    return value;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maxBytes) throw new CrawlerFailure("FETCH", "ERROR");
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: false }).decode(result);
};

const fetchWithBounds = async (
  sourceUrl: string,
  limits: ResolvedCrawlerLimits,
  client: typeof globalThis.fetch,
  resolveHost: (hostname: string) => Promise<readonly string[]>,
): Promise<FetchedNewsPage> => {
  let current = await assertPublicUrl(sourceUrl, resolveHost);
  let redirects = 0;
  for (;;) {
    const controller = new AbortController();
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        controller.abort();
        reject(new CrawlerFailure("FETCH", "TIMEOUT"));
      }, limits.timeoutMs);
    });
    try {
      const request = (async () => {
        const response = await client(current.href, {
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          if (redirects >= limits.maxRedirects) throw new CrawlerFailure("FETCH", "ERROR");
          const location = response.headers.get("location");
          if (!location) throw new CrawlerFailure("FETCH", "ERROR");
          redirects += 1;
          current = await assertPublicUrl(new URL(location, current).href, resolveHost);
          return undefined;
        }
        if (response.status < 200 || response.status >= 300 || !contentTypeIsHtml(response.headers.get("content-type"))) throw new CrawlerFailure("FETCH", "ERROR");
        const html = await readResponseText(response, limits.maxHtmlBytes);
        const responseUrl = response.url && response.url !== current.href ? response.url : current.href;
        const finalUrl = await assertPublicUrl(responseUrl, resolveHost);
        return { finalUrl: finalUrl.href, html, contentType: response.headers.get("content-type") };
      })();
      const result = await Promise.race([request, timeout]);
      if (result) return result;
    } catch (error) {
      if (error instanceof CrawlerFailure) throw error;
      throw new CrawlerFailure("FETCH", failureReason(error));
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }
};

const escapeAttribute = (value: string): string => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const safeAttribute = (name: string, value: string, baseUrl: URL): string | undefined => {
  const normalizedName = name.toLowerCase();
  const trimmed = value.trim().slice(0, 2_000);
  if (!["href", "datetime", "content", "name", "property", "rel", "lang"].includes(normalizedName) || !trimmed) return undefined;
  if (normalizedName === "href") {
    try {
      const href = new URL(trimmed, baseUrl);
      if (!["http:", "https:"].includes(href.protocol) || href.username || href.password) return undefined;
      return `href="${escapeAttribute(href.href)}"`;
    } catch { return undefined; }
  }
  return `${normalizedName}="${escapeAttribute(trimmed)}"`;
};

const sanitizeTag = (token: string, baseUrl: URL): string => {
  const closing = /^<\//.test(token);
  const match = token.match(/^<\/?\s*([A-Za-z][\w-]*)/);
  if (!match || !ALLOWED_TAGS.has(match[1]!.toLowerCase())) return "";
  const tagName = match[1]!.toLowerCase();
  if (closing) return `</${tagName}>`;
  const attributes = token.slice(match[0].length, -1).replace(/\/\s*$/, "");
  const output: string[] = [];
  ATTRIBUTE.lastIndex = 0;
  for (let attribute = ATTRIBUTE.exec(attributes); attribute; attribute = ATTRIBUTE.exec(attributes)) {
    const value = attribute[2] ?? attribute[3] ?? attribute[4];
    if (value === undefined) continue;
    const sanitized = safeAttribute(attribute[1]!, value, baseUrl);
    if (sanitized) output.push(sanitized);
  }
  return `<${tagName}${output.length ? ` ${output.join(" ")}` : ""}${VOID_TAGS.has(tagName) || /\/\s*>$/.test(token) ? " /" : ""}>`;
};

const truncateUtf8 = (value: string, maxBytes: number): string => {
  if (byteLength(value) <= maxBytes) return value;
  const prefix = Buffer.from(value, "utf8").subarray(0, maxBytes).toString("utf8");
  const lastTag = prefix.lastIndexOf(">");
  return lastTag > 0 ? prefix.slice(0, lastTag + 1) : prefix;
};

/** Safety/normalization only: semantic extraction is delegated to HtmlNewsInterpreter. */
export const preprocessCrawlerHtml = (rawHtml: string, sourceUrl: string, maxBytes: number): string => {
  if (typeof rawHtml !== "string" || byteLength(rawHtml) > maxBytes) throw new CrawlerFailure("FETCH", "ERROR");
  const baseUrl = parseHttpUrl(sourceUrl);
  const withoutUnsafeBlocks = rawHtml.replace(BLOCKED_ELEMENT, "").replace(HTML_COMMENT, "");
  let result = "";
  let cursor = 0;
  TAG.lastIndex = 0;
  for (let token = TAG.exec(withoutUnsafeBlocks); token; token = TAG.exec(withoutUnsafeBlocks)) {
    result += withoutUnsafeBlocks.slice(cursor, token.index);
    result += sanitizeTag(token[0], baseUrl);
    cursor = token.index + token[0].length;
  }
  result += withoutUnsafeBlocks.slice(cursor);
  return result;
};

const decodeBasicEntities = (value: string): string => value
  .replace(/&nbsp;?/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&quot;/gi, "\"")
  .replace(/&#39;|&apos;/gi, "'");

const visibleText = (html: string): string => decodeBasicEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const normalizedText = (value: string): string => value.replace(/\s+/g, " ").trim();

/**
 * Evidence is deliberately derived from generic HTML structure and metadata,
 * rather than a site's CSS selectors. The model output remains untrusted: a
 * token appearing once in a page is not enough to establish provenance.
 */
interface PageDateEvidence { readonly timestamp: number; readonly hasTime: boolean; }
interface PageEvidence {
  readonly pageText: string;
  readonly bodyText: string;
  readonly titleText: readonly string[];
  readonly publisherText: readonly string[];
  readonly dates: readonly PageDateEvidence[];
  readonly supportedUrls: ReadonlySet<string>;
}

const EVIDENCE_STOPWORDS = new Set([
  "about", "after", "before", "call", "from", "ignore", "into", "more", "over", "previous", "read", "share", "the", "this", "tool", "under", "with",
]);
const SOURCE_NOISE = new Set([
  "com", "co", "org", "net", "io", "ai", "test", "www", "news", "media", "network", "online", "official", "press", "publisher", "site", "website",
]);
const PROMPT_INJECTION = /\b(?:ignore|disregard|override|follow)\b[\s\S]{0,100}\b(?:previous|system|developer|user|instructions?|prompt)\b|\b(?:call|use|invoke)\s+(?:a\s+)?tool\b/i;
const ISO_DATE = /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[T\s]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:\s?(?:Z|[+-]\d{2}:?\d{2}))?)?\b/g;
const NAMED_DATE = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,|\s+)\s*\d{4}\b/gi;

const foldEvidenceText = (value: string): string => value
  .normalize("NFKD")
  .replace(/\p{M}/gu, "")
  .toLocaleLowerCase();

const evidenceTokens = (value: string, ignored = EVIDENCE_STOPWORDS): string[] =>
  [...new Set((foldEvidenceText(value).match(SIGNIFICANT_TOKEN) ?? []).filter((token) => !ignored.has(token)))];

const parseAttributes = (value: string): Map<string, string> => {
  const attributes = new Map<string, string>();
  ATTRIBUTE.lastIndex = 0;
  for (let attribute = ATTRIBUTE.exec(value); attribute; attribute = ATTRIBUTE.exec(value)) {
    const parsed = attribute[2] ?? attribute[3] ?? attribute[4];
    if (parsed !== undefined) attributes.set(attribute[1]!.toLocaleLowerCase(), decodeBasicEntities(parsed));
  }
  return attributes;
};

const dateEvidence = (value: string, dates: PageDateEvidence[]): void => {
  const trimmed = normalizedText(decodeBasicEntities(value));
  if (!trimmed) return;
  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) return;
  dates.push({ timestamp, hasTime: /(?:T|\b\d{1,2}:\d{2}\b)/i.test(trimmed) });
};

const sameUtcDate = (left: number, right: number): boolean => {
  const a = new Date(left);
  const b = new Date(right);
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
};

const extractPageEvidence = (html: string, pageUrl: URL): PageEvidence => {
  const pageText = visibleText(html);
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/\s*body\s*>/i);
  const bodyEvidenceHtml = (bodyMatch?.[1] ?? html).replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/\s*h[1-6]\s*>/gi, " ");
  const bodyText = visibleText(bodyEvidenceHtml);
  const titleText: string[] = [];
  const publisherText: string[] = [];
  const dates: PageDateEvidence[] = [];
  const supportedUrls = new Set<string>([pageUrl.href]);
  const addSupportedUrl = (value: string): void => {
    try {
      const url = new URL(value, pageUrl);
      if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password && url.origin === pageUrl.origin) supportedUrls.add(url.href);
    } catch { /* Malformed links are not evidence. */ }
  };

  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/\s*title\s*>/i);
  if (titleMatch?.[1]) titleText.push(normalizedText(visibleText(titleMatch[1])));

  const meta = /<meta\b([^>]*)>/gi;
  for (let match = meta.exec(html); match; match = meta.exec(html)) {
    const attributes = parseAttributes(match[1] ?? "");
    const key = (attributes.get("property") ?? attributes.get("name") ?? "").trim().toLocaleLowerCase();
    const content = attributes.get("content");
    if (!key || !content) continue;
    if (["og:title", "twitter:title", "title"].includes(key)) titleText.push(normalizedText(content));
    if (["og:site_name", "twitter:site", "article:publisher", "publisher", "source"].includes(key)) publisherText.push(normalizedText(content));
    if (["og:url", "twitter:url"].includes(key)) addSupportedUrl(content);
    if (/^(?:article:)?(?:published|publication|date|time|timestamp|created|modified|updated|pubdate)/.test(key)) dateEvidence(content, dates);
  }

  const links = /<(?:a|link)\b([^>]*)>/gi;
  for (let match = links.exec(html); match; match = links.exec(html)) {
    const attributes = parseAttributes(match[1] ?? "");
    const href = attributes.get("href");
    if (href) addSupportedUrl(href);
  }

  const times = /<time\b([^>]*)>([\s\S]*?)<\/\s*time\s*>/gi;
  for (let match = times.exec(html); match; match = times.exec(html)) {
    const attributes = parseAttributes(match[1] ?? "");
    const datetime = attributes.get("datetime");
    if (datetime) dateEvidence(datetime, dates);
    else if (match[2]) {
      const text = visibleText(match[2]);
      for (const literal of text.match(ISO_DATE) ?? []) dateEvidence(literal, dates);
      for (const literal of text.match(NAMED_DATE) ?? []) dateEvidence(literal, dates);
    }
  }
  for (const literal of pageText.match(ISO_DATE) ?? []) dateEvidence(literal, dates);
  for (const literal of pageText.match(NAMED_DATE) ?? []) dateEvidence(literal, dates);

  return { pageText, bodyText, titleText, publisherText, dates, supportedUrls };
};

const supportsTitle = (title: string, evidence: PageEvidence): boolean => {
  const foldedTitle = normalizedText(foldEvidenceText(title));
  const textSources = [evidence.pageText, ...evidence.titleText].map((value) => normalizedText(foldEvidenceText(value)));
  if (textSources.some((text) => text.includes(foldedTitle))) return true;
  const tokens = evidenceTokens(title);
  if (!tokens.length) return false;
  const best = textSources.reduce((score, text) => Math.max(score, tokens.filter((token) => text.includes(token)).length), 0);
  return best >= (tokens.length === 1 ? 1 : Math.max(2, Math.ceil(tokens.length * 0.67)));
};

const supportsContent = (content: string, bodyText: string): boolean => {
  const tokens = evidenceTokens(content);
  if (tokens.length < 3) return false;
  const foldedBody = normalizedText(foldEvidenceText(bodyText));
  const bodyTokens = evidenceTokens(bodyText);
  const bodyTokenSet = new Set(bodyTokens);
  const matched = tokens.filter((token) => bodyTokenSet.has(token));
  const ratio = matched.length / tokens.length;
  if (matched.length < 3 || ratio < 0.6) return false;
  const bodyTokenText = bodyTokens.join(" ");
  const hasAdjacentEvidence = tokens.slice(0, -1).some((token, index) => {
    const next = tokens[index + 1];
    return next !== undefined && bodyTokenText.includes(token + " " + next);
  });
  return hasAdjacentEvidence || matched.length >= Math.max(4, Math.ceil(tokens.length * 0.75)) || foldedBody.includes(normalizedText(foldEvidenceText(content)));
};

const supportsSource = (source: string, pageUrl: URL, publishers: readonly string[]): boolean => {
  const sourceTokens = evidenceTokens(source, SOURCE_NOISE);
  if (!sourceTokens.length) return false;
  const metadataMatch = publishers.some((publisher) => {
    const publisherTokens = evidenceTokens(publisher, SOURCE_NOISE);
    const matched = sourceTokens.filter((token) => publisherTokens.includes(token));
    return matched.length >= Math.max(1, Math.ceil(sourceTokens.length * 0.5));
  });
  if (metadataMatch) return true;
  const hostTokens = evidenceTokens(pageUrl.hostname, SOURCE_NOISE);
  const matched = sourceTokens.filter((token) => hostTokens.includes(token));
  return matched.length >= (sourceTokens.length === 1 ? 1 : Math.max(2, Math.ceil(sourceTokens.length * 0.5)));
};

const supportsPublishedAt = (publishedAt: string, dates: readonly PageDateEvidence[]): boolean => {
  const timestamp = Date.parse(publishedAt);
  if (!Number.isFinite(timestamp) || !dates.length) return false;
  return dates.some((evidence) => evidence.hasTime ? Math.abs(evidence.timestamp - timestamp) <= 1_000 : sameUtcDate(evidence.timestamp, timestamp));
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const normalizeUtc = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
};
const normalizeUrl = (value: unknown, pageUrl: URL): string | undefined => {
  if (typeof value !== "string") return undefined;
  let candidate: URL;
  try { candidate = new URL(value); } catch { return undefined; }
  if (!["http:", "https:"].includes(candidate.protocol) || candidate.username || candidate.password || candidate.origin !== pageUrl.origin) return undefined;
  return candidate.href;
};

const normalizeCandidate = (
  raw: unknown,
  pageUrl: URL,
  evidence: PageEvidence,
  crawledAt: string,
  limits: ResolvedCrawlerLimits,
): NewsItem => {
  if (!isRecord(raw)) throw new CrawlerFailure("SCHEMA", "INVALID_OUTPUT");
  const expected = ["title", "content", "source", "publishedAt", "relatedCoins", "canonicalUrl"];
  if (Object.keys(raw).some((key) => !expected.includes(key)) || expected.some((key) => !(key in raw))) throw new CrawlerFailure("SCHEMA", "INVALID_OUTPUT");
  if (![raw.title, raw.content, raw.source].every((value) => typeof value === "string")) throw new CrawlerFailure("SCHEMA", "INVALID_OUTPUT");
  if (!Array.isArray(raw.relatedCoins) || raw.relatedCoins.length > 64 || raw.relatedCoins.some((coin) => typeof coin !== "string")) throw new CrawlerFailure("SCHEMA", "INVALID_OUTPUT");
  const title = normalizedText(raw.title as string);
  const content = normalizedText(raw.content as string);
  const source = normalizedText(raw.source as string);
  const publishedAt = normalizeUtc(raw.publishedAt);
  const canonicalUrl = normalizeUrl(raw.canonicalUrl, pageUrl);
  if (!title || !content || !source || title.length > limits.maxFieldLength || content.length > limits.maxFieldLength || source.length > limits.maxFieldLength || !publishedAt || !canonicalUrl) throw new CrawlerFailure("VALIDATION", "INVALID_OUTPUT");
  const coins = [...new Set((raw.relatedCoins as string[]).map((coin) => normalizedText(coin).toUpperCase()).filter(Boolean))];
  if (PROMPT_INJECTION.test(title + "\n" + content + "\n" + source)) throw new CrawlerFailure("VALIDATION", "INVALID_OUTPUT");
  if (!evidence.supportedUrls.has(canonicalUrl) || !supportsTitle(title, evidence) || !supportsContent(content, evidence.bodyText) || !supportsPublishedAt(publishedAt, evidence.dates) || !supportsSource(source, pageUrl, evidence.publisherText)) {
    throw new CrawlerFailure("VALIDATION", "INVALID_OUTPUT");
  }
  const item = validateNewsItem({
    id: createHash("sha256").update(canonicalUrl, "utf8").digest("hex").slice(0, 24),
    title,
    content,
    source,
    publishedAt,
    crawledAt,
    relatedCoins: coins,
    url: canonicalUrl,
  });
  return item;
};

const validateInterpreterOutput = (value: unknown, maxCandidates: number): value is InterpretedNewsCandidate[] => Array.isArray(value) && value.length <= maxCandidates;

export function createCrawlerNewsProvider(options: CrawlerNewsProviderOptions): NewsProvider {
  const sourceUrls = [...(options.sourceUrls ?? options.urls ?? [])];
  if (!sourceUrls.length) throw new Error("CRAWLER_SOURCE_URLS_REQUIRED");
  if (!options.interpreter || typeof options.interpreter.interpret !== "function") throw new Error("CRAWLER_INTERPRETER_REQUIRED");
  const limits = resolvedLimits(options);
  validateLimits(limits);
  const providerName = options.name ?? "CRAWLER_LLM_V1";
  const clock = options.clock ?? { now: () => new Date().toISOString() };
  const resolveHost = options.resolveHost ?? defaultResolveHost;
  const client = options.fetch ?? globalThis.fetch;
  const observability = options.observability ?? {
    recordProviderFailure: ({ providerName: failedProvider, stage, reason }: { providerName: string; stage: NewsProviderFailureStage; reason: NewsProviderFailureReason }) => {
      console.warn(`[news] provider failure: ${failedProvider} ${stage} ${reason}`);
    },
  };

  return {
    name: providerName,
    async fetch(): Promise<NewsItem[]> {
      const items: NewsItem[] = [];
      for (const sourceUrl of sourceUrls) {
        let page: FetchedNewsPage;
        try {
          await assertPublicUrl(sourceUrl, options.fetchPage ? undefined : resolveHost);
          page = options.fetchPage ? await options.fetchPage(sourceUrl, limits) : await fetchWithBounds(sourceUrl, limits, client, resolveHost);
          const finalUrl = page.finalUrl ?? page.url ?? sourceUrl;
          const safeFinalUrl = await assertPublicUrl(finalUrl, options.fetchPage ? undefined : resolveHost);
          if (typeof page.html !== "string" || byteLength(page.html) > limits.maxHtmlBytes || !contentTypeIsHtml(page.contentType)) throw new CrawlerFailure("FETCH", "ERROR");
          const cleanedHtml = truncateUtf8(preprocessCrawlerHtml(page.html, safeFinalUrl.href, limits.maxHtmlBytes), limits.maxInterpreterHtmlBytes);
          if (!visibleText(cleanedHtml)) throw new CrawlerFailure("FETCH", "ERROR");
          page = { ...page, finalUrl: safeFinalUrl.href, html: cleanedHtml };
        } catch (error) {
          const failure = error instanceof CrawlerFailure ? error : new CrawlerFailure("FETCH", failureReason(error));
          observe(observability, providerName, failure.stage, failure.reason);
          continue;
        }

        let interpreted: unknown;
        try {
          let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
          const timeout = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => reject(new CrawlerFailure("MODEL", "TIMEOUT")), limits.timeoutMs);
          });
          try {
            interpreted = await Promise.race([
              Promise.resolve().then(() => options.interpreter.interpret({ sourceUrl: page.finalUrl!, html: page.html })),
              timeout,
            ]);
          } finally {
            if (timeoutHandle) clearTimeout(timeoutHandle);
          }
        } catch (error) {
          const code = isRecord(error) && typeof error.code === "string" ? error.code : undefined;
          const failure = error instanceof CrawlerFailure
            ? error
            : code === "CRAWLER_MODEL_SCHEMA_INVALID"
              ? new CrawlerFailure("SCHEMA", "INVALID_OUTPUT")
              : new CrawlerFailure("MODEL", failureReason(error));
          observe(observability, providerName, failure.stage, failure.reason);
          continue;
        }
        if (!validateInterpreterOutput(interpreted, limits.maxCandidates)) {
          observe(observability, providerName, "SCHEMA", "INVALID_OUTPUT");
          continue;
        }
        const pageUrl = new URL(page.finalUrl!);
        const evidence = extractPageEvidence(page.html, pageUrl);
        const crawledAt = normalizeUtc(clock.now());
        if (!crawledAt) {
          observe(observability, providerName, "VALIDATION", "INVALID_OUTPUT");
          continue;
        }
        for (const candidate of interpreted) {
          try {
            items.push(normalizeCandidate(candidate, pageUrl, evidence, crawledAt, limits));
          } catch (error) {
            const failure = error instanceof CrawlerFailure ? error : new CrawlerFailure("VALIDATION", "INVALID_OUTPUT");
            observe(observability, providerName, failure.stage, failure.reason);
          }
        }
      }
      return items;
    },
  };
}
