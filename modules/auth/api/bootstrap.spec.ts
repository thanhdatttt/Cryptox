import { describe, expect, it } from "vitest";
import { createAuthModule, type AuthModuleDependencies } from "./bootstrap";

describe("Auth composition contract", () => {
  it("requires explicit credential, session, token, and clock ports", () => {
    const dependencies = {
      users: {
        insert: async (input) => ({ ...input, updatedAt: input.createdAt }),
        getByNormalizedEmail: async () => undefined,
        getById: async () => undefined,
      },
      sessions: {
        insert: async (session) => session,
        getActiveByTokenDigest: async () => undefined,
        revokeByTokenDigest: async () => undefined,
      },
      passwordHash: {
        hash: async () => "argon2id-hash",
        verify: async () => false,
      },
      sessionTokens: {
        generate: () => "opaque-token",
        digest: () => "token-digest",
      },
      clock: { now: () => "2026-08-28T00:00:00.000Z" },
    } satisfies AuthModuleDependencies;

    expect(Object.keys(createAuthModule(dependencies)).sort()).toEqual(
      ["currentUser", "login", "logout", "register", "resolveSession"].sort(),
    );
  });
});
