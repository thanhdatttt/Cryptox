import { describe, expect, it } from "vitest";
import { createOpenAiCompatibleStrategyGenerationAdapter, createOpenAiStrategyGenerationAdapter, StrategyModelError } from "./openai-generation-adapter";

const input = {
  sourceText: "Use RSI with a 14 period.",
  strategies: [{ name: "RSI", displayName: "RSI", description: "momentum", category: "MOMENTUM" as const, implementationVersion: "1", implementationSha256: "sha", minimumHistoryCandles: 0, parameters: [] }],
  promptVersion: "prompt-v1",
};

describe("OpenAI-compatible strategy generation adapter", () => {
  it("sends only the bounded proposal contract and parses the structured response", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const adapter = createOpenAiStrategyGenerationAdapter({
      apiKey: "test-key",
      model: "test-model",
      modelVersion: "test-version",
      endpoint: "https://llm.test/chat",
      fetch: async (_url, init) => {
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ kind: "SINGLE", strategyName: "RSI", parameters: { period: 14 } }) } }] }), { status: 200, headers: { "content-type": "application/json" } });
      },
    });

    await expect(adapter.generate(input)).resolves.toEqual({ kind: "SINGLE", strategyName: "RSI", parameters: { period: 14 } });
    expect(requestBody).toMatchObject({ model: "test-model", temperature: 0, response_format: { type: "json_schema", json_schema: { strict: true } } });
    expect(String((requestBody?.messages as Array<{ content: string }>)[1]?.content)).toContain("Use RSI with a 14 period.");
  });

  it("maps provider and structured-output failures to bounded model errors", async () => {
    const timeout = createOpenAiStrategyGenerationAdapter({ apiKey: "test-key", model: "test-model", fetch: async () => new Response("", { status: 504 }) });
    await expect(timeout.generate(input)).rejects.toThrow("STRATEGY_MODEL_TIMEOUT");

    const malformed = createOpenAiStrategyGenerationAdapter({ apiKey: "test-key", model: "test-model", fetch: async () => new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), { status: 200 }) });
    await expect(malformed.generate(input)).rejects.toThrow("STRATEGY_MODEL_SCHEMA_INVALID");

    const unavailable = createOpenAiStrategyGenerationAdapter({ apiKey: "", model: "test-model", fetch: async () => { throw new Error("must not fetch"); } });
    await expect(unavailable.generate(input)).rejects.toThrow("STRATEGY_MODEL_UNAVAILABLE");
  });

  it("distinguishes authentication, rate-limit, provider, and timeout failures without exposing response data", async () => {
    const authentication = createOpenAiCompatibleStrategyGenerationAdapter({ apiKey: "test-key", model: "test-model", maxRetries: 0, fetch: async () => new Response("secret provider payload", { status: 401 }) });
    await expect(authentication.generate(input)).rejects.toMatchObject({ code: "STRATEGY_MODEL_AUTHENTICATION_FAILED" });

    let attempts = 0;
    const rateLimited = createOpenAiCompatibleStrategyGenerationAdapter({ apiKey: "test-key", model: "test-model", maxRetries: 1, fetch: async () => { attempts += 1; return new Response("secret provider payload", { status: 429 }); } });
    await expect(rateLimited.generate(input)).rejects.toMatchObject({ code: "STRATEGY_MODEL_RATE_LIMITED" });
    expect(attempts).toBe(2);

    const timeout = createOpenAiCompatibleStrategyGenerationAdapter({ apiKey: "test-key", model: "test-model", timeoutMs: 5, fetch: async (_url, init) => new Promise((_resolve, reject) => { init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))); }) });
    await expect(timeout.generate(input)).rejects.toMatchObject({ code: "STRATEGY_MODEL_TIMEOUT" });
    expect(new StrategyModelError("STRATEGY_MODEL_ERROR").message).toBe("STRATEGY_MODEL_ERROR");
  });

  it("supports the provider-neutral factory while retaining the source-compatible alias", () => {
    expect(createOpenAiStrategyGenerationAdapter).toBe(createOpenAiCompatibleStrategyGenerationAdapter);
  });
});
