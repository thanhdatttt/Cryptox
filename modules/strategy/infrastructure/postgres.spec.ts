import { describe, expect, it } from "vitest";
import type { AuthenticatedUserId } from "modules/auth/api";
import type { CompositeDefinitionRecord, StrategyDefinitionRecord } from "../application/ports";
import {
  createPostgresStrategyDependencies,
  type PostgresPool,
  type PostgresQueryResult,
} from "./postgres";

interface QueryCall {
  text: string;
  values?: unknown[];
}

function fakePool(responses: readonly PostgresQueryResult[]): {
  pool: PostgresPool;
  calls: QueryCall[];
  readonly endCalls: number;
} {
  const calls: QueryCall[] = [];
  let responseIndex = 0;
  let endCalls = 0;
  const pool: PostgresPool = {
    query: async <Row extends Record<string, unknown>>(text: string, values?: unknown[]) => {
      calls.push({ text, values });
      const response = responses[responseIndex++];
      if (!response) throw new Error("unexpected fake query");
      return response as PostgresQueryResult<Row>;
    },
    end: async () => {
      endCalls += 1;
    },
  };
  return { pool, calls, get endCalls() { return endCalls; } };
}

function dynamicPool(
  query: (text: string, values: unknown[] | undefined, callNumber: number) => Promise<PostgresQueryResult>,
): { pool: PostgresPool; calls: QueryCall[] } {
  const calls: QueryCall[] = [];
  const pool: PostgresPool = {
    query: async <Row extends Record<string, unknown>>(text: string, values?: unknown[]) => {
      calls.push({ text, values });
      return (await query(text, values, calls.length)) as PostgresQueryResult<Row>;
    },
    end: async () => undefined,
  };
  return { pool, calls };
}

const ownerA = "00000000-0000-4000-8000-000000000001" as AuthenticatedUserId;
const ownerB = "00000000-0000-4000-8000-000000000002" as AuthenticatedUserId;
const definitionIdA = "00000000-0000-4000-8000-000000000011";
const definitionIdB = "00000000-0000-4000-8000-000000000012";
const compositeId = "00000000-0000-4000-8000-000000000021";
const fixedCreatedAt = "2026-08-30T00:00:00.000Z";

function definitionRow(
  id: string,
  ownerUserId: AuthenticatedUserId,
  version = 1,
  createdAt = fixedCreatedAt,
): Record<string, unknown> {
  return {
    id,
    owner_user_id: ownerUserId,
    logical_family_key: "ma-family",
    strategy_name: "MA",
    implementation_version: "1.0.0",
    behavior_profile_id: "TECHNICAL_PROFILES_V1",
    version,
    parameters: { fastPeriod: 2, slowPeriod: 3 },
    authoring_origin: null,
    created_at: createdAt,
  };
}

function definition(
  ownerUserId: AuthenticatedUserId = ownerA,
  id = definitionIdA,
  version = 1,
): StrategyDefinitionRecord {
  return {
    id,
    ownerUserId,
    logicalFamilyKey: "ma-family",
    strategyName: "MA",
    implementationVersion: "1.0.0",
    behaviorProfileId: "TECHNICAL_PROFILES_V1",
    version,
    parameters: Object.freeze({ fastPeriod: 2, slowPeriod: 3 }),
    createdAt: fixedCreatedAt,
  };
}

function compositeRow(
  ownerUserId: AuthenticatedUserId = ownerA,
  id = compositeId,
  components: unknown = [
    {
      strategyDefinitionId: definitionIdA,
      strategyDefinitionVersion: 3,
      enabled: true,
      weight: 1,
    },
  ],
): Record<string, unknown> {
  return {
    id,
    owner_user_id: ownerUserId,
    logical_family_key: "composite-family",
    version: 1,
    method: "MAJORITY_VOTE",
    combination_profile_id: "MAJORITY_VOTE_V1",
    weighted_buy_threshold: null,
    weighted_sell_threshold: null,
    created_at: fixedCreatedAt,
    components,
  };
}

function compositeComponentRow(
  id: string,
  strategyDefinitionId: string,
  strategyDefinitionVersion: number,
): Record<string, unknown> {
  return {
    composite_definition_id: id,
    component_position: 0,
    strategy_definition_id: strategyDefinitionId,
    strategy_definition_version: strategyDefinitionVersion,
    enabled: true,
    weight: "1",
  };
}

