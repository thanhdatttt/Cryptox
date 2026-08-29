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
  if (!contentType) return true;
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
        const response = await client(current.href, { redirect: "manual", signal: controller.signal });
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
const candidateTokens = (value: string): string[] => [...new Set((value.toLocaleLowerCase().match(SIGNIFICANT_TOKEN) ?? []))];

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
  pageText: string,
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
  if (candidateTokens(`${title} ${content}`).every((token) => !pageText.toLocaleLowerCase().includes(token))) throw new CrawlerFailure("VALIDATION", "INVALID_OUTPUT");
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
          const failure = error instanceof CrawlerFailure ? error : new CrawlerFailure("MODEL", failureReason(error));
          observe(observability, providerName, failure.stage, failure.reason);
          continue;
        }
        if (!validateInterpreterOutput(interpreted, limits.maxCandidates)) {
          observe(observability, providerName, "SCHEMA", "INVALID_OUTPUT");
          continue;
        }
        const pageUrl = new URL(page.finalUrl!);
        const pageText = visibleText(page.html);
        const crawledAt = normalizeUtc(clock.now());
        if (!crawledAt) {
          observe(observability, providerName, "VALIDATION", "INVALID_OUTPUT");
          continue;
        }
        for (const candidate of interpreted) {
          try {
            items.push(normalizeCandidate(candidate, pageUrl, pageText, crawledAt, limits));
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
