import { describe, expect, it } from "vitest";
import { FixtureAuthClient, FixtureProtectedRequestClient } from "./fixture-client";
import { InMemoryPrivateCache } from "./cache";
import { guardRoute } from "./navigation";
import { AuthStore } from "./state";

describe("protected request recovery", () => {
  it("handles a protected 401 through the reusable client and existing login guard", async () => {
    const store = new AuthStore(
      new FixtureAuthClient({ now: () => "2026-08-28T00:00:00.000Z" }),
      new InMemoryPrivateCache(),
    );
    await store.register({ email: "person@example.test", password: "secret" });
    const protectedClient = new FixtureProtectedRequestClient(() => store.handleUnauthorized(), true);

    await expect(protectedClient.get("/private/workspace", () => ({ ready: true }))).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });

    expect(store.snapshot().status).toBe("anonymous");
    expect(guardRoute("strategies", store.snapshot().status)).toEqual({
      kind: "redirect",
      returnTo: "strategies",
    });
  });
});
