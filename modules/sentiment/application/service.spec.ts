import { describe, expect, it } from "vitest";
import type {
  SentimentModuleDependencies,
  SentimentObservability,
  SentimentProvider,
  SentimentProviderResult,
} from "./ports";
import { createLexiconV1Provider } from "./lexicon";
import { InMemorySentimentResultRepository } from "./memory";
import { createSentimentApplication } from "./service";

const input = {
  newsId: "00000000-0000-4000-8000-000000000002",
  title: "Bitcoin gains",
  content: "The market is bullish.",
  source: "fixture-provider",
  publishedAt: "2026-01-01T00:00:00.000Z",
  relatedCoins: ["BTC"],
};

function dependencies(
  provider: SentimentProvider = createLexiconV1Provider(),
  resultRepository = new InMemorySentimentResultRepository(),
  observability: SentimentObservability = { recordInferenceFailure: () => undefined },
): SentimentModuleDependencies & { resultRepository: InMemorySentimentResultRepository } {
  return {
    provider,
    resultRepository,
    clock: { now: () => "2026-01-02T00:00:00.000Z" },
    observability,
  };
}

describe("Sentiment application [CSL-R-SN-01, CSL-R-OB-01]", () => {
  it("stores successful analysis with input reference, timestamp, and model provenance", async () => {
    const configured = dependencies();
    const application = createSentimentApplication(configured);

    const result = await application.analyze(input);

    expect(result).toMatchObject({
      newsId: input.newsId,
      label: "POSITIVE",
      providerId: "LEXICON_V1",
      analysisProfileId: "LEXICON_V1",
      modelName: "LEXICON_V1",
      modelVersion: "1",
      analyzedAt: "2026-01-02T00:00:00.000Z",
    });
    await expect(application.readLatestForNews(input.newsId)).resolves.toEqual(result);
    expect(configured.resultRepository.size).toBe(1);
  });

  it("keeps repeated deterministic analysis idempotent for the same model version", async () => {
    const configured = dependencies();
    const application = createSentimentApplication(configured);

    const first = await application.analyze(input);
    const second = await application.analyze(input);

    expect(second).toEqual(first);
    expect(configured.resultRepository.size).toBe(1);
  });

  it("rejects invalid input before provider or repository writes", async () => {
    let providerCalls = 0;
    const provider: SentimentProvider = {
      id: "test-provider",
      analyze: async () => {
        providerCalls += 1;
        return {
          label: "NEUTRAL",
          score: 0,
          providerId: "test-provider",
          analysisProfileId: "test-profile",
          modelName: "test-model",
          modelVersion: "1",
        };
      },
    };
    const configured = dependencies(provider);
    const application = createSentimentApplication(configured);

    await expect(application.analyze({ ...input, content: "   " })).rejects.toMatchObject({
      code: "INVALID_SENTIMENT_INPUT",
    });
    expect(providerCalls).toBe(0);
    expect(configured.resultRepository.size).toBe(0);
  });

  it("observes provider exceptions and stores nothing", async () => {
    const failures: Array<{ newsId: string; reason: string }> = [];
    const observability: SentimentObservability = {
      recordInferenceFailure: (failure) => failures.push(failure),
    };
    const provider: SentimentProvider = {
      id: "failing-provider",
      analyze: async () => {
        throw new Error("provider unavailable");
      },
    };
    const configured = dependencies(provider, new InMemorySentimentResultRepository(), observability);
    const application = createSentimentApplication(configured);

    await expect(application.analyze(input)).rejects.toMatchObject({
      code: "INFERENCE_ERROR",
      message: "provider unavailable",
    });
    expect(failures).toEqual([{ newsId: input.newsId, reason: "INFERENCE_ERROR" }]);
    expect(configured.resultRepository.size).toBe(0);
  });

  it("classifies timeout exceptions as isolated failures", async () => {
    const failures: string[] = [];
    const provider: SentimentProvider = {
      id: "timeout-provider",
      analyze: async () => {
        throw Object.assign(new Error("timed out"), { code: "TIMEOUT" });
      },
    };
    const configured = dependencies(provider, new InMemorySentimentResultRepository(), {
      recordInferenceFailure: ({ reason }) => failures.push(reason),
    });
    const application = createSentimentApplication(configured);

    await expect(application.analyze(input)).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(failures).toEqual(["TIMEOUT"]);
    expect(configured.resultRepository.size).toBe(0);
  });

  it("observes invalid provider output and stores nothing", async () => {
    const failures: string[] = [];
    const invalidResult: SentimentProviderResult = {
      label: "POSITIVE",
      score: Number.NaN,
      providerId: "invalid-provider",
      analysisProfileId: "invalid-profile",
      modelName: "invalid-model",
      modelVersion: "1",
    };
    const provider: SentimentProvider = {
      id: "invalid-provider",
      analyze: async () => invalidResult,
    };
    const configured = dependencies(provider, new InMemorySentimentResultRepository(), {
      recordInferenceFailure: ({ reason }) => failures.push(reason),
    });
    const application = createSentimentApplication(configured);

    await expect(application.analyze(input)).rejects.toMatchObject({ code: "INVALID_RESULT" });
    expect(failures).toEqual(["INVALID_RESULT"]);
    expect(configured.resultRepository.size).toBe(0);
  });

  it("returns explicit absence for a news item without a successful result", async () => {
    const application = createSentimentApplication(dependencies());

    await expect(application.readLatestForNews("00000000-0000-4000-8000-000000000099")).resolves.toBeUndefined();
  });
});

