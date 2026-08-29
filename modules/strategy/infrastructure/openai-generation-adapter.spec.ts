import { describe, expect, it } from "vitest";
import { createOpenAiStrategyGenerationAdapter } from "./openai-generation-adapter";

const input = {
  sourceText: "Use RSI with a 14 period.",
  strategies: [{ name: "RSI", displayName: "RSI", description: "momentum", category: "MOMENTUM" as const, implementationVersion: "1", implementationSha256: "sha", minimumHistoryCandles: 0, parameters: [] }],
  promptVersion: "prompt-v1",
};

describe("OpenAI strategy generation adapter", () => {
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
});
