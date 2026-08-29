import { describe, expect, it } from "vitest";
import { PostgresCompositeDefinitionRepository, PostgresStrategyDefinitionRepository, PostgresStrategyGenerationUnitOfWork } from "./postgres-repositories";

describe("PostgreSQL strategy repositories", () => {
  it("uses parameterized owner-scoped definition and composite SQL", async () => {
    const calls: Array<{ text: string; values: unknown[] }> = [];
    const pool = { query: async <Row>(text: string, values: unknown[]) => {
      calls.push({ text, values });
      return { rows: (text.includes("composite_strategy_definitions") ? [{ id: "composite-1", user_id: "user-id", logical_family_key: "composite:test", version: 1, method: "MAJORITY_VOTE", components: [], thresholds: null, created_at: "2025-01-01T00:00:00.000Z" }] : [{ id: "strategy-1", user_id: "user-id", logical_family_key: "strategy:MA", family_name: "Moving Average", strategy_name: "MA", implementation_version: "1.0.0", implementation_sha256: "builtin:MA:1.0.0", version: 1, parameters: { fastPeriod: 20, slowPeriod: 50 }, created_at: "2025-01-01T00:00:00.000Z" }]) as Row[] };
    } };
    const definitions = new PostgresStrategyDefinitionRepository(pool);
    await expect(definitions.insert("user-id", { id: "strategy-1", userId: "user-id", logicalFamilyKey: "strategy:MA", familyName: "Moving Average", strategyName: "MA", implementationVersion: "1.0.0", implementationSha256: "builtin:MA:1.0.0", version: 1, parameters: { fastPeriod: 20, slowPeriod: 50 }, createdAt: "2025-01-01T00:00:00.000Z" })).resolves.toMatchObject({ userId: "user-id" });
    await definitions.listByIds("user-id", ["strategy-1"]);
    await expect(new PostgresCompositeDefinitionRepository(pool).get("user-id", "composite-1")).resolves.toMatchObject({ userId: "user-id" });

    expect(calls).toHaveLength(3);
    expect(calls[0]).toMatchObject({ text: expect.stringContaining("VALUES ($1, $2"), values: expect.arrayContaining(["user-id", "strategy:MA"]) });
    expect(calls[1].text).toContain("user_id = $1 AND id = ANY($2::text[])");
    expect(calls[2].text).toContain("user_id = $1 AND id = $2");
  });

  it("commits generated definitions, composites, and audit in one transaction", async () => {
    const calls: string[] = [];
    let released = false;
    const transaction = {
      query: async <Row>(text: string, _values: unknown[]) => { calls.push(text); return { rows: [] as Row[] }; },
      release: () => { released = true; },
    };
    const pool = { query: async <Row>(_text: string, _values: unknown[]) => ({ rows: [] as Row[] }), connect: async () => transaction };
    const unitOfWork = new PostgresStrategyGenerationUnitOfWork(pool);

    await unitOfWork.commit({
      ownerUserId: "user-id",
      definitions: [{ id: "strategy-1", userId: "user-id", logicalFamilyKey: "strategy:RSI", strategyName: "RSI", implementationVersion: "1", implementationSha256: "sha", version: 1, parameters: { period: 14 }, createdAt: "2025-01-01T00:00:00.000Z" }],
      composite: { id: "composite-1", userId: "user-id", logicalFamilyKey: "composite:weighted", version: 1, method: "WEIGHTED_SCORE", components: [{ strategyDefinitionId: "strategy-1", weight: 1 }], thresholds: { buy: 0.3, sell: -0.3 }, createdAt: "2025-01-01T00:00:00.000Z" },
      audit: { id: "generation-1", ownerUserId: "user-id", sourceType: "TEXT", sourceText: "source", modelName: "model", modelVersion: "1", promptVersion: "1", outputKind: "COMPOSITE", compositeDefinitionId: "composite-1", createdAt: "2025-01-01T00:00:00.000Z" },
    });

    expect(calls[0]).toBe("BEGIN");
    expect(calls.at(-1)).toBe("COMMIT");
    expect(calls.filter((call) => call.startsWith("INSERT"))).toHaveLength(3);
    expect(released).toBe(true);
  });

  it("rolls back after an insert failure and refuses non-transactional persistence", async () => {
    const calls: string[] = [];
    const transaction = {
      query: async <Row>(text: string, _values: unknown[]) => { calls.push(text); if (text.startsWith("INSERT") && calls.length === 2) throw new Error("insert failed"); return { rows: [] as Row[] }; },
      release: () => undefined,
    };
    const pool = { query: async <Row>(_text: string, _values: unknown[]) => ({ rows: [] as Row[] }), connect: async () => transaction };
    const unitOfWork = new PostgresStrategyGenerationUnitOfWork(pool);
    const input = { ownerUserId: "user-id", definitions: [], audit: { id: "generation-1", ownerUserId: "user-id", sourceType: "TEXT" as const, sourceText: "source", modelName: "model", modelVersion: "1", promptVersion: "1", outputKind: "SINGLE" as const, strategyDefinitionId: "strategy-1", createdAt: "2025-01-01T00:00:00.000Z" } };

    await expect(unitOfWork.commit(input)).rejects.toThrow("insert failed");
    expect(calls).toContain("ROLLBACK");
    expect(calls).not.toContain("COMMIT");

    await expect(new PostgresStrategyGenerationUnitOfWork({ query: async <Row>() => ({ rows: [] as Row[] }) }).commit(input)).rejects.toThrow("STRATEGY_GENERATION_PERSISTENCE_UNAVAILABLE");
  });
});
