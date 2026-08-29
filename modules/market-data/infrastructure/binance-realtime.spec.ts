import { describe, expect, it, vi } from "vitest";
import type { Candle } from "../domain/contracts";
import { createBinanceRealtimeProvider, type BinanceWebSocketFactory } from "./binance-realtime";

interface FakeSocket {
  readonly readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
  send(data: string): void;
  close(): void;
  open(): void;
  message(data: unknown): void;
  disconnect(): void;
  fail(): void;
}

function socketFactory(): { sockets: FakeSocket[]; factory: BinanceWebSocketFactory } {
  const sockets: FakeSocket[] = [];
  const factory: BinanceWebSocketFactory = () => {
    const socket: FakeSocket = {
      readyState: 0,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      send: vi.fn(),
      close: vi.fn(function close(this: FakeSocket) { this.disconnect(); }),
      open() {
        socket.onopen?.();
      },
      message(data) {
        socket.onmessage?.({ data });
      },
      disconnect() {
        socket.onclose?.();
      },
      fail() {
        socket.onerror?.();
      },
    };
    sockets.push(socket);
    return socket;
  };
  return { sockets, factory };
}

function kline(timestamp: string, close: string, isClosed: boolean): Record<string, unknown> {
  const openTime = Date.parse(timestamp);
  return {
    e: "kline",
    s: "BTCUSDT",
    k: {
      t: openTime,
      i: "5m",
      o: close,
      h: close,
      l: close,
      c: close,
      v: "2",
      x: isClosed,
    },
  };
}

function historyCandle(timestamp: string, close: number): Candle {
  return {
    pair: "BTCUSDT",
    timeframe: "5m",
    timestamp,
    open: close,
    high: close,
    low: close,
    close,
    volume: 2,
    isClosed: true,
  };
}

function response(payload: unknown): { ok: boolean; status: number; json: () => Promise<unknown> } {
  return { ok: true, status: 200, json: async () => payload };
}

async function flushAsyncWork(): Promise<void> {
  for (let index = 0; index < 20; index += 1) await Promise.resolve();
}

