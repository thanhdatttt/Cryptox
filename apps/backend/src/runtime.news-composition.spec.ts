import { describe, expect, it, vi } from "vitest";
import type {
  CollectNewsCommand,
  NewsCollectionResult,
  NewsModulePublicApi,
} from "@cryptox/news";
import type { NewsRefreshTimer } from "@cryptox/news/bootstrap";
import { createBackendRuntime } from "./runtime";

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
