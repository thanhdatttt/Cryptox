import { describe, expect, it, vi } from "vitest";
import { REST_SCHEMA_VERSION, type MarketHistoryRequestDto } from "@cryptox/contracts/rest";
import { ChartController } from "./chart-state";
import { MarketWebSocketClient, RestMarketDataClient, type WebSocketLike } from "./clients";
import { RemoteMarketDataSource } from "./remote-source";

class TestSocket implements WebSocketLike {
  public readyState = 0;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent<string>) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readonly sent: string[] = [];

  public open(): void {
    this.readyState = 1;
    this.onopen?.({} as Event);
  }

  public receive(value: unknown): void {
    this.onmessage?.({ data: JSON.stringify(value) } as MessageEvent<string>);
  }

  public send(data: string): void {
    this.sent.push(data);
  }

  public close(): void {
    this.readyState = 3;
    this.onclose?.({} as CloseEvent);
  }
}

const historyRequest: MarketHistoryRequestDto = {
  schemaVersion: REST_SCHEMA_VERSION,
  pair: "BTCUSDT",
  timeframe: "5m",
  range: { from: "2026-08-27T00:00:00.000Z", to: "2026-08-28T00:00:00.000Z" },
  limit: 100,
  completeness: "ALLOW_PARTIAL",
};

