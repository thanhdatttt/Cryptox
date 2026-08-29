import { describe, expect, it } from "vitest";
import type { PostgresPool, PostgresQueryResult } from "./postgres";
import { createPostgresLeaderboardDependencies } from "./postgres";

function fakePool(responses: readonly Record<string, unknown>[][]) {
  const queries: Array<{ text: string; values?: unknown[] }> = [];
  const pool: PostgresPool = {
    query: async <Row extends Record<string, unknown> = Record<string, unknown>>(
      text: string,
      values?: unknown[],
    ): Promise<PostgresQueryResult<Row>> => {
      queries.push({ text, values });
      return { rows: (responses[queries.length - 1] ?? []) as Row[] };
    },
    end: async () => undefined,
  };
  return { pool, queries };
}

describe("Leaderboard PostgreSQL adapter", () => {
  it("provides an idempotent module-owned default configuration initializer", async () => {
    const { pool, queries } = fakePool([[]]);
    const dependencies = createPostgresLeaderboardDependencies({ connectionString: "", pool });

    await dependencies.initialize();
    expect(queries[0]?.text).toContain("INSERT INTO ranking_configurations");
    expect(queries[0]?.text).toContain("ON CONFLICT (id) DO NOTHING");
    expect(queries[0]?.values?.slice(0, 3)).toEqual([
      "ranking-v1",
      "LINEAR_REQUIRED_V1",
      1,
    ]);
    await dependencies.close();
  });

  it("maps versioned configurations and owner-scoped scope reads", async () => {
    const { pool, queries } = fakePool([
      [{
        id: "ranking-v1",
        profile_id: "LINEAR_REQUIRED_V1",
        version: 1,
        name: "Required",
        description: null,
        formula: {
          totalReturnPercentWeight: 0.5,
          winRatePercentWeight: 0.3,
          maxDrawdownMagnitudePercentWeight: -0.2,
        },
        minimum_number_of_trades: 1,
        tie_breakers: [],
        created_at: "2026-08-29T00:00:00.000Z",
      }],
      [{
        id: "scope-1",
        owner_user_id: "user-1",
        name: "Private",
        k: 3,
        ranking_configuration_id: "ranking-v1",
        comparison_key: "BTCUSDT:1h",
        created_at: "2026-08-29T00:00:00.000Z",
      }],
    ]);
    const dependencies = createPostgresLeaderboardDependencies({ connectionString: "", pool });

    await expect(dependencies.configurationRepository.getById("ranking-v1")).resolves.toMatchObject({
      id: "ranking-v1",
      version: 1,
    });
    await expect(dependencies.scopeRepository.getByOwnerAndId("user-1" as never, "scope-1"))
      .resolves.toMatchObject({ ownerUserId: "user-1", k: 3 });
    expect(queries[1]?.text).toContain("owner_user_id = $1::uuid");
    expect(queries[1]?.values).toEqual(["user-1", "scope-1"]);
    await dependencies.close();
  });

  it("keeps entry reads and mutations owner-scoped", async () => {
    const { pool, queries } = fakePool([
      [{
        id: "entry-1",
        rank: 1,
        candidate_id: "candidate-1",
        search_run_id: null,
        experiment_id: "experiment-1",
        leaderboard_scope_id: "scope-1",
        ranking_configuration_id: "ranking-v1",
        score: "19.5",
        added_at: "2026-08-29T00:00:00.000Z",
      }],
      [],
    ]);
    const dependencies = createPostgresLeaderboardDependencies({ connectionString: "", pool });

    await expect(dependencies.entryRepository.getActiveTopK("user-1" as never, "scope-1", 2))
      .resolves.toMatchObject([{ experimentId: "experiment-1", score: 19.5 }]);
    await dependencies.entryRepository.deactivateForScopeOwner("user-1" as never, "entry-1");
    expect(queries[0]?.text).toContain("s.owner_user_id = $1::uuid");
    expect(queries[1]?.text).toContain("s.owner_user_id = $2::uuid");
    await dependencies.close();
  });
});
