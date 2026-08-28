import { describe, expect, it } from "vitest";
import {
  REST_SCHEMA_VERSION,
  type CandleDto,
  type MarketHistoryRequestDto,
  type MarketHistoryResponseDto,
  type RestMarketTimeframe,
} from "@cryptox/contracts/rest";
import type { MarketSubscription } from "@cryptox/contracts/websocket";
import { ChartController, MarketDashboardController } from "./chart-state";
import { FixtureMarketDataSource } from "./fixture-source";
import type { MarketDataSource, MarketRealtimeEvent, Unsubscribe } from "./types";

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function responseFor(request: MarketHistoryRequestDto): MarketHistoryResponseDto {
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    pair: request.pair,
    timeframe: request.timeframe,
    range: request.range,
    candles: [],
    complete: true,
    missingRanges: [],
    formingIncluded: false,
    asOf: "2026-08-28T00:00:00.000Z",
    provenance: {
      provider: "TEST",
      pair: request.pair,
      timeframe: request.timeframe,
      range: request.range,
      replayGuarantee: "EXACT_REPLAY_AVAILABLE",
      datasetId: "test-dataset",
      datasetVersion: "1",
    },
  };
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

class ControlledMarketSource implements MarketDataSource {
  public readonly reads: Array<{
    request: MarketHistoryRequestDto;
    result: Deferred<MarketHistoryResponseDto>;
  }> = [];
  private listener?: (event: MarketRealtimeEvent) => void;

  public readHistory(request: MarketHistoryRequestDto): Promise<MarketHistoryResponseDto> {
    const result = deferred<MarketHistoryResponseDto>();
    this.reads.push({ request, result });
    return result.promise;
  }

  public subscribe(
    _subscription: MarketSubscription,
    listener: (event: MarketRealtimeEvent) => void,
  ): Unsubscribe {
    this.listener = listener;
    return () => {
      if (this.listener === listener) this.listener = undefined;
    };
  }

  public resolveRead(index: number, candles: readonly CandleDto[] = []): void {
    const read = this.reads[index]!;
    read.result.resolve({ ...responseFor(read.request), candles });
  }

  public status(status: "CONNECTED" | "RECONNECTING" | "DISCONNECTED"): void {
    this.listener?.({
      type: "CONNECTION_STATUS",
      status: { provider: "CONTROLLED", status, lastEventAt: "2026-08-28T00:00:00.000Z" },
    });
  }

  public candle(timeframe: RestMarketTimeframe, timestamp: string): CandleDto {
    const candle: CandleDto = {
      pair: "BTCUSDT",
      timeframe,
      timestamp,
      open: 100,
      high: 111,
      low: 98,
      close: 108,
      volume: 20,
      isClosed: true,
    };
    this.listener?.({ type: "CANDLE", candle });
    return candle;
  }
}