describe("typed market clients", () => {
  it("preserves the browser fetch receiver for the default REST market seam", async () => {
    const browserLike = {
      fetch(this: unknown, _input: string, _init?: RequestInit) {
        if (this !== undefined && this !== globalThis) {
          throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            schemaVersion: REST_SCHEMA_VERSION,
            pair: historyRequest.pair,
            timeframe: historyRequest.timeframe,
            candles: [],
            missingRanges: [],
          }),
        });
      },
    };
    const unboundBrowserFetch = browserLike.fetch;
    vi.stubGlobal("fetch", unboundBrowserFetch);

    try {
      await expect(new RestMarketDataClient("/api", unboundBrowserFetch).readHistory(historyRequest)).rejects.toThrow(
        /Illegal invocation/,
      );
      await expect(new RestMarketDataClient("/api").readHistory(historyRequest)).resolves.toMatchObject({
        pair: historyRequest.pair,
        timeframe: historyRequest.timeframe,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("uses the frozen history DTO and rejects a response for another market", async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        schemaVersion: 1,
        pair: "ETHUSDT",
        timeframe: "5m",
        candles: [],
        missingRanges: [],
      }),
    }));
    const client = new RestMarketDataClient("/api", fetcher);

    await expect(client.readHistory(historyRequest)).rejects.toThrow(/does not match/);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/market-data/history",
      expect.objectContaining({ method: "POST", body: JSON.stringify(historyRequest) }),
    );
  });

  it("sends normalized subscribe/unsubscribe messages and routes only matching candles", () => {
    const socket = new TestSocket();
    const client = new MarketWebSocketClient("ws://market.test", () => socket);
    const messages: string[] = [];
    const unsubscribe = client.subscribe(
      { pair: "BTCUSDT", timeframe: "5m" },
      (message) => messages.push(message.type),
    );
    socket.open();
    expect(JSON.parse(socket.sent[0]!)).toMatchObject({
      schemaVersion: 1,
      type: "SUBSCRIBE",
      payload: { subscriptions: [{ pair: "BTCUSDT", timeframe: "5m" }] },
    });

    socket.receive({
      schemaVersion: 1,
      type: "CANDLE",
      sentAt: "2026-08-28T00:00:00.000Z",
      payload: {
        pair: "ETHUSDT",
        timeframe: "5m",
        timestamp: "2026-08-28T00:00:00.000Z",
        open: 1,
        high: 2,
        low: 1,
        close: 2,
        volume: 1,
        isClosed: true,
      },
    });
    socket.receive({
      schemaVersion: 1,
      type: "CANDLE",
      sentAt: "2026-08-28T00:00:00.000Z",
      payload: {
        pair: "BTCUSDT",
        timeframe: "5m",
        timestamp: "2026-08-28T00:00:00.000Z",
        open: 1,
        high: 2,
        low: 1,
        close: 2,
        volume: 1,
        isClosed: true,
      },
    });
    expect(messages).toEqual(["CANDLE"]);

    unsubscribe();
    expect(JSON.parse(socket.sent.at(-1)!)).toMatchObject({
      schemaVersion: 1,
      type: "UNSUBSCRIBE",
      payload: { subscriptions: [{ pair: "BTCUSDT", timeframe: "5m" }] },
    });
    expect(socket.readyState).toBe(3);
  });

  it("promotes a late subscription on an open socket when its acknowledgement arrives", async () => {
    const socket = new TestSocket();
    const fetcher = vi.fn(async (_input: string, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as MarketHistoryRequestDto;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          schemaVersion: 1,
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
            datasetId: "test",
            datasetVersion: "1",
          },
        }),
      };
    });
    const source = new RemoteMarketDataSource(
      new RestMarketDataClient("/api", fetcher),
      new MarketWebSocketClient("ws://market.test", () => socket),
    );
    const first = new ChartController("first", "BTCUSDT", "5m", source);
    await first.start();
    socket.open();
    socket.receive({
      schemaVersion: 1,
      type: "SUBSCRIPTION_ACK",
      sentAt: "2026-08-28T00:00:00.000Z",
      payload: {
        action: "SUBSCRIBE",
        accepted: [
          { subscription: { pair: "BTCUSDT", timeframe: "5m" }, state: "ACTIVE" },
        ],
        rejected: [],
      },
    });
    expect(first.snapshot().connection).toBe("LIVE");

    const late = new ChartController("late", "BTCUSDT", "15m", source);
    await late.start();
    expect(late.snapshot().connection).toBe("CONNECTING");
    expect(JSON.parse(socket.sent.at(-1)!)).toMatchObject({
      type: "SUBSCRIBE",
      payload: { subscriptions: [{ pair: "BTCUSDT", timeframe: "15m" }] },
    });

    socket.receive({
      schemaVersion: 1,
      type: "SUBSCRIPTION_ACK",
      sentAt: "2026-08-28T00:01:00.000Z",
      payload: {
        action: "SUBSCRIBE",
        accepted: [
          { subscription: { pair: "BTCUSDT", timeframe: "15m" }, state: "ACTIVE" },
        ],
        rejected: [],
      },
    });
    expect(late.snapshot()).toMatchObject({ connection: "LIVE", stale: false });
    first.stop();
    late.stop();
  });

  it("stops reconnecting at the configured cap when sockets never become confirmed", async () => {
    vi.useFakeTimers();
    const sockets: TestSocket[] = [];
    const client = new MarketWebSocketClient(
      "ws://market.test",
      () => {
        const socket = new TestSocket();
        sockets.push(socket);
        return socket;
      },
      25,
      2,
    );
    const statuses: string[] = [];
    const unsubscribe = client.subscribe(
      { pair: "BTCUSDT", timeframe: "15m" },
      (message) => {
        if (message.type === "CONNECTION_STATUS") statuses.push(message.payload.status);
      },
    );
    sockets[0]!.open();
    sockets[0]!.close();

    expect(statuses).toEqual(["DISCONNECTED", "RECONNECTING"]);
    await vi.advanceTimersByTimeAsync(25);
    sockets[1]!.open();
    sockets[1]!.close();
    await vi.advanceTimersByTimeAsync(25);
    sockets[2]!.open();
    sockets[2]!.close();
    await vi.advanceTimersByTimeAsync(100);

    expect(sockets).toHaveLength(3);
    expect(statuses).toEqual([
      "DISCONNECTED",
      "RECONNECTING",
      "DISCONNECTED",
      "RECONNECTING",
      "DISCONNECTED",
    ]);
    expect(JSON.parse(sockets[2]!.sent[0]!)).toMatchObject({
      type: "SUBSCRIBE",
      payload: { subscriptions: [{ pair: "BTCUSDT", timeframe: "15m" }] },
    });

    unsubscribe();
    vi.useRealTimers();
  });
});
