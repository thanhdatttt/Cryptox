"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateNewsItem = void 0;
const errors_1 = require("./errors");
const canonicalTimestamp = (value) => {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) && value.endsWith("Z") && new Date(parsed).toISOString() === value;
};
const requiredText = (value) => typeof value === "string" && value.trim().length > 0;
const validateNewsItem = (item) => {
    if (!item || ![item.id, item.title, item.content, item.source, item.url].every(requiredText)) {
        throw new errors_1.NewsException("INVALID_NEWS_ITEM", "News item must contain its normalized identity, content, and provenance.");
    }
    try {
        const url = new URL(item.url);
        if (!["http:", "https:"].includes(url.protocol))
            throw new Error("Unsupported protocol");
    }
    catch {
        throw new errors_1.NewsException("INVALID_NEWS_ITEM", "News item URL must be an absolute HTTP(S) URL.");
    }
    if (!canonicalTimestamp(item.publishedAt) || !canonicalTimestamp(item.crawledAt) || !Array.isArray(item.relatedCoins) || item.relatedCoins.some((coin) => !requiredText(coin))) {
        throw new errors_1.NewsException("INVALID_NEWS_ITEM", "News item timestamps and related coins must be normalized.");
    }
    return { ...item, relatedCoins: [...item.relatedCoins] };
};
exports.validateNewsItem = validateNewsItem;
