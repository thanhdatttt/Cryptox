import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUserId } from "modules/auth/api";
import { LLM_AUTHORING_V1_ID } from "modules/strategy/api/contracts";
import type { NewsReadItem } from "modules/news/api";
import type { StrategyAuthoringProviderPort, StrategyFactoryPort } from "./ports";
import {
  AUTHORING_PROFILE_ID,
  AUTHORING_TIMEOUT_MS,
  createStrategyAuthoringApplication,
  createStrategyAuthoringFactory,
  type StrategyAuthoringApplicationDependencies,
  type StrategyAuthoringDraftRecord,
} from "./authoring";
import { createInMemoryStrategyDependencies } from "./memory";

const userA = "user-a" as AuthenticatedUserId;
const userB = "user-b" as AuthenticatedUserId;
const fixedTime = "2026-08-30T00:00:00.000Z";

function makeFactory(): StrategyFactoryPort {
  return {
    descriptor: {
      name: "AUTHORING_TEST",
      displayName: "Authoring test strategy",
      description: "A deterministic test-only plugin.",
      category: "MOMENTUM",
      implementationVersion: "1.0.0",
      behaviorProfileId: "AUTHORING_TEST_PROFILE",
      parameters: [
        { key: "period", label: "Period", type: "INTEGER", required: true, defaultValue: 14, minimum: 1, maximum: 200 },
        { key: "mode", label: "Mode", type: "ENUM", required: false, defaultValue: "FAST", options: ["FAST", "SLOW"] },
      ],
      visualization: [],
    },
    create: () => ({
      name: "AUTHORING_TEST",
      category: "MOMENTUM",
      analyze: () => ({ signal: "HOLD" as const, signalAt: fixedTime, visualization: [] }),
    }),
  };
}

function makeProvider(
  result: Readonly<Record<string, unknown>> | undefined,
  failure?: unknown,
): StrategyAuthoringProviderPort & {
  configured: boolean;
  calls: Array<{ prompt?: string; newsItemId?: string; timeoutMs: 45_000 }>;
} {
  const calls: Array<{ prompt?: string; newsItemId?: string; timeoutMs: 45_000 }> = [];
  return {
    id: "test-provider",
    modelId: "test-model",
    configured: true,
    calls,
    createStructuredDraft: async (input) => {
      calls.push(input);
      if (failure !== undefined) throw failure;
      return result as Readonly<Record<string, never>>;
    },
  };
}

function makeDependencies(
  provider?: StrategyAuthoringApplicationDependencies["provider"],
  extra: Partial<StrategyAuthoringApplicationDependencies> = {},
) {
  const base = createInMemoryStrategyDependencies([makeFactory()]);
  let nextId = 0;
  return {
    ...base,
    provider,
    logicalFamilyKey: "authoring-family",
    strategyName: "AUTHORING_TEST",
    clock: { now: () => fixedTime },
    idFactory: () => `authoring-id-${++nextId}`,
    ...extra,
  } satisfies StrategyAuthoringApplicationDependencies;
}

function makeApplication(
  owner: AuthenticatedUserId = userA,
  provider?: StrategyAuthoringApplicationDependencies["provider"],
  extra: Partial<StrategyAuthoringApplicationDependencies> = {},
) {
  const dependencies = makeDependencies(provider, extra);
  return {
    application: createStrategyAuthoringApplication(owner, dependencies),
    dependencies,
  };
}

function approvedNewsItem(): NewsReadItem {
  return {
    id: "news-1",
    providerId: "news-provider",
    providerItemId: "item-1",
    title: "Bitcoin market update",
    content: "A persisted approved item used only as authoring input.",
    source: "test-feed",
    publishedAt: fixedTime,
    crawledAt: fixedTime,
    relatedCoins: ["BTC"],
    url: "https://example.test/article",
    extraction: {
      sourceKind: "RSS",
      canonicalUrl: "https://example.test/article",
      normalizedContentHash: "hash-1",
      template: {
        id: "template-1",
        sourceId: "test-feed",
        version: 3,
        status: "APPROVED",
      },
      extractedAt: fixedTime,
      normalizedRetainUntil: "2026-11-28T00:00:00.000Z",
    },
    sentiment: null,
  };
}

