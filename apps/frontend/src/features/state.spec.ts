import { describe, expect, it } from "vitest";
import { InMemoryPrivateCache } from "../auth/cache";
import { FixtureFeatureClient } from "./fixture-client";
import { FEATURE_PRIVATE_CACHE_KEY } from "./types";
import { FeatureWorkspaceStore } from "./state";

describe("FeatureWorkspaceStore", () => {
  it("loads descriptor-driven private data and keeps the cache isolated after an owner change", async () => {
    const cache = new InMemoryPrivateCache();
    const storeA = new FeatureWorkspaceStore(new FixtureFeatureClient({ ownerUserId: "user-a" }), cache);

    await storeA.load();

    expect(storeA.snapshot()).toMatchObject({ status: "ready", newsStatus: "ready" });
    expect(storeA.snapshot().descriptors.map((descriptor) => descriptor.name)).toEqual([
      "MA",
      "RSI",
      "BOLLINGER_BANDS",
      "SUPPORT_RESISTANCE",
    ]);
    expect(storeA.snapshot().strategyDefinitions.every((definition) => definition.ownerUserId === "user-a")).toBe(true);
    expect(cache.has(FEATURE_PRIVATE_CACHE_KEY)).toBe(true);

    cache.clear();
    const storeB = new FeatureWorkspaceStore(new FixtureFeatureClient({ ownerUserId: "user-b" }), cache);
    await storeB.load();

    expect(storeB.snapshot().strategyDefinitions.every((definition) => definition.ownerUserId === "user-b")).toBe(true);
    expect(storeB.snapshot().strategyDefinitions.some((definition) => definition.id.includes("user-a"))).toBe(false);
    expect(storeB.snapshot().experiments.every((experiment) => experiment.id.includes("user-b"))).toBe(true);
  });

  it("keeps core workspace data ready when News/Sentiment is unavailable", async () => {
    class NewsFailureClient extends FixtureFeatureClient {
      public override async news(): Promise<never> {
        throw new Error("News provider unavailable");
      }
    }

    const store = new FeatureWorkspaceStore(
      new NewsFailureClient({ ownerUserId: "user-news" }),
      new InMemoryPrivateCache(),
    );
    await store.load();

    expect(store.snapshot()).toMatchObject({ status: "ready", newsStatus: "unavailable" });
    expect(store.snapshot().strategyDefinitions).not.toHaveLength(0);
    expect(store.snapshot().leaderboard?.entries).not.toHaveLength(0);
    expect(store.snapshot().newsMessage).toContain("News provider unavailable");
  });
});
