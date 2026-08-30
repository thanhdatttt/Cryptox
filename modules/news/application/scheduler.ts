import type {
  CollectNewsCommand,
  NewsModulePublicApi,
} from "./ports";

export const DEFAULT_NEWS_REFRESH_INTERVAL_MINUTES = 5 as const;
const MIN_NEWS_REFRESH_INTERVAL_MINUTES = 1;
const MAX_NEWS_REFRESH_INTERVAL_MINUTES = 5;
const MINUTES_TO_MILLISECONDS = 60 * 1_000;

export interface NewsRefreshTimer {
  setInterval(callback: () => void, intervalMs: number): unknown;
  clearInterval(handle: unknown): void;
}

export interface NewsRefreshClock {
  now(): string;
}

export interface NewsRefreshFailure {
  readonly occurredAt: string;
}

export interface NewsRefreshSchedulerOptions {
  /** The interval used by the configured News source, in whole minutes. */
  readonly intervalMinutes?: number;
  /** Alias for callers passing through ConfiguredNewsProvider configuration. */
  readonly refreshIntervalMinutes?: number;
  /** Optional collection command; an empty command collects all configured providers. */
  readonly command?: CollectNewsCommand;
  readonly timer?: NewsRefreshTimer;
  readonly clock?: NewsRefreshClock;
  readonly onRefreshFailure?: (failure: NewsRefreshFailure) => void;
}

const systemTimer: NewsRefreshTimer = {
  setInterval: (callback, intervalMs) => setInterval(callback, intervalMs),
  clearInterval: (handle) => clearInterval(handle as ReturnType<typeof setInterval>),
};

const systemClock: NewsRefreshClock = {
  now: () => new Date().toISOString(),
};

export function validateNewsRefreshIntervalMinutes(value: unknown): number {
  const selected = value === undefined ? DEFAULT_NEWS_REFRESH_INTERVAL_MINUTES : value;
  if (
    typeof selected !== "number"
    || !Number.isSafeInteger(selected)
    || selected < MIN_NEWS_REFRESH_INTERVAL_MINUTES
    || selected > MAX_NEWS_REFRESH_INTERVAL_MINUTES
  ) {
    throw new Error("News refresh interval must be an integer between 1 and 5 minutes");
  }
  return selected;
}

function copyCommand(command: CollectNewsCommand | undefined): CollectNewsCommand {
  if (command === undefined) return {};
  return {
    ...(command.providerIds === undefined ? {} : { providerIds: [...command.providerIds] }),
    ...(command.relatedCoins === undefined ? {} : { relatedCoins: [...command.relatedCoins] }),
    ...(command.publishedAfter === undefined ? {} : { publishedAfter: command.publishedAfter }),
    ...(command.limit === undefined ? {} : { limit: command.limit }),
  };
}

/**
 * Runs the existing public News collection on a bounded cadence.
 *
 * The scheduler owns timer lifecycle only. Provider fetching, persistence,
 * deduplication, and auxiliary analysis remain inside the News application.
 */
export class NewsRefreshScheduler {
  public readonly intervalMinutes: number;

  private readonly command: CollectNewsCommand;
  private readonly timer: NewsRefreshTimer;
  private readonly clock: NewsRefreshClock;
  private readonly onRefreshFailure: ((failure: NewsRefreshFailure) => void) | undefined;
  private timerHandle: unknown;
  private started = false;
  private shutDown = false;
  private collecting = false;

  public constructor(
    private readonly news: Pick<NewsModulePublicApi, "collect">,
    options: NewsRefreshSchedulerOptions = {},
  ) {
    if (!news || typeof news.collect !== "function") {
      throw new Error("News collection is required");
    }
    const configuredInterval = options.intervalMinutes ?? options.refreshIntervalMinutes;
    this.intervalMinutes = validateNewsRefreshIntervalMinutes(configuredInterval);
    this.command = copyCommand(options.command);
    this.timer = options.timer ?? systemTimer;
    this.clock = options.clock ?? systemClock;
    this.onRefreshFailure = options.onRefreshFailure;
  }

  public start(): void {
    if (this.started || this.shutDown) return;
    this.started = true;
    try {
      this.timerHandle = this.timer.setInterval(
        () => {
          void this.refresh();
        },
        this.intervalMinutes * MINUTES_TO_MILLISECONDS,
      );
    } catch (error) {
      this.started = false;
      throw error;
    }
  }

  /** Stops future ticks synchronously; an already-running collection may finish. */
  public shutdown(): void {
    if (this.shutDown) return;
    this.shutDown = true;
    this.started = false;
    if (this.timerHandle !== undefined) {
      this.timer.clearInterval(this.timerHandle);
      this.timerHandle = undefined;
    }
  }

  public stop(): void {
    this.shutdown();
  }

  private async refresh(): Promise<void> {
    if (this.shutDown || this.collecting) return;
    this.collecting = true;
    try {
      await this.news.collect(this.command);
    } catch {
      this.recordRefreshFailure();
    } finally {
      this.collecting = false;
    }
  }

  private recordRefreshFailure(): void {
    if (!this.onRefreshFailure) return;
    try {
      this.onRefreshFailure({ occurredAt: this.clock.now() });
    } catch {
      // Failure observation must not stop later scheduled News refreshes.
    }
  }
}

export function createNewsRefreshScheduler(
  news: Pick<NewsModulePublicApi, "collect">,
  options: NewsRefreshSchedulerOptions = {},
): NewsRefreshScheduler {
  return new NewsRefreshScheduler(news, options);
}
