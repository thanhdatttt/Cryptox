import { describe, expect, it } from "vitest";
import type { SentimentAnalysisInput } from "./ports";
import {
  createLexiconV1Provider,
  LEXICON_V1_ANALYSIS_PROFILE_ID,
  LEXICON_V1_MODEL_NAME,
  LEXICON_V1_MODEL_VERSION,
} from "./lexicon";

const input: SentimentAnalysisInput = {
  newsId: "00000000-0000-4000-8000-000000000001",
  title: "Bitcoin market",
  content: "The market is stable.",
  source: "fixture-provider",
  publishedAt: "2026-01-01T00:00:00.000Z",
  relatedCoins: ["BTC"],
};

async function scoreFor(content: string) {
  return createLexiconV1Provider().analyze({ ...input, content });
}

describe("LEXICON_V1 local provider [CSL-R-SN-01]", () => {
  it("classifies positive, neutral, and negative fixture text", async () => {
    await expect(scoreFor("Bitcoin rallied and the outlook is bullish with strong growth.")).resolves.toMatchObject({
      label: "POSITIVE",
    });
    await expect(scoreFor("Bitcoin market update continues today.")).resolves.toMatchObject({
      label: "NEUTRAL",
      score: 0,
    });
    await expect(scoreFor("Bitcoin crashed and the outlook is bearish with weak demand.")).resolves.toMatchObject({
      label: "NEGATIVE",
    });
  });

  it("returns finite scores in the normalized range with stable provenance", async () => {
    const result = await scoreFor("The project achieved a milestone.");

    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(-1);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result).toMatchObject({
      providerId: "LEXICON_V1",
      analysisProfileId: LEXICON_V1_ANALYSIS_PROFILE_ID,
      modelName: LEXICON_V1_MODEL_NAME,
      modelVersion: LEXICON_V1_MODEL_VERSION,
    });
  });

  it("is deterministic and applies the documented negation/intensifier policy", async () => {
    const [first, second] = await Promise.all([
      scoreFor("The outlook is very bullish."),
      scoreFor("The outlook is very bullish."),
    ]);
    const plain = await scoreFor("The outlook is bullish.");
    const negated = await scoreFor("The outlook is not bullish.");
    const negatedIntensified = await scoreFor("The outlook is not very bullish.");

    expect(first).toEqual(second);
    expect(first.score).toBeGreaterThan(plain.score);
    expect(negated.label).toBe("NEGATIVE");
    expect(negatedIntensified.label).toBe("NEGATIVE");
    expect(Math.abs(negatedIntensified.score)).toBeGreaterThan(Math.abs(negated.score));
  });

  it("stops modifier scope at documented sentence boundaries", async () => {
    await expect(scoreFor("The outlook is bullish. The outlook is not bullish.")).resolves.toMatchObject({
      label: "NEUTRAL",
      score: 0,
    });
  });
});

