import { describe, expect, it } from "vitest";
import {
  REST_SCHEMA_VERSION,
  RestContractValidationError,
  parseCreateStrategyAuthoringDraftRequest,
  parseStrategyAuthoringDraftActionRequest,
  parseStrategyAuthoringDraftId,
} from "./index";

describe("Strategy authoring REST contracts", () => {
  it("accepts only a bounded prompt or approved News reference", () => {
    expect(parseCreateStrategyAuthoringDraftRequest({
      schemaVersion: REST_SCHEMA_VERSION,
      source: { kind: "PROMPT" },
      prompt: "  Create a moving-average draft.  ",
    })).toEqual({
      schemaVersion: REST_SCHEMA_VERSION,
      source: { kind: "PROMPT" },
      prompt: "Create a moving-average draft.",
    });

    expect(parseCreateStrategyAuthoringDraftRequest({
      schemaVersion: REST_SCHEMA_VERSION,
      source: { kind: "APPROVED_NEWS_ITEM", newsItemId: " news-1 " },
    })).toEqual({
      schemaVersion: REST_SCHEMA_VERSION,
      source: { kind: "APPROVED_NEWS_ITEM", newsItemId: "news-1" },
    });
  });

  it("rejects identity, credential, raw-output, URL, and blank input fields", () => {
    const invalidRequests: unknown[] = [
      { schemaVersion: REST_SCHEMA_VERSION, source: { kind: "PROMPT" }, prompt: "  " },
      { schemaVersion: REST_SCHEMA_VERSION, source: { kind: "APPROVED_NEWS_ITEM", newsItemId: "  " } },
      { schemaVersion: REST_SCHEMA_VERSION, source: { kind: "PROMPT" }, prompt: "draft", ownerUserId: "user-b" },
      { schemaVersion: REST_SCHEMA_VERSION, source: { kind: "PROMPT" }, prompt: "draft", apiKey: null },
      { schemaVersion: REST_SCHEMA_VERSION, source: { kind: "PROMPT" }, prompt: "draft", url: "https://example.test" },
      { schemaVersion: REST_SCHEMA_VERSION, source: { kind: "PROMPT" }, prompt: "draft", structuredDraft: {} },
    ];

    for (const request of invalidRequests) {
      expect(() => parseCreateStrategyAuthoringDraftRequest(request))
        .toThrow(RestContractValidationError);
    }
  });

  it("keeps Validate and Approve actions body-only and bounds opaque ids", () => {
    expect(parseStrategyAuthoringDraftActionRequest({ schemaVersion: REST_SCHEMA_VERSION }))
      .toEqual({ schemaVersion: REST_SCHEMA_VERSION });
    expect(parseStrategyAuthoringDraftId(" draft-1 ")).toBe("draft-1");
    expect(() => parseStrategyAuthoringDraftActionRequest({ schemaVersion: REST_SCHEMA_VERSION, draft: {} }))
      .toThrow(RestContractValidationError);
    expect(() => parseStrategyAuthoringDraftId("draft id")).toThrow(RestContractValidationError);
    expect(() => parseStrategyAuthoringDraftId(" ")).toThrow(RestContractValidationError);
  });
});
