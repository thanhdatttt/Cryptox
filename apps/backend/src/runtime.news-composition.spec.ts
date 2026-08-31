import { describe, expect, it, vi } from "vitest";
import type {
  CollectNewsCommand,
  NewsCollectionResult,
  NewsModulePublicApi,
} from "@cryptox/news";
import type { NewsRefreshTimer, SafeNewsFetch } from "@cryptox/news/bootstrap";
import type { OpenAiCompatibleFetch } from "@cryptox/strategy/bootstrap";
import {
  BACKEND_RUNTIME_ENV_NAMES,
  composeConfiguredNewsProviders,
  createBackendRuntime,
  createConfiguredAuthoringProvider,
} from "./runtime";

const EMPTY_RESULT: NewsCollectionResult = {
  fetchedCount: 0,
  storedCount: 0,
  duplicateCount: 0,
  rejectedCount: 0,
};

interface ScheduledInterval {
  readonly callback: () => void;
  readonly intervalMs: number;
  cleared: boolean;
}

class FakeNewsTimer implements NewsRefreshTimer {
  public readonly intervals: ScheduledInterval[] = [];
  public clearCalls = 0;

  public setInterval(callback: () => void, intervalMs: number): ScheduledInterval {
    const interval: ScheduledInterval = { callback, intervalMs, cleared: false };
    this.intervals.push(interval);
    return interval;
  }

  public clearInterval(handle: unknown): void {
    const interval = handle as ScheduledInterval;
    interval.cleared = true;
    this.clearCalls += 1;
  }

  public async tick(index = 0): Promise<void> {
    const interval = this.intervals[index];
    if (!interval || interval.cleared) return;
    interval.callback();
    await Promise.resolve();
  }
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function waitFor(check: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (check()) return;
    await flush();
  }
  throw new Error("runtime News composition did not reach the expected state");
}

