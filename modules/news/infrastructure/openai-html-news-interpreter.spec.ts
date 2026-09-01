import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { createOpenAiCompatibleHtmlNewsInterpreter, HtmlNewsInterpreterError } from "./openai-html-news-interpreter";

const candidate = {
  title: "Bitcoin market update",
  content: "Institutional demand supports Bitcoin.",
  source: "Example News",
  publishedAt: "2026-08-28T06:15:00.000Z",
  relatedCoins: ["BTC"],
  canonicalUrl: "https://news.example.test/articles/bitcoin",
};

const withModelServer = async (
  handler: (body: Record<string, unknown>) => unknown,
  run: (endpoint: string, seen: Record<string, unknown>[]) => Promise<void>,
): Promise<void> => {
  const seen: Record<string, unknown>[] = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
    seen.push(body);
    const payload = handler(body);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("model server did not bind");
  try { await run(`http://127.0.0.1:${address.port}/v1/chat/completions`, seen); }
  finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
};

const options = (endpoint: string) => ({
  apiKey: "local-test-key",
  model: "fake-news-model",
  endpoint,
  promptVersion: "crawler-v1",
  timeoutMs: 1_000,
  maxInputBytes: 10_000,
  maxOutputBytes: 20_000,
  maxCandidates: 4,
  maxFieldLength: 2_000,
});

const modelEnvelope = (content: unknown): string => JSON.stringify({ choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }] });

const streamedResponse = (chunks: Uint8Array[], onCancel?: () => void, closeAfterChunks = true): Response => {
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[index++];
      if (chunk) controller.enqueue(chunk);
      else if (closeAfterChunks) controller.close();
    },
    cancel() { onCancel?.(); },
  });
  return new Response(stream, { status: 200, headers: { "content-type": "application/json" } });
};

const interpretWithResponse = async (response: Response, overrides: Partial<ReturnType<typeof options>> = {}) => {
  const interpreter = createOpenAiCompatibleHtmlNewsInterpreter({
    ...options("https://model.example.test/v1/chat/completions"),
    ...overrides,
    fetch: async () => response,
  });
  return interpreter.interpret({ sourceUrl: candidate.canonicalUrl, html: "<article><h1>Bitcoin market update</h1></article>" });
};

describe("OpenAI-compatible HTML News interpreter", () => {
  it("uses a local fake model with strict structured output and no tools", async () => {
    await withModelServer(() => ({ candidates: [candidate] }), async (endpoint, seen) => {
      const interpreter = createOpenAiCompatibleHtmlNewsInterpreter(options(endpoint));
      await expect(interpreter.interpret({
        sourceUrl: candidate.canonicalUrl,
        html: "<article><h1>Bitcoin market update</h1><p>Institutional demand supports Bitcoin.</p></article>",
      })).resolves.toEqual([candidate]);
      expect(seen[0]).toMatchObject({
        model: "fake-news-model",
        temperature: 0,
        response_format: { type: "json_schema", json_schema: { strict: true } },
      });
      expect(seen[0]).not.toHaveProperty("tools");
      expect(JSON.stringify(seen[0])).toContain("Institutional demand supports Bitcoin.");
    });
  });

  it("rejects malformed model output and enforces input/output bounds", async () => {
    await withModelServer(() => ({ candidates: [{ ...candidate, hallucinated: "ignore" }] }), async (endpoint) => {
      const interpreter = createOpenAiCompatibleHtmlNewsInterpreter(options(endpoint));
      await expect(interpreter.interpret({ sourceUrl: candidate.canonicalUrl, html: "<p>Bitcoin</p>" })).rejects.toMatchObject({ code: "CRAWLER_MODEL_SCHEMA_INVALID" });
    });
    const local = createOpenAiCompatibleHtmlNewsInterpreter({
      ...options("http://127.0.0.1:1"),
      maxInputBytes: 4,
      fetch: async () => { throw new Error("must not request"); },
    });
    await expect(local.interpret({ sourceUrl: candidate.canonicalUrl, html: "too large" })).rejects.toBeInstanceOf(HtmlNewsInterpreterError);
  });

  it("rejects an oversized declared Content-Length before reading the response", async () => {
    let textRead = false;
    let streamRead = false;
    let aborted = false;
    const response = {
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "9" }),
      body: { getReader: () => { streamRead = true; throw new Error("stream must not be read"); } },
      text: async () => { textRead = true; return modelEnvelope({ candidates: [] }); },
    } as unknown as Response;
    const interpreter = createOpenAiCompatibleHtmlNewsInterpreter({
      ...options("https://model.example.test/v1/chat/completions"),
      maxOutputBytes: 8,
      fetch: async (_input, init) => {
        init?.signal?.addEventListener("abort", () => { aborted = true; });
        return response;
      },
    });

    await expect(interpreter.interpret({ sourceUrl: candidate.canonicalUrl, html: "<p>Bitcoin</p>" })).rejects.toMatchObject({ code: "CRAWLER_MODEL_SCHEMA_INVALID" });
    expect({ textRead, streamRead, aborted }).toEqual({ textRead: false, streamRead: false, aborted: true });
  });

  it("cancels an oversized chunked response as soon as the byte limit is crossed", async () => {
    const body = new TextEncoder().encode(modelEnvelope({ candidates: [] }));
    let cancelled = false;
    const response = streamedResponse([body.subarray(0, 4), body.subarray(4)], () => { cancelled = true; }, false);
    await expect(interpretWithResponse(response, { maxOutputBytes: body.byteLength - 1 })).rejects.toMatchObject({ code: "CRAWLER_MODEL_SCHEMA_INVALID" });
    expect(cancelled).toBe(true);
  });

  it("accepts an exact-boundary streamed response", async () => {
    const body = new TextEncoder().encode(modelEnvelope({ candidates: [candidate] }));
    const response = streamedResponse([body.subarray(0, 7), body.subarray(7, 19), body.subarray(19)]);
    await expect(interpretWithResponse(response, { maxOutputBytes: body.byteLength })).resolves.toEqual([candidate]);
  });

  it("classifies malformed streamed JSON as schema-invalid", async () => {
    const body = new TextEncoder().encode(modelEnvelope("{"));
    const response = streamedResponse([body.subarray(0, 3), body.subarray(3)]);
    await expect(interpretWithResponse(response, { maxOutputBytes: body.byteLength })).rejects.toMatchObject({ code: "CRAWLER_MODEL_SCHEMA_INVALID" });
  });

  it("classifies a stalled streamed response as a timeout and cancels its reader", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull: () => new Promise<void>(() => undefined),
      cancel() { cancelled = true; },
    });
    const response = new Response(stream, { status: 200, headers: { "content-type": "application/json" } });
    const interpreter = createOpenAiCompatibleHtmlNewsInterpreter({
      ...options("https://model.example.test/v1/chat/completions"),
      timeoutMs: 20,
      fetch: async () => response,
    });

    await expect(interpreter.interpret({ sourceUrl: candidate.canonicalUrl, html: "<p>Bitcoin</p>" })).rejects.toMatchObject({ code: "CRAWLER_MODEL_TIMEOUT" });
    expect(cancelled).toBe(true);
  });
});
