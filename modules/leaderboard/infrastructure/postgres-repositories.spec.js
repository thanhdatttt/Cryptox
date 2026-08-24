"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const postgres_repositories_1 = require("./postgres-repositories");
(0, vitest_1.describe)("PostgresLeaderboardEntryRepository", () => {
    (0, vitest_1.it)("stores immutable experiment references and reads active Top-K entries with parameterized SQL", async () => {
        const calls = [];
        const repository = new postgres_repositories_1.PostgresLeaderboardEntryRepository({
            query: async (text, values) => {
                calls.push({ text, values });
                return { rows: text.startsWith("INSERT") ? [{ id: "entry-1", experiment_result_id: "experiment-1", leaderboard_scope_id: "scope-1", score_formula_id: "MVP_MANUAL_V1", score: "12.5", added_at: "2025-01-01T00:00:00.000Z" }] : [] };
            },
        });
        const inserted = await repository.insert({ experimentResultId: "experiment-1", leaderboardScopeId: "scope-1", scoreFormulaId: "MVP_MANUAL_V1", score: 12.5, addedAt: "2025-01-01T00:00:00.000Z" });
        await repository.getActiveTopK("scope-1", 10);
        await repository.deactivate(inserted.id);
        (0, vitest_1.expect)(inserted).toMatchObject({ experimentResultId: "experiment-1", score: 12.5 });
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO leaderboard_entries") && call.values.includes("experiment-1"))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.includes("active = TRUE") && call.values.includes(10))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("UPDATE leaderboard_entries SET active = FALSE") && call.values.includes("entry-1"))).toBe(true);
    });
});
