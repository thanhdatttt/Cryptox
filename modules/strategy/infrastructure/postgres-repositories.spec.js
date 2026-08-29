"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const postgres_repositories_1 = require("./postgres-repositories");
(0, vitest_1.describe)("PostgreSQL strategy repositories", () => {
    (0, vitest_1.it)("uses parameterized owner-scoped definition and composite SQL", async () => {
        const calls = [];
        const pool = { query: async (text, values) => {
                calls.push({ text, values });
                return { rows: (text.includes("composite_strategy_definitions") ? [{ id: "composite-1", user_id: "user-id", logical_family_key: "composite:test", version: 1, method: "MAJORITY_VOTE", components: [], thresholds: null, created_at: "2025-01-01T00:00:00.000Z" }] : [{ id: "strategy-1", user_id: "user-id", logical_family_key: "strategy:MA", family_name: "Moving Average", strategy_name: "MA", implementation_version: "1.0.0", implementation_sha256: "builtin:MA:1.0.0", version: 1, parameters: { fastPeriod: 20, slowPeriod: 50 }, created_at: "2025-01-01T00:00:00.000Z" }]) };
            } };
        const definitions = new postgres_repositories_1.PostgresStrategyDefinitionRepository(pool);
        await (0, vitest_1.expect)(definitions.insert("user-id", { id: "strategy-1", userId: "user-id", logicalFamilyKey: "strategy:MA", familyName: "Moving Average", strategyName: "MA", implementationVersion: "1.0.0", implementationSha256: "builtin:MA:1.0.0", version: 1, parameters: { fastPeriod: 20, slowPeriod: 50 }, createdAt: "2025-01-01T00:00:00.000Z" })).resolves.toMatchObject({ userId: "user-id" });
        await definitions.listByIds("user-id", ["strategy-1"]);
        await (0, vitest_1.expect)(new postgres_repositories_1.PostgresCompositeDefinitionRepository(pool).get("user-id", "composite-1")).resolves.toMatchObject({ userId: "user-id" });
        (0, vitest_1.expect)(calls).toHaveLength(3);
        (0, vitest_1.expect)(calls[0]).toMatchObject({ text: vitest_1.expect.stringContaining("VALUES ($1, $2"), values: vitest_1.expect.arrayContaining(["user-id", "strategy:MA"]) });
        (0, vitest_1.expect)(calls[1].text).toContain("user_id = $1 AND id = ANY($2::text[])");
        (0, vitest_1.expect)(calls[2].text).toContain("user_id = $1 AND id = $2");
    });
    (0, vitest_1.it)("commits generated definitions, composites, and audit in one transaction", async () => {
        const calls = [];
        let released = false;
        const transaction = {
            query: async (text, _values) => { calls.push(text); return { rows: [] }; },
            release: () => { released = true; },
        };
        const pool = { query: async (_text, _values) => ({ rows: [] }), connect: async () => transaction };
        const unitOfWork = new postgres_repositories_1.PostgresStrategyGenerationUnitOfWork(pool);
        await unitOfWork.commit({
            ownerUserId: "user-id",
            definitions: [{ id: "strategy-1", userId: "user-id", logicalFamilyKey: "strategy:RSI", strategyName: "RSI", implementationVersion: "1", implementationSha256: "sha", version: 1, parameters: { period: 14 }, createdAt: "2025-01-01T00:00:00.000Z" }],
            composite: { id: "composite-1", userId: "user-id", logicalFamilyKey: "composite:weighted", version: 1, method: "WEIGHTED_SCORE", components: [{ strategyDefinitionId: "strategy-1", weight: 1 }], thresholds: { buy: 0.3, sell: -0.3 }, createdAt: "2025-01-01T00:00:00.000Z" },
            audit: { id: "generation-1", ownerUserId: "user-id", sourceType: "TEXT", sourceText: "source", modelName: "model", modelVersion: "1", promptVersion: "1", outputKind: "COMPOSITE", compositeDefinitionId: "composite-1", createdAt: "2025-01-01T00:00:00.000Z" },
        });
        (0, vitest_1.expect)(calls[0]).toBe("BEGIN");
        (0, vitest_1.expect)(calls.at(-1)).toBe("COMMIT");
        (0, vitest_1.expect)(calls.filter((call) => call.startsWith("INSERT"))).toHaveLength(3);
        (0, vitest_1.expect)(released).toBe(true);
    });
    (0, vitest_1.it)("rolls back after an insert failure and refuses non-transactional persistence", async () => {
        const calls = [];
        const transaction = {
            query: async (text, _values) => { calls.push(text); if (text.startsWith("INSERT") && calls.length === 2)
                throw new Error("insert failed"); return { rows: [] }; },
            release: () => undefined,
        };
        const pool = { query: async (_text, _values) => ({ rows: [] }), connect: async () => transaction };
        const unitOfWork = new postgres_repositories_1.PostgresStrategyGenerationUnitOfWork(pool);
        const input = { ownerUserId: "user-id", definitions: [], audit: { id: "generation-1", ownerUserId: "user-id", sourceType: "TEXT", sourceText: "source", modelName: "model", modelVersion: "1", promptVersion: "1", outputKind: "SINGLE", strategyDefinitionId: "strategy-1", createdAt: "2025-01-01T00:00:00.000Z" } };
        await (0, vitest_1.expect)(unitOfWork.commit(input)).rejects.toThrow("insert failed");
        (0, vitest_1.expect)(calls).toContain("ROLLBACK");
        (0, vitest_1.expect)(calls).not.toContain("COMMIT");
        await (0, vitest_1.expect)(new postgres_repositories_1.PostgresStrategyGenerationUnitOfWork({ query: async () => ({ rows: [] }) }).commit(input)).rejects.toThrow("STRATEGY_GENERATION_PERSISTENCE_UNAVAILABLE");
    });
});
