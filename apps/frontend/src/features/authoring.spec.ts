import { describe, expect, it, vi } from "vitest";
import type {
  ApproveStrategyAuthoringDraftResponseDto,
  NewsPageResponseDto,
  StrategyAuthoringDraftDto,
  StrategyCatalogResponseDto,
  StrategyDefinitionDto,
} from "@cryptox/contracts/rest";
import { InMemoryPrivateCache } from "../auth/cache";
import { FeatureClientError, RestFeatureClient } from "./clients";
import {
  FIXTURE_AUTHORING_PARAMETERS,
  FIXTURE_AUTHORING_PROVIDER,
} from "./fixture-data";
import { FixtureFeatureClient } from "./fixture-client";
import { FeatureWorkspaceStore } from "./state";
import {
  FEATURE_PRIVATE_CACHE_KEY,
  READY_AUTHORING_STATE,
  type FeaturePrivateCache,
  type FeatureWorkspaceCache,
} from "./types";

const OWNER = "authoring-owner";
const RAW_PROMPT = "raw prompt must never enter a response or cache";
const RAW_COMPLETION = "raw completion must never enter a response or cache";

function response(value: unknown, status = 200): Pick<Response, "ok" | "status" | "json"> {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
  };
}

function draft(status: StrategyAuthoringDraftDto["status"] = "DRAFT"): StrategyAuthoringDraftDto {
  return {
    id: "opaque-draft-1",
    ownerUserId: OWNER,
    profileId: "LLM_AUTHORING_V1",
    source: { kind: "PROMPT" },
    provider: { ...FIXTURE_AUTHORING_PROVIDER },
    status,
    structuredDraft: { ...FIXTURE_AUTHORING_PARAMETERS },
    ...(status === "VALIDATED"
      ? { validation: { valid: true, reasons: [], validatedAt: "2026-08-31T00:00:01.000Z" } }
      : {}),
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:01.000Z",
  };
}

function definition(): StrategyDefinitionDto {
  return {
    id: "opaque-definition-1",
    ownerUserId: OWNER,
    logicalFamilyKey: "authoring-family",
    strategyName: "MA",
    implementationVersion: "1.0.0",
    behaviorProfileId: "TECHNICAL_PROFILES_V1",
    version: 1,
    parameters: { ...FIXTURE_AUTHORING_PARAMETERS },
    authoringOrigin: {
      kind: "LLM_DRAFT",
      draftId: "opaque-draft-1",
      providerId: FIXTURE_AUTHORING_PROVIDER.id,
      modelId: FIXTURE_AUTHORING_PROVIDER.modelId,
    },
    createdAt: "2026-08-31T00:00:02.000Z",
  };
}

function emptyFeatureCache(): FeatureWorkspaceCache {
  return {
    authoring: READY_AUTHORING_STATE,
    descriptors: [],
    strategyDefinitions: [],
    compositeDefinitions: [],
    searchRuns: [],
    searchRankings: {},
    experiments: [],
    trades: [],
    newsStatus: "unavailable",
  };
}

class RevisionlessCache implements FeaturePrivateCache {
  public getCalls = 0;
  public setCalls = 0;

  public constructor(private readonly initial?: FeatureWorkspaceCache) {}

  public get<T>(_key: string): T | undefined {
    this.getCalls += 1;
    return this.initial as T | undefined;
  }

  public set(_key: string, _value: unknown): void {
    this.setCalls += 1;
  }
}

