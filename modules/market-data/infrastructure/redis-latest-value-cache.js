"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisLatestValueCache = void 0;
exports.createRedisLatestValueCache = createRedisLatestValueCache;
const ioredis_1 = __importDefault(require("ioredis"));
/** Redis is an ephemeral accelerator; callers remain responsible for PostgreSQL authority and fallback. */
class RedisLatestValueCache {
    client;
    constructor(client) {
        this.client = client;
    }
    async get(key) {
        const value = await this.client.get(key);
        if (value === null)
            return undefined;
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    async set(key, value) {
        await this.client.set(key, JSON.stringify(value), "EX", "172800");
    }
    async delete(key) {
        await this.client.del(key);
    }
    async close() {
        try {
            await this.client.quit?.();
        }
        catch {
            this.client.disconnect?.();
        }
    }
}
exports.RedisLatestValueCache = RedisLatestValueCache;
function createRedisLatestValueCache(redisUrl) {
    return new RedisLatestValueCache(new ioredis_1.default(redisUrl, {
        connectTimeout: 1_000,
        enableOfflineQueue: false,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
    }));
}
