import type { LookupAddress, LookupOptions } from "node:dns";
import { describe, expect, it, vi } from "vitest";

const mockedHttpsRequest = vi.hoisted(() => vi.fn());
vi.mock("node:https", () => ({ request: mockedHttpsRequest }));

import {
  SafeNewsFetchError,
  createSafeNewsUrlFetcher,
  type SafeNewsFetch,
} from "./safe-fetch";

type LookupCallback = (error: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;
type PinnedLookup = (hostname: string, options: LookupOptions, callback: LookupCallback) => void;
type PinnedRequestOptions = {
  readonly method?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
  readonly servername?: string;
  readonly lookup?: PinnedLookup;
};

function response(status: number, headers: Record<string, string>, body = "ok") {
  return {
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  };
}

function makeFetcher(fetcher: SafeNewsFetch, options: Partial<Parameters<typeof createSafeNewsUrlFetcher>[0]> = {}) {
  return createSafeNewsUrlFetcher({
    sources: [{ id: "configured-source", allowedUrlPrefixes: ["https://news.example.test/"] }],
    resolve: async () => ["93.184.216.34"],
    fetch: fetcher,
    ...options,
  });
}

describe("safe News URL fetch [CSL-R-NW-02, ADR-009]", () => {
  it("uses the Node multi-address lookup shape while pinning the validated address and TLS server name", async () => {
    const lookupResults: Array<{
      readonly mode: "all" | "single";
      readonly error: NodeJS.ErrnoException | null;
      readonly address: string | LookupAddress[];
      readonly family?: number;
    }> = [];
    const request = {
      once: vi.fn().mockReturnThis(),
      end: vi.fn(),
    };
    let requestOptions: PinnedRequestOptions | undefined;
    let responseCallback: ((response: {
      readonly statusCode: number;
      readonly headers: Readonly<Record<string, string>>;
      readonly [Symbol.asyncIterator]: () => AsyncIterator<Uint8Array>;
    }) => void) | undefined;

    mockedHttpsRequest.mockImplementation((_input: URL, options: PinnedRequestOptions, callback: typeof responseCallback) => {
      requestOptions = options;
      responseCallback = callback;
      request.end.mockImplementation(() => {
        const lookup = requestOptions?.lookup;
        if (!lookup || !responseCallback) throw new Error("mocked HTTPS request was not configured");
        lookup("news.example.test", { all: true }, (error, address, family) => {
          lookupResults.push({ mode: "all", error, address, family });
        });
        lookup("news.example.test", { all: false }, (error, address, family) => {
          lookupResults.push({ mode: "single", error, address, family });
        });
        responseCallback({
          statusCode: 200,
          headers: { "content-type": "application/rss+xml" },
          async *[Symbol.asyncIterator]() {
            yield new TextEncoder().encode("<rss><channel /></rss>");
          },
        });
      });
      return request;
    });

    const fetcher = createSafeNewsUrlFetcher({
      sources: [{ id: "configured-source", allowedHosts: ["news.example.test"] }],
      resolve: async () => ["93.184.216.34"],
    });

    await expect(fetcher.fetch({
      url: "https://news.example.test/article",
      sourceId: "configured-source",
      timeoutMs: 20_000,
      maximumRedirects: 3,
      maximumBodyBytes: 1_048_576,
    })).resolves.toMatchObject({
      canonicalUrl: "https://news.example.test/article",
      body: "<rss><channel /></rss>",
      contentType: "application/rss+xml",
    });
    expect(mockedHttpsRequest).toHaveBeenCalledTimes(1);
    expect(requestOptions).toMatchObject({
      method: "GET",
      servername: "news.example.test",
    });
    expect(lookupResults).toEqual([
      {
        mode: "all",
        error: null,
        address: [{ address: "93.184.216.34", family: 4 }],
        family: undefined,
      },
      {
        mode: "single",
        error: null,
        address: "93.184.216.34",
        family: 4,
      },
    ]);
    expect(request.end).toHaveBeenCalledTimes(1);
  });

  it("requires an allowlisted HTTPS destination before contacting a provider", async () => {
    let calls = 0;
    const fetcher = makeFetcher(async () => {
      calls += 1;
      return response(200, {}, "must not be contacted");
    });

    await expect(fetcher.fetch({
      url: "http://news.example.test/article",
      sourceId: "configured-source",
      timeoutMs: 20_000,
      maximumRedirects: 3,
      maximumBodyBytes: 1_048_576,
    })).rejects.toMatchObject({ reason: "NOT_HTTPS" });
    await expect(fetcher.fetch({
      url: "https://unlisted.example.test/article",
      sourceId: "configured-source",
      timeoutMs: 20_000,
      maximumRedirects: 3,
      maximumBodyBytes: 1_048_576,
    })).rejects.toMatchObject({ reason: "NOT_ALLOWLISTED" });
    expect(calls).toBe(0);
  });

  it("rejects localhost, private, link-local, and DNS-rebinding destinations without a request", async () => {
    let calls = 0;
    const fetcher = createSafeNewsUrlFetcher({
      sources: [{
        id: "configured-source",
        allowedHosts: ["localhost", "127.0.0.1", "private.example.test", "rebind.example.test"],
      }],
      resolve: async (hostname) => hostname === "private.example.test"
        ? ["10.0.0.7"]
        : hostname === "rebind.example.test"
          ? ["169.254.10.10"]
          : ["93.184.216.34"],
      fetch: async () => {
        calls += 1;
        return response(200, {}, "must not be contacted");
      },
    });

    for (const url of [
      "https://localhost/article",
      "https://127.0.0.1/article",
      "https://private.example.test/article",
      "https://rebind.example.test/article",
    ]) {
      await expect(fetcher.fetch({
        url,
        sourceId: "configured-source",
        timeoutMs: 20_000,
        maximumRedirects: 3,
        maximumBodyBytes: 1_048_576,
      })).rejects.toMatchObject({ reason: "UNSAFE_DESTINATION" });
    }
    expect(calls).toBe(0);
  });

  it("revalidates every redirect, caps redirects at three, and omits credentials/cookies", async () => {
    const calls: Array<{ url: string; init: Record<string, unknown> }> = [];
    const addresses: Record<string, readonly string[]> = {
      "news.example.test": ["93.184.216.34"],
      "redirect.example.test": ["93.184.216.35"],
      "private.example.test": ["192.168.1.12"],
    };
    let redirect = true;
    const fetcher = createSafeNewsUrlFetcher({
      sources: [{ id: "configured-source", allowedHosts: ["news.example.test", "redirect.example.test", "private.example.test"] }],
      resolve: async (hostname) => addresses[hostname] ?? [],
      fetch: async (url, init) => {
        calls.push({ url, init: init as unknown as Record<string, unknown> });
        if (redirect) {
          redirect = false;
          return response(302, { location: "https://redirect.example.test/final" });
        }
        return response(200, { "content-type": "text/html" }, "safe content");
      },
    });

    await expect(fetcher.fetch({
      url: "https://news.example.test/start",
      sourceId: "configured-source",
      timeoutMs: 20_000,
      maximumRedirects: 3,
      maximumBodyBytes: 1_048_576,
    })).resolves.toMatchObject({ canonicalUrl: "https://redirect.example.test/final", redirects: 1, body: "safe content" });
    expect(calls).toHaveLength(2);
    expect(calls[0]?.init).toMatchObject({ method: "GET", redirect: "manual", credentials: "omit" });
    expect(calls[0]?.init).toMatchObject({ resolvedAddress: "93.184.216.34" });
    expect(calls[0]?.init).not.toHaveProperty("headers.Cookie");
    expect(calls[0]?.init).not.toHaveProperty("headers.Authorization");

    const unsafeRedirect = createSafeNewsUrlFetcher({
      sources: [{ id: "configured-source", allowedHosts: ["news.example.test", "private.example.test"] }],
      resolve: async (hostname) => hostname === "private.example.test" ? ["10.0.0.5"] : ["93.184.216.34"],
      fetch: async () => response(302, { location: "https://private.example.test/final" }),
    });
    await expect(unsafeRedirect.fetch({
      url: "https://news.example.test/start",
      sourceId: "configured-source",
      timeoutMs: 20_000,
      maximumRedirects: 3,
      maximumBodyBytes: 1_048_576,
    })).rejects.toMatchObject({ reason: "UNSAFE_DESTINATION" });
  });

  it("stops after the configured total timeout and rejects oversized bodies", async () => {
    let aborted = false;
    const timeoutFetcher = makeFetcher(async (_url, init) => {
      init.signal.addEventListener("abort", () => { aborted = true; });
      return new Promise<never>(() => undefined);
    }, { timeoutMs: 5 });
    await expect(timeoutFetcher.fetch({
      url: "https://news.example.test/slow",
      sourceId: "configured-source",
      timeoutMs: 20_000,
      maximumRedirects: 3,
      maximumBodyBytes: 1_048_576,
    })).rejects.toMatchObject({ reason: "TIMEOUT" });
    expect(aborted).toBe(true);

    const oversized = makeFetcher(async () => response(200, { "content-length": "1048577" }, "too large"));
    await expect(oversized.fetch({
      url: "https://news.example.test/large",
      sourceId: "configured-source",
      timeoutMs: 20_000,
      maximumRedirects: 3,
      maximumBodyBytes: 1_048_576,
    })).rejects.toMatchObject({ reason: "BODY_TOO_LARGE" });
  });

  it("rejects a fourth redirect even when each earlier hop is public", async () => {
    let calls = 0;
    const fetcher = makeFetcher(async () => {
      calls += 1;
      return response(302, { location: `https://news.example.test/hop-${calls + 1}` });
    });
    await expect(fetcher.fetch({
      url: "https://news.example.test/hop-1",
      sourceId: "configured-source",
      timeoutMs: 20_000,
      maximumRedirects: 3,
      maximumBodyBytes: 1_048_576,
    })).rejects.toMatchObject({ reason: "REDIRECT_LIMIT" });
    expect(calls).toBe(4);
  });

  it("exposes a typed safety error without echoing a supplied URL", () => {
    const error = new SafeNewsFetchError("NOT_ALLOWLISTED", "destination is not configured");
    expect(error.reason).toBe("NOT_ALLOWLISTED");
    expect(error.message).not.toContain("https://");
  });
});
