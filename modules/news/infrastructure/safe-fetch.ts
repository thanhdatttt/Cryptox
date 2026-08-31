import { request as httpsRequest } from "node:https";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { SafeNewsFailureReason, SafeNewsUrlFetchPort } from "../application/ports";
import { canonicalProviderId, canonicalizeNewsUrl } from "../application/normalization";

export const SAFE_FETCH_TIMEOUT_MS = 20_000 as const;
export const SAFE_FETCH_MAX_REDIRECTS = 3 as const;
export const SAFE_FETCH_MAX_BODY_BYTES = 1_048_576 as const;

export interface SafeNewsSourceConfiguration {
  readonly id: string;
  /** Exact HTTPS URL prefixes. A prefix never matches a sibling path such as /news-archive. */
  readonly allowedUrlPrefixes?: readonly string[];
  /** Exact hosts, or a leading `*.` suffix pattern for explicitly configured subdomains. */
  readonly allowedHosts?: readonly string[];
  /** Alias accepted for configuration loaders that call prefixes an allowlist. */
  readonly allowlist?: readonly string[];
  /** Exact URLs may be used when a source has no path-prefix configuration. */
  readonly allowedUrls?: readonly string[];
}

export type SafeNewsFetchHeaders = Readonly<Record<string, string>>;

export interface SafeNewsFetchInit {
  readonly method: "GET";
  readonly headers: SafeNewsFetchHeaders;
  readonly redirect: "manual";
  readonly credentials: "omit";
  readonly signal: AbortSignal;
  /** Address returned by the safety preflight; the default transport pins it. */
  readonly resolvedAddress: string;
}

export interface SafeNewsFetchResponse {
  readonly status: number;
  readonly headers?: {
    get(name: string): string | null;
  } | Readonly<Record<string, string | undefined>>;
  readonly body?: {
    getReader(): {
      read(): Promise<{ done: boolean; value?: Uint8Array }>;
      cancel?(reason?: unknown): Promise<void> | void;
      releaseLock?(): void;
    };
  } | AsyncIterable<Uint8Array> | null;
  arrayBuffer?(): Promise<ArrayBuffer>;
  text?(): Promise<string>;
}

export type SafeNewsFetch = (
  input: string,
  init: SafeNewsFetchInit,
) => Promise<SafeNewsFetchResponse>;

export type SafeDnsResolver = (hostname: string) => Promise<readonly string[]>;

export interface SafeNewsUrlFetcherOptions {
  readonly sources: readonly SafeNewsSourceConfiguration[];
  readonly fetch?: SafeNewsFetch;
  readonly resolve?: SafeDnsResolver;
  /** Test-only tightening is allowed; production behavior is never looser than 20 seconds. */
  readonly timeoutMs?: number;
  /** Test-only tightening is allowed; production behavior is never looser than three redirects. */
  readonly maximumRedirects?: number;
  /** Test-only tightening is allowed; production behavior is never looser than one MiB. */
  readonly maximumBodyBytes?: number;
  readonly now?: () => number;
}

export class SafeNewsFetchError extends Error {
  public readonly name = "SafeNewsFetchError";

  public constructor(
    public readonly reason: SafeNewsFailureReason,
    message: string = reason,
  ) {
    super(message);
  }
}

interface NormalizedSource {
  readonly id: string;
  readonly allowedUrlPrefixes: readonly URL[];
  readonly allowedHosts: readonly string[];
  readonly allowedUrls: readonly string[];
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new SafeNewsFetchError("NOT_ALLOWLISTED", `${field} is required`);
  return value.trim();
}

