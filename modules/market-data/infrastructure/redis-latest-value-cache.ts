import Redis from "ioredis";
import type { LatestValueCache } from "../application/ports";

export interface RedisLatestValueClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
  quit?(): Promise<unknown>;
  disconnect?(): void;
}

/** Redis is an ephemeral accelerator; callers remain responsible for PostgreSQL authority and fallback. */
export class RedisLatestValueCache implements LatestValueCache {
  constructor(private readonly client: RedisLatestValueClient) {}

  async get(key: string): Promise<unknown> {
    const value = await this.client.get(key);
    if (value === null) return undefined;
    try { return JSON.parse(value) as unknown; } catch { return value; }
  }

  async set(key: string, value: unknown): Promise<void> {
    await (this.client.set as unknown as (key: string, value: string, ...arguments_: string[]) => Promise<unknown>)(key, JSON.stringify(value), "EX", "172800");
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async close(): Promise<void> {
    try { await this.client.quit?.(); } catch { this.client.disconnect?.(); }
  }
}

export function createRedisLatestValueCache(redisUrl: string): RedisLatestValueCache {
  return new RedisLatestValueCache(new Redis(redisUrl, {
    connectTimeout: 1_000,
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  }));
}