describe("Binance realtime provider", () => {
  it("normalizes Binance trade events into provider-neutral ticks without forwarding the provider envelope", async () => {
    const sockets = socketFactory();
    const updates: Array<{ kind: string; payload: unknown }> = [];
    const provider = createBinanceRealtimeProvider({
      webSocket: sockets.factory,
      fetch: async () => response([]),
    });
    const subscriptionPromise = provider.subscribe([{ pair: "BTCUSDT", timeframe: "5m" }], (update) => updates.push(update));
    sockets.sockets[0]!.open();
    await subscriptionPromise;

    sockets.sockets[0]!.message(JSON.stringify({
      e: "trade",
      E: Date.parse("2026-01-01T00:00:00.125Z"),
      s: "BTCUSDT",
      p: "100.25",
      q: "3",
      secret: "must-not-cross-boundary",
    }));
    await flushAsyncWork();

    expect(updates.filter((update) => update.kind === "TICK").map((update) => update.payload)).toEqual([
      { pair: "BTCUSDT", price: 100.25, timestamp: "2026-01-01T00:00:00.125Z" },
    ]);
    expect(JSON.stringify(updates)).not.toContain("must-not-cross-boundary");
    await provider.shutdown();
  });

  it("normalizes klines, suppresses duplicate/out-of-order closed candles, and resubscribes after bounded backoff", async () => {
    const sockets = socketFactory();
    const sleeps: number[] = [];
    const provider = createBinanceRealtimeProvider({
      webSocket: sockets.factory,
      sleep: async (delay) => { sleeps.push(delay); },
      reconnectBaseDelayMs: 10,
      reconnectMaxDelayMs: 15,
      maxReconnectAttempts: 2,
      clock: () => "2026-01-01T00:05:00.000Z",
      fetch: async () => response([]),
    });
    const updates: Array<{ kind: string; payload: unknown }> = [];
    const subscriptionPromise = provider.subscribe([{ pair: "btcusdt", timeframe: "5m" }], (update) => updates.push(update));
    sockets.sockets[0]!.open();
    await subscriptionPromise;
    expect(JSON.parse((sockets.sockets[0]!.send as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string)).toMatchObject({
      method: "SUBSCRIBE",
      params: ["btcusdt@kline_5m", "btcusdt@trade"],
    });

    sockets.sockets[0]!.message(JSON.stringify(kline("2026-01-01T00:00:00.000Z", "100", true)));
    sockets.sockets[0]!.message(JSON.stringify(kline("2026-01-01T00:00:00.000Z", "100", true)));
    sockets.sockets[0]!.message(JSON.stringify(kline("2026-01-01T00:05:00.000Z", "101", true)));
    sockets.sockets[0]!.message(JSON.stringify(kline("2026-01-01T00:02:00.000Z", "99", true)));
    await Promise.resolve();
    await Promise.resolve();

    sockets.sockets[0]!.disconnect();
    expect(updates.map((update) => (update.payload as { status?: string }).status).filter(Boolean)).toEqual(["CONNECTED", "RECONNECTING"]);
    expect(sleeps).toEqual([10]);
    await flushAsyncWork();
    sockets.sockets[1]!.open();
    await flushAsyncWork();
    expect((sockets.sockets[1]!.send as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    expect(updates.map((update) => (update.payload as { status?: string }).status).filter(Boolean)).toEqual(["CONNECTED", "RECONNECTING", "CONNECTED"]);
    await provider.shutdown();
  });

  it("emits changed corrections for observed closed candles but drops unseen older out-of-order candles", async () => {
    const sockets = socketFactory();
    const updates: Array<{ kind: string; payload: unknown }> = [];
    const provider = createBinanceRealtimeProvider({
      webSocket: sockets.factory,
      fetch: async () => response([]),
    });
    const subscriptionPromise = provider.subscribe([{ pair: "BTCUSDT", timeframe: "5m" }], (update) => updates.push(update));
    sockets.sockets[0]!.open();
    await subscriptionPromise;

    sockets.sockets[0]!.message(JSON.stringify(kline("2026-01-01T00:10:00.000Z", "110", true)));
    sockets.sockets[0]!.message(JSON.stringify(kline("2026-01-01T00:05:00.000Z", "105", true)));
    sockets.sockets[0]!.message(JSON.stringify(kline("2026-01-01T00:10:00.000Z", "111", true)));
    sockets.sockets[0]!.message(JSON.stringify(kline("2026-01-01T00:10:00.000Z", "111", true)));
    await flushAsyncWork();

    expect(updates.filter((update) => update.kind === "CANDLE").map((update) => (update.payload as Candle).close)).toEqual([110, 111]);
    await provider.shutdown();
  });

  it("does not regress an observed closed candle to forming", async () => {
    const sockets = socketFactory();
    const updates: Array<{ kind: string; payload: unknown }> = [];
    const provider = createBinanceRealtimeProvider({
      webSocket: sockets.factory,
      fetch: async () => response([]),
    });
    const subscriptionPromise = provider.subscribe([{ pair: "BTCUSDT", timeframe: "5m" }], (update) => updates.push(update));
    sockets.sockets[0]!.open();
    await subscriptionPromise;

    sockets.sockets[0]!.message(JSON.stringify(kline("2026-01-01T00:10:00.000Z", "110", true)));
    sockets.sockets[0]!.message(JSON.stringify(kline("2026-01-01T00:10:00.000Z", "112", false)));
    await flushAsyncWork();

    const candles = updates.filter((update) => update.kind === "CANDLE").map((update) => update.payload as Candle);
    expect(candles).toHaveLength(1);
    expect(candles[0]).toMatchObject({ timestamp: "2026-01-01T00:10:00.000Z", close: 110, isClosed: true });
    await provider.shutdown();
  });

  it("fills REST gaps before releasing CONNECTED and queues live continuation", async () => {
    const sockets = socketFactory();
    const reads: Array<{ from: string; to: string }> = [];
    const updates: Array<{ kind: string; payload: unknown }> = [];
    const provider = createBinanceRealtimeProvider({
      webSocket: sockets.factory,
      sleep: async () => undefined,
      clock: () => "2026-01-01T00:20:00.000Z",
      fetch: async (url) => {
        const parsed = new URL(url);
        reads.push({ from: new Date(Number(parsed.searchParams.get("startTime"))).toISOString(), to: new Date(Number(parsed.searchParams.get("endTime")) + 1).toISOString() });
        return response([
          [Date.parse("2026-01-01T00:05:00.000Z"), "101", "101", "101", "101", "2", Date.parse("2026-01-01T00:09:59.999Z")],
          [Date.parse("2026-01-01T00:10:00.000Z"), "102", "102", "102", "102", "2", Date.parse("2026-01-01T00:14:59.999Z")],
          [Date.parse("2026-01-01T00:15:00.000Z"), "103", "103", "103", "103", "2", Date.parse("2026-01-01T00:19:59.999Z")],
        ]);
      },
    });
    const subscriptionPromise = provider.subscribe([{ pair: "BTCUSDT", timeframe: "5m" }], (update) => updates.push(update));
    sockets.sockets[0]!.open();
    await subscriptionPromise;
    sockets.sockets[0]!.message(JSON.stringify(kline("2026-01-01T00:00:00.000Z", "100", true)));
    await Promise.resolve();
    await Promise.resolve();
    sockets.sockets[0]!.disconnect();
    await flushAsyncWork();
    sockets.sockets[1]!.open();
    sockets.sockets[1]!.message(JSON.stringify(kline("2026-01-01T00:20:00.000Z", "104", true)));
    await flushAsyncWork();

    expect(reads).toEqual([
      { from: "2026-01-01T00:05:00.000Z", to: "2026-01-01T00:20:00.000Z" },
    ]);
    expect(updates.filter((update) => update.kind === "CANDLE").map((update) => (update.payload as Candle).timestamp)).toEqual([
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:05:00.000Z",
      "2026-01-01T00:10:00.000Z",
      "2026-01-01T00:15:00.000Z",
      "2026-01-01T00:20:00.000Z",
    ]);
    const statuses = updates.filter((update) => update.kind === "CONNECTION_STATUS").map((update) => (update.payload as { status: string }).status);
    expect(statuses).toEqual(["CONNECTED", "RECONNECTING", "CONNECTED"]);
    await provider.shutdown();
  });

  it("caps reconnect attempts and applies the configured backoff ceiling", async () => {
    const sockets = socketFactory();
    const sleeps: number[] = [];
    const updates: Array<{ kind: string; payload: unknown }> = [];
    const provider = createBinanceRealtimeProvider({
      webSocket: sockets.factory,
      sleep: async (delay) => { sleeps.push(delay); },
      reconnectBaseDelayMs: 10,
      reconnectMaxDelayMs: 15,
      maxReconnectAttempts: 2,
      fetch: async () => response([]),
    });
    const subscriptionPromise = provider.subscribe([{ pair: "BTCUSDT", timeframe: "5m" }], (update) => updates.push(update));
    sockets.sockets[0]!.open();
    await subscriptionPromise;
    sockets.sockets[0]!.disconnect();
    await flushAsyncWork();
    sockets.sockets[1]!.disconnect();
    await flushAsyncWork();
    sockets.sockets[2]!.disconnect();
    await flushAsyncWork();

    expect(sleeps).toEqual([10, 15]);
    expect(updates.map((update) => (update.payload as { status?: string }).status).filter(Boolean)).toEqual([
      "CONNECTED",
      "RECONNECTING",
      "RECONNECTING",
      "RECONNECTING",
      "DISCONNECTED",
    ]);
    await provider.shutdown();
  });

  it("reconnects after a socket error even when no close event follows", async () => {
    const sockets = socketFactory();
    const sleeps: number[] = [];
    const updates: Array<{ kind: string; payload: unknown }> = [];
    const provider = createBinanceRealtimeProvider({
      webSocket: sockets.factory,
      sleep: async (delay) => { sleeps.push(delay); },
      reconnectBaseDelayMs: 10,
      reconnectMaxDelayMs: 10,
      maxReconnectAttempts: 1,
      fetch: async () => response([]),
    });
    const subscriptionPromise = provider.subscribe([{ pair: "BTCUSDT", timeframe: "5m" }], (update) => updates.push(update));
    sockets.sockets[0]!.open();
    await subscriptionPromise;

    sockets.sockets[0]!.fail();
    await flushAsyncWork();
    expect(sleeps).toEqual([10]);
    expect(updates.filter((update) => update.kind === "CONNECTION_STATUS").map((update) => (update.payload as { status: string }).status)).toEqual([
      "CONNECTED",
      "RECONNECTING",
    ]);

    sockets.sockets[1]!.open();
    await flushAsyncWork();
    expect(updates.filter((update) => update.kind === "CONNECTION_STATUS").map((update) => (update.payload as { status: string }).status)).toEqual([
      "CONNECTED",
      "RECONNECTING",
      "CONNECTED",
    ]);
    await provider.shutdown();
  });

  it("does not release continuation when REST reconciliation still has missing candle slots", async () => {
    const sockets = socketFactory();
    const observations: unknown[] = [];
    const updates: Array<{ kind: string; payload: unknown }> = [];
    const provider = createBinanceRealtimeProvider({
      webSocket: sockets.factory,
      sleep: async () => undefined,
      clock: () => "2026-01-01T00:10:00.000Z",
      observability: { record: (event) => observations.push(event) },
      fetch: async () => response([]),
    });
    const subscriptionPromise = provider.subscribe([{ pair: "BTCUSDT", timeframe: "5m" }], (update) => updates.push(update));
    sockets.sockets[0]!.open();
    await subscriptionPromise;
    sockets.sockets[0]!.message(JSON.stringify(kline("2026-01-01T00:00:00.000Z", "100", true)));
    await flushAsyncWork();
    sockets.sockets[0]!.disconnect();
    await flushAsyncWork();
    sockets.sockets[1]!.open();
    await flushAsyncWork();

    expect(observations).toEqual(expect.arrayContaining([expect.objectContaining({ type: "HISTORY_GAP" })]));
    expect(updates.filter((update) => update.kind === "CONNECTION_STATUS").map((update) => (update.payload as { status: string }).status)).toEqual([
      "CONNECTED",
      "RECONNECTING",
      "RECONNECTING",
    ]);
    await provider.shutdown();
  });

  it("bounds REST gap reconciliation before requesting an oversized missing range", async () => {
    const sockets = socketFactory();
    const fetcher = vi.fn(async () => response([]));
    const observations: unknown[] = [];
    const provider = createBinanceRealtimeProvider({
      webSocket: sockets.factory,
      sleep: async () => undefined,
      clock: () => "2026-01-01T00:20:00.000Z",
      maxGapCandles: 2,
      observability: { record: (event) => observations.push(event) },
      fetch: fetcher,
    });
    const updates: Array<{ kind: string; payload: unknown }> = [];
    const subscriptionPromise = provider.subscribe([{ pair: "BTCUSDT", timeframe: "5m" }], (update) => updates.push(update));
    sockets.sockets[0]!.open();
    await subscriptionPromise;
    sockets.sockets[0]!.message(JSON.stringify(kline("2026-01-01T00:00:00.000Z", "100", true)));
    await flushAsyncWork();
    sockets.sockets[0]!.disconnect();
    await flushAsyncWork();
    sockets.sockets[1]!.open();
    await flushAsyncWork();

    expect(fetcher).not.toHaveBeenCalled();
    expect(observations).toEqual(expect.arrayContaining([expect.objectContaining({ type: "HISTORY_GAP" })]));
    expect(updates.filter((update) => update.kind === "CANDLE").map((update) => (update.payload as Candle).timestamp)).toEqual([
      "2026-01-01T00:00:00.000Z",
    ]);
    await provider.shutdown();
  });

  it("ends a mid-candle REST recovery window at the latest fully closed interval", async () => {
    const sockets = socketFactory();
    const reads: Array<{ from: string; to: string }> = [];
    const updates: Array<{ kind: string; payload: unknown }> = [];
    const provider = createBinanceRealtimeProvider({
      webSocket: sockets.factory,
      sleep: async () => undefined,
      clock: () => "2026-01-01T00:17:00.000Z",
      fetch: async (url) => {
        const parsed = new URL(url);
        reads.push({ from: new Date(Number(parsed.searchParams.get("startTime"))).toISOString(), to: new Date(Number(parsed.searchParams.get("endTime")) + 1).toISOString() });
        return response([
          [Date.parse("2026-01-01T00:05:00.000Z"), "101", "101", "101", "101", "2", Date.parse("2026-01-01T00:09:59.999Z")],
          [Date.parse("2026-01-01T00:10:00.000Z"), "102", "102", "102", "102", "2", Date.parse("2026-01-01T00:14:59.999Z")],
        ]);
      },
    });
    const subscriptionPromise = provider.subscribe([{ pair: "BTCUSDT", timeframe: "5m" }], (update) => updates.push(update));
    sockets.sockets[0]!.open();
    await subscriptionPromise;
    sockets.sockets[0]!.message(JSON.stringify(kline("2026-01-01T00:00:00.000Z", "100", true)));
    await flushAsyncWork();
    sockets.sockets[0]!.disconnect();
    await flushAsyncWork();
    sockets.sockets[1]!.open();
    sockets.sockets[1]!.message(JSON.stringify(kline("2026-01-01T00:15:00.000Z", "103", false)));
    await flushAsyncWork();

    expect(reads).toEqual([{ from: "2026-01-01T00:05:00.000Z", to: "2026-01-01T00:15:00.000Z" }]);
    expect(updates.filter((update) => update.kind === "CANDLE").map((update) => (update.payload as Candle).timestamp)).toEqual([
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:05:00.000Z",
      "2026-01-01T00:10:00.000Z",
      "2026-01-01T00:15:00.000Z",
    ]);
    expect(updates.filter((update) => update.kind === "CONNECTION_STATUS").map((update) => (update.payload as { status: string }).status)).toEqual([
      "CONNECTED",
      "RECONNECTING",
      "CONNECTED",
    ]);
    await provider.shutdown();
  });

  it("stops reconnecting on shutdown and reports malformed payloads without leaking raw data", async () => {
    const sockets = socketFactory();
    const failures: unknown[] = [];
    const provider = createBinanceRealtimeProvider({
      webSocket: sockets.factory,
      maxReconnectAttempts: 1,
      sleep: async () => undefined,
      observability: { record: (event) => failures.push(event) },
      fetch: async () => response([]),
    });
    const subscriptionPromise = provider.subscribe([{ pair: "BTCUSDT", timeframe: "5m" }], () => undefined);
    sockets.sockets[0]!.open();
    await subscriptionPromise;
    sockets.sockets[0]!.message(JSON.stringify({ e: "kline", k: { x: "not-a-boolean" }, secret: "do-not-forward" }));
    await Promise.resolve();
    await provider.shutdown();
    expect(failures).toEqual(expect.arrayContaining([expect.objectContaining({ type: "PROVIDER_FAILURE" })]));
    expect(JSON.stringify(failures)).not.toContain("do-not-forward");
    expect(sockets.sockets[0]!.close).toHaveBeenCalled();
    expect(sockets.sockets).toHaveLength(1);
  });

  it("does not create a replacement socket after shutdown cancels a pending reconnect", async () => {
    const sockets = socketFactory();
    let releaseSleep!: () => void;
    const sleep = () => new Promise<void>((resolve) => { releaseSleep = resolve; });
    const provider = createBinanceRealtimeProvider({
      webSocket: sockets.factory,
      sleep,
      maxReconnectAttempts: 2,
      fetch: async () => response([]),
    });
    const subscriptionPromise = provider.subscribe([{ pair: "BTCUSDT", timeframe: "5m" }], () => undefined);
    sockets.sockets[0]!.open();
    await subscriptionPromise;
    sockets.sockets[0]!.disconnect();
    await flushAsyncWork();
    await provider.shutdown();
    releaseSleep();
    await flushAsyncWork();

    expect(sockets.sockets).toHaveLength(1);
  });
});
