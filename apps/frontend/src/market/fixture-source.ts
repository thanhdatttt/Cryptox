import {
  REST_SCHEMA_VERSION,
  type CandleDto,
  type MarketHistoryRequestDto,
  type MarketHistoryResponseDto,
  type RestMarketTimeframe,
} from "@cryptox/contracts/rest";
import type { MarketSubscription } from "@cryptox/contracts/websocket";
import type { MarketDataSource, MarketRealtimeEvent, Unsubscribe } from "./types";

interface FixtureSubscriber {
  readonly subscription: MarketSubscription;
  readonly listener: (event: MarketRealtimeEvent) => void;
}

const timeframeMinutes: Readonly<Record<RestMarketTimeframe, number>> = {
  "1m": 1,
  "5m": 5,
  "15m": 15,
  "1h": 60,
  "4h": 240,
  "1d": 1440,
};

function key(subscription: MarketSubscription): string {
  return `${subscription.pair}:${subscription.timeframe}`;
}

function syntheticCandles(pair: string, timeframe: RestMarketTimeframe): CandleDto[] {
  const interval = timeframeMinutes[timeframe] * 60_000;
  const end = Date.parse("2026-08-28T00:00:00.000Z");
  return Array.from({ length: 80 }, (_, index) => {
    const wave = Math.sin(index / 5) * 420;
    const open = 62_000 + wave + index * 11;
    const close = open + Math.cos(index / 3) * 115;
    return {
      pair,
      timeframe,
      timestamp: new Date(end - (79 - index) * interval).toISOString(),
      open,
      high: Math.max(open, close) + 90,
      low: Math.min(open, close) - 90,
      close,
      volume: 24 + index * 0.8,
      isClosed: index < 79,
    };
  });
}

export class FixtureMarketDataSource implements MarketDataSource {
  private readonly histories = new Map<string, CandleDto[]>();
  private readonly subscribers = new Map<number, FixtureSubscriber>();
  private readonly disconnected = new Set<string>();
  private nextId = 1;

  public historyReads: string[] = [];
  public subscriptions: string[] = [];
  public unsubscriptions: string[] = [];

  public async readHistory(
    request: MarketHistoryRequestDto,
  ): Promise<MarketHistoryResponseDto> {
    const marketKey = key(request);
    this.historyReads.push(marketKey);
    const candles = this.histories.get(marketKey) ?? syntheticCandles(request.pair, request.timeframe);
    this.histories.set(marketKey, candles);
    return {
      schemaVersion: REST_SCHEMA_VERSION,
      pair: request.pair,
      timeframe: request.timeframe,
      range: request.range,
      candles: candles.slice(-request.limit!),
      complete: true,
      missingRanges: [],
      formingIncluded: request.includeForming ?? false,
      asOf: new Date().toISOString(),
      provenance: {
        provider: "FIXTURE",
        pair: request.pair,
        timeframe: request.timeframe,
        range: request.range,
        replayGuarantee: "EXACT_REPLAY_AVAILABLE",
        datasetId: `fixture-${marketKey}`,
        datasetVersion: "F-01-V1",
      },
    };
  }

  public subscribe(
    subscription: MarketSubscription,
    listener: (event: MarketRealtimeEvent) => void,
  ): Unsubscribe {
    const id = this.nextId++;
    const marketKey = key(subscription);
    this.subscriptions.push(marketKey);
    this.subscribers.set(id, { subscription, listener });
    queueMicrotask(() => {
      if (!this.subscribers.has(id)) return;
      listener({
        type: "CONNECTION_STATUS",
        status: {
          provider: "FIXTURE",
          status: this.disconnected.has(marketKey) ? "DISCONNECTED" : "CONNECTED",
          lastEventAt: new Date().toISOString(),
        },
      });
    });
    return () => {
      if (!this.subscribers.delete(id)) return;
      this.unsubscriptions.push(marketKey);
    };
  }

  public emitCandle(candle: CandleDto): void {
    const marketKey = key(candle);
    const history = this.histories.get(marketKey) ?? [];
    const next = [...history.filter((item) => item.timestamp !== candle.timestamp), candle].sort(
      (left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp),
    );
    this.histories.set(marketKey, next);
    if (this.disconnected.has(marketKey)) return;
    this.forMarket(marketKey, (subscriber) =>
      subscriber.listener({ type: "CANDLE", candle }),
    );
  }

  public disconnect(subscription: MarketSubscription): void {
    const marketKey = key(subscription);
    this.disconnected.add(marketKey);
    this.emitStatus(marketKey, "DISCONNECTED");
  }

  public reconnect(subscription: MarketSubscription): void {
    const marketKey = key(subscription);
    this.disconnected.delete(marketKey);
    this.emitStatus(marketKey, "RECONNECTING");
    this.emitStatus(marketKey, "CONNECTED");
  }

  private emitStatus(
    marketKey: string,
    status: "CONNECTED" | "RECONNECTING" | "DISCONNECTED",
  ): void {
    this.forMarket(marketKey, (subscriber) =>
      subscriber.listener({
        type: "CONNECTION_STATUS",
        status: { provider: "FIXTURE", status, lastEventAt: new Date().toISOString() },
      }),
    );
  }

  private forMarket(marketKey: string, action: (subscriber: FixtureSubscriber) => void): void {
    for (const subscriber of this.subscribers.values()) {
      if (key(subscriber.subscription) === marketKey) action(subscriber);
    }
  }
}