function headerValue(response: SafeNewsFetchResponse, name: string): string | undefined {
  if (!response.headers) return undefined;
  if (typeof response.headers.get === "function") return response.headers.get(name)?.trim() || undefined;
  const headers = response.headers as Readonly<Record<string, string | undefined>>;
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  const value = key === undefined ? undefined : headers[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function secureUrl(value: unknown): URL {
  const raw = requiredText(value, "url");
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new SafeNewsFetchError("NOT_HTTPS", "URL is not a valid HTTPS URL");
  }
  if (parsed.protocol !== "https:") throw new SafeNewsFetchError("NOT_HTTPS", "URL must use HTTPS");
  if (parsed.username || parsed.password) {
    throw new SafeNewsFetchError("UNSAFE_DESTINATION", "URL credentials are not allowed");
  }
  try {
    return new URL(canonicalizeNewsUrl(parsed.toString()));
  } catch {
    throw new SafeNewsFetchError("UNSAFE_DESTINATION", "URL destination is invalid");
  }
}

function sourceId(value: unknown): string {
  try {
    return canonicalProviderId(requiredText(value, "sourceId"));
  } catch {
    throw new SafeNewsFetchError("NOT_ALLOWLISTED", "source is not configured");
  }
}

function normalizedPrefix(value: string): URL {
  const url = secureUrl(value);
  url.search = "";
  url.hash = "";
  return url;
}

function normalizeSource(source: SafeNewsSourceConfiguration): NormalizedSource {
  const id = sourceId(source.id);
  const prefixValues = [
    ...(source.allowedUrlPrefixes ?? []),
    ...(source.allowlist ?? []),
  ];
  const allowedUrlPrefixes = prefixValues.map(normalizedPrefix);
  const allowedUrls = (source.allowedUrls ?? []).map((value) => secureUrl(value).toString());
  const allowedHosts = (source.allowedHosts ?? []).map((value) => {
    if (typeof value !== "string" || !value.trim()) throw new SafeNewsFetchError("NOT_ALLOWLISTED", "source host is invalid");
    const host = value.trim().toLowerCase();
    if (host.startsWith("*.") && host.length > 2) return host;
    if (host.includes("/") || host.includes(":")) {
      throw new SafeNewsFetchError("NOT_ALLOWLISTED", "source host is invalid");
    }
    return host;
  });
  if (allowedUrlPrefixes.length === 0 && allowedUrls.length === 0 && allowedHosts.length === 0) {
    throw new SafeNewsFetchError("NOT_ALLOWLISTED", "source has no URL allowlist");
  }
  return { id, allowedUrlPrefixes, allowedHosts, allowedUrls };
}

function hostIsAllowlisted(url: URL, source: NormalizedSource): boolean {
  if (source.allowedUrls.includes(url.toString())) return true;
  if (source.allowedHosts.some((allowed) => allowed.startsWith("*.")
    ? url.hostname.endsWith(allowed.slice(1)) && url.hostname !== allowed.slice(2)
    : url.hostname === allowed)) return true;
  return source.allowedUrlPrefixes.some((prefix) => {
    if (prefix.origin !== url.origin) return false;
    if (url.pathname === prefix.pathname) return true;
    const prefixPath = prefix.pathname.endsWith("/") ? prefix.pathname : `${prefix.pathname}/`;
    return url.pathname.startsWith(prefixPath);
  });
}

function ipv4IsUnsafe(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;
  const [first, second] = octets;
  return first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 192 && second === 0)
    || (first === 198 && second >= 18 && second <= 19)
    || first >= 224;
}

function ipv6IsUnsafe(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/gu, "");
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || /^fe[89ab]/u.test(normalized)) return true;
  if (normalized.startsWith("2001:db8:") || normalized.startsWith("2001:10:")) return true;
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    if (isIP(mapped) === 4) return ipv4IsUnsafe(mapped);
    const hex = mapped.split(":");
    if (hex.length === 2) {
      const numbers = hex.map((part) => Number.parseInt(part, 16));
      if (numbers.every(Number.isFinite)) {
        return ipv4IsUnsafe(`${numbers[0] >> 8}.${numbers[0] & 255}.${numbers[1] >> 8}.${numbers[1] & 255}`);
      }
    }
  }
  return false;
}

function addressIsUnsafe(address: string): boolean {
  const kind = isIP(address);
  if (kind === 4) return ipv4IsUnsafe(address);
  if (kind === 6) return ipv6IsUnsafe(address);
  return true;
}

function hostnameIsUnsafe(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/gu, "").replace(/\.$/u, "");
  return lower === "localhost"
    || lower.endsWith(".localhost")
    || lower.endsWith(".local")
    || lower === "local"
    || lower === "0.0.0.0"
    || lower === "::";
}

