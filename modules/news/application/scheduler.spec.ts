import { describe, expect, it } from "vitest";
import {
  DEFAULT_NEWS_REFRESH_INTERVAL_MINUTES,
  NewsRefreshScheduler,
  validateNewsRefreshIntervalMinutes,
  type NewsRefreshTimer,
} from "./scheduler";
import type { NewsCollectionResult, NewsModulePublicApi } from "../api/contracts";

const EMPTY_RESULT: NewsCollectionResult = {
  fetchedCount: 0,
  storedCount: 0,
  duplicateCount: 0,
  rejectedCount: 0,
};

interface ScheduledInterval {
  callback: () => void;
  intervalMs: number;
  cleared: boolean;
}

class FakeTimer implements NewsRefreshTimer {
  public readonly intervals: ScheduledInterval[] = [];
  public clearCalls = 0;

  public setInterval(callback: () => void, intervalMs: number): ScheduledInterval {
    const interval = { callback, intervalMs, cleared: false };
    this.intervals.push(interval);
    return interval;
  }

  public clearInterval(handle: unknown): void {
    const interval = handle as ScheduledInterval;
    interval.cleared = true;
    this.clearCalls += 1;
  }

  public async tick(interval = this.intervals[0]): Promise<void> {
    if (!interval || interval.cleared) return;
    interval.callback();
    await Promise.resolve();
  }
}

function collection(collect: NewsModulePublicApi["collect"]): Pick<NewsModulePublicApi, "collect"> {
  return { collect };
}

describe("NewsRefreshScheduler (CSL-R-NW-02, CSL-R-RP-02, CSL-R-OB-01)", () => {
  it("uses the five-minute default and accepts only whole minutes from one through five", () => {
    expect(validateNewsRefreshIntervalMinutes(undefined)).toBe(DEFAULT_NEWS_REFRESH_INTERVAL_MINUTES);
    expect(validateNewsRefreshIntervalMinutes(1)).toBe(1);
    expect(validateNewsRefreshIntervalMinutes(5)).toBe(5);
    for (const value of [0, 6, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "5"]) {
      expect(() => validateNewsRefreshIntervalMinutes(value)).toThrow();
    }

    const scheduler = new NewsRefreshScheduler(collection(async () => EMPTY_RESULT), { intervalMinutes: 2 });
    expect(scheduler.intervalMinutes).toBe(2);
    const configuredScheduler = new NewsRefreshScheduler(collection(async () => EMPTY_RESULT), { refreshIntervalMinutes: 3 });
    expect(configuredScheduler.intervalMinutes).toBe(3);
    expect(() => new NewsRefreshScheduler(collection(async () => EMPTY_RESULT), { intervalMinutes: 0 })).toThrow();
  });

  it("collects once per interval through the public News collection", async () => {
    const timer = new FakeTimer();
    const commands: unknown[] = [];
    const scheduler = new NewsRefreshScheduler(collection(async (command) => {
      commands.push(command);
      return EMPTY_RESULT;
    }), { intervalMinutes: 2, timer });

    scheduler.start();
    expect(timer.intervals[0]?.intervalMs).toBe(2 * 60 * 1_000);
    await timer.tick();
    await timer.tick();

    expect(commands).toEqual([{}, {}]);
  });

  it("does not overlap a collection that is still running", async () => {
    const timer = new FakeTimer();
    let calls = 0;
    let resolveFirst: (() => void) | undefined;
    const first = new Promise<NewsCollectionResult>((resolve) => {
      resolveFirst = () => resolve(EMPTY_RESULT);
    });
    const scheduler = new NewsRefreshScheduler(collection(async () => {
      calls += 1;
      return calls === 1 ? first : EMPTY_RESULT;
    }), { timer });

    scheduler.start();
    await timer.tick();
    await timer.tick();
    expect(calls).toBe(1);

    resolveFirst!();
    await first;
    await Promise.resolve();
    await timer.tick();
    expect(calls).toBe(2);
  });

  it("continues after a failed refresh and reports failure through the clock seam", async () => {
    const timer = new FakeTimer();
    let calls = 0;
    const failures: string[] = [];
    const scheduler = new NewsRefreshScheduler(collection(async () => {
      calls += 1;
      if (calls === 1) throw new Error("provider unavailable");
      return EMPTY_RESULT;
    }), {
      timer,
      clock: { now: () => "2026-08-30T00:00:00.000Z" },
      onRefreshFailure: ({ occurredAt }) => failures.push(occurredAt),
    });

    scheduler.start();
    await timer.tick();
    await timer.tick();

    expect(calls).toBe(2);
    expect(failures).toEqual(["2026-08-30T00:00:00.000Z"]);
  });

  it("shuts down idempotently and prevents queued or future ticks", async () => {
    const timer = new FakeTimer();
    let calls = 0;
    const scheduler = new NewsRefreshScheduler(collection(async () => {
      calls += 1;
      return EMPTY_RESULT;
    }), { timer });

    scheduler.start();
    scheduler.shutdown();
    scheduler.shutdown();
    scheduler.stop();
    await timer.tick();
    scheduler.start();

    expect(calls).toBe(0);
    expect(timer.clearCalls).toBe(1);
    expect(timer.intervals).toHaveLength(1);
  });
});
