import { describe, expect, it } from "vitest";
import type { Candle } from "../domain/contracts";
import type { MarketDataHistoryRequest, MarketDataProvider } from "./ports";

const request: MarketDataHistoryRequest = {
  pair: "BTCUSDT",
  timeframe: "5m",
  range: { from: "2026-01-01T00:00:00Z", to: "2026-01-01T00:05:00Z" },
};

function fakeProvider(id: string, close: number): MarketDataProvider {
  const candle: Candle = {
    pair: request.pair,
    timeframe: request.timeframe,
    timestamp: request.range!.from,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
    isClosed: true,
  };

  return {
    id,
    readCandles: async (input) => ({
      range: input.range,
      candles: [candle],
      complete: true,
      missingRanges: [],
      formingIncluded: false,
      observedAt: "2026-01-01T00:06:00Z",
    }),
    subscribe: async (_subscriptions, sink) => {
      sink({ kind: "CANDLE", payload: candle });
      return async () => undefined;
    },
    shutdown: async () => undefined,
  };
}

describe("MarketDataProvider", () => {
  it("allows provider substitution without changing normalized consumers", async () => {
    const first = await fakeProvider("provider-a", 100).readCandles(request);
    const second = await fakeProvider("provider-b", 200).readCandles(request);

    expect(first.candles[0]).toMatchObject({ pair: "BTCUSDT", close: 100 });
    expect(second.candles[0]).toMatchObject({ pair: "BTCUSDT", close: 200 });
  });

  it("delivers only normalized provider updates", async () => {
    const updates: Candle[] = [];
    const unsubscribe = await fakeProvider("provider-a", 100).subscribe(
      [{ pair: "BTCUSDT", timeframe: "5m" }],
      (update) => {
        if (update.kind === "CANDLE") updates.push(update.payload);
      },
    );

    expect(updates).toHaveLength(1);
    await unsubscribe();
  });
});