async function defaultResolve(hostname: string): Promise<readonly string[]> {
  const addresses = await dnsLookup(hostname, { all: true, verbatim: true });
  return addresses.map(({ address }) => address);
}

async function validateDestination(
  url: URL,
  source: NormalizedSource,
  resolve: SafeDnsResolver,
  deadline: number,
  now: () => number,
): Promise<string> {
  if (!hostIsAllowlisted(url, source)) throw new SafeNewsFetchError("NOT_ALLOWLISTED", "destination is not allowlisted");
  if (hostnameIsUnsafe(url.hostname)) throw new SafeNewsFetchError("UNSAFE_DESTINATION", "destination is unsafe");
  const hostname = url.hostname.replace(/^\[|\]$/gu, "");
  const kind = isIP(hostname);
  if (kind !== 0) {
    if (addressIsUnsafe(hostname)) throw new SafeNewsFetchError("UNSAFE_DESTINATION", "destination is unsafe");
    return hostname;
  }
  let addresses: readonly string[];
  try {
    if (now() >= deadline) throw new SafeNewsFetchError("TIMEOUT", "request timed out");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new SafeNewsFetchError("TIMEOUT", "request timed out")), Math.max(1, deadline - now()));
      (timer as unknown as { unref?: () => void }).unref?.();
    });
    try {
      addresses = await Promise.race([resolve(hostname), timeout]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  } catch (error) {
    if (error instanceof SafeNewsFetchError) throw error;
    if (now() >= deadline) throw new SafeNewsFetchError("TIMEOUT", "request timed out");
    throw new SafeNewsFetchError("DNS_FAILURE", "destination could not be resolved");
  }
  if (!Array.isArray(addresses) || addresses.length === 0 || addresses.some(addressIsUnsafe)) {
    throw new SafeNewsFetchError("UNSAFE_DESTINATION", "destination is unsafe");
  }
  return addresses[0]!;
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

async function readBody(
  response: SafeNewsFetchResponse,
  maximumBytes: number,
  deadline: number,
  now: () => number,
  controller: AbortController,
): Promise<string> {
  const contentLength = headerValue(response, "content-length");
  if (contentLength !== undefined) {
    const parsed = Number(contentLength);
    if (!Number.isSafeInteger(parsed) || parsed < 0) throw new SafeNewsFetchError("INVALID_RESPONSE", "response length is invalid");
    if (parsed > maximumBytes) throw new SafeNewsFetchError("BODY_TOO_LARGE", "response body is too large");
  }

  const remaining = (): number => Math.max(1, deadline - now());
  const withDeadline = async <T>(operation: Promise<T>): Promise<T> => {
    if (now() >= deadline) throw new SafeNewsFetchError("TIMEOUT", "request timed out");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new SafeNewsFetchError("TIMEOUT", "request timed out"));
      }, remaining());
      (timer as unknown as { unref?: () => void }).unref?.();
    });
    try {
      return await Promise.race([operation, timeout]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };

  const chunks: Buffer[] = [];
  let total = 0;
  const append = (value: Uint8Array): void => {
    total += value.byteLength;
    if (total > maximumBytes) throw new SafeNewsFetchError("BODY_TOO_LARGE", "response body is too large");
    chunks.push(Buffer.from(value));
  };

  const body = response.body;
  if (body && typeof (body as { getReader?: unknown }).getReader === "function") {
    const reader = (body as { getReader(): { read(): Promise<{ done: boolean; value?: Uint8Array }>; cancel?(reason?: unknown): Promise<void> | void; releaseLock?(): void } }).getReader();
    try {
      while (true) {
        const next = await withDeadline(reader.read());
        if (next.done) break;
        if (next.value) append(next.value);
      }
    } catch (error) {
      await reader.cancel?.(error);
      throw error;
    } finally {
      reader.releaseLock?.();
    }
    return Buffer.concat(chunks).toString("utf8");
  }

  if (body && typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === "function") {
    const iterator = (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator]();
    while (true) {
      const next = await withDeadline(iterator.next());
      if (next.done) break;
      append(next.value);
    }
    return Buffer.concat(chunks).toString("utf8");
  }

  if (response.arrayBuffer) {
    const buffer = Buffer.from(await withDeadline(response.arrayBuffer()));
    if (buffer.byteLength > maximumBytes) throw new SafeNewsFetchError("BODY_TOO_LARGE", "response body is too large");
    return buffer.toString("utf8");
  }
  if (response.text) {
    const value = await withDeadline(response.text());
    if (byteLength(value) > maximumBytes) throw new SafeNewsFetchError("BODY_TOO_LARGE", "response body is too large");
    return value;
  }
  throw new SafeNewsFetchError("INVALID_RESPONSE", "response has no readable body");
}

