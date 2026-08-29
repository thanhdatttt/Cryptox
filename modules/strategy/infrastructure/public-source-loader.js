"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPublicStrategySourceLoader = createPublicStrategySourceLoader;
const promises_1 = require("node:dns/promises");
const node_net_1 = require("node:net");
const numberFromEnv = (name, fallback) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
};
const boundedOption = (value, fallback, integer = false, allowZero = false) => {
    if (value === undefined || !Number.isFinite(value) || value < 0 || (!allowZero && value === 0) || (integer && !Number.isInteger(value)))
        return fallback;
    return value;
};
const blockedHostname = (hostname) => {
    const normalized = hostname.toLowerCase().replace(/\.$/, "");
    return normalized === "localhost" || normalized.endsWith(".localhost") || normalized.endsWith(".local") || normalized === "metadata.google.internal";
};
const blockedIpv4 = (value) => {
    const parts = value.split(".").map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255))
        return true;
    const [a, b, c] = parts;
    return a === 0 || a === 10 || a === 127 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && (b === 0 || b === 168)) ||
        (a === 198 && (b >= 18 && b <= 19 || b === 51 && c === 100)) ||
        (a === 203 && b === 0 && c === 113) ||
        a >= 224;
};
const blockedIpv6 = (value) => {
    const normalized = value.toLowerCase();
    if (normalized === "::" || normalized === "::1" || /^fe[89ab]/.test(normalized) || /^(fc|fd)/.test(normalized) || normalized.startsWith("ff"))
        return true;
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? blockedIpv4(mapped[1]) : false;
};
const blockedAddress = (value) => {
    const normalized = value.replace(/^\[|\]$/g, "");
    const kind = (0, node_net_1.isIP)(normalized);
    return kind === 4 ? blockedIpv4(normalized) : kind === 6 ? blockedIpv6(normalized) : true;
};
const withTimeout = async (work, timeoutMs, errorCode) => {
    let timer;
    try {
        return await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(errorCode)), timeoutMs); })]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
};
const assertPublicUrl = async (value, resolve, timeoutMs) => {
    let url;
    try {
        url = new URL(value);
    }
    catch {
        throw new Error("STRATEGY_SOURCE_INVALID_URL");
    }
    if (!(["http:", "https:"].includes(url.protocol)) || url.username || url.password || !url.hostname)
        throw new Error("STRATEGY_SOURCE_UNSAFE");
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    if (blockedHostname(hostname))
        throw new Error("STRATEGY_SOURCE_UNSAFE");
    const kind = (0, node_net_1.isIP)(hostname);
    if (kind !== 0 && blockedAddress(hostname))
        throw new Error("STRATEGY_SOURCE_UNSAFE");
    if (kind === 0) {
        let addresses;
        const resolver = resolve ?? (async (name, options) => await (0, promises_1.lookup)(name, options));
        try {
            addresses = await withTimeout(resolver(hostname, { all: true, verbatim: true }), timeoutMs, "STRATEGY_SOURCE_TIMEOUT");
        }
        catch (error) {
            if (error instanceof Error && error.message === "STRATEGY_SOURCE_TIMEOUT")
                throw error;
            throw new Error("STRATEGY_SOURCE_UNAVAILABLE");
        }
        if (!addresses.length || addresses.some(({ address }) => blockedAddress(address)))
            throw new Error("STRATEGY_SOURCE_UNSAFE");
    }
    return url;
};
const readBoundedBody = async (response, maxBytes) => {
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > maxBytes)
        throw new Error("STRATEGY_SOURCE_TOO_LARGE");
    if (!response.body) {
        const value = await response.text();
        if (Buffer.byteLength(value, "utf8") > maxBytes)
            throw new Error("STRATEGY_SOURCE_TOO_LARGE");
        return value;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    try {
        for (;;) {
            const next = await reader.read();
            if (next.done)
                break;
            total += next.value.byteLength;
            if (total > maxBytes) {
                try {
                    await reader.cancel();
                }
                catch { /* preserve the size failure */ }
                throw new Error("STRATEGY_SOURCE_TOO_LARGE");
            }
            chunks.push(next.value);
        }
    }
    finally {
        await reader.releaseLock();
    }
    return new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
};
const decodeEntities = (value) => value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
const readableText = (body, contentType, maxCharacters) => {
    const text = contentType.includes("html")
        ? body
            .replace(/<!--[\s\S]*?-->/g, " ")
            .replace(/<(script|style|noscript|template|svg|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, " ")
            .replace(/<(br|\/p|\/div|\/article|\/section|\/h[1-6]|\/li|\/blockquote|\/header|\/footer)[^>]*>/gi, "\n")
            .replace(/<[^>]+>/g, " ")
        : body;
    return decodeEntities(text).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").replace(/[ \t\r\f]+/g, " ").replace(/\n\s+/g, "\n").trim().slice(0, maxCharacters);
};
function createPublicStrategySourceLoader(options = {}) {
    const request = options.fetch ?? globalThis.fetch;
    const timeoutMs = boundedOption(options.timeoutMs ?? numberFromEnv("STRATEGY_URL_TIMEOUT_MS", 5_000), 5_000);
    const maxRedirects = boundedOption(options.maxRedirects ?? numberFromEnv("STRATEGY_URL_MAX_REDIRECTS", 3), 3, true, true);
    const maxResponseBytes = boundedOption(options.maxResponseBytes ?? numberFromEnv("STRATEGY_URL_MAX_RESPONSE_BYTES", 1_000_000), 1_000_000, true);
    const maxExtractedTextCharacters = boundedOption(options.maxExtractedTextCharacters ?? numberFromEnv("STRATEGY_URL_MAX_TEXT_CHARACTERS", 100_000), 100_000, true);
    return {
        async load(inputUrl) {
            let current = await assertPublicUrl(inputUrl, options.lookup, timeoutMs);
            for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), timeoutMs);
                try {
                    const response = await request(current, { redirect: "manual", signal: controller.signal });
                    if (response.status >= 300 && response.status < 400) {
                        const location = response.headers.get("location");
                        if (!location || redirect === maxRedirects)
                            throw new Error("STRATEGY_SOURCE_REDIRECT_LIMIT");
                        current = await assertPublicUrl(new URL(location, current).toString(), options.lookup, timeoutMs);
                        continue;
                    }
                    if (!response.ok)
                        throw new Error("STRATEGY_SOURCE_UNAVAILABLE");
                    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
                    if (!(contentType.includes("text/html") || contentType.includes("application/xhtml+xml") || contentType.includes("text/plain")))
                        throw new Error("STRATEGY_SOURCE_UNSUPPORTED_CONTENT");
                    const body = await withTimeout(readBoundedBody(response, maxResponseBytes), timeoutMs, "STRATEGY_SOURCE_TIMEOUT");
                    const sourceText = readableText(body, contentType, maxExtractedTextCharacters);
                    if (sourceText.length < 20)
                        throw new Error("STRATEGY_SOURCE_UNUSABLE");
                    return { sourceText, canonicalUrl: current.toString() };
                }
                catch (error) {
                    if (controller.signal.aborted)
                        throw new Error("STRATEGY_SOURCE_TIMEOUT");
                    if (error instanceof Error && error.message.startsWith("STRATEGY_SOURCE_"))
                        throw error;
                    throw new Error("STRATEGY_SOURCE_UNAVAILABLE");
                }
                finally {
                    clearTimeout(timer);
                }
            }
            throw new Error("STRATEGY_SOURCE_REDIRECT_LIMIT");
        },
    };
}
