import { describe, expect, it } from "vitest";
import {
  AUTH_SESSION_V1,
  PRIVATE_RESOURCE_FAILURES,
  PER_USER_OWNERSHIP_V1,
  type AuthenticatedRequestContext,
  type AuthenticatedUserId,
} from "./contracts";
import type {
  AuthSessionRepository,
  AuthUserRepository,
} from "../application/ports";

const userId = "user-1" as AuthenticatedUserId;

describe("Auth and ownership contracts", () => {
  it("freezes opaque fixed-lifetime session and private-resource failure semantics", () => {
    expect(AUTH_SESSION_V1).toMatchObject({
      passwordHash: "ARGON2ID",
      sessionStorage: "POSTGRESQL_OPAQUE_TOKEN_DIGEST_ONLY",
      absoluteLifetimeHours: 24,
      slidingRenewal: false,
      refreshToken: false,
      cookie: { httpOnly: true, sameSite: "Lax", path: "/", domain: "OMITTED" },
    });
    expect(PRIVATE_RESOURCE_FAILURES).toEqual({
      unauthenticated: { code: "UNAUTHENTICATED", httpStatus: 401 },
      missingOrCrossUser: { code: "NOT_FOUND", httpStatus: 404 },
    });
    expect(PER_USER_OWNERSHIP_V1).toMatchObject({
      directRoots: [
        "StrategyDefinition",
        "CompositeDefinition",
        "SearchRun",
        "Candidate",
        "LeaderboardScope",
      ],
      inherited: {
        CompositeComponent: "CompositeDefinition",
        Experiment: "Candidate",
        Trade: "Experiment",
        EvaluationResult: "Experiment",
        LeaderboardEntry: "LeaderboardScope",
      },
      collectionFiltering: "OWNER_BEFORE_PAGINATION_AND_COUNTING",
      crossUserLookup: "NOT_FOUND",
    });
  });

  it("keeps trusted identity separate from credentials and owner-scopes Auth persistence", () => {
    const context: AuthenticatedRequestContext = { authenticatedUserId: userId };
    const users = {
      insert: async (input) => ({ ...input, updatedAt: input.createdAt }),
      getByNormalizedEmail: async () => undefined,
      getById: async (id) =>
        id === context.authenticatedUserId
          ? {
              id,
              normalizedEmail: "user@example.test",
              passwordHash: "argon2id-hash",
              createdAt: "2026-08-28T00:00:00.000Z",
              updatedAt: "2026-08-28T00:00:00.000Z",
            }
          : undefined,
    } satisfies AuthUserRepository<AuthenticatedUserId>;
    const sessions = {
      insert: async (session) => session,
      getActiveByTokenDigest: async () => undefined,
      revokeByTokenDigest: async () => undefined,
    } satisfies AuthSessionRepository<AuthenticatedUserId>;

    expect(context).toEqual({ authenticatedUserId: "user-1" });
    expect(users.getById).toBeTypeOf("function");
    expect(sessions.getActiveByTokenDigest).toBeTypeOf("function");
  });
});