describe("backend News runtime composition (CSL-R-RD-01, CSL-R-NW-01, CSL-R-NW-02, CSL-R-OB-01)", () => {
  it("composes the copied .env.example CoinDesk RSS shape through the safe HTTPS boundary", async () => {
    const rssUrl = "https://www.coindesk.com/arc/outboundfeeds/rss/?output=1";
    const environment = {
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssUrl]: rssUrl,
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssAllowedHosts]: "www.coindesk.com",
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssAllowedUrlPrefixes]: "https://www.coindesk.com/arc/outboundfeeds/rss/",
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssAllowedUrls]: "",
    };
    const rssBody = `<?xml version="1.0"?><rss><channel><item>
      <guid>rss-guid-1</guid><title>Bitcoin market update</title>
      <description><![CDATA[The market is stable.]]></description>
      <link>https://www.coindesk.com/news/rss-1</link>
      <pubDate>Fri, 02 Jan 2026 00:00:00 GMT</pubDate><category>BTC</category>
      <provider-secret>must stay inside the provider boundary</provider-secret>
    </item></channel></rss>`;
    let requestedUrl: string | undefined;
    let requestedInit: Parameters<SafeNewsFetch>[1] | undefined;
    const safeNewsFetch: SafeNewsFetch = async (input, init) => {
      requestedUrl = input;
      requestedInit = init;
      return {
        status: 200,
        headers: { "content-type": "application/rss+xml" },
        text: async () => rssBody,
      };
    };

    const composition = composeConfiguredNewsProviders({
      environment,
      safeNewsFetch,
      safeDnsResolver: async () => ["93.184.216.34"],
    });

    expect(composition.providers).toHaveLength(1);
    const provider = composition.providers[0];
    expect(provider).toMatchObject({ id: "coindesk-rss", sourceKind: "RSS" });
    expect(composition.safeUrlFetcher).toBeDefined();
    expect(composition.urlImportExtractor).toBe(provider);
    if (!provider?.fetchDocument) throw new Error("RSS provider must expose its document boundary");

    const document = await provider.fetchDocument({ limit: 10 });

    expect(requestedUrl).toBe(rssUrl);
    expect(requestedInit).toMatchObject({
      method: "GET",
      redirect: "manual",
      credentials: "omit",
    });
    expect(requestedInit?.headers?.Accept).toContain("application/rss+xml");
    expect(requestedInit?.headers).not.toHaveProperty("authorization");
    expect(document).toMatchObject({ sourceKind: "RSS", canonicalUrl: rssUrl, redirects: 0 });
    expect(document.items).toHaveLength(1);
    expect(document.items[0]).toMatchObject({
      providerId: "coindesk-rss",
      providerItemId: "rss-guid-1",
      title: "Bitcoin market update",
      content: "The market is stable.",
      url: "https://www.coindesk.com/news/rss-1",
    });
    expect(document.items[0]).not.toHaveProperty("provider-secret");
  });

  it.each([
    ["missing URL", {
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssAllowedHosts]: "www.coindesk.com",
    }],
    ["missing allowlist", {
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssUrl]: "https://www.coindesk.com/rss",
    }],
    ["non-HTTPS URL", {
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssUrl]: "http://www.coindesk.com/rss",
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssAllowedHosts]: "www.coindesk.com",
    }],
    ["credentialed URL", {
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssUrl]: "https://user:password@www.coindesk.com/rss",
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssAllowedHosts]: "www.coindesk.com",
    }],
    ["unsafe localhost destination", {
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssUrl]: "https://localhost/rss",
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssAllowedHosts]: "localhost",
    }],
    ["malformed allowlist", {
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssUrl]: "https://www.coindesk.com/rss",
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssAllowedHosts]: "www.coindesk.com,",
    }],
    ["malformed optional URL allowlist", {
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssUrl]: "https://www.coindesk.com/rss",
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssAllowedUrls]: "https://www.coindesk.com/rss,",
    }],
    ["all-empty effective allowlist", {
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssUrl]: "https://www.coindesk.com/rss",
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssAllowedUrls]: "",
    }],
    ["allowlist does not cover URL", {
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssUrl]: "https://www.coindesk.com/rss",
      [BACKEND_RUNTIME_ENV_NAMES.coindeskRssAllowedHosts]: "feeds.example.test",
    }],
  ])("rejects %s RSS configuration without fixture fallback", (_label, environment) => {
    let fetchCalls = 0;
    const safeNewsFetch: SafeNewsFetch = async () => {
      fetchCalls += 1;
      throw new Error("unsafe RSS configuration must not contact a remote destination");
    };

    const composition = composeConfiguredNewsProviders({ environment, safeNewsFetch });

    expect(composition.providers).toHaveLength(0);
    expect(composition.safeUrlFetcher).toBeUndefined();
    expect(composition.urlImportExtractor).toBeUndefined();
    expect(fetchCalls).toBe(0);
  });

  it("preserves explicit legacy CoinDesk JSON adapter composition", async () => {
    let requestedUrl = "";
    let requestedHeaders: Readonly<Record<string, string>> | undefined;
    const coinDeskFetch = async (
      input: string,
      init?: { signal?: AbortSignal; headers?: Record<string, string> },
    ) => {
      requestedUrl = input;
      requestedHeaders = init?.headers;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          Data: [{
            GUID: "legacy-guid-1",
            TITLE: "Legacy CoinDesk item",
            BODY: "Legacy JSON content",
            URL: "https://api.example.test/article/1",
            PUBLISHED_ON: 1_767_312_000,
          }],
        }),
      };
    };

    const composition = composeConfiguredNewsProviders({
      environment: { COINDESK_BASE_URL: "https://api.example.test" },
      coinDeskFetch,
    });

    expect(composition.providers).toHaveLength(1);
    const provider = composition.providers[0];
    expect(provider).toMatchObject({ id: "coindesk" });
    const items = await provider?.fetch({ limit: 1 });

    expect(requestedUrl).toContain("https://api.example.test/news/v1/article/list");
    expect(requestedHeaders).toEqual({ Accept: "application/json" });
    expect(items?.[0]).toMatchObject({
      providerId: "coindesk",
      providerItemId: "legacy-guid-1",
      title: "Legacy CoinDesk item",
    });
  });

  it("keeps authoring provider-neutral while accepting the configured OpenAI-compatible endpoint", async () => {
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const key = "test-only-authoring-key";
    let requestedEndpoint = "";
    let requestedInit: Parameters<OpenAiCompatibleFetch>[1] | undefined;
    const authoringFetch: OpenAiCompatibleFetch = async (input, init) => {
      requestedEndpoint = input;
      requestedInit = init;
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: '{"fastPeriod":20}' } }] }),
      };
    };

    const provider = createConfiguredAuthoringProvider({
      environment: {
        LLM_AUTHORING_ENDPOINT: endpoint,
        LLM_AUTHORING_MODEL: "gemini-2.5-flash",
        LLM_AUTHORING_API_KEY: key,
        GEMINI_API_KEY: "ignored-alias",
      },
      authoringFetch,
    });

    expect(provider).toBeDefined();
    if (!provider) throw new Error("authoring provider should be configured");
    const result = await provider.createStructuredDraft({ prompt: "Create a strategy.", timeoutMs: 45_000 });
    const body = JSON.parse(requestedInit?.body ?? "{}") as {
      model?: string;
      temperature?: number;
      response_format?: { type?: string };
    };

    expect(requestedEndpoint).toBe(endpoint);
    expect(requestedInit?.method).toBe("POST");
    expect(requestedInit?.headers?.authorization).toMatch(/^Bearer /u);
    expect(requestedInit?.body).not.toContain(key);
    expect(body).toMatchObject({
      model: "gemini-2.5-flash",
      temperature: 0,
      response_format: { type: "json_object" },
    });
    expect(result).toEqual({ fastPeriod: 20 });
    expect(JSON.stringify(result)).not.toContain(key);
    expect(JSON.stringify(provider)).not.toContain(key);

    expect(createConfiguredAuthoringProvider({
      environment: {
        GEMINI_ENDPOINT: endpoint,
        GEMINI_MODEL: "gemini-2.5-flash",
        GEMINI_API_KEY: key,
      },
      authoringFetch,
    })).toBeUndefined();
  });

  it("collects once before scheduling, isolates failure, prevents overlap, and shuts down idempotently", async () => {
    const timer = new FakeNewsTimer();
    const commands: CollectNewsCommand[] = [];
    let calls = 0;
    let inFlight = 0;
    let maxInFlight = 0;
    let failNext = false;
    let blockNext = false;
    let releaseBlocked: (() => void) | undefined;
    const news: NewsModulePublicApi = {
      collect: async (command) => {
        calls += 1;
        commands.push(command);
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        try {
          if (failNext) {
            failNext = false;
            throw new Error("provider detail must remain inside the provider boundary");
          }
          if (blockNext) {
            blockNext = false;
            await new Promise<void>((resolve) => {
              releaseBlocked = resolve;
            });
          }
          return EMPTY_RESULT;
        } finally {
          inFlight -= 1;
        }
      },
      readNews: async () => ({ items: [] }),
    };
    const runtime = createBackendRuntime({
      databaseUrl: "",
      databaseReady: true,
      news,
      newsRefresh: { intervalMinutes: 2, timer },
    });

    try {
      await waitFor(() => calls === 1 && timer.intervals.length === 1);
      expect(runtime.news).toBe(news);
      expect(commands).toEqual([{}]);
      expect(timer.intervals[0]).toMatchObject({ intervalMs: 2 * 60 * 1_000 });
      expect(runtime.composition().optionalDependencies.find(({ name }) => name === "news-provider"))
        .toMatchObject({ available: true });

      failNext = true;
      await timer.tick();
      await flush();
      expect(calls).toBe(2);
      expect(runtime.composition().optionalDependencies.find(({ name }) => name === "news-provider"))
        .toMatchObject({ available: false, detail: "News provider failure is isolated from core capabilities." });

      blockNext = true;
      await timer.tick();
      expect(calls).toBe(3);
      expect(inFlight).toBe(1);
      await timer.tick();
      expect(calls).toBe(3);

      releaseBlocked?.();
      await flush();
      expect(inFlight).toBe(0);
      await timer.tick();
      await flush();
      expect(calls).toBe(4);
      expect(maxInFlight).toBe(1);

      const callsBeforeClose = calls;
      const firstClose = runtime.close();
      const secondClose = runtime.close();
      await Promise.all([firstClose, secondClose]);
      await runtime.close();
      expect(timer.clearCalls).toBe(1);
      await timer.tick();
      expect(calls).toBe(callsBeforeClose);
    } finally {
      await runtime.close();
    }
  });

  it("keeps News unavailable and makes no provider call when CoinDesk is unconfigured", async () => {
    vi.stubEnv("COINDESK_API_KEY", "");
    vi.stubEnv("COINDESK_BASE_URL", "");
    for (const name of Object.values(BACKEND_RUNTIME_ENV_NAMES)) vi.stubEnv(name, "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const timer = new FakeNewsTimer();
    const runtime = createBackendRuntime({
      databaseUrl: "",
      databaseReady: false,
      newsRefresh: { timer },
    });

    try {
      expect(runtime.news).toBeUndefined();
      expect(runtime.isCapabilityAvailable("news")).toBe(false);
      expect(() => runtime.requireCapability("news")).toThrow("news capability is unavailable");
      expect(timer.intervals).toHaveLength(0);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(runtime.composition().optionalDependencies.find(({ name }) => name === "news-provider"))
        .toMatchObject({ available: false, detail: "No explicitly configured real News provider is available." });
    } finally {
      await runtime.close();
      fetchSpy.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});
