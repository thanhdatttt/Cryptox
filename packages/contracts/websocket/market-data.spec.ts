import { describe, expect, it } from "vitest";
import {
  MARKET_WS_CLIENT_MESSAGE_TYPES,
  MARKET_WS_SERVER_MESSAGE_TYPES,
  parseMarketWebSocketClientMessage,
  parseMarketWebSocketServerMessage,
  type MarketWebSocketServerMessage,
} from "@cryptox/contracts/websocket";

describe("market WebSocket transport contracts", () => {
  it("freezes market-only public discriminators", () => {
    expect(MARKET_WS_CLIENT_MESSAGE_TYPES).toEqual(["SUBSCRIBE", "UNSUBSCRIBE"]);
    expect(MARKET_WS_SERVER_MESSAGE_TYPES).toEqual([
      "MARKET_TICK",
      "CANDLE",
      "CONNECTION_STATUS",
      "MARKET_OBSERVABILITY",
      "SUBSCRIPTION_ACK",
      "ERROR",
    ]);
    expect(MARKET_WS_SERVER_MESSAGE_TYPES).not.toContain("LEADERBOARD_UPDATED");
  });

  it.each(["SUBSCRIBE", "UNSUBSCRIBE"] as const)(
    "round-trips and validates %s",
    (type) => {
      const message = {
        schemaVersion: 1,
        type,
        requestId: "request-1",
        payload: { subscriptions: [{ pair: "BTCUSDT", timeframe: "5m" }] },
      };
      expect(parseMarketWebSocketClientMessage(JSON.parse(JSON.stringify(message)))).toEqual(
        message,
      );
    },
  );

  it("round-trips every approved server message family", () => {
    const messages: MarketWebSocketServerMessage[] = [
      {
        schemaVersion: 1,
        type: "MARKET_TICK",
        sentAt: "2026-01-01T00:00:01Z",
        payload: { pair: "BTCUSDT", price: 100, timestamp: "2026-01-01T00:00:00Z" },
      },
      {
        schemaVersion: 1,
        type: "CANDLE",
        sentAt: "2026-01-01T00:00:01Z",
        payload: {
          pair: "BTCUSDT",
          timeframe: "5m",
          timestamp: "2026-01-01T00:00:00Z",
          open: 100,
          high: 101,
          low: 99,
          close: 100,
          volume: 1,
          isClosed: true,
        },
      },
      {
        schemaVersion: 1,
        type: "CONNECTION_STATUS",
        sentAt: "2026-01-01T00:00:01Z",
        payload: {
          provider: "binance",
          status: "CONNECTED",
          lastEventAt: "2026-01-01T00:00:00Z",
        },
      },
      {
        schemaVersion: 1,
        type: "MARKET_OBSERVABILITY",
        sentAt: "2026-01-01T00:00:01Z",
        payload: {
          profileId: "MARKET_OBSERVABILITY_V1",
          pair: "BTCUSDT",
          connection: {
            provider: "binance",
            status: "CONNECTED",
            lastEventAt: "2026-01-01T00:00:00Z",
          },
          lastLatencyMs: 25,
          latestTicks: [
            {
              pair: "BTCUSDT",
              price: 100,
              timestamp: "2026-01-01T00:00:00Z",
              providerEventAt: "2026-01-01T00:00:00Z",
              receivedAt: "2026-01-01T00:00:00.025Z",
              latencyMs: 25,
            },
          ],
          persistence: "EPHEMERAL_IN_MEMORY_ONLY",
        },
      },
      {
        schemaVersion: 1,
        type: "SUBSCRIPTION_ACK",
        sentAt: "2026-01-01T00:00:01Z",
        requestId: "request-1",
        payload: {
          action: "SUBSCRIBE",
          accepted: [
            {
              subscription: { pair: "BTCUSDT", timeframe: "5m" },
              state: "ACTIVE",
            },
          ],
          rejected: [],
        },
      },
      {
        schemaVersion: 1,
        type: "ERROR",
        sentAt: "2026-01-01T00:00:01Z",
        payload: { code: "PROVIDER_UNAVAILABLE", message: "temporarily unavailable" },
      },
    ];

    expect(
      messages.map((message) =>
        parseMarketWebSocketServerMessage(JSON.parse(JSON.stringify(message))),
      ),
    ).toEqual(messages);
  });

  it("rejects non-market messages and malformed numeric payloads", () => {
    expect(() =>
      parseMarketWebSocketServerMessage({
        schemaVersion: 1,
        type: "LEADERBOARD_UPDATED",
        sentAt: "2026-01-01T00:00:01Z",
        payload: {},
      }),
    ).toThrow();
    expect(() =>
      parseMarketWebSocketServerMessage({
        schemaVersion: 1,
        type: "MARKET_TICK",
        sentAt: "2026-01-01T00:00:01Z",
        payload: { pair: "BTCUSDT", price: Number.NaN, timestamp: "now" },
      }),
    ).toThrow();
    expect(() =>
      parseMarketWebSocketServerMessage({
        schemaVersion: 1,
        type: "MARKET_OBSERVABILITY",
        sentAt: "2026-01-01T00:00:01Z",
        payload: {
          profileId: "MARKET_OBSERVABILITY_V1",
          pair: "BTCUSDT",
          connection: { provider: "binance", status: "CONNECTED", lastEventAt: "now" },
          lastLatencyMs: 0,
          latestTicks: Array.from({ length: 101 }, () => ({
            pair: "BTCUSDT", price: 1, timestamp: "now", providerEventAt: "now", receivedAt: "now", latencyMs: 0,
          })),
          persistence: "EPHEMERAL_IN_MEMORY_ONLY",
        },
      }),
    ).toThrow();
  });
});
