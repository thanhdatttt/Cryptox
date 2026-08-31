import { Module, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { describe, expect, it } from "vitest";
import type {
  AuthModulePublicApi,
  AuthenticatedRequestContext,
  AuthenticatedSessionIdentity,
  AuthenticatedUserId,
} from "@cryptox/auth";
import type {
  StrategyAuthoringDraft,
  StrategyAuthoringPort,
  StrategyDefinition,
} from "@cryptox/strategy";
import * as strategyPublic from "@cryptox/strategy";
import type { StrategyModuleWithAuthoring } from "@cryptox/strategy/bootstrap";
import { CapabilitiesController } from "./capabilities.controller";
import { BACKEND_RUNTIME_TOKEN, createBackendRuntime, type BackendRuntime } from "./runtime";

const USER_A = "00000000-0000-4000-8000-000000000001" as AuthenticatedUserId;
const USER_B = "00000000-0000-4000-8000-000000000002" as AuthenticatedUserId;
const EXPIRES_AT = "2026-09-01T00:00:00.000Z";

function identity(authenticatedUserId: AuthenticatedUserId): AuthenticatedSessionIdentity {
  return { sessionId: `session-${authenticatedUserId}`, expiresAt: EXPIRES_AT, authenticatedUserId };
}

function createAuth(): AuthModulePublicApi {
  const tokens = new Map<string, AuthenticatedUserId>([
    ["token-a", USER_A],
    ["token-b", USER_B],
  ]);
  return {
    register: async () => { throw new Error("not used"); },
    login: async () => { throw new Error("not used"); },
    resolveSession: async (token) => {
      const userId = tokens.get(token);
      return userId === undefined ? undefined : identity(userId);
    },
    currentUser: async (context) => ({
      id: context.authenticatedUserId,
      email: `${context.authenticatedUserId}@example.test`,
      createdAt: EXPIRES_AT,
      updatedAt: EXPIRES_AT,
    }),
    logout: async () => undefined,
  };
}

function copy<T>(value: T): T {
  return structuredClone(value) as T;
}

function notUsed(): never {
  throw new Error("not used");
}

interface AuthoringFixture {
  readonly strategy: StrategyModuleWithAuthoring;
  readonly drafts: Map<string, StrategyAuthoringDraft>;
  readonly definitions: Map<string, StrategyDefinition>;
  readonly providerCalls: Array<{ prompt?: string; source: StrategyAuthoringDraft["source"] }>;
}

function createAuthoringStrategy(): AuthoringFixture {
  const drafts = new Map<string, StrategyAuthoringDraft>();
  const definitions = new Map<string, StrategyDefinition>();
  const providerCalls: Array<{ prompt?: string; source: StrategyAuthoringDraft["source"] }> = [];
  let draftSequence = 0;
  let definitionSequence = 0;

  const createAuthoringPort = (context: AuthenticatedRequestContext): StrategyAuthoringPort => {
    const ownerUserId = context.authenticatedUserId;
    return {
      createDraft: async (command) => {
        providerCalls.push({
          ...(command.prompt === undefined ? {} : { prompt: command.prompt }),
          source: copy(command.source),
        });
        const draft: StrategyAuthoringDraft = {
          id: `${ownerUserId}-draft-${++draftSequence}`,
          ownerUserId,
          profileId: "LLM_AUTHORING_V1",
          source: copy(command.source),
          provider: { id: "fixture-provider", modelId: "fixture-model", configured: true },
          status: "DRAFT",
          structuredDraft: { fastPeriod: 20, slowPeriod: 50 },
          createdAt: EXPIRES_AT,
          updatedAt: EXPIRES_AT,
        };
        drafts.set(draft.id, draft);
        return copy(draft);
      },
      validateDraft: async (submittedDraft) => {
        const current = drafts.get(submittedDraft.id);
        if (!current || current.ownerUserId !== ownerUserId) {
          throw Object.assign(new Error("private draft not found"), { code: "NOT_FOUND" });
        }
        if (current.status !== "DRAFT") return copy(current);
        const validated: StrategyAuthoringDraft = {
          ...current,
          status: "VALIDATED",
          validation: { valid: true, reasons: [], validatedAt: EXPIRES_AT },
          updatedAt: EXPIRES_AT,
        };
        drafts.set(validated.id, validated);
        return copy(validated);
      },
      approveDraft: async (draftId) => {
        const current = drafts.get(draftId);
        if (!current || current.ownerUserId !== ownerUserId) {
          throw Object.assign(new Error("private draft not found"), { code: "NOT_FOUND" });
        }
        if (current.status === "APPROVED" && current.approvedDefinitionId) {
          const existing = definitions.get(current.approvedDefinitionId);
          if (existing) return copy(existing);
        }
        if (current.status !== "VALIDATED") {
          throw Object.assign(new Error("draft is not validated"), { code: "DRAFT_NOT_VALIDATED" });
        }
        const definition: StrategyDefinition = {
          id: `${ownerUserId}-definition-${++definitionSequence}`,
          ownerUserId,
          logicalFamilyKey: "llm-authoring",
          strategyName: "MA",
          implementationVersion: "1.0.0",
          behaviorProfileId: "TECHNICAL_PROFILES_V1",
          version: 1,
          parameters: { ...current.structuredDraft },
          authoringOrigin: {
            kind: "LLM_DRAFT",
            draftId: current.id,
            providerId: current.provider.id,
            modelId: current.provider.modelId,
          },
          createdAt: EXPIRES_AT,
        };
        definitions.set(definition.id, definition);
        drafts.set(current.id, {
          ...current,
          status: "APPROVED",
          approvedDefinitionId: definition.id,
          updatedAt: EXPIRES_AT,
        });
        return copy(definition);
      },
    };
  };

  const strategy: StrategyModuleWithAuthoring = {
    listStrategies: strategyPublic.listStrategies,
    defineStrategy: async () => notUsed(),
    defineComposite: async () => notUsed(),
    readStrategyDefinition: async () => notUsed(),
    readCompositeDefinition: async () => notUsed(),
    listStrategyDefinitions: async () => notUsed(),
    listCompositeDefinitions: async () => notUsed(),
    resolveStrategy: async () => notUsed(),
    combineSignals: () => notUsed(),
    createAuthoringPort,
  };
  return { strategy, drafts, definitions, providerCalls };
}

async function startHttpApp(runtime: BackendRuntime): Promise<{
  app: INestApplication;
  baseUrl: string;
}> {
  @Module({
    controllers: [CapabilitiesController],
    providers: [{ provide: BACKEND_RUNTIME_TOKEN, useValue: runtime }],
  })
  class BackendIntegrationModule {}

  const app = await NestFactory.create(BackendIntegrationModule, { logger: false });
  await app.listen(0, "127.0.0.1");
  const address = app.getHttpServer().address() as { port: number } | string | null;
  if (!address || typeof address === "string") throw new Error("backend integration app did not bind");
  return { app, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function jsonRequest(
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<{ response: Response; body: unknown }> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) as unknown : undefined };
}

function actionBody(): string {
  return JSON.stringify({ schemaVersion: 1 });
}

describe("Strategy authoring REST composition", () => {
  it("enforces authentication and maps the owner-scoped Draft -> Validate -> Approve lifecycle", async () => {
    const fixture = createAuthoringStrategy();
    const runtime = createBackendRuntime({ auth: createAuth(), strategy: fixture.strategy, databaseReady: true });
    const { app, baseUrl } = await startHttpApp(runtime);
    try {
      const unauthenticated = await jsonRequest(`${baseUrl}`, "/strategy/authoring/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schemaVersion: 1, source: { kind: "PROMPT" }, prompt: "Draft a strategy." }),
      });
      expect(unauthenticated.response.status).toBe(401);
      expect(fixture.providerCalls).toHaveLength(0);

      const created = await jsonRequest(baseUrl, "/strategy/authoring/drafts", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: "cryptox_session=token-a" },
        body: JSON.stringify({ schemaVersion: 1, source: { kind: "PROMPT" }, prompt: "  Draft a strategy.  " }),
      });
      expect(created.response.status).toBe(200);
      const createdBody = created.body as { draft: StrategyAuthoringDraft };
      expect(createdBody.draft).toMatchObject({
        ownerUserId: USER_A,
        status: "DRAFT",
        provider: { id: "fixture-provider", modelId: "fixture-model", configured: true },
      });
      expect(createdBody.draft).not.toHaveProperty("prompt");
      expect(JSON.stringify(created.body)).not.toContain("Draft a strategy.");
      expect(fixture.providerCalls).toHaveLength(1);

      const draftId = createdBody.draft.id;
      const validated = await jsonRequest(baseUrl, `/strategy/authoring/drafts/${draftId}/validate`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: "cryptox_session=token-a" },
        body: actionBody(),
      });
      expect(validated.response.status).toBe(200);
      expect(validated.body).toMatchObject({ schemaVersion: 1, draft: { id: draftId, status: "VALIDATED" } });

      const approved = await jsonRequest(baseUrl, `/strategy/authoring/drafts/${draftId}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: "cryptox_session=token-a" },
        body: actionBody(),
      });
      expect(approved.response.status).toBe(200);
      expect(approved.body).toMatchObject({
        schemaVersion: 1,
        definition: {
          ownerUserId: USER_A,
          version: 1,
          authoringOrigin: {
            kind: "LLM_DRAFT",
            draftId,
            providerId: "fixture-provider",
            modelId: "fixture-model",
          },
        },
      });
      expect(fixture.definitions.size).toBe(1);

      const approvedAgain = await jsonRequest(baseUrl, `/strategy/authoring/drafts/${draftId}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: "cryptox_session=token-a" },
        body: actionBody(),
      });
      expect(approvedAgain.response.status).toBe(200);
      expect((approvedAgain.body as { definition: { id: string } }).definition.id)
        .toBe((approved.body as { definition: { id: string } }).definition.id);
      expect(fixture.definitions.size).toBe(1);

      const otherOwner = await jsonRequest(baseUrl, `/strategy/authoring/drafts/${draftId}/validate`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: "cryptox_session=token-b" },
        body: actionBody(),
      });
      expect(otherOwner.response.status).toBe(404);
      expect(JSON.stringify(otherOwner.body)).not.toContain(draftId);

      const unsafe = await jsonRequest(baseUrl, "/strategy/authoring/drafts", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: "cryptox_session=token-a" },
        body: JSON.stringify({
          schemaVersion: 1,
          source: { kind: "PROMPT" },
          prompt: "Draft a strategy.",
          ownerUserId: USER_B,
        }),
      });
      expect(unsafe.response.status).toBe(400);
      expect(fixture.providerCalls).toHaveLength(1);
    } finally {
      await app.close();
      await runtime.close();
    }
  });

  it("fails closed as unavailable when the configured runtime has no authoring provider seam", async () => {
    const strategy: import("@cryptox/strategy").StrategyModulePublicApi = {
      listStrategies: strategyPublic.listStrategies,
      defineStrategy: async () => notUsed(),
      defineComposite: async () => notUsed(),
      readStrategyDefinition: async () => notUsed(),
      readCompositeDefinition: async () => notUsed(),
      listStrategyDefinitions: async () => notUsed(),
      listCompositeDefinitions: async () => notUsed(),
      resolveStrategy: async () => notUsed(),
      combineSignals: () => notUsed(),
    };
    const runtime = createBackendRuntime({ auth: createAuth(), strategy, databaseReady: true });
    const strategyAvailabilityBefore = runtime.readiness().unavailableRequired
      .find((item) => item.name === "strategy-persistence");
    const { app, baseUrl } = await startHttpApp(runtime);
    try {
      const response = await jsonRequest(baseUrl, "/strategy/authoring/drafts", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: "cryptox_session=token-a" },
        body: JSON.stringify({ schemaVersion: 1, source: { kind: "PROMPT" }, prompt: "Draft a strategy." }),
      });
      expect(response.response.status).toBe(503);
      expect(response.body).toMatchObject({ error: { code: "CAPABILITY_UNAVAILABLE" } });
      expect(runtime.readiness().unavailableRequired
        .find((item) => item.name === "strategy-persistence"))
        .toEqual(strategyAvailabilityBefore);
    } finally {
      await app.close();
      await runtime.close();
    }
  });
});
