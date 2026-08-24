import type {
  MarketDataConnectionStatus,
  MarketSubscription,
  MarketTick,
  Candle,
  MarketDataError,
} from "modules/market-data/api";
export type MarketWebSocketClientMessage = {
  schemaVersion: 1;
  action: "SUBSCRIBE" | "UNSUBSCRIBE";
  requestId: string;
  subscriptions: MarketSubscription[];
};
export type MarketWebSocketServerMessage = {
  schemaVersion: 1;
  type: "MARKET_TICK" | "CANDLE" | "CONNECTION_STATUS" | "SUBSCRIPTION_ACK" | "ERROR";
  sentAt: string;
  requestId?: string;
  payload:
    | MarketTick
    | Candle
    | MarketDataConnectionStatus
    | {
        action: "SUBSCRIBE" | "UNSUBSCRIBE";
        accepted: Array<{
          subscription: MarketSubscription;
          state: "ACTIVE" | "ALREADY_ACTIVE" | "ABSENT";
        }>;
        rejected: Array<{ subscription: MarketSubscription; code: MarketDataError["code"] }>;
      }
    | MarketDataError;
};
