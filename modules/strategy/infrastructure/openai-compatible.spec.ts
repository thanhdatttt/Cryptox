import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOpenAiCompatibleAuthoringProvider,
  StrategyAuthoringProviderError,
} from "./openai-compatible";

function response(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

function configuredProvider(fetcher: Parameters<typeof createOpenAiCompatibleAuthoringProvider>[0]["fetch"]) {
  return createOpenAiCompatibleAuthoringProvider({
    endpoint: "https://provider.example/v1/chat/completions",
    model: "demo-model",
    apiKey: "secret-value",
    providerId: "demo-provider",
    fetch: fetcher,
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("OpenAI-compatible Strategy authoring provider", () => {
  it("requires endpoint, model, and key and does not call a missing configuration", async () => {
    const fetcher = vi.fn();
    for (const options of [
      { model: "demo-model", apiKey: "secret" },
      { endpoint: "https://provider.example", apiKey: "secret" },
      { endpoint: "https://provider.example", model: "demo-model" },
    ]) {
      const provider = createOpenAiCompatibleAuthoringProvider({ ...options, fetch: fetcher });
      expect(provider.configured).toBe(false);
      await expect(provider.createStructuredDraft({ prompt: "Draft", timeoutMs: 45_000 }))
        .rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED" });
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("makes exactly one request with a bounded JSON request and never puts the key in the body", async () => {
    const fetcher = vi.fn(async () => response({
      choices: [{ message: { content: '{"mode":"FAST","period":20}' } }],
    }));
    const provider = configuredProvider(fetcher);

    const result = await provider.createStructuredDraft({ prompt: "Create a strategy.", timeoutMs: 45_000 });

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetcher.mock.calls[0]!;
    expect(endpoint).toBe("https://provider.example/v1/chat/completions");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      "content-type": "application/json",
      authorization: "Bearer secret-value",
    });
    expect(init?.body).not.toContain("secret-value");
    expect(JSON.parse(init?.body ?? "{}" as string)).toMatchObject({
      model: "demo-model",
      temperature: 0,
      response_format: { type: "json_object" },
    });
    expect(result).toEqual({ mode: "FAST", period: 20 });
    expect(JSON.stringify(result)).not.toContain("secret-value");
  });

  it("uses the same single request path for an approved News reference", async () => {
    const fetcher = vi.fn(async () => response({
      choices: [{ message: { content: '{"period":20}' } }],
    }));
    const provider = configuredProvider(fetcher);

    await provider.createStructuredDraft({ newsItemId: "news-1", timeoutMs: 45_000 });

    expect(fetcher).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetcher.mock.calls[0]?.[1]?.body ?? "{}") as { messages?: Array<{ content?: string }> };
    expect(body.messages?.some((message) => message.content?.includes("news-1"))).toBe(true);
  });

  it("aborts and rejects at the hard timeout without retrying", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const fetcher = vi.fn((_input: string, init?: { signal?: AbortSignal }) => {
      signal = init?.signal;
      return new Promise<never>(() => undefined);
    });
    const provider = configuredProvider(fetcher);
    const pending = provider.createStructuredDraft({ prompt: "Wait", timeoutMs: 45_000 });
    const rejected = expect(pending).rejects.toMatchObject({ code: "PROVIDER_TIMEOUT" });

    await vi.advanceTimersByTimeAsync(45_000);
    await rejected;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(signal?.aborted).toBe(true);
  });

  it("applies the hard timeout while parsing a response body", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const json = vi.fn(() => new Promise<never>(() => undefined));
    const fetcher = vi.fn(async (_input: string, init?: { signal?: AbortSignal }) => {
      signal = init?.signal;
      return { ok: true, status: 200, json };
    });
    const provider = configuredProvider(fetcher);
    const pending = provider.createStructuredDraft({ prompt: "Parse slowly", timeoutMs: 45_000 });
    const rejected = expect(pending).rejects.toMatchObject({ code: "PROVIDER_TIMEOUT" });

    await vi.advanceTimersByTimeAsync(45_000);
    await rejected;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(json).toHaveBeenCalledTimes(1);
    expect(signal?.aborted).toBe(true);
  });

  it("maps provider HTTP failures without exposing response bodies", async () => {
    const fetcher = vi.fn(async () => response({ secret: "body must not escape" }, 503));
    const provider = configuredProvider(fetcher);

    await expect(provider.createStructuredDraft({ prompt: "Draft", timeoutMs: 45_000 }))
      .rejects.toMatchObject({ code: "PROVIDER_FAILURE" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["missing choices", { choices: [] }],
    ["invalid JSON", { choices: [{ message: { content: "not-json" } }] }],
    ["nested value", { choices: [{ message: { content: '{"period":{"value":20}}' } }] }],
    ["boolean value", { choices: [{ message: { content: '{"period":true}' } }] }],
    ["secret field", { choices: [{ message: { content: '{"apiKey":"secret"}' } }] }],
    ["URL field", { choices: [{ message: { content: '{"sourceUrl":"https://example.test"}' } }] }],
  ])("strictly rejects %s provider JSON", async (_label, payload) => {
    const fetcher = vi.fn(async () => response(payload));
    const provider = configuredProvider(fetcher);

    await expect(provider.createStructuredDraft({ prompt: "Draft", timeoutMs: 45_000 }))
      .rejects.toBeInstanceOf(StrategyAuthoringProviderError);
    await expect(provider.createStructuredDraft({ prompt: "Draft", timeoutMs: 45_000 }))
      .rejects.toMatchObject({ code: "MALFORMED_PROVIDER_RESPONSE" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
