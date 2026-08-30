import type {
  CandleDto,
  MarketHistoryRequestDto,
  MarketHistoryResponseDto,
  RestMarketTimeframe,
} from "@cryptox/contracts/rest";
import type {
  MarketConnectionStatusPayload,
  MarketObservabilityPayload,
  MarketSubscription,
} from "@cryptox/contracts/websocket";

export type ChartConnectionState =
  | "LOADING_HISTORY"
  | "CONNECTING"
  | "LIVE"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "RECOVERING"
  | "ERROR";

export interface ChartState {
  readonly id: string;
  readonly pair: string;
  readonly timeframe: RestMarketTimeframe;
  readonly candles: readonly CandleDto[];
  readonly connection: ChartConnectionState;
  readonly recoveryStatus: "NOT_NEEDED" | "PENDING" | "RECOVERED" | "FAILED";
  readonly stale: boolean;
  /** Delivery/health state only. It is never used as chart history or backtest input. */
  readonly observability?: MarketObservabilityPayload;
  readonly error?: string;
}

export type MarketRealtimeEvent =
  | { readonly type: "CANDLE"; readonly candle: CandleDto }
  | {
      readonly type: "CONNECTION_STATUS";
      readonly status: MarketConnectionStatusPayload;
    }
  | {
      readonly type: "MARKET_OBSERVABILITY";
      readonly observability: MarketObservabilityPayload;
    };

export type Unsubscribe = () => void;

export interface MarketDataSource {
  readHistory(request: MarketHistoryRequestDto): Promise<MarketHistoryResponseDto>;
  subscribe(
    subscription: MarketSubscription,
    listener: (event: MarketRealtimeEvent) => void,
  ): Unsubscribe;
}
