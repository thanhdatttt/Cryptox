import { describe, expect, it } from "vitest";
import { PostgresLeaderboardEntryRepository } from "./postgres-repositories";

describe("PostgresLeaderboardEntryRepository", () => {
  it("stores immutable experiment references and reads active Top-K entries with parameterized SQL", async () => {
    const calls: Array<{ text: string; values: unknown[] }> = [];
    const repository = new PostgresLeaderboardEntryRepository({
      query: async <Row>(text: string, values: unknown[]) => {
        calls.push({ text, values });
        return { rows: text.startsWith("INSERT") ? [{ id: "entry-1", experiment_result_id: "experiment-1", leaderboard_scope_id: "scope-1", score_formula_id: "MVP_MANUAL_V1", score: "12.5", added_at: "2025-01-01T00:00:00.000Z" }] as Row[] : [] as Row[] };
      },
    });

    const inserted = await repository.insert({ experimentResultId: "experiment-1", leaderboardScopeId: "scope-1", scoreFormulaId: "MVP_MANUAL_V1", score: 12.5, addedAt: "2025-01-01T00:00:00.000Z" });
    await repository.getActiveTopK("scope-1", 10);
    await repository.deactivate(inserted.id);

    expect(inserted).toMatchObject({ experimentResultId: "experiment-1", score: 12.5 });
    expect(calls.some((call) => call.text.startsWith("INSERT INTO leaderboard_entries") && call.values.includes("experiment-1"))).toBe(true);
    expect(calls.some((call) => call.text.includes("active = TRUE") && call.values.includes(10))).toBe(true);
    expect(calls.some((call) => call.text.startsWith("UPDATE leaderboard_entries SET active = FALSE") && call.values.includes("entry-1"))).toBe(true);
  });
});
