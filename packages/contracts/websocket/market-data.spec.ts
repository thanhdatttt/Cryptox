import { describe, expect, it } from "vitest";
import type {
  MarketWebSocketClientMessage,
  MarketWebSocketServerMessage,
} from "./market-data";

function payloadIdentity(message: MarketWebSocketServerMessage): string {
  switch (message.type) {
    case "MARKET_TICK":
      return message.payload.pair;
    case "CANDLE":
      return `${message.payload.pair}:${message.payload.timeframe}`;
    case "CONNECTION_STATUS":
      return message.payload.provider;
    case "SUBSCRIPTION_ACK":
      return message.payload.action;
    case "ERROR":
      return message.payload.code;
  }
}

describe("market WebSocket transport contracts", () => {
  it("keeps client commands versioned and market-only", () => {
    const message = {
      schemaVersion: 1,
      type: "SUBSCRIBE",
      requestId: "request-1",
      payload: { subscriptions: [{ pair: "BTCUSDT", timeframe: "5m" }] },
    } satisfies MarketWebSocketClientMessage;

    expect(message).toMatchObject({ schemaVersion: 1, type: "SUBSCRIBE" });
  });

  it("narrows each server payload by its discriminator", () => {
    const messages: MarketWebSocketServerMessage[] = [
      {
        schemaVersion: 1,
        type: "MARKET_TICK",
        sentAt: "2026-01-01T00:00:01Z",
        payload: { pair: "BTCUSDT", price: 100, timestamp: "2026-01-01T00:00:00Z" },
      },
      {
        schemaVersion: 1,
        type: "ERROR",
        sentAt: "2026-01-01T00:00:01Z",
        payload: { code: "PROVIDER_UNAVAILABLE", message: "temporarily unavailable" },
      },
    ];

    expect(messages.map(payloadIdentity)).toEqual(["BTCUSDT", "PROVIDER_UNAVAILABLE"]);
  });
});
