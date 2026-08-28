import { describe, expect, it } from "vitest";
import { FixtureAuthClient } from "./fixture-client";
import { AuthStore } from "./state";
import { InMemoryPrivateCache } from "./cache";

describe("FixtureAuthClient", () => {
  it("supports registration, reload restoration, and logout without exposing a cookie", async () => {
    const client = new FixtureAuthClient({ now: () => "2026-08-28T00:00:00.000Z" });
    const firstCache = new InMemoryPrivateCache();
    const firstStore = new AuthStore(client, firstCache);

    await expect(firstStore.register({ email: " Person@Example.Test ", password: "secret" })).resolves.toBe(true);
    expect(firstStore.snapshot().user?.email).toBe("person@example.test");
    expect(firstStore.snapshot()).not.toHaveProperty("sessionCookie");

    const reloadedStore = new AuthStore(client, new InMemoryPrivateCache());
    await reloadedStore.restore();
    expect(reloadedStore.snapshot()).toMatchObject({
      status: "authenticated",
      user: { email: "person@example.test" },
    });

    await reloadedStore.logout();
    expect(reloadedStore.snapshot().status).toBe("anonymous");
    await expect(reloadedStore.restore()).resolves.toBeUndefined();
    expect(reloadedStore.snapshot().status).toBe("anonymous");
  });

  it("rejects an expired fixture session during current-user restoration", async () => {
    let now = "2026-08-28T00:00:00.000Z";
    const client = new FixtureAuthClient({ now: () => now });
    const store = new AuthStore(client, new InMemoryPrivateCache());
    await store.register({ email: "person@example.test", password: "secret" });

    now = "2026-08-29T00:00:00.000Z";
    await store.restore();

    expect(store.snapshot()).toMatchObject({ status: "anonymous" });
    expect(store.snapshot().message).toContain("expired");
  });
});
