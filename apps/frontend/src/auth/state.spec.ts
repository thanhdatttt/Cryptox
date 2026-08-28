import { describe, expect, it } from "vitest";
import type {
  AuthSessionResponseDto,
  AuthUserDto,
  CurrentUserResponseDto,
  LogoutResponseDto,
} from "@cryptox/contracts/rest";
import { InMemoryPrivateCache } from "./cache";
import { AuthClientError } from "./clients";
import { AuthStore } from "./state";
import type { AuthClient, AuthCredentials } from "./types";

const userA: AuthUserDto = {
  id: "user-a",
  email: "a@example.test",
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:00.000Z",
};
const userB: AuthUserDto = { ...userA, id: "user-b", email: "b@example.test" };

class SwitchingAuthClient implements AuthClient {
  private active = userA;

  public async register(_credentials: AuthCredentials): Promise<AuthSessionResponseDto> {
    this.active = userA;
    return { schemaVersion: 1, user: userA, expiresAt: "2026-08-29T00:00:00.000Z" };
  }

  public async login(_credentials: AuthCredentials): Promise<AuthSessionResponseDto> {
    this.active = userB;
    return { schemaVersion: 1, user: userB, expiresAt: "2026-08-29T00:00:00.000Z" };
  }

  public async currentUser(): Promise<CurrentUserResponseDto> {
    return { schemaVersion: 1, user: this.active };
  }

  public async logout(): Promise<LogoutResponseDto> {
    return { schemaVersion: 1, authenticated: false };
  }
}

class SessionRetainingAuthClient implements AuthClient {
  public async register(_credentials: AuthCredentials): Promise<AuthSessionResponseDto> {
    return { schemaVersion: 1, user: userA, expiresAt: "2026-08-29T00:00:00.000Z" };
  }

  public async login(_credentials: AuthCredentials): Promise<AuthSessionResponseDto> {
    return { schemaVersion: 1, user: userA, expiresAt: "2026-08-29T00:00:00.000Z" };
  }

  public async currentUser(): Promise<CurrentUserResponseDto> {
    return { schemaVersion: 1, user: userA };
  }

  public logout(): Promise<LogoutResponseDto> {
    return Promise.reject(new AuthClientError(503, "transport unavailable"));
  }
}

describe("AuthStore private state boundary", () => {
  it("clears user A's private cache on logout before user B logs in", async () => {
    const cache = new InMemoryPrivateCache();
    const store = new AuthStore(new SwitchingAuthClient(), cache);

    await store.register({ email: userA.email, password: "secret" });
    cache.set("strategies", [{ name: "A-only" }]);
    expect(cache.has("strategies")).toBe(true);

    await store.logout();
    expect(cache.size).toBe(0);
    await store.login({ email: userB.email, password: "secret" });

    expect(store.snapshot()).toMatchObject({ status: "authenticated", user: userB });
    expect(cache.get("strategies")).toBeUndefined();
  });

  it("clears private state and exposes a login recovery message for any protected 401", async () => {
    const cache = new InMemoryPrivateCache();
    const store = new AuthStore(new SwitchingAuthClient(), cache);
    await store.register({ email: userA.email, password: "secret" });
    cache.set("leaderboard", [{ score: 1 }]);

    store.handleUnauthorized();

    expect(store.snapshot()).toMatchObject({ status: "anonymous" });
    expect(store.snapshot().message).toContain("expired");
    expect(cache.size).toBe(0);
  });

  it("keeps an unknown logout outcome authenticated and restores that session after reload", async () => {
    const client = new SessionRetainingAuthClient();
    const cache = new InMemoryPrivateCache();
    const store = new AuthStore(client, cache);
    await store.register({ email: userA.email, password: "secret" });
    cache.set("backtests", [{ name: "A-only" }]);

    await store.logout();

    expect(store.snapshot()).toMatchObject({ status: "authenticated", user: userA, pending: false });
    expect(store.snapshot().message).toContain("session may still be active");
    expect(cache.size).toBe(0);

    const reloadedStore = new AuthStore(client, new InMemoryPrivateCache());
    await reloadedStore.restore();
    expect(reloadedStore.snapshot()).toMatchObject({ status: "authenticated", user: userA });
  });
});
