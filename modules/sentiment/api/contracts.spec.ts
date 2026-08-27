import { describe, expect, it } from "vitest";
import {
  LEXICON_V1,
  SENTIMENT_LABELS,
  type SentimentResult,
} from "./contracts";

describe("sentiment public contracts", () => {
  it("freezes local LEXICON_V1 identity while keeping the boundary model-neutral", () => {
    expect(SENTIMENT_LABELS).toEqual(["POSITIVE", "NEUTRAL", "NEGATIVE"]);
    expect(LEXICON_V1).toEqual({
      id: "LEXICON_V1",
      providerKind: "LOCAL_DETERMINISTIC_LEXICON",
      scoreRange: { minimum: -1, maximum: 1 },
      labels: ["POSITIVE", "NEUTRAL", "NEGATIVE"],
      hostedInference: false,
      modelDownloadRequired: false,
    });
    const result: SentimentResult = {
      newsId: "news-1",
      label: "NEUTRAL",
      score: 0,
      providerId: "replaceable-provider",
      analysisProfileId: "another-model-neutral-profile",
      modelName: "fixture",
      modelVersion: "1",
      analyzedAt: "2026-01-01T00:00:00Z",
    };
    expect(result.providerId).toBe("replaceable-provider");
  });
});
