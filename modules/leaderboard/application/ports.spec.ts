import { describe, expect, it } from "vitest";
import type { AuthenticatedUserId } from "modules/auth/api";
import type {
  LeaderboardEntryRepository,
  LeaderboardScopeRepository,
} from "./ports";

type Scope = { id: string; ownerUserId: AuthenticatedUserId };
type Entry = { id: string; rank: number; leaderboardScopeId: string };

describe("Leaderboard owner-scoped repository ports", () => {
  it("requires the scope owner for scope, entry, search ranking, and mutation access", () => {
    const scopes = {
      insert: async (ownerUserId, command: { id: string }) => ({ ...command, ownerUserId }),
      getByOwnerAndId: async () => undefined,
    } satisfies LeaderboardScopeRepository<Scope, { id: string }>;
    const entries = {
      getActiveTopK: async () => [],
      listByOwnerAndSearchRun: async () => [],
      insertForScopeOwner: async (_ownerUserId, entry) => ({ ...entry, id: "entry-1", rank: 1 }),
      deactivateForScopeOwner: async () => undefined,
    } satisfies LeaderboardEntryRepository<Entry>;

    expect(scopes.getByOwnerAndId).toBeTypeOf("function");
    expect(entries.getActiveTopK).toBeTypeOf("function");
    expect(entries.listByOwnerAndSearchRun).toBeTypeOf("function");
    expect(entries.deactivateForScopeOwner).toBeTypeOf("function");
  });
});
