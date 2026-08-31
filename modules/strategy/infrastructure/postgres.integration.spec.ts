import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthenticatedUserId } from "modules/auth/api";
import type { StrategyAuthoringDraftRecord } from "../application/authoring";
import type { CompositeDefinitionRecord, StrategyDefinitionRecord } from "../application/ports";
import {
  createPostgresStrategyDependencies,
  type PostgresStrategyDependencies,
} from "./postgres";

const databaseUrl = process.env.DATABASE_URL;
const shouldRun = Boolean(databaseUrl);

describe.skipIf(!shouldRun)("Strategy PostgreSQL persistence", () => {
  const ownerA = randomUUID() as AuthenticatedUserId;
  const ownerB = randomUUID() as AuthenticatedUserId;
  let dependencies: PostgresStrategyDependencies | undefined;
  let ownerBDefinition: StrategyDefinitionRecord;

  beforeAll(async () => {
    dependencies = createPostgresStrategyDependencies({ connectionString: databaseUrl! });
    const now = "2026-08-30T00:00:00.000Z";
    await dependencies.pool.query(
      `
        INSERT INTO users (id, normalized_email, password_hash, created_at, updated_at)
        VALUES ($1::uuid, $2, $3, $4::timestamptz, $4::timestamptz),
          ($5::uuid, $6, $3, $4::timestamptz, $4::timestamptz)
      `,
      [ownerA, `${ownerA}@strategy-test.invalid`, "fixture-hash", now, ownerB, `${ownerB}@strategy-test.invalid`],
    );
  });

  afterAll(async () => {
    if (!dependencies) return;
    await dependencies.pool.query(
      "DELETE FROM strategy_authoring_drafts WHERE owner_user_id = ANY($1::uuid[])",
      [[ownerA, ownerB]],
    );
    await dependencies.pool.query(
      `
        DELETE FROM composite_components
        WHERE composite_definition_id IN (
          SELECT id
          FROM composite_strategy_definitions
          WHERE owner_user_id = ANY($1::uuid[])
        )
      `,
      [[ownerA, ownerB]],
    );
    await dependencies.pool.query(
      "DELETE FROM composite_strategy_definitions WHERE owner_user_id = ANY($1::uuid[])",
      [[ownerA, ownerB]],
    );
    await dependencies.pool.query(
      "DELETE FROM strategy_definitions WHERE owner_user_id = ANY($1::uuid[])",
      [[ownerA, ownerB]],
    );
    await dependencies.pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [[ownerA, ownerB]]);
    await dependencies.close();
  });

  async function insertDefinition(
    ownerUserId: AuthenticatedUserId,
    logicalFamilyKey: string,
    createdAt: string,
  ): Promise<StrategyDefinitionRecord> {
    const version = await dependencies!.definitionRepository.allocateNextVersion(ownerUserId, logicalFamilyKey);
    return dependencies!.definitionRepository.insert(ownerUserId, {
      id: randomUUID(),
      ownerUserId,
      logicalFamilyKey,
      strategyName: "MA",
      implementationVersion: "1.0.0",
      behaviorProfileId: "TECHNICAL_PROFILES_V1",
      version,
      parameters: { fastPeriod: 2, slowPeriod: 3 },
      createdAt,
    });
  }

  it("filters owners before pagination and preserves exact composite component versions", async () => {
    const first = await insertDefinition(ownerA, "isolation-family", "2026-08-30T00:00:00.000Z");
    const second = await insertDefinition(ownerA, "isolation-family", "2026-08-30T00:00:01.000Z");
    ownerBDefinition = await insertDefinition(ownerB, "isolation-family", "2026-08-30T00:00:00.000Z");

    const firstPage = await dependencies!.definitionRepository.listByOwner(ownerA, { limit: 1 });
    const secondPage = await dependencies!.definitionRepository.listByOwner(ownerA, {
      limit: 1,
      cursor: firstPage.nextCursor,
    });

    expect(firstPage.items.map((item) => item.id)).toEqual([first.id]);
    expect(secondPage.items.map((item) => item.id)).toEqual([second.id]);
    expect(await dependencies!.definitionRepository.getByOwnerAndId(ownerA, ownerBDefinition.id))
      .toBeUndefined();

    const composite: CompositeDefinitionRecord = {
      id: randomUUID(),
      ownerUserId: ownerA,
      logicalFamilyKey: "integration-composite-family",
      version: await dependencies!.compositeRepository.allocateNextVersion(
        ownerA,
        "integration-composite-family",
      ),
      method: "MAJORITY_VOTE",
      combinationProfileId: "MAJORITY_VOTE_V1",
      components: [
        { strategyDefinitionId: first.id, strategyDefinitionVersion: first.version },
        { strategyDefinitionId: second.id, strategyDefinitionVersion: second.version },
      ],
      createdAt: "2026-08-30T00:00:02.000Z",
    };
    const storedComposite = await dependencies!.compositeRepository.insert(ownerA, composite);
    const readComposite = await dependencies!.compositeRepository.getByOwnerAndId(ownerA, storedComposite.id);

    expect(readComposite?.components).toEqual(composite.components);
    await expect(
      dependencies!.compositeRepository.insert(ownerA, {
        ...composite,
        id: randomUUID(),
        logicalFamilyKey: "cross-owner-composite-family",
        version: 1,
        components: [{
          strategyDefinitionId: ownerBDefinition.id,
          strategyDefinitionVersion: ownerBDefinition.version,
        }],
      }),
    ).rejects.toThrow("NOT_FOUND");
  });

  it("allocates distinct versions for concurrent inserts in one owner/family", async () => {
    const family = "concurrent-family";
    const versionA = await dependencies!.definitionRepository.allocateNextVersion(ownerA, family);
    const versionB = await dependencies!.definitionRepository.allocateNextVersion(ownerA, family);
    const createdAt = "2026-08-30T00:00:03.000Z";
    const [first, second] = await Promise.all([
      dependencies!.definitionRepository.insert(ownerA, {
        id: randomUUID(),
        ownerUserId: ownerA,
        logicalFamilyKey: family,
        strategyName: "MA",
        implementationVersion: "1.0.0",
        behaviorProfileId: "TECHNICAL_PROFILES_V1",
        version: versionA,
        parameters: { fastPeriod: 2, slowPeriod: 3 },
        createdAt,
      }),
      dependencies!.definitionRepository.insert(ownerA, {
        id: randomUUID(),
        ownerUserId: ownerA,
        logicalFamilyKey: family,
        strategyName: "MA",
        implementationVersion: "1.0.0",
        behaviorProfileId: "TECHNICAL_PROFILES_V1",
        version: versionB,
        parameters: { fastPeriod: 2, slowPeriod: 3 },
        createdAt,
      }),
    ]);

    expect(new Set([first.version, second.version])).toEqual(new Set([1, 2]));
  });

  it("persists draft state with owner isolation through strategy_authoring_drafts", async () => {
    const createdAt = "2026-08-30T00:00:04.000Z";
    const draft: StrategyAuthoringDraftRecord = {
      id: randomUUID(),
      ownerUserId: ownerA,
      profileId: "LLM_AUTHORING_V1",
      source: { kind: "PROMPT" },
      provider: { id: "openai-compatible", modelId: "configured-model", configured: true },
      status: "DRAFT",
      structuredDraft: { period: 14 },
      createdAt,
      updatedAt: createdAt,
    };

    const inserted = await dependencies!.draftRepository.insert(ownerA, draft);
    expect(await dependencies!.draftRepository.getByOwnerAndId(ownerB, draft.id)).toBeUndefined();
    const validated = await dependencies!.draftRepository.save(ownerA, {
      ...inserted,
      status: "VALIDATED",
      validation: { valid: true, reasons: [], validatedAt: createdAt },
      updatedAt: "2026-08-30T00:00:05.000Z",
    });

    expect(validated).toMatchObject({
      id: draft.id,
      ownerUserId: ownerA,
      status: "VALIDATED",
      structuredDraft: { period: 14 },
      validation: { valid: true, reasons: [] },
    });
    expect(Object.isFrozen(validated)).toBe(true);
  });
});