function compositeDefinition(ownerUserId: AuthenticatedUserId = ownerA): CompositeDefinitionRecord {
  return {
    id: compositeId,
    ownerUserId,
    logicalFamilyKey: "composite-family",
    version: 1,
    method: "MAJORITY_VOTE",
    combinationProfileId: "MAJORITY_VOTE_V1",
    components: Object.freeze([
      {
        strategyDefinitionId: definitionIdA,
        strategyDefinitionVersion: 3,
      },
    ]),
    createdAt: fixedCreatedAt,
  };
}

describe("Strategy PostgreSQL repositories [CSL-R-OW-01, CSL-R-ST-04, CSL-R-RP-02]", () => {
  it("filters definitions by trusted owner before paginating with the existing cursor order", async () => {
    const fake = fakePool([
      {
        rows: [
          definitionRow(definitionIdA, ownerA, 1, "2026-08-30T00:00:00.000Z"),
          definitionRow(definitionIdB, ownerA, 2, "2026-08-30T00:00:00.000Z"),
          definitionRow("00000000-0000-4000-8000-000000000013", ownerA, 3, "2026-08-30T00:00:01.000Z"),
        ],
      },
      { rows: [definitionRow("00000000-0000-4000-8000-000000000013", ownerA, 3, "2026-08-30T00:00:01.000Z")] },
      { rows: [definitionRow("00000000-0000-4000-8000-000000000014", ownerB)] },
    ]);
    const dependencies = createPostgresStrategyDependencies({ connectionString: "", pool: fake.pool });

    const firstPage = await dependencies.definitionRepository.listByOwner(ownerA, { limit: 2 });
    const secondPage = await dependencies.definitionRepository.listByOwner(ownerA, {
      limit: 2,
      cursor: firstPage.nextCursor,
    });
    const otherOwnerPage = await dependencies.definitionRepository.listByOwner(ownerB, { limit: 2 });

    expect(firstPage.items.map((item) => item.id)).toEqual([definitionIdA, definitionIdB]);
    expect(firstPage.nextCursor).toBe(definitionIdB);
    expect(secondPage.items.map((item) => item.id)).toEqual([
      "00000000-0000-4000-8000-000000000013",
    ]);
    expect(otherOwnerPage.items.map((item) => item.ownerUserId)).toEqual([ownerB]);
    expect(fake.calls[0]?.text).toContain("d.owner_user_id = $1::uuid");
    expect(fake.calls[0]?.text).toContain("ORDER BY d.created_at ASC, d.id ASC");
    expect(fake.calls[0]?.values).toEqual([ownerA, null, 3]);
    expect(fake.calls[1]?.values).toEqual([ownerA, definitionIdB, 3]);
    expect(fake.calls[2]?.values).toEqual([ownerB, null, 3]);
    await dependencies.close();
    await dependencies.close();
    expect(fake.endCalls).toBe(1);
  });

  it("returns immutable owner-scoped definitions and preserves safe authoring provenance", async () => {
    const fake = fakePool([{
      rows: [{
        ...definitionRow(definitionIdA, ownerA),
        authoring_origin: { kind: "LLM_DRAFT", draftId: "draft-1", providerId: "provider", modelId: "model" },
      }],
    }]);
    const dependencies = createPostgresStrategyDependencies({ connectionString: "", pool: fake.pool });

    const result = await dependencies.definitionRepository.getByOwnerAndId(ownerA, definitionIdA);

    expect(result).toMatchObject({
      id: definitionIdA,
      ownerUserId: ownerA,
      authoringOrigin: { kind: "LLM_DRAFT", draftId: "draft-1" },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.parameters)).toBe(true);
    expect(Object.isFrozen(result?.authoringOrigin)).toBe(true);
    expect(fake.calls[0]?.values).toEqual([ownerA, definitionIdA]);
    await dependencies.close();
  });

  it("allocates from the owner/family maximum and retries only the database version conflict", async () => {
    const conflict = Object.assign(new Error("duplicate family version"), {
      code: "23505",
      constraint: "strategy_definitions_family_version_unique",
    });
    const fake = dynamicPool(async (text, _values, callNumber) => {
      if (text.includes("SELECT COALESCE(MAX(version), 0) + 1 AS next_version")) {
        return { rows: [{ next_version: "4" }] };
      }
      if (callNumber === 2) throw conflict;
      return { rows: [definitionRow(definitionIdA, ownerA, 4)] };
    });
    const dependencies = createPostgresStrategyDependencies({ connectionString: "", pool: fake.pool });

    await expect(dependencies.definitionRepository.allocateNextVersion(ownerA, "ma-family"))
      .resolves.toBe(4);
    const inserted = await dependencies.definitionRepository.insert(ownerA, definition(ownerA, definitionIdA, 4));

    expect(inserted.version).toBe(4);
    expect(fake.calls).toHaveLength(3);
    expect(fake.calls[1]?.text).toContain("COALESCE(MAX(version), 0) + 1 AS version");
    expect(fake.calls[2]?.text).toContain("COALESCE(MAX(version), 0) + 1 AS version");
    expect(fake.calls[1]?.text).toContain("INSERT INTO strategy_definitions");
    await dependencies.close();
  });

  it("persists exact component versions atomically and rejects cross-owner component references", async () => {
    const fake = fakePool([
      { rows: [compositeRow()] },
      { rows: [] },
    ]);
    const dependencies = createPostgresStrategyDependencies({ connectionString: "", pool: fake.pool });

    const inserted = await dependencies.compositeRepository.insert(ownerA, compositeDefinition());
    expect(inserted.components).toEqual([
      { strategyDefinitionId: definitionIdA, strategyDefinitionVersion: 3 },
    ]);
    expect(Object.isFrozen(inserted)).toBe(true);
    expect(Object.isFrozen(inserted.components)).toBe(true);
    expect(fake.calls[0]?.text).toContain("jsonb_to_recordset($9::jsonb)");
    expect(fake.calls[0]?.text).toContain("strategy.owner_user_id = $2::uuid");
    expect(fake.calls[0]?.text).toContain("strategy_definition_version");
    expect(JSON.parse(String(fake.calls[0]?.values?.[8]))).toEqual([
      {
        componentPosition: 0,
        strategyDefinitionId: definitionIdA,
        strategyDefinitionVersion: 3,
        enabled: true,
        weight: 1,
      },
    ]);

    const crossOwnerComponent = {
      ...compositeDefinition(ownerA),
      id: "00000000-0000-4000-8000-000000000022",
      components: [{ strategyDefinitionId: definitionIdB, strategyDefinitionVersion: 1 }],
    } satisfies CompositeDefinitionRecord;
    await expect(dependencies.compositeRepository.insert(ownerA, crossOwnerComponent))
      .rejects.toThrow("NOT_FOUND");
    expect(fake.calls[1]?.text).toContain("strategy.owner_user_id = $2::uuid");
    await dependencies.close();
  });

  it("keeps composite reads owner-scoped, paginated, and versioned by component provenance", async () => {
    const compositeId2 = "00000000-0000-4000-8000-000000000022";
    const compositeId3 = "00000000-0000-4000-8000-000000000023";
    const fake = fakePool([
      {
        rows: [
          compositeRow(ownerA, compositeId),
          compositeRow(ownerA, compositeId2, [
            {
              strategyDefinitionId: definitionIdB,
              strategyDefinitionVersion: 4,
              enabled: true,
              weight: 1,
            },
          ]),
          compositeRow(ownerA, compositeId3),
        ],
      },
      {
        rows: [
          compositeComponentRow(compositeId, definitionIdA, 3),
          compositeComponentRow(compositeId2, definitionIdB, 4),
        ],
      },
      { rows: [] },
    ]);
    const dependencies = createPostgresStrategyDependencies({ connectionString: "", pool: fake.pool });

    const page = await dependencies.compositeRepository.listByOwner(ownerA, { limit: 2 });
    const missingToOtherOwner = await dependencies.compositeRepository.getByOwnerAndId(ownerB, compositeId);

    expect(page.items.map((item) => item.id)).toEqual([compositeId, compositeId2]);
    expect(page.nextCursor).toBe(compositeId2);
    expect(page.items[0]?.components).toEqual([
      { strategyDefinitionId: definitionIdA, strategyDefinitionVersion: 3 },
    ]);
    expect(page.items[1]?.components).toEqual([
      { strategyDefinitionId: definitionIdB, strategyDefinitionVersion: 4 },
    ]);
    expect(missingToOtherOwner).toBeUndefined();
    expect(fake.calls[0]?.text).toContain("d.owner_user_id = $1::uuid");
    expect(fake.calls[0]?.text).toContain("ORDER BY d.created_at ASC, d.id ASC");
    expect(fake.calls[0]?.values).toEqual([ownerA, null, 3]);
    expect(fake.calls[1]?.values).toEqual([[compositeId, compositeId2]]);
    expect(fake.calls[2]?.values).toEqual([ownerB, compositeId]);
    await dependencies.close();
  });
});
