"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const openai_generation_adapter_1 = require("./openai-generation-adapter");
const input = {
    sourceText: "Use RSI with a 14 period.",
    strategies: [{ name: "RSI", displayName: "RSI", description: "momentum", category: "MOMENTUM", implementationVersion: "1", implementationSha256: "sha", minimumHistoryCandles: 0, parameters: [] }],
    promptVersion: "prompt-v1",
};
(0, vitest_1.describe)("OpenAI strategy generation adapter", () => {
    (0, vitest_1.it)("sends only the bounded proposal contract and parses the structured response", async () => {
        let requestBody;
        const adapter = (0, openai_generation_adapter_1.createOpenAiStrategyGenerationAdapter)({
            apiKey: "test-key",
            model: "test-model",
            modelVersion: "test-version",
            endpoint: "https://llm.test/chat",
            fetch: async (_url, init) => {
                requestBody = JSON.parse(String(init?.body));
                return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ kind: "SINGLE", strategyName: "RSI", parameters: { period: 14 } }) } }] }), { status: 200, headers: { "content-type": "application/json" } });
            },
        });
        await (0, vitest_1.expect)(adapter.generate(input)).resolves.toEqual({ kind: "SINGLE", strategyName: "RSI", parameters: { period: 14 } });
        (0, vitest_1.expect)(requestBody).toMatchObject({ model: "test-model", temperature: 0, response_format: { type: "json_schema", json_schema: { strict: true } } });
        (0, vitest_1.expect)(String((requestBody?.messages)[1]?.content)).toContain("Use RSI with a 14 period.");
    });
    (0, vitest_1.it)("maps provider and structured-output failures to bounded model errors", async () => {
        const timeout = (0, openai_generation_adapter_1.createOpenAiStrategyGenerationAdapter)({ apiKey: "test-key", model: "test-model", fetch: async () => new Response("", { status: 504 }) });
        await (0, vitest_1.expect)(timeout.generate(input)).rejects.toThrow("STRATEGY_MODEL_TIMEOUT");
        const malformed = (0, openai_generation_adapter_1.createOpenAiStrategyGenerationAdapter)({ apiKey: "test-key", model: "test-model", fetch: async () => new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), { status: 200 }) });
        await (0, vitest_1.expect)(malformed.generate(input)).rejects.toThrow("STRATEGY_MODEL_SCHEMA_INVALID");
        const unavailable = (0, openai_generation_adapter_1.createOpenAiStrategyGenerationAdapter)({ apiKey: "", model: "test-model", fetch: async () => { throw new Error("must not fetch"); } });
        await (0, vitest_1.expect)(unavailable.generate(input)).rejects.toThrow("STRATEGY_MODEL_UNAVAILABLE");
    });
});
