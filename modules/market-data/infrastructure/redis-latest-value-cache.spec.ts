import { describe, expect, it, vi } from "vitest";
import { RedisLatestValueCache } from "./redis-latest-value-cache";
import type { RedisLatestValueClient } from "./redis-latest-value-cache";

describe("Redis latest-value cache", () => {
  it("serializes ephemeral values and preserves cache misses", async () => {
    let stored: string | undefined;
    const client: RedisLatestValueClient = {
      get: vi.fn(async () => stored ?? null),
      set: vi.fn(async (_key, value) => { stored = value; }),
      del: vi.fn(async () => undefined),
    };
    const cache = new RedisLatestValueCache(client);

    await cache.set("candles:latest:BTCUSDT:1h", { schemaVersion: 1, candles: [] });
    expect(client.set).toHaveBeenCalledWith("candles:latest:BTCUSDT:1h", '{"schemaVersion":1,"candles":[]}', "EX", "172800");
    await expect(cache.get("candles:latest:BTCUSDT:1h")).resolves.toEqual({ schemaVersion: 1, candles: [] });
    stored = undefined;
    await expect(cache.get("candles:latest:BTCUSDT:1h")).resolves.toBeUndefined();
  });

  it("closes the client without making shutdown depend on Redis", async () => {
    const client: RedisLatestValueClient = { get: async () => null, set: async () => undefined, del: async () => undefined, quit: vi.fn(async () => undefined) };
    await new RedisLatestValueCache(client).close();
    expect(client.quit).toHaveBeenCalledOnce();
  });
});
