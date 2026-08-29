import type { LatestValueCache } from "../application/ports";
export interface RedisLatestValueClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<unknown>;
    del(key: string): Promise<unknown>;
    quit?(): Promise<unknown>;
    disconnect?(): void;
}
/** Redis is an ephemeral accelerator; callers remain responsible for PostgreSQL authority and fallback. */
export declare class RedisLatestValueCache implements LatestValueCache {
    private readonly client;
    constructor(client: RedisLatestValueClient);
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
    close(): Promise<void>;
}
export declare function createRedisLatestValueCache(redisUrl: string): RedisLatestValueCache;
