import type { StrategyAuthoringProviderPort, StrategyParameterValue } from "../application/ports";

export interface OpenAiCompatibleResponse {
  readonly ok?: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export interface OpenAiCompatibleRequestInit {
  readonly method?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly signal?: AbortSignal;
}

export type OpenAiCompatibleFetch = (
  input: string,
  init?: OpenAiCompatibleRequestInit,
) => Promise<OpenAiCompatibleResponse>;

export interface OpenAiCompatibleAuthoringOptions {
  readonly endpoint?: string;
  readonly model?: string;
  readonly apiKey?: string;
  readonly providerId?: string;
  readonly fetch?: OpenAiCompatibleFetch;
}

export type AuthoringProviderErrorCode =
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_FAILURE"
  | "MALFORMED_PROVIDER_RESPONSE";

export class StrategyAuthoringProviderError extends Error {
  public readonly name = "StrategyAuthoringProviderError";

  public constructor(public readonly code: AuthoringProviderErrorCode) {
    super(code);
  }
}

interface OpenAiCompatibleAuthoringProvider extends StrategyAuthoringProviderPort {
  readonly configured: boolean;
}

const TIMEOUT_MS = 45_000 as const;
const unsafeFieldPattern = /(?:api[_-]?key|secret|credential|token|password|prompt|completion|url|uri|endpoint|authorization|cookie|header|content|source)/i;

function validEndpoint(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const endpoint = new URL(value.trim());
    if (
      (endpoint.protocol !== "https:" && endpoint.protocol !== "http:")
      || endpoint.username
      || endpoint.password
      || endpoint.search
      || endpoint.hash
    ) return undefined;
    return endpoint.toString();
  } catch {
    return undefined;
  }
}

function validLabel(value: unknown, fallback: string): string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value.trim())
    ? value.trim()
    : fallback;
}

function validModel(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value.trim());
}

function configuredSecret(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function record(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function structuredValues(value: unknown): Readonly<Record<string, StrategyParameterValue>> {
  if (!record(value)) throw new StrategyAuthoringProviderError("MALFORMED_PROVIDER_RESPONSE");
  const result: Record<string, StrategyParameterValue> = {};
  for (const key of Object.keys(value)) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(key) || unsafeFieldPattern.test(key)) {
      throw new StrategyAuthoringProviderError("MALFORMED_PROVIDER_RESPONSE");
    }
    const item = value[key];
    if (typeof item === "number") {
      if (!Number.isFinite(item)) throw new StrategyAuthoringProviderError("MALFORMED_PROVIDER_RESPONSE");
      result[key] = item;
    } else if (typeof item === "string" && item.trim()) {
      result[key] = item;
    } else {
      throw new StrategyAuthoringProviderError("MALFORMED_PROVIDER_RESPONSE");
    }
  }
  return Object.freeze(Object.fromEntries(Object.keys(result).sort().map((key) => [key, result[key]])));
}

function responseContent(payload: unknown): Readonly<Record<string, unknown>> {
  if (!record(payload) || !Array.isArray(payload.choices) || payload.choices.length !== 1) {
    throw new StrategyAuthoringProviderError("MALFORMED_PROVIDER_RESPONSE");
  }
  const choice = payload.choices[0];
  if (!record(choice) || !record(choice.message) || typeof choice.message.content !== "string") {
    throw new StrategyAuthoringProviderError("MALFORMED_PROVIDER_RESPONSE");
  }
  try {
    const parsed = JSON.parse(choice.message.content) as unknown;
    if (!record(parsed)) throw new Error("not an object");
    return parsed;
  } catch {
    throw new StrategyAuthoringProviderError("MALFORMED_PROVIDER_RESPONSE");
  }
}

function providerInput(input: { prompt?: string; newsItemId?: string }): string {
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  const newsItemId = typeof input.newsItemId === "string" ? input.newsItemId.trim() : "";
  if (!prompt && !newsItemId) throw new StrategyAuthoringProviderError("PROVIDER_FAILURE");
  return prompt || `Approved News item reference: ${newsItemId}`;
}

type ProviderOperationOutcome =
  | { kind: "value"; value: Readonly<Record<string, StrategyParameterValue>> }
  | { kind: "failure"; code: AuthoringProviderErrorCode };

function providerErrorCode(error: unknown): AuthoringProviderErrorCode {
  return error instanceof StrategyAuthoringProviderError ? error.code : "PROVIDER_FAILURE";
}

function defaultFetch(input: string, init?: OpenAiCompatibleRequestInit): Promise<OpenAiCompatibleResponse> {
  return globalThis.fetch(input, init as RequestInit);
}

export function createOpenAiCompatibleAuthoringProvider(
  options: OpenAiCompatibleAuthoringOptions,
): OpenAiCompatibleAuthoringProvider {
  const endpoint = validEndpoint(options.endpoint);
  const model = validLabel(options.model, "model");
  const providerId = validLabel(options.providerId, "openai-compatible");
  const apiKey = configuredSecret(options.apiKey);
  const configured = endpoint !== undefined
    && validModel(options.model)
    && apiKey !== undefined;
  const request = options.fetch ?? defaultFetch;

  const createStructuredDraft = async (input: {
    prompt?: string;
    newsItemId?: string;
    timeoutMs: 45_000;
  }): Promise<Readonly<Record<string, StrategyParameterValue>>> => {
    if (!configured || !endpoint || !apiKey) {
      throw new StrategyAuthoringProviderError("PROVIDER_NOT_CONFIGURED");
    }
    if (input.timeoutMs !== TIMEOUT_MS) {
      throw new StrategyAuthoringProviderError("PROVIDER_FAILURE");
    }
    const userContent = providerInput(input);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const responsePromise = Promise.resolve()
      .then(async (): Promise<Readonly<Record<string, StrategyParameterValue>>> => {
        const response = await request(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: "Return exactly one JSON object containing only the strategy parameter values.",
              },
              { role: "user", content: userContent },
            ],
            temperature: 0,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        });
        const status = response.status;
        if (!Number.isInteger(status) || status < 200 || status >= 300 || response.ok === false) {
          throw new StrategyAuthoringProviderError("PROVIDER_FAILURE");
        }
        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new StrategyAuthoringProviderError("MALFORMED_PROVIDER_RESPONSE");
        }
        return structuredValues(responseContent(payload));
      })
      .then(
        (value): ProviderOperationOutcome => ({ kind: "value", value }),
        (error: unknown): ProviderOperationOutcome => ({ kind: "failure", code: providerErrorCode(error) }),
      );
    const timeoutPromise = new Promise<{ kind: "timeout" }>((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve({ kind: "timeout" });
      }, TIMEOUT_MS);
      (timer as unknown as { unref?: () => void }).unref?.();
    });

    try {
      const outcome = await Promise.race([responsePromise, timeoutPromise]);
      if (outcome.kind === "timeout") throw new StrategyAuthoringProviderError("PROVIDER_TIMEOUT");
      if (outcome.kind === "failure") throw new StrategyAuthoringProviderError(outcome.code);
      return outcome.value;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };

  return {
    id: providerId,
    modelId: model,
    configured,
    createStructuredDraft,
  };
}

export type { OpenAiCompatibleAuthoringProvider };
