import { describe, expect, it } from "vitest";
import { createAuthApplication } from "./service";
import type {
  AuthApplicationDependencies,
  AuthSessionRecord,
  AuthUserCredentialRecord,
} from "./ports";

type AuthenticatedUserId = string;

function makeDependencies() {
  const users = new Map<string, AuthUserCredentialRecord<AuthenticatedUserId>>();
  const sessions = new Map<string, AuthSessionRecord<AuthenticatedUserId>>();
  let now = "2026-08-28T00:00:00.000Z";
  let tokenNumber = 0;
  const dependencies: AuthApplicationDependencies<AuthenticatedUserId> = {
    users: {
      insert: async (input) => {
        const user = { ...input, updatedAt: input.createdAt };
        users.set(user.id, user);
        return user;
      },
      getByNormalizedEmail: async (email) =>
        [...users.values()].find((user) => user.normalizedEmail === email),
      getById: async (id) => users.get(id),
    },
    sessions: {
      insert: async (session) => {
        sessions.set(session.tokenDigest, { ...session });
        return session;
      },
      getActiveByTokenDigest: async (digest, at) => {
        const session = sessions.get(digest);
        return session && !session.revokedAt && Date.parse(session.expiresAt) > Date.parse(at)
          ? session
          : undefined;
      },
      revokeByTokenDigest: async (digest, revokedAt) => {
        const session = sessions.get(digest);
        if (session) session.revokedAt = revokedAt;
      },
    },
    passwordHash: {
      hash: async (password) => `fake-argon2id:${password}`,
      verify: async (hash, password) => hash === `fake-argon2id:${password}`,
    },
    sessionTokens: {
      generate: () => `opaque-token-${++tokenNumber}`,
      digest: (token) => `digest:${token}`,
    },
    clock: { now: () => now },
  };
  return { dependencies, users, sessions, setNow: (value: string) => (now = value) };
}

describe("Auth application", () => {
  it("normalizes email, hashes credentials, and creates a fixed 24-hour session", async () => {
    const { dependencies, sessions } = makeDependencies();
    const auth = createAuthApplication(dependencies);

    const grant = await auth.register({ email: " User@Example.Test ", password: "secret" });
    expect(grant.user.email).toBe("user@example.test");
    expect(grant.expiresAt).toBe("2026-08-29T00:00:00.000Z");
    expect([...sessions.values()][0]).toMatchObject({ tokenDigest: "digest:opaque-token-1" });
    expect([...sessions.values()][0]).not.toHaveProperty("opaqueToken");
  });

  it("does not disclose whether a login email exists and rejects duplicate registration", async () => {
    const { dependencies } = makeDependencies();
    const auth = createAuthApplication(dependencies);
    await auth.register({ email: "user@example.test", password: "secret" });

    await expect(auth.register({ email: "USER@example.test", password: "other" })).rejects.toMatchObject({
      code: "EMAIL_ALREADY_REGISTERED",
    });
    await expect(auth.login({ email: "missing@example.test", password: "secret" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    await expect(auth.login({ email: "user@example.test", password: "wrong" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });

  it("resolves, expires, revokes, and owner-checks sessions", async () => {
    const { dependencies, setNow } = makeDependencies();
    const auth = createAuthApplication(dependencies);
    const grant = await auth.register({ email: "user@example.test", password: "secret" });

    const identity = await auth.resolveSession(grant.opaqueToken);
    expect(identity).toMatchObject({ authenticatedUserId: grant.user.id, expiresAt: grant.expiresAt });
    expect(await auth.currentUser({ authenticatedUserId: grant.user.id })).toEqual(grant.user);
    await expect(auth.currentUser({ authenticatedUserId: "other" as AuthenticatedUserId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    await auth.logout(grant.opaqueToken);
    expect(await auth.resolveSession(grant.opaqueToken)).toBeUndefined();
    const second = await auth.login({ email: "user@example.test", password: "secret" });
    setNow("2026-08-29T00:00:00.000Z");
    expect(await auth.resolveSession(second.opaqueToken)).toBeUndefined();
  });
});
