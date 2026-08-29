export type MarketTimeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
export const MARKET_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
export const MARKET_WS_CLIENT_MESSAGE_TYPES = ["SUBSCRIBE", "UNSUBSCRIBE"] as const;
export const MARKET_WS_SERVER_MESSAGE_TYPES = [
  "MARKET_TICK",
  "CANDLE",
  "CONNECTION_STATUS",
  "MARKET_OBSERVABILITY",
  "SUBSCRIPTION_ACK",
  "ERROR",
] as const;

export interface MarketSubscription {
  pair: string;
  timeframe: MarketTimeframe;
}

export interface MarketTickPayload {
  pair: string;
  price: number;
  timestamp: string;
}

export interface CandlePayload {
  pair: string;
  timeframe: MarketTimeframe;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

export interface MarketConnectionStatusPayload {
  provider: string;
  status: "CONNECTED" | "RECONNECTING" | "DISCONNECTED";
  lastEventAt: string;
}

/** Explicitly ephemeral delivery/health projection; it is not a market-history payload. */
export interface MarketObservabilityPayload {
  profileId: "MARKET_OBSERVABILITY_V1";
  pair: string;
  connection: MarketConnectionStatusPayload;
  lastLatencyMs: number | null;
  latestTicks: Array<MarketTickPayload & { providerEventAt: string; receivedAt: string; latencyMs: number }>;
  persistence: "EPHEMERAL_IN_MEMORY_ONLY";
}

export type MarketDataErrorCode =
  | "INVALID_PAIR"
  | "INVALID_TIMEFRAME"
  | "PROVIDER_UNAVAILABLE";

export interface MarketDataErrorPayload {
  code: MarketDataErrorCode;
  message: string;
}

export type MarketWebSocketClientMessage =
  | {
      schemaVersion: 1;
      type: "SUBSCRIBE";
      requestId: string;
      payload: { subscriptions: MarketSubscription[] };
    }
  | {
      schemaVersion: 1;
      type: "UNSUBSCRIBE";
      requestId: string;
      payload: { subscriptions: MarketSubscription[] };
    };

interface MarketServerMessageMetadata {
  schemaVersion: 1;
  sentAt: string;
  requestId?: string;
}

export type MarketWebSocketServerMessage =
  | (MarketServerMessageMetadata & { type: "MARKET_TICK"; payload: MarketTickPayload })
  | (MarketServerMessageMetadata & { type: "CANDLE"; payload: CandlePayload })
  | (MarketServerMessageMetadata & {
      type: "CONNECTION_STATUS";
      payload: MarketConnectionStatusPayload;
    })
  | (MarketServerMessageMetadata & {
      type: "MARKET_OBSERVABILITY";
      payload: MarketObservabilityPayload;
    })
  | (MarketServerMessageMetadata & {
      type: "SUBSCRIPTION_ACK";
      payload: {
        action: "SUBSCRIBE" | "UNSUBSCRIBE";
        accepted: Array<{
          subscription: MarketSubscription;
          state: "ACTIVE" | "ALREADY_ACTIVE" | "ABSENT";
        }>;
        rejected: Array<{ subscription: MarketSubscription; code: MarketDataErrorCode }>;
      };
    })
  | (MarketServerMessageMetadata & { type: "ERROR"; payload: MarketDataErrorPayload });

export class MarketWebSocketContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketWebSocketContractError";
  }
}

function recordValue(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new MarketWebSocketContractError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new MarketWebSocketContractError(`${label} must be a non-empty string`);
  }
  return value;
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new MarketWebSocketContractError(`${label} must be finite`);
  }
  return value;
}

function timeframeValue(value: unknown): MarketTimeframe {
  if (!MARKET_TIMEFRAMES.includes(value as MarketTimeframe)) {
    throw new MarketWebSocketContractError("Unsupported market timeframe");
  }
  return value as MarketTimeframe;
}

function subscriptionValue(value: unknown): MarketSubscription {
  const subscription = recordValue(value, "subscription");
  return {
    pair: stringValue(subscription.pair, "subscription.pair"),
    timeframe: timeframeValue(subscription.timeframe),
  };
}

