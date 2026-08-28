import type {
  CandleDto,
  MarketHistoryRequestDto,
  MarketHistoryResponseDto,
  RestMarketTimeframe,
} from "@cryptox/contracts/rest";
import type {
  MarketConnectionStatusPayload,
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
  readonly stale: boolean;
  readonly error?: string;
}

export type MarketRealtimeEvent =
  | { readonly type: "CANDLE"; readonly candle: CandleDto }
  | {
      readonly type: "CONNECTION_STATUS";
      readonly status: MarketConnectionStatusPayload;
    };

export type Unsubscribe = () => void;

export interface MarketDataSource {
  readHistory(request: MarketHistoryRequestDto): Promise<MarketHistoryResponseDto>;
  subscribe(
    subscription: MarketSubscription,
    listener: (event: MarketRealtimeEvent) => void,
  ): Unsubscribe;
}