describe("Strategy authoring application", () => {
  it("makes one configured provider request with the hard timeout and stores only a structured draft", async () => {
    const provider = makeProvider({ mode: "FAST", period: 20 });
    const { application, dependencies } = makeApplication(userA, provider);

    const draft = await application.createDraft({
      source: { kind: "PROMPT" },
      prompt: "Create a momentum strategy for BTC.",
    });

    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]).toMatchObject({ timeoutMs: AUTHORING_TIMEOUT_MS });
    expect(draft).toMatchObject({
      ownerUserId: userA,
      profileId: LLM_AUTHORING_V1_ID,
      status: "DRAFT",
      structuredDraft: { mode: "FAST", period: 20 },
      provider: { id: "test-provider", modelId: "test-model", configured: true },
    });
    expect(draft).not.toHaveProperty("prompt");
    expect(dependencies.repositories.authoringDraftRepository.drafts.size).toBe(1);
    expect(Object.isFrozen(draft)).toBe(true);
    expect(Object.isFrozen(draft.structuredDraft)).toBe(true);
  });

  it("does not call or persist when provider configuration is missing", async () => {
    const provider = makeProvider({ period: 20 });
    provider.configured = false;
    const { application, dependencies } = makeApplication(userA, provider);

    const draft = await application.createDraft({ source: { kind: "PROMPT" }, prompt: "Draft it." });

    expect(draft.status).toBe("REJECTED");
    expect(draft.validation?.reasons).toContain("PROVIDER_NOT_CONFIGURED");
    expect(provider.calls).toHaveLength(0);
    expect(dependencies.repositories.authoringDraftRepository.drafts.size).toBe(0);
  });

  it.each([
    ["timeout", { code: "PROVIDER_TIMEOUT" }, "PROVIDER_TIMEOUT"],
    ["provider failure", new Error("private provider detail"), "PROVIDER_FAILURE"],
  ])("does not persist after %s", async (_label, failure, reason) => {
    const provider = makeProvider({ period: 20 }, failure);
    const { application, dependencies } = makeApplication(userA, provider);
    const draft = await application.createDraft({ source: { kind: "PROMPT" }, prompt: "Draft it." });

    expect(draft.status).toBe("REJECTED");
    expect(draft.validation?.reasons).toContain(reason);
    expect(dependencies.repositories.authoringDraftRepository.drafts.size).toBe(0);
  });

  it.each([
    ["malformed", { period: { value: 20 } }],
    ["invalid", { period: Number.NaN, mode: "FAST" }],
    ["unknown field", { period: 20, credentials: "secret" }],
  ])("rejects %s structured output before any definition write", async (_label, result) => {
    const provider = makeProvider(result);
    const { application, dependencies } = makeApplication(userA, provider);
    const allocate = vi.spyOn(dependencies.definitionRepository, "allocateNextVersion");
    const insert = vi.spyOn(dependencies.definitionRepository, "insert");

    const draft = await application.createDraft({ source: { kind: "PROMPT" }, prompt: "Draft it." });

    expect(draft.status).toBe("REJECTED");
    expect(draft.validation?.reasons).toContain("INVALID_PROVIDER_DRAFT");
    expect(allocate).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
    expect(dependencies.repositories.authoringDraftRepository.drafts.size).toBe(0);
  });

  it("requires deterministic validation before approval and leaves rejected approval unchanged", async () => {
    const provider = makeProvider({ period: 20, mode: "FAST" });
    const { application, dependencies } = makeApplication(userA, provider);
    const draft = await application.createDraft({ source: { kind: "PROMPT" }, prompt: "Draft it." });
    const allocate = vi.spyOn(dependencies.definitionRepository, "allocateNextVersion");
    const insert = vi.spyOn(dependencies.definitionRepository, "insert");

    await expect(application.approveDraft(draft.id)).rejects.toMatchObject({ code: "DRAFT_NOT_VALIDATED" });
    expect(allocate).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
    expect((await dependencies.repositories.authoringDraftRepository.getByOwnerAndId(userA, draft.id))?.status)
      .toBe("DRAFT");

    const rejected = await application.createDraft({ source: { kind: "PROMPT" }, prompt: "" });
    await expect(application.approveDraft(rejected.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dependencies.repositories.authoringDraftRepository.drafts.size).toBe(1);
  });

  it("creates one immutable owner-scoped version and makes repeated approval idempotent", async () => {
    const provider = makeProvider({ period: 20, mode: "FAST" });
    const { application, dependencies } = makeApplication(userA, provider);
    const draft = await application.createDraft({ source: { kind: "PROMPT" }, prompt: "Draft it." });
    await expect(application.validateDraft({ ...draft, ownerUserId: userB })).resolves.toMatchObject({
      ownerUserId: userA,
      status: "VALIDATED",
    });
    const allocate = vi.spyOn(dependencies.definitionRepository, "allocateNextVersion");
    const insert = vi.spyOn(dependencies.definitionRepository, "insert");

    const first = await application.approveDraft(draft.id);
    const second = await application.approveDraft(draft.id);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      ownerUserId: userA,
      logicalFamilyKey: "authoring-family",
      version: 1,
      authoringOrigin: {
        kind: "LLM_DRAFT",
        draftId: draft.id,
        providerId: "test-provider",
        modelId: "test-model",
      },
    });
    expect(allocate).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(dependencies.repositories.definitions.size).toBe(1);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.parameters)).toBe(true);
    expect(JSON.stringify(first)).not.toMatch(/prompt|completion|secret|token|url/i);
  });

  it("serializes concurrent approval across separately-created authenticated ports", async () => {
    const provider = makeProvider({ period: 20, mode: "FAST" });
    const dependencies = makeDependencies(provider);
    const authoringFactory = createStrategyAuthoringFactory(dependencies);
    const firstPort = authoringFactory({ authenticatedUserId: userA });
    const secondPort = authoringFactory({ authenticatedUserId: userA });
    const draft = await firstPort.createDraft({ source: { kind: "PROMPT" }, prompt: "Draft it." });
    const validated = await firstPort.validateDraft(draft);
    const allocate = vi.spyOn(dependencies.definitionRepository, "allocateNextVersion");
    const insert = vi.spyOn(dependencies.definitionRepository, "insert");
    const originalGetByOwnerAndId = dependencies.draftRepository.getByOwnerAndId.bind(dependencies.draftRepository);
    let firstApprovalRead = true;
    vi.spyOn(dependencies.draftRepository, "getByOwnerAndId").mockImplementation(async (ownerUserId, draftId) => {
      const stored = await originalGetByOwnerAndId(ownerUserId, draftId);
      if (firstApprovalRead) {
        firstApprovalRead = false;
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      return stored;
    });

    const [first, second] = await Promise.all([
      firstPort.approveDraft(validated.id),
      secondPort.approveDraft(validated.id),
    ]);

    expect(first).toEqual(second);
    expect(allocate).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(dependencies.repositories.definitions.size).toBe(1);
    expect(first).toMatchObject({ ownerUserId: userA, version: 1 });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.parameters)).toBe(true);
    expect(
      (await dependencies.draftRepository.getByOwnerAndId(userA, validated.id))?.approvedDefinitionId,
    ).toBe(first.id);
  });

  it("isolates owners and rejects unauthenticated composition", async () => {
    const provider = makeProvider({ period: 20, mode: "FAST" });
    const ownerApp = makeApplication(userA, provider);
    const draft = await ownerApp.application.createDraft({ source: { kind: "PROMPT" }, prompt: "Draft it." });
    const otherApp = makeApplication(userB, provider).application;

    await expect(otherApp.validateDraft(draft)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(otherApp.approveDraft(draft.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(() => createStrategyAuthoringApplication(undefined, ownerApp.dependencies)).toThrow("UNAUTHENTICATED");
  });

  it("uses only the public News reader for approved persisted content and records safe origin", async () => {
    const item = approvedNewsItem();
    const queries: unknown[] = [];
    const news = {
      readNews: async (query: unknown) => {
        queries.push(query);
        return { items: [item] };
      },
    };
    const provider = makeProvider({ period: 20, mode: "SLOW" });
    const { application, dependencies } = makeApplication(userA, provider, { news });

    const draft = await application.createDraft({
      source: { kind: "APPROVED_NEWS_ITEM", newsItemId: item.id },
      prompt: "This must not replace News content.",
    });
    expect(draft.status).toBe("DRAFT");
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]?.newsItemId).toBe(item.id);
    expect(provider.calls[0]?.prompt).toContain(item.content);
    expect(provider.calls[0]?.prompt).not.toContain(item.url);
    expect(draft.source).toEqual({ kind: "APPROVED_NEWS_ITEM", newsItemId: item.id });
    expect(dependencies.repositories.authoringDraftRepository.drafts.get(draft.id)).not.toHaveProperty("url");

    const validated = await application.validateDraft(draft);
    const definition = await application.approveDraft(validated.id);
    expect(definition.authoringOrigin).toEqual({
      kind: "APPROVED_NEWS_ITEM",
      newsItemId: item.id,
      extractionTemplateVersion: 3,
    });
    expect(queries).toHaveLength(2);
    expect(queries).toEqual([
      { limit: 10_000, order: "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC" },
      { limit: 10_000, order: "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC" },
    ]);
  });

  it("does not substitute arbitrary URL content or accept a non-approved News item", async () => {
    const news = {
      readNews: async () => ({
        items: [{ ...approvedNewsItem(), extraction: { ...approvedNewsItem().extraction!, template: {
          ...approvedNewsItem().extraction!.template!, status: "DRAFT" as const,
        } } }],
      }),
    };
    const provider = makeProvider({ period: 20 });
    const { application, dependencies } = makeApplication(userA, provider, { news });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const draft = await application.createDraft({
      source: { kind: "APPROVED_NEWS_ITEM", newsItemId: "news-1" },
      prompt: "https://attacker.example/raw content",
    });

    expect(draft.status).toBe("REJECTED");
    expect(draft.validation?.reasons).toContain("NEWS_ITEM_NOT_APPROVED");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(provider.calls).toHaveLength(0);
    expect(dependencies.repositories.authoringDraftRepository.drafts.size).toBe(0);
    fetchSpy.mockRestore();
  });

  it("rejects an invalid persisted draft without saving or allocating a definition", async () => {
    const provider = makeProvider({ period: 20, mode: "FAST" });
    const { application, dependencies } = makeApplication(userA, provider);
    const draft = await application.createDraft({ source: { kind: "PROMPT" }, prompt: "Draft it." });
    const stored = dependencies.repositories.authoringDraftRepository.drafts.get(draft.id)!;
    dependencies.repositories.authoringDraftRepository.drafts.set(draft.id, {
      ...stored,
      structuredDraft: { period: Number.NaN, mode: "FAST" },
    } as StrategyAuthoringDraftRecord);
    const save = vi.spyOn(dependencies.draftRepository, "save");
    const allocate = vi.spyOn(dependencies.definitionRepository, "allocateNextVersion");

    const result = await application.validateDraft(draft);

    expect(result.status).toBe("REJECTED");
    expect(save).not.toHaveBeenCalled();
    expect(allocate).not.toHaveBeenCalled();
  });
});