function responseHeaders(response: { headers: Readonly<Record<string, string | string[] | undefined>> }): SafeNewsFetchResponse["headers"] {
  return Object.fromEntries(Object.entries(response.headers).map(([name, value]) => [
    name,
    Array.isArray(value) ? value.join(", ") : value,
  ]));
}

/**
 * The production transport keeps the validated hostname for TLS/SNI but pins
 * the connection lookup to the address selected by the safety preflight.
 */
function safeFetchFromPinnedHttps(): SafeNewsFetch {
  return (input, init) => new Promise((resolve, reject) => {
    let request: ReturnType<typeof httpsRequest>;
    try {
      const url = new URL(input);
      request = httpsRequest(url, {
        method: init.method,
        headers: init.headers,
        signal: init.signal,
        servername: url.hostname,
        lookup: (_hostname, _options, callback) => {
          const family = isIP(init.resolvedAddress);
          if (family !== 4 && family !== 6) {
            callback(new Error("validated address is invalid"), "", 0);
            return;
          }
          if (_options.all) {
            callback(null, [{ address: init.resolvedAddress, family }]);
            return;
          }
          callback(null, init.resolvedAddress, family);
        },
      }, (response) => {
        resolve({
          status: response.statusCode ?? 0,
          headers: responseHeaders(response),
          body: response,
        });
      });
    } catch (error) {
      reject(error);
      return;
    }
    request.once("error", reject);
    request.end();
  });
}

export class SafeNewsUrlFetcher implements SafeNewsUrlFetchPort {
  private readonly sourceMap: ReadonlyMap<string, NormalizedSource>;
  private readonly fetcher: SafeNewsFetch;
  private readonly resolve: SafeDnsResolver;
  private readonly timeoutMs: number;
  private readonly maximumRedirects: number;
  private readonly maximumBodyBytes: number;
  private readonly now: () => number;

  public constructor(options: SafeNewsUrlFetcherOptions) {
    if (!options || !Array.isArray(options.sources) || options.sources.length === 0) {
      throw new Error("at least one configured News source is required");
    }
    const normalized = options.sources.map(normalizeSource);
    if (new Set(normalized.map((source) => source.id)).size !== normalized.length) {
      throw new Error("News source ids must be distinct");
    }
    this.sourceMap = new Map(normalized.map((source) => [source.id, source]));
    // A custom transport is retained as a deterministic test seam. The
    // production default is the pinned Node HTTPS implementation above.
    this.fetcher = options.fetch ?? safeFetchFromPinnedHttps();
    this.resolve = options.resolve ?? defaultResolve;
    this.timeoutMs = boundedOption(options.timeoutMs, SAFE_FETCH_TIMEOUT_MS, "timeout");
    this.maximumRedirects = boundedOption(options.maximumRedirects, SAFE_FETCH_MAX_REDIRECTS, "redirect limit", true);
    this.maximumBodyBytes = boundedOption(options.maximumBodyBytes, SAFE_FETCH_MAX_BODY_BYTES, "body limit");
    this.now = options.now ?? Date.now;
  }

