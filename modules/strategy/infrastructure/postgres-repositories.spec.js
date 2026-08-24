"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const postgres_repositories_1 = require("./postgres-repositories");
(0, vitest_1.describe)("PostgreSQL strategy repositories", () => {
    (0, vitest_1.it)("uses parameterized owner-scoped definition and composite SQL", async () => {
        const calls = [];
        const pool = { query: async (text, values) => {
                calls.push({ text, values });
                return { rows: [{ id: "strategy-1", logical_family_key: "strategy:MA", family_name: "Moving Average", strategy_name: "MA", implementation_version: "1.0.0", implementation_sha256: "builtin:MA:1.0.0", version: 1, parameters: { fastPeriod: 20, slowPeriod: 50 }, created_at: "2025-01-01T00:00:00.000Z" }] };
            } };
        const definitions = new postgres_repositories_1.PostgresStrategyDefinitionRepository(pool);
        await definitions.insert("user-id", { id: "strategy-1", logicalFamilyKey: "strategy:MA", familyName: "Moving Average", strategyName: "MA", implementationVersion: "1.0.0", implementationSha256: "builtin:MA:1.0.0", version: 1, parameters: { fastPeriod: 20, slowPeriod: 50 }, createdAt: "2025-01-01T00:00:00.000Z" });
        await definitions.listByIds("user-id", ["strategy-1"]);
        await new postgres_repositories_1.PostgresCompositeDefinitionRepository(pool).get("user-id", "composite-1");
        (0, vitest_1.expect)(calls).toHaveLength(3);
        (0, vitest_1.expect)(calls[0]).toMatchObject({ text: vitest_1.expect.stringContaining("VALUES ($1, $2"), values: vitest_1.expect.arrayContaining(["user-id", "strategy:MA"]) });
        (0, vitest_1.expect)(calls[1].text).toContain("user_id = $1 AND id = ANY($2::text[])");
        (0, vitest_1.expect)(calls[2].text).toContain("user_id = $1 AND id = $2");
    });
});
