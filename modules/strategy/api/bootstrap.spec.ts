import { describe, expect, it } from "vitest";
import type { AuthenticatedRequestContext, AuthenticatedUserId } from "modules/auth/api";
import { createInMemoryStrategyDependencies } from "../application/memory";
import type { StrategyAuthoringApplicationDependencies } from "../application/authoring";
import {
  createPostgresStrategyDependencies,
  createStrategyAuthoringPort,
  createStrategyAuthoringPortFactory,
  createStrategyModule,
  type PostgresPool,
  type PostgresQueryResult,
} from "./bootstrap";

const userA = "trusted-a" as AuthenticatedUserId;
const userB = "trusted-b" as AuthenticatedUserId;

function dependencies(): StrategyAuthoringApplicationDependencies {
  const base = createInMemoryStrategyDependencies([{
    descriptor: {
      name: "BOOTSTRAP_TEST",
      displayName: "Bootstrap test strategy",
      description: "Test-only strategy.",
      category: "TREND",
      implementationVersion: "1",
      behaviorProfileId: "BOOTSTRAP_TEST_V1",
      parameters: [{ key: "period", label: "Period", type: "INTEGER", required: true, defaultValue: 14, minimum: 1 }],
      visualization: [],
    },
    create: () => ({
      name: "BOOTSTRAP_TEST",
      category: "TREND",
      analyze: () => ({ signal: "HOLD" as const, signalAt: "2026-08-30T00:00:00.000Z", visualization: [] }),
    }),
  }]);
  let nextId = 0;
  return {
    ...base,
    provider: {
      id: "bootstrap-provider",
      modelId: "bootstrap-model",
      configured: true,
      createStructuredDraft: async () => ({ period: 14 }),
    },
    logicalFamilyKey: "bootstrap-family",
    strategyName: "BOOTSTRAP_TEST",
    clock: { now: () => "2026-08-30T00:00:00.000Z" },
    idFactory: () => `bootstrap-${++nextId}`,
  } satisfies StrategyAuthoringApplicationDependencies;
}

describe("Strategy authoring API composition", () => {
  it("binds trusted request identity before exposing the frozen authoring port", async () => {
    const port = createStrategyAuthoringPort({ authenticatedUserId: userA }, dependencies());
    const draft = await port.createDraft({ source: { kind: "PROMPT" }, prompt: "Make a strategy." });

    expect(draft.ownerUserId).toBe(userA);
    expect(draft).not.toHaveProperty("authenticatedUserId");
  });

  it("rejects missing identity and isolates ports created for different owners", async () => {
    const deps = dependencies();
    expect(() => createStrategyAuthoringPort(
      undefined as unknown as AuthenticatedRequestContext,
      deps,
    )).toThrow("UNAUTHENTICATED");

    const factory = createStrategyAuthoringPortFactory(deps);
    const first = await factory({ authenticatedUserId: userA }).createDraft({
      source: { kind: "PROMPT" },
      prompt: "First draft.",
    });
    const secondPort = factory({ authenticatedUserId: userB });

    await expect(secondPort.validateDraft(first)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(first.ownerUserId).toBe(userA);
  });

  it("accepts the PostgreSQL repositories through the public Strategy bootstrap boundary", async () => {
    const calls: string[] = [];
    const pool: PostgresPool = {
      query: async <Row extends Record<string, unknown>>(text: string) => {
        calls.push(text);
        const response = calls.length === 1
          ? { rows: [{ next_version: 1 }] }
          : {
            rows: [{
              id: "00000000-0000-4000-8000-000000000031",
              owner_user_id: userA,
              logical_family_key: "bootstrap-family",
              strategy_name: "BOOTSTRAP_TEST",
              implementation_version: "1",
              behavior_profile_id: "BOOTSTRAP_TEST_V1",
              version: 1,
              parameters: { period: 14 },
              authoring_origin: null,
              created_at: "2026-08-30T00:00:00.000Z",
            }],
          };
        return response as unknown as PostgresQueryResult<Row>;
      },
      end: async () => undefined,
    };
    const postgres = createPostgresStrategyDependencies({ connectionString: "", pool });
    const inMemory = dependencies();
    const strategyModule = createStrategyModule({
      factories: inMemory.factories,
      definitionRepository: postgres.definitionRepository,
      compositeRepository: postgres.compositeRepository,
    });

    const result = await strategyModule.defineStrategy(
      { authenticatedUserId: userA },
      { logicalFamilyKey: "bootstrap-family", strategyName: "BOOTSTRAP_TEST", parameters: { period: 14 } },
    );

    expect(result).toMatchObject({ ownerUserId: userA, version: 1, strategyName: "BOOTSTRAP_TEST" });
    expect(calls).toHaveLength(2);
    await postgres.close();
  });
});