  public async fetch(input: {
    url: string;
    sourceId: string;
    timeoutMs: 20_000;
    maximumRedirects: 3;
    maximumBodyBytes: 1_048_576;
  }): Promise<{
    canonicalUrl: string;
    body: string;
    contentType: string;
    redirects: number;
  }> {
    const source = this.sourceMap.get(sourceId(input.sourceId));
    if (!source) throw new SafeNewsFetchError("NOT_ALLOWLISTED", "source is not configured");
    const timeoutMs = Math.min(this.timeoutMs, input.timeoutMs, SAFE_FETCH_TIMEOUT_MS);
    const maximumRedirects = Math.min(this.maximumRedirects, input.maximumRedirects, SAFE_FETCH_MAX_REDIRECTS);
    const maximumBodyBytes = Math.min(this.maximumBodyBytes, input.maximumBodyBytes, SAFE_FETCH_MAX_BODY_BYTES);
    if (!Number.isSafeInteger(timeoutMs) || !Number.isSafeInteger(maximumRedirects) || !Number.isSafeInteger(maximumBodyBytes)
      || timeoutMs < 1 || maximumRedirects < 0 || maximumBodyBytes < 1) {
      throw new SafeNewsFetchError("INVALID_RESPONSE", "safe-fetch limits are invalid");
    }

    let current = secureUrl(input.url);
    let redirects = 0;
    const startedAt = this.now();
    const deadline = startedAt + timeoutMs;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new SafeNewsFetchError("TIMEOUT", "request timed out"));
      }, Math.max(1, timeoutMs));
      (timer as unknown as { unref?: () => void }).unref?.();
    });
    try {
      while (true) {
        const resolvedAddress = await Promise.race([
          validateDestination(current, source, this.resolve, deadline, this.now),
          timeout,
        ]);
        if (this.now() >= deadline) throw new SafeNewsFetchError("TIMEOUT", "request timed out");
        let response: SafeNewsFetchResponse;
        try {
          response = await Promise.race([
            Promise.resolve().then(() => this.fetcher(current.toString(), {
              method: "GET",
              headers: {
                Accept: "text/html,application/xhtml+xml,application/rss+xml,application/xml;q=0.9,text/xml;q=0.8",
              },
              redirect: "manual",
              credentials: "omit",
              signal: controller.signal,
              resolvedAddress,
            })),
            timeout,
          ]);
        } catch (error) {
          if (error instanceof SafeNewsFetchError) throw error;
          if (controller.signal.aborted) throw new SafeNewsFetchError("TIMEOUT", "request timed out");
          throw new SafeNewsFetchError("HTTP_ERROR", "safe News request failed");
        }
        if (!response || !Number.isInteger(response.status) || response.status < 100 || response.status > 599) {
          throw new SafeNewsFetchError("INVALID_RESPONSE", "response status is invalid");
        }
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          if (redirects >= maximumRedirects) throw new SafeNewsFetchError("REDIRECT_LIMIT", "redirect limit exceeded");
          const location = headerValue(response, "location");
          if (!location) throw new SafeNewsFetchError("INVALID_RESPONSE", "redirect location is missing");
          try {
            current = secureUrl(new URL(location, current).toString());
          } catch (error) {
            if (error instanceof SafeNewsFetchError) throw error;
            throw new SafeNewsFetchError("UNSAFE_DESTINATION", "redirect destination is invalid");
          }
          redirects += 1;
          continue;
        }
        if (response.status < 200 || response.status >= 300) {
          throw new SafeNewsFetchError("HTTP_ERROR", "safe News request returned an unsuccessful status");
        }
        const body = await Promise.race([
          readBody(response, maximumBodyBytes, deadline, this.now, controller),
          timeout,
        ]);
        return {
          canonicalUrl: current.toString(),
          body,
          contentType: headerValue(response, "content-type") ?? "application/octet-stream",
          redirects,
        };
      }
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      controller.abort();
    }
  }
}

function boundedOption(value: number | undefined, maximum: number, field: string, allowZero = false): number {
  const selected = value ?? maximum;
  if (!Number.isSafeInteger(selected) || selected < (allowZero ? 0 : 1) || selected > maximum) {
    throw new Error(`safe News ${field} must be a bounded integer`);
  }
  return selected;
}

export function createSafeNewsUrlFetcher(options: SafeNewsUrlFetcherOptions): SafeNewsUrlFetcher {
  return new SafeNewsUrlFetcher(options);
}
