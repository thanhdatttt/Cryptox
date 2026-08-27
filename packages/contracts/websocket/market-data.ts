export type MarketTimeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

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

export type MarketDataErrorCode =
  | "INVALID_PAIR"
  | "INVALID_TIMEFRAME"
  | "RANGE_TOO_LARGE"
  | "INVALID_CURSOR"
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
