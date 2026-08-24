import { describe, expect, it } from "vitest";
import { PostgresCompositeDefinitionRepository, PostgresStrategyDefinitionRepository } from "./postgres-repositories";

describe("PostgreSQL strategy repositories", () => {
  it("uses parameterized owner-scoped definition and composite SQL", async () => {
    const calls: Array<{ text: string; values: unknown[] }> = [];
    const pool = { query: async <Row>(text: string, values: unknown[]) => {
      calls.push({ text, values });
      return { rows: [{ id: "strategy-1", logical_family_key: "strategy:MA", family_name: "Moving Average", strategy_name: "MA", implementation_version: "1.0.0", implementation_sha256: "builtin:MA:1.0.0", version: 1, parameters: { fastPeriod: 20, slowPeriod: 50 }, created_at: "2025-01-01T00:00:00.000Z" }] as Row[] };
    } };
    const definitions = new PostgresStrategyDefinitionRepository(pool);
    await definitions.insert("user-id", { id: "strategy-1", logicalFamilyKey: "strategy:MA", familyName: "Moving Average", strategyName: "MA", implementationVersion: "1.0.0", implementationSha256: "builtin:MA:1.0.0", version: 1, parameters: { fastPeriod: 20, slowPeriod: 50 }, createdAt: "2025-01-01T00:00:00.000Z" });
    await definitions.listByIds("user-id", ["strategy-1"]);
    await new PostgresCompositeDefinitionRepository(pool).get("user-id", "composite-1");

    expect(calls).toHaveLength(3);
    expect(calls[0]).toMatchObject({ text: expect.stringContaining("VALUES ($1, $2"), values: expect.arrayContaining(["user-id", "strategy:MA"]) });
    expect(calls[1].text).toContain("user_id = $1 AND id = ANY($2::text[])");
    expect(calls[2].text).toContain("user_id = $1 AND id = $2");
  });
});
