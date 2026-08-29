import { describe, expect, it } from "vitest";
import { createSentimentApplication, joinNewsSentimentProvenance } from "./service";
import { createLexiconV1Provider } from "./lexicon";
import { InMemorySentimentResultRepository } from "./memory";
import type { NewsExtractionProvenanceInput } from "./ports";

const input = {
  newsId: "00000000-0000-4000-8000-000000000021",
  title: "Bitcoin gains",
  content: "The market is bullish.",
  source: "configured-source",
  publishedAt: "2026-01-01T00:00:00.000Z",
  relatedCoins: ["BTC"],
};

const provenance: NewsExtractionProvenanceInput = {
  sourceKind: "ALLOWLISTED_URL_IMPORT",
  canonicalUrl: "https://news.example.test/article",
  normalizedContentHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  templateVersion: 3,
  extractedAt: "2026-01-01T00:01:00.000Z",
};

function application() {
  const repository = new InMemorySentimentResultRepository();
  const app = createSentimentApplication({
    provider: createLexiconV1Provider(),
    resultRepository: repository,
    clock: { now: () => "2026-01-01T00:02:00.000Z" },
    observability: { recordInferenceFailure: () => undefined },
  });
  return { app, repository };
}

describe("neutral News-to-Sentiment provenance join [CSL-R-SN-01, CSL-R-RP-02]", () => {
  it("joins only a successful stored result and retains safe extraction provenance", async () => {
    const { app } = application();
    const result = await app.analyze(input);
    await expect(app.readLatestForNewsWithProvenance(input.newsId, provenance)).resolves.toEqual({
      newsId: input.newsId,
      result,
      newsExtraction: provenance,
    });
  });

  it("does not fabricate a result for missing sentiment and rejects unsafe provenance", async () => {
    const { app } = application();
    await expect(app.readLatestForNewsWithProvenance("00000000-0000-4000-8000-000000000022", provenance)).resolves.toBeUndefined();
    expect(() => joinNewsSentimentProvenance({
      newsId: input.newsId,
      label: "NEUTRAL",
      score: 0,
      providerId: "provider",
      analysisProfileId: "profile",
      modelName: "model",
      modelVersion: "1",
      analyzedAt: "2026-01-01T00:00:00.000Z",
    }, { ...provenance, canonicalUrl: "http://private.example.test/article" })).toThrow("INVALID_PROVENANCE");
  });

  it("contains no provider-specific fields in the joined projection", async () => {
    const { app } = application();
    await app.analyze(input);
    const joined = await app.readLatestForNewsWithProvenance(input.newsId, provenance);
    expect(joined).not.toHaveProperty("rawResponse");
    expect(joined?.newsExtraction).toEqual(provenance);
  });
});
