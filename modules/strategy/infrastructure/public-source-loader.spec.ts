import { describe, expect, it } from "vitest";
import { createPublicStrategySourceLoader } from "./public-source-loader";

describe("public strategy source loader", () => {
  it("fetches one public HTML page and returns bounded readable text", async () => {
    let requested = "";
    const loader = createPublicStrategySourceLoader({
      lookup: async () => [{ address: "93.184.216.34" }],
      fetch: async (input) => {
        requested = String(input);
        return new Response("<html><head><style>ignore</style></head><body><h1>Moving Average strategy</h1><script>ignore()</script><p>Use the fast and slow averages for trend confirmation.</p></body></html>", { status: 200, headers: { "content-type": "text/html" } });
      },
    });

    const result = await loader.load("https://example.com/article");

    expect(requested).toBe("https://example.com/article");
    expect(result.canonicalUrl).toBe("https://example.com/article");
    expect(result.sourceText).toContain("Moving Average strategy");
    expect(result.sourceText).toContain("trend confirmation");
    expect(result.sourceText).not.toContain("ignore");
  });

  it("revalidates redirects and blocks private destinations", async () => {
    const loader = createPublicStrategySourceLoader({ lookup: async () => [{ address: "93.184.216.34" }], fetch: async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } }) });
    await expect(loader.load("https://example.com/article")).rejects.toThrow("STRATEGY_SOURCE_UNSAFE");
    await expect(loader.load("http://169.254.169.254/metadata")).rejects.toThrow("STRATEGY_SOURCE_UNSAFE");
    await expect(loader.load("http://[::1]/metadata")).rejects.toThrow("STRATEGY_SOURCE_UNSAFE");
    const dnsPrivate = createPublicStrategySourceLoader({ lookup: async () => [{ address: "10.0.0.4" }], fetch: async () => { throw new Error("must not fetch"); } });
    await expect(dnsPrivate.load("https://example.com/article")).rejects.toThrow("STRATEGY_SOURCE_UNSAFE");
  });

  it("rejects unsupported content and oversized responses", async () => {
    const unsupported = createPublicStrategySourceLoader({ lookup: async () => [{ address: "93.184.216.34" }], fetch: async () => new Response("data", { status: 200, headers: { "content-type": "application/pdf" } }) });
    await expect(unsupported.load("https://example.com/article")).rejects.toThrow("STRATEGY_SOURCE_UNSUPPORTED_CONTENT");

    const oversized = createPublicStrategySourceLoader({ maxResponseBytes: 10, lookup: async () => [{ address: "93.184.216.34" }], fetch: async () => new Response("this response is too large", { status: 200, headers: { "content-type": "text/plain" } }) });
    await expect(oversized.load("https://example.com/article")).rejects.toThrow("STRATEGY_SOURCE_TOO_LARGE");
  });

  it("bounds redirects, DNS resolution, and streamed reads", async () => {
    const redirect = createPublicStrategySourceLoader({ maxRedirects: 1, lookup: async () => [{ address: "93.184.216.34" }], fetch: async (input) => new Response(null, { status: 302, headers: { location: `${String(input)}/next` } }) });
    await expect(redirect.load("https://example.com/article")).rejects.toThrow("STRATEGY_SOURCE_REDIRECT_LIMIT");

    const dnsTimeout = createPublicStrategySourceLoader({ timeoutMs: 5, lookup: () => new Promise(() => undefined), fetch: async () => { throw new Error("must not fetch"); } });
    await expect(dnsTimeout.load("https://example.com/article")).rejects.toThrow("STRATEGY_SOURCE_TIMEOUT");

    const streamedTimeout = createPublicStrategySourceLoader({ timeoutMs: 5, lookup: async () => [{ address: "93.184.216.34" }], fetch: async (_input, init) => {
      const signal = init?.signal as AbortSignal;
      const body = new ReadableStream<Uint8Array>({ start(controller) { signal.addEventListener("abort", () => controller.error(new Error("aborted")), { once: true }); } });
      return new Response(body, { status: 200, headers: { "content-type": "text/plain" } });
    } });
    await expect(streamedTimeout.load("https://example.com/article")).rejects.toThrow("STRATEGY_SOURCE_TIMEOUT");
  });
});
