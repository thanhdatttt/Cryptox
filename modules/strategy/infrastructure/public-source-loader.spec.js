"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const public_source_loader_1 = require("./public-source-loader");
(0, vitest_1.describe)("public strategy source loader", () => {
    (0, vitest_1.it)("fetches one public HTML page and returns bounded readable text", async () => {
        let requested = "";
        const loader = (0, public_source_loader_1.createPublicStrategySourceLoader)({
            lookup: async () => [{ address: "93.184.216.34" }],
            fetch: async (input) => {
                requested = String(input);
                return new Response("<html><head><style>ignore</style></head><body><h1>Moving Average strategy</h1><script>ignore()</script><p>Use the fast and slow averages for trend confirmation.</p></body></html>", { status: 200, headers: { "content-type": "text/html" } });
            },
        });
        const result = await loader.load("https://example.com/article");
        (0, vitest_1.expect)(requested).toBe("https://example.com/article");
        (0, vitest_1.expect)(result.canonicalUrl).toBe("https://example.com/article");
        (0, vitest_1.expect)(result.sourceText).toContain("Moving Average strategy");
        (0, vitest_1.expect)(result.sourceText).toContain("trend confirmation");
        (0, vitest_1.expect)(result.sourceText).not.toContain("ignore");
    });
    (0, vitest_1.it)("revalidates redirects and blocks private destinations", async () => {
        const loader = (0, public_source_loader_1.createPublicStrategySourceLoader)({ lookup: async () => [{ address: "93.184.216.34" }], fetch: async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } }) });
        await (0, vitest_1.expect)(loader.load("https://example.com/article")).rejects.toThrow("STRATEGY_SOURCE_UNSAFE");
        await (0, vitest_1.expect)(loader.load("http://169.254.169.254/metadata")).rejects.toThrow("STRATEGY_SOURCE_UNSAFE");
        await (0, vitest_1.expect)(loader.load("http://[::1]/metadata")).rejects.toThrow("STRATEGY_SOURCE_UNSAFE");
        const dnsPrivate = (0, public_source_loader_1.createPublicStrategySourceLoader)({ lookup: async () => [{ address: "10.0.0.4" }], fetch: async () => { throw new Error("must not fetch"); } });
        await (0, vitest_1.expect)(dnsPrivate.load("https://example.com/article")).rejects.toThrow("STRATEGY_SOURCE_UNSAFE");
    });
    (0, vitest_1.it)("rejects unsupported content and oversized responses", async () => {
        const unsupported = (0, public_source_loader_1.createPublicStrategySourceLoader)({ lookup: async () => [{ address: "93.184.216.34" }], fetch: async () => new Response("data", { status: 200, headers: { "content-type": "application/pdf" } }) });
        await (0, vitest_1.expect)(unsupported.load("https://example.com/article")).rejects.toThrow("STRATEGY_SOURCE_UNSUPPORTED_CONTENT");
        const oversized = (0, public_source_loader_1.createPublicStrategySourceLoader)({ maxResponseBytes: 10, lookup: async () => [{ address: "93.184.216.34" }], fetch: async () => new Response("this response is too large", { status: 200, headers: { "content-type": "text/plain" } }) });
        await (0, vitest_1.expect)(oversized.load("https://example.com/article")).rejects.toThrow("STRATEGY_SOURCE_TOO_LARGE");
    });
    (0, vitest_1.it)("bounds redirects, DNS resolution, and streamed reads", async () => {
        const redirect = (0, public_source_loader_1.createPublicStrategySourceLoader)({ maxRedirects: 1, lookup: async () => [{ address: "93.184.216.34" }], fetch: async (input) => new Response(null, { status: 302, headers: { location: `${String(input)}/next` } }) });
        await (0, vitest_1.expect)(redirect.load("https://example.com/article")).rejects.toThrow("STRATEGY_SOURCE_REDIRECT_LIMIT");
        const dnsTimeout = (0, public_source_loader_1.createPublicStrategySourceLoader)({ timeoutMs: 5, lookup: () => new Promise(() => undefined), fetch: async () => { throw new Error("must not fetch"); } });
        await (0, vitest_1.expect)(dnsTimeout.load("https://example.com/article")).rejects.toThrow("STRATEGY_SOURCE_TIMEOUT");
        const streamedTimeout = (0, public_source_loader_1.createPublicStrategySourceLoader)({ timeoutMs: 5, lookup: async () => [{ address: "93.184.216.34" }], fetch: async (_input, init) => {
                const signal = init?.signal;
                const body = new ReadableStream({ start(controller) { signal.addEventListener("abort", () => controller.error(new Error("aborted")), { once: true }); } });
                return new Response(body, { status: 200, headers: { "content-type": "text/plain" } });
            } });
        await (0, vitest_1.expect)(streamedTimeout.load("https://example.com/article")).rejects.toThrow("STRATEGY_SOURCE_TIMEOUT");
    });
});