describe("LLM authoring frontend boundary", () => {
  it("uses same-origin typed requests and strips raw prompt/completion fields from responses", async () => {
    const requests: Array<{ input: string; init?: RequestInit }> = [];
    const approvedDefinition = definition();
    const fetcher = async (input: string, init?: RequestInit) => {
      requests.push({ input, init });
      if (input.endsWith("/validate")) {
        return response({ schemaVersion: 1, draft: draft("VALIDATED") });
      }
      if (input.endsWith("/approve")) {
        return response({
          schemaVersion: 1,
          definition: { ...approvedDefinition, completion: RAW_COMPLETION, credentials: "provider-secret" },
        });
      }
      return response({
        schemaVersion: 1,
        draft: { ...draft(), prompt: RAW_PROMPT, completion: RAW_COMPLETION, credentials: "provider-secret" },
      });
    };
    const client = new RestFeatureClient("/api", fetcher);

    const saved = await client.createStrategyAuthoringDraft({
      schemaVersion: 1,
      source: { kind: "PROMPT" },
      prompt: RAW_PROMPT,
    });
    expect(saved.draft.id).toBe("opaque-draft-1");
    expect(saved.draft).not.toHaveProperty("prompt");
    expect(saved.draft).not.toHaveProperty("completion");
    expect(saved.draft).not.toHaveProperty("credentials");
    expect(requests[0]?.input).toBe("/api/strategy/authoring/drafts");
    expect(JSON.parse(String(requests[0]?.init?.body))).toEqual({
      schemaVersion: 1,
      source: { kind: "PROMPT" },
      prompt: RAW_PROMPT,
    });
    expect(requests[0]?.init?.credentials).toBe("include");
    expect(requests[0]?.init?.headers).toEqual({ accept: "application/json", "content-type": "application/json" });
    expect(requests[0]?.init?.headers).not.toHaveProperty("authorization");

    const validated = await client.validateStrategyAuthoringDraft(saved.draft.id, { schemaVersion: 1 });
    expect(validated.draft.status).toBe("VALIDATED");
    expect(requests[1]?.input).toBe("/api/strategy/authoring/drafts/opaque-draft-1/validate");
    expect(JSON.parse(String(requests[1]?.init?.body))).toEqual({ schemaVersion: 1 });

    const approved = await client.approveStrategyAuthoringDraft(saved.draft.id, { schemaVersion: 1 });
    expect(approved.definition).toEqual(approvedDefinition);
    expect(approved.definition).not.toHaveProperty("completion");
    expect(approved.definition).not.toHaveProperty("credentials");
    expect(requests[2]?.input).toBe("/api/strategy/authoring/drafts/opaque-draft-1/approve");
    expect(JSON.parse(String(requests[2]?.init?.body))).toEqual({ schemaVersion: 1 });
  });

  it("fails closed before fetching when the REST base is not a same-origin path", async () => {
    const fetcher = vi.fn(async () => response({ schemaVersion: 1 }));
    const client = new RestFeatureClient("https://external.example.test/api", fetcher);

    expect(client.authoringTransportAvailable).toBe(false);
    await expect(client.createStrategyAuthoringDraft({
      schemaVersion: 1,
      source: { kind: "PROMPT" },
      prompt: "prompt",
    })).rejects.toMatchObject({ status: 503, code: "TRANSPORT_UNAVAILABLE" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("projects explicit Save, Validate, and Approve transitions with safe post-approval provenance", async () => {
    const cache = new InMemoryPrivateCache();
    const store = new FeatureWorkspaceStore(new FixtureFeatureClient({ ownerUserId: OWNER }), cache);
    await store.load();

    await store.createStrategyAuthoringDraft({ source: { kind: "PROMPT" }, prompt: RAW_PROMPT });
    expect(store.snapshot().authoring).toMatchObject({
      status: "DRAFT",
      actions: { save: true, validate: true, approve: false },
    });
    expect(JSON.stringify(store.snapshot())).not.toContain(RAW_PROMPT);
    const draftId = store.snapshot().authoring.draft?.id;
    if (!draftId) throw new Error("The fixture did not return a draft id");

    await store.validateStrategyAuthoringDraft(draftId);
    expect(store.snapshot().authoring).toMatchObject({
      status: "VALIDATED",
      actions: { save: true, validate: false, approve: true },
      draft: { id: draftId, status: "VALIDATED" },
    });

    await store.approveStrategyAuthoringDraft(draftId);
    const authoring = store.snapshot().authoring;
    expect(authoring).toMatchObject({
      status: "APPROVED",
      actions: { save: true, validate: false, approve: false },
      draft: { id: draftId, status: "APPROVED" },
    });
    expect(authoring.definition?.id).toBe(authoring.draft?.approvedDefinitionId);
    expect(store.snapshot().strategyDefinitions.some((item) => item.id === authoring.definition?.id)).toBe(true);
    expect(authoring.definition?.authoringOrigin).toMatchObject({ kind: "LLM_DRAFT", draftId });
    expect(JSON.stringify(cache.get(FEATURE_PRIVATE_CACHE_KEY))).not.toContain(RAW_PROMPT);
    expect(JSON.stringify(cache.get(FEATURE_PRIVATE_CACHE_KEY))).not.toContain(RAW_COMPLETION);
  });

  it("accepts only a loaded News item with an approved existing template", async () => {
    const client = new FixtureFeatureClient({ ownerUserId: "news-owner" });

    await expect(client.createStrategyAuthoringDraft({
      schemaVersion: 1,
      source: { kind: "APPROVED_NEWS_ITEM", newsItemId: "fixture-news-1" },
    })).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });

    const news = await client.news();
    expect(news.items.some((item) => item.id === "fixture-news-1")).toBe(true);
    await expect(client.createStrategyAuthoringDraft({
      schemaVersion: 1,
      source: { kind: "APPROVED_NEWS_ITEM", newsItemId: "fixture-news-1" },
    })).resolves.toMatchObject({ draft: { source: { kind: "APPROVED_NEWS_ITEM", newsItemId: "fixture-news-1" } } });
    await expect(client.createStrategyAuthoringDraft({
      schemaVersion: 1,
      source: { kind: "APPROVED_NEWS_ITEM", newsItemId: "fixture-news-2" },
    })).rejects.toMatchObject({ status: 409, code: "NEWS_ITEM_NOT_APPROVED" });
  });

  it.each([
    ["rejected", "REJECTED", "INVALID_PROVIDER_DRAFT"],
    ["failure", "FAILURE", "SAVE"],
    ["unavailable", "UNAVAILABLE", "CAPABILITY_UNAVAILABLE"],
  ] as const)("keeps the %s authoring state distinct", async (behavior, status, marker) => {
    const store = new FeatureWorkspaceStore(
      new FixtureFeatureClient({ ownerUserId: `state-${behavior}`, authoringBehavior: behavior }),
      new InMemoryPrivateCache(),
    );
    await store.load();
    await store.createStrategyAuthoringDraft({ source: { kind: "PROMPT" }, prompt: "state test" });

    expect(store.snapshot().authoring.status).toBe(status);
    if (status === "REJECTED") {
      expect(store.snapshot().authoring.message).toContain(marker);
      expect(store.snapshot().authoring.actions).toEqual({ save: true, validate: false, approve: false });
    } else if (status === "FAILURE") {
      expect(store.snapshot().authoring.failedAction).toBe(marker);
      expect(store.snapshot().authoring.draft).toBeUndefined();
    } else {
      expect(store.snapshot().authoring.reason).toBe(marker);
      expect(store.snapshot().authoring.actions).toEqual({ save: false, validate: false, approve: false });
    }
  });

  it("does not read or write private cache state without a revision boundary", async () => {
    const staleCache = new RevisionlessCache({
      ...emptyFeatureCache(),
      strategyDefinitions: [{
        id: "user-a-private-definition",
        ownerUserId: "user-a",
        logicalFamilyKey: "private",
        strategyName: "MA",
        implementationVersion: "1.0.0",
        behaviorProfileId: "TECHNICAL_PROFILES_V1",
        version: 1,
        parameters: {},
        createdAt: "2026-08-31T00:00:00.000Z",
      }],
    });
    const store = new FeatureWorkspaceStore(new FixtureFeatureClient({ ownerUserId: "user-b" }), staleCache);

    await store.load();

    expect(staleCache.getCalls).toBe(0);
    expect(staleCache.setCalls).toBe(0);
    expect(store.snapshot().strategyDefinitions.every((item) => item.ownerUserId === "user-b")).toBe(true);
  });

  it("does not publish or cache an in-flight private response after the revision changes", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    class DeferredCatalogClient extends FixtureFeatureClient {
      public override async strategyCatalog(): Promise<StrategyCatalogResponseDto> {
        await gate;
        return super.strategyCatalog();
      }
    }

    const cache = new InMemoryPrivateCache();
    const store = new FeatureWorkspaceStore(new DeferredCatalogClient({ ownerUserId: "user-a" }), cache);
    const loading = store.load();
    await Promise.resolve();
    cache.clear();
    release();
    await loading;

    expect(cache.has(FEATURE_PRIVATE_CACHE_KEY)).toBe(false);
    expect(store.snapshot().strategyDefinitions).toEqual([]);
  });

  it("keeps owner and draft identifiers server-scoped", async () => {
    const ownerA = new FixtureFeatureClient({ ownerUserId: "user-a" });
    const ownerB = new FixtureFeatureClient({ ownerUserId: "user-b" });
    const draftA = await ownerA.createStrategyAuthoringDraft({ schemaVersion: 1, source: { kind: "PROMPT" }, prompt: "owner A" });

    await expect(ownerB.validateStrategyAuthoringDraft(draftA.draft.id, { schemaVersion: 1 })).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
    await expect(ownerB.approveStrategyAuthoringDraft(draftA.draft.id, { schemaVersion: 1 })).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
    expect((await ownerB.strategyDefinitions()).items.every((item) => item.ownerUserId === "user-b")).toBe(true);
  });

  it("keeps an unavailable transport state even when core loading fails", async () => {
    const fetcher = vi.fn(async () => response({ schemaVersion: 1 }));
    const store = new FeatureWorkspaceStore(
      new RestFeatureClient("https://external.example.test", fetcher),
      new InMemoryPrivateCache(),
    );

    expect(store.snapshot().authoring.status).toBe("UNAVAILABLE");
    await store.load();
    expect(store.snapshot().authoring).toMatchObject({
      status: "UNAVAILABLE",
      actions: { save: false, validate: false, approve: false },
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