describe("ChartController", () => {
  it("applies history before opening the realtime subscription", async () => {
    const events: string[] = [];
    const source: MarketDataSource = {
      async readHistory(request) {
        events.push("history:start");
        await Promise.resolve();
        events.push("history:applied");
        return responseFor(request);
      },
      subscribe(_subscription, listener) {
        events.push("realtime:subscribe");
        listener({
          type: "CONNECTION_STATUS",
          status: {
            provider: "TEST",
            status: "CONNECTED",
            lastEventAt: "2026-08-28T00:00:00.000Z",
          },
        });
        return () => events.push("realtime:unsubscribe");
      },
    };
    const controller = new ChartController("chart-1", "BTCUSDT", "5m", source);

    await controller.start();

    expect(events).toEqual(["history:start", "history:applied", "realtime:subscribe"]);
    expect(controller.snapshot().connection).toBe("LIVE");
    controller.stop();
    expect(events.at(-1)).toBe("realtime:unsubscribe");
  });

  it("changes only the selected chart timeframe and cleans up its old subscription", async () => {
    const source = new FixtureMarketDataSource();
    const dashboard = new MarketDashboardController(source, [
      { id: "one", pair: "BTCUSDT", timeframe: "5m" },
      { id: "two", pair: "BTCUSDT", timeframe: "15m" },
      { id: "three", pair: "BTCUSDT", timeframe: "1h" },
      { id: "four", pair: "BTCUSDT", timeframe: "4h" },
    ]);
    await dashboard.start();
    await flush();
    const untouchedBefore = dashboard.charts.slice(1).map((chart) => chart.snapshot());

    await dashboard.charts[0]!.changeTimeframe("1m");
    await flush();

    expect(dashboard.charts[0]!.snapshot().timeframe).toBe("1m");
    expect(dashboard.charts.slice(1).map((chart) => chart.snapshot())).toEqual(untouchedBefore);
    expect(source.unsubscriptions).toEqual(["BTCUSDT:5m"]);
    expect(source.historyReads.at(-1)).toBe("BTCUSDT:1m");
    expect(source.subscriptions.at(-1)).toBe("BTCUSDT:1m");
    dashboard.stop();
  });

  it("marks a disconnected chart stale and replaces a missed fixture gap on reconnect", async () => {
    const source = new FixtureMarketDataSource();
    const subscription: MarketSubscription = { pair: "BTCUSDT", timeframe: "5m" };
    const controller = new ChartController("chart-1", subscription.pair, subscription.timeframe, source);
    await controller.start();
    await flush();

    source.disconnect(subscription);
    expect(controller.snapshot()).toMatchObject({ connection: "DISCONNECTED", stale: true });

    const missed: CandleDto = {
      pair: subscription.pair,
      timeframe: subscription.timeframe,
      timestamp: "2026-08-28T00:05:00.000Z",
      open: 63_000,
      high: 63_220,
      low: 62_940,
      close: 63_180,
      volume: 41,
      isClosed: true,
    };
    source.emitCandle(missed);
    expect(controller.snapshot().candles.some((candle) => candle.timestamp === missed.timestamp)).toBe(false);

    source.reconnect(subscription);
    await flush();

    expect(controller.snapshot()).toMatchObject({ connection: "LIVE", stale: false });
    expect(controller.snapshot().candles).toContainEqual(missed);
    expect(source.historyReads).toEqual(["BTCUSDT:5m", "BTCUSDT:5m"]);
    controller.stop();
  });

  it("keeps a newer overlapping recovery authoritative until its buffered updates merge", async () => {
    const source = new ControlledMarketSource();
    const controller = new ChartController("chart-1", "BTCUSDT", "5m", source);
    const starting = controller.start();
    source.resolveRead(0);
    await starting;
    source.status("CONNECTED");

    source.status("DISCONNECTED");
    source.status("CONNECTED");
    source.status("DISCONNECTED");
    source.status("CONNECTED");
    expect(source.reads).toHaveLength(3);

    source.resolveRead(1);
    await flush();
    expect(controller.snapshot().connection).toBe("RECOVERING");
    const buffered = source.candle("5m", "2026-08-28T00:05:00.000Z");
    expect(controller.snapshot().candles).not.toContainEqual(buffered);

    source.resolveRead(2);
    await flush();
    expect(controller.snapshot()).toMatchObject({ connection: "LIVE", stale: false });
    expect(controller.snapshot().candles).toContainEqual(buffered);
    controller.stop();
  });

  it("does not let an obsolete timeframe recovery clear the active recovery", async () => {
    const source = new ControlledMarketSource();
    const controller = new ChartController("chart-1", "BTCUSDT", "5m", source);
    const starting = controller.start();
    source.resolveRead(0);
    await starting;
    source.status("CONNECTED");
    source.status("DISCONNECTED");
    source.status("CONNECTED");

    const changing = controller.changeTimeframe("15m");
    source.resolveRead(2);
    await changing;
    source.status("CONNECTED");
    source.status("DISCONNECTED");
    source.status("CONNECTED");
    expect(source.reads).toHaveLength(4);

    source.resolveRead(1);
    await flush();
    const buffered = source.candle("15m", "2026-08-28T00:15:00.000Z");
    expect(controller.snapshot().candles).not.toContainEqual(buffered);

    source.resolveRead(3);
    await flush();
    expect(controller.snapshot()).toMatchObject({
      timeframe: "15m",
      connection: "LIVE",
      stale: false,
    });
    expect(controller.snapshot().candles).toContainEqual(buffered);
    controller.stop();
  });

  it("enforces the supported one-to-four chart boundary", () => {
    const source = new FixtureMarketDataSource();
    expect(() => new MarketDashboardController(source, [])).toThrow(/one and four/);
    expect(
      () =>
        new MarketDashboardController(
          source,
          Array.from({ length: 5 }, (_, index) => ({
            id: String(index),
            pair: "BTCUSDT",
            timeframe: "5m" as const,
          })),
        ),
    ).toThrow(/one and four/);
  });
});