export function parseMarketWebSocketClientMessage(
  value: unknown,
): MarketWebSocketClientMessage {
  const message = recordValue(value, "market WebSocket client message");
  if (
    message.schemaVersion !== 1 ||
    !MARKET_WS_CLIENT_MESSAGE_TYPES.includes(
      message.type as (typeof MARKET_WS_CLIENT_MESSAGE_TYPES)[number],
    )
  ) {
    throw new MarketWebSocketContractError("Unsupported market client message");
  }
  const payload = recordValue(message.payload, "payload");
  if (!Array.isArray(payload.subscriptions) || payload.subscriptions.length === 0) {
    throw new MarketWebSocketContractError("subscriptions must be a non-empty array");
  }
  return {
    schemaVersion: 1,
    type: message.type as "SUBSCRIBE" | "UNSUBSCRIBE",
    requestId: stringValue(message.requestId, "requestId"),
    payload: { subscriptions: payload.subscriptions.map(subscriptionValue) },
  };
}

export function parseMarketWebSocketServerMessage(
  value: unknown,
): MarketWebSocketServerMessage {
  const message = recordValue(value, "market WebSocket server message");
  if (
    message.schemaVersion !== 1 ||
    !MARKET_WS_SERVER_MESSAGE_TYPES.includes(
      message.type as (typeof MARKET_WS_SERVER_MESSAGE_TYPES)[number],
    )
  ) {
    throw new MarketWebSocketContractError("Unsupported market server message");
  }
  const metadata = {
    schemaVersion: 1 as const,
    sentAt: stringValue(message.sentAt, "sentAt"),
    ...(message.requestId === undefined
      ? {}
      : { requestId: stringValue(message.requestId, "requestId") }),
  };
  const payload = recordValue(message.payload, "payload");
  switch (message.type) {
    case "MARKET_TICK":
      return {
        ...metadata,
        type: "MARKET_TICK",
        payload: {
          pair: stringValue(payload.pair, "payload.pair"),
          price: finiteNumber(payload.price, "payload.price"),
          timestamp: stringValue(payload.timestamp, "payload.timestamp"),
        },
      };
    case "CANDLE": {
      if (typeof payload.isClosed !== "boolean") {
        throw new MarketWebSocketContractError("Invalid normalized candle state");
      }
      const candle = {
        pair: stringValue(payload.pair, "payload.pair"),
        timeframe: timeframeValue(payload.timeframe),
        timestamp: stringValue(payload.timestamp, "payload.timestamp"),
        open: finiteNumber(payload.open, "payload.open"),
        high: finiteNumber(payload.high, "payload.high"),
        low: finiteNumber(payload.low, "payload.low"),
        close: finiteNumber(payload.close, "payload.close"),
        volume: finiteNumber(payload.volume, "payload.volume"),
        isClosed: payload.isClosed,
      };
      if (
        candle.high < Math.max(candle.open, candle.close, candle.low) ||
        candle.low > Math.min(candle.open, candle.close, candle.high)
      ) {
        throw new MarketWebSocketContractError("Invalid normalized candle");
      }
      return { ...metadata, type: "CANDLE", payload: candle };
    }
    case "CONNECTION_STATUS": {
      if (
        payload.status !== "CONNECTED" &&
        payload.status !== "RECONNECTING" &&
        payload.status !== "DISCONNECTED"
      ) {
        throw new MarketWebSocketContractError("Invalid connection status");
      }
      return {
        ...metadata,
        type: "CONNECTION_STATUS",
        payload: {
          provider: stringValue(payload.provider, "payload.provider"),
          status: payload.status,
          lastEventAt: stringValue(payload.lastEventAt, "payload.lastEventAt"),
        },
      };
    }
    case "MARKET_OBSERVABILITY": {
      if (payload.profileId !== "MARKET_OBSERVABILITY_V1" || payload.persistence !== "EPHEMERAL_IN_MEMORY_ONLY") {
        throw new MarketWebSocketContractError("Invalid market observability profile");
      }
      const connection = recordValue(payload.connection, "payload.connection");
      if (
        connection.status !== "CONNECTED" &&
        connection.status !== "RECONNECTING" &&
        connection.status !== "DISCONNECTED"
      ) {
        throw new MarketWebSocketContractError("Invalid observability connection status");
      }
      if (payload.lastLatencyMs !== null && (typeof payload.lastLatencyMs !== "number" || !Number.isFinite(payload.lastLatencyMs) || payload.lastLatencyMs < 0)) {
        throw new MarketWebSocketContractError("Invalid observability latency");
      }
      if (!Array.isArray(payload.latestTicks) || payload.latestTicks.length > 100) {
        throw new MarketWebSocketContractError("Invalid observability tick buffer");
      }
      const pair = stringValue(payload.pair, "payload.pair");
      return {
        ...metadata,
        type: "MARKET_OBSERVABILITY",
        payload: {
          profileId: "MARKET_OBSERVABILITY_V1",
          pair,
          connection: {
            provider: stringValue(connection.provider, "payload.connection.provider"),
            status: connection.status,
            lastEventAt: stringValue(connection.lastEventAt, "payload.connection.lastEventAt"),
          },
          lastLatencyMs: payload.lastLatencyMs,
          latestTicks: payload.latestTicks.map((value, index) => {
            const tick = recordValue(value, `payload.latestTicks[${index}]`);
            const tickPair = stringValue(tick.pair, `payload.latestTicks[${index}].pair`);
            if (tickPair !== pair) throw new MarketWebSocketContractError("Observability tick pair mismatch");
            const latencyMs = finiteNumber(tick.latencyMs, `payload.latestTicks[${index}].latencyMs`);
            if (latencyMs < 0) throw new MarketWebSocketContractError("Invalid observability tick latency");
            return {
              pair: tickPair,
              price: finiteNumber(tick.price, `payload.latestTicks[${index}].price`),
              timestamp: stringValue(tick.timestamp, `payload.latestTicks[${index}].timestamp`),
              providerEventAt: stringValue(tick.providerEventAt, `payload.latestTicks[${index}].providerEventAt`),
              receivedAt: stringValue(tick.receivedAt, `payload.latestTicks[${index}].receivedAt`),
              latencyMs,
            };
          }),
          persistence: "EPHEMERAL_IN_MEMORY_ONLY",
        },
      };
    }
    case "SUBSCRIPTION_ACK": {
      if (payload.action !== "SUBSCRIBE" && payload.action !== "UNSUBSCRIBE") {
        throw new MarketWebSocketContractError("Invalid acknowledgement action");
      }
      if (!Array.isArray(payload.accepted) || !Array.isArray(payload.rejected)) {
        throw new MarketWebSocketContractError("Invalid acknowledgement lists");
      }
      return {
        ...metadata,
        type: "SUBSCRIPTION_ACK",
        payload: {
          action: payload.action,
          accepted: payload.accepted.map((item) => {
            const accepted = recordValue(item, "accepted subscription");
            if (
              accepted.state !== "ACTIVE" &&
              accepted.state !== "ALREADY_ACTIVE" &&
              accepted.state !== "ABSENT"
            ) {
              throw new MarketWebSocketContractError("Invalid subscription state");
            }
            return {
              subscription: subscriptionValue(accepted.subscription),
              state: accepted.state,
            };
          }),
          rejected: payload.rejected.map((item) => {
            const rejected = recordValue(item, "rejected subscription");
            if (
              rejected.code !== "INVALID_PAIR" &&
              rejected.code !== "INVALID_TIMEFRAME" &&
              rejected.code !== "PROVIDER_UNAVAILABLE"
            ) {
              throw new MarketWebSocketContractError("Invalid market error code");
            }
            return {
              subscription: subscriptionValue(rejected.subscription),
              code: rejected.code,
            };
          }),
        },
      };
    }
    case "ERROR": {
      if (
        payload.code !== "INVALID_PAIR" &&
        payload.code !== "INVALID_TIMEFRAME" &&
        payload.code !== "PROVIDER_UNAVAILABLE"
      ) {
        throw new MarketWebSocketContractError("Invalid market error code");
      }
      return {
        ...metadata,
        type: "ERROR",
        payload: {
          code: payload.code,
          message: stringValue(payload.message, "payload.message"),
        },
      };
    }
    default:
      throw new MarketWebSocketContractError("Unsupported market server message");
  }
}
