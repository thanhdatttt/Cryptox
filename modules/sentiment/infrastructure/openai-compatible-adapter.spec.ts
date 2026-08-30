import { describe, expect, it } from "vitest";
import { createOpenAiCompatibleSentimentAdapter, SentimentModelError } from "./openai-compatible-adapter";

const input = { newsId: "news-1", title: "Bitcoin adoption grows", content: "Institutional inflows support demand.", source: "RSS", publishedAt: "2025-01-01T00:00:00.000Z", relatedCoins: ["BTC"] };

describe("OpenAI-compatible sentiment adapter", () => {
  it("sends a bounded structured request and returns versioned sentiment provenance", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const adapter = createOpenAiCompatibleSentimentAdapter({
      apiKey: "test-key",
      model: "gemini-test",
      modelVersion: "2025-01",
      endpoint: "https://model.test/chat",
      clock: { now: () => "2025-01-01T00:01:00.000Z" },
      fetch: async (_url, init) => {
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ label: "POSITIVE", score: 0.75 }) } }] }), { status: 200, headers: { "content-type": "application/json" } });
      },
    });

    await expect(adapter.analyze(input)).resolves.toEqual({ newsId: "news-1", label: "POSITIVE", score: 0.75, modelName: "gemini-test", modelVersion: "2025-01", analyzedAt: "2025-01-01T00:01:00.000Z" });
    expect(requestBody).toMatchObject({ model: "gemini-test", temperature: 0, response_format: { type: "json_schema", json_schema: { strict: true } } });
    expect(String((requestBody?.messages as Array<{ content: string }>)[1]?.content)).toContain("Institutional inflows");
  });

  it("maps authentication, rate-limit, malformed, and timeout responses without exposing payloads", async () => {
    const authentication = createOpenAiCompatibleSentimentAdapter({ apiKey: "key", model: "model", maxRetries: 0, fetch: async () => new Response("secret", { status: 401 }) });
    await expect(authentication.analyze(input)).rejects.toMatchObject({ code: "SENTIMENT_MODEL_AUTHENTICATION_FAILED" });

    let attempts = 0;
    const rateLimited = createOpenAiCompatibleSentimentAdapter({ apiKey: "key", model: "model", maxRetries: 1, fetch: async () => { attempts += 1; return new Response("secret", { status: 429 }); } });
    await expect(rateLimited.analyze(input)).rejects.toMatchObject({ code: "SENTIMENT_MODEL_RATE_LIMITED" });
    expect(attempts).toBe(2);

    const malformed = createOpenAiCompatibleSentimentAdapter({ apiKey: "key", model: "model", maxRetries: 0, fetch: async () => new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), { status: 200 }) });
    await expect(malformed.analyze(input)).rejects.toMatchObject({ code: "SENTIMENT_MODEL_SCHEMA_INVALID" });

    const timeout = createOpenAiCompatibleSentimentAdapter({ apiKey: "key", model: "model", timeoutMs: 5, fetch: async (_url, init) => new Promise<never>((_resolve, reject) => { init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))); }) });
    await expect(timeout.analyze(input)).rejects.toMatchObject({ code: "SENTIMENT_MODEL_TIMEOUT" });
  });

  it("fails closed when credentials or model identity are absent", async () => {
    const adapter = createOpenAiCompatibleSentimentAdapter({ apiKey: "", model: "model", fetch: async () => { throw new Error("must not fetch"); } });
    await expect(adapter.analyze(input)).rejects.toMatchObject({ code: "SENTIMENT_MODEL_UNAVAILABLE" });
    expect(new SentimentModelError("SENTIMENT_MODEL_ERROR").message).toBe("SENTIMENT_MODEL_ERROR");
  });
});
