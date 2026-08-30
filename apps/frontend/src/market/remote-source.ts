import type {
  CandleDto,
  MarketHistoryRequestDto,
  MarketHistoryResponseDto,
} from "@cryptox/contracts/rest";
import type { MarketSubscription } from "@cryptox/contracts/websocket";
import { MarketWebSocketClient, RestMarketDataClient } from "./clients";
import type { MarketDataSource, MarketRealtimeEvent, Unsubscribe } from "./types";

export class RemoteMarketDataSource implements MarketDataSource {
  public constructor(
    private readonly rest: RestMarketDataClient,
    private readonly realtime: MarketWebSocketClient,
  ) {}

  public readHistory(request: MarketHistoryRequestDto): Promise<MarketHistoryResponseDto> {
    return this.rest.readHistory(request);
  }

  public subscribe(
    subscription: MarketSubscription,
    listener: (event: MarketRealtimeEvent) => void,
  ): Unsubscribe {
    return this.realtime.subscribe(subscription, (message) => {
      if (message.type === "CANDLE") {
        listener({ type: "CANDLE", candle: message.payload as CandleDto });
      } else if (message.type === "CONNECTION_STATUS") {
        listener({ type: "CONNECTION_STATUS", status: message.payload });
      } else if (
        message.type === "MARKET_OBSERVABILITY" &&
        message.payload.pair === subscription.pair
      ) {
        listener({ type: "MARKET_OBSERVABILITY", observability: message.payload });
      } else if (
        message.type === "SUBSCRIPTION_ACK" &&
        message.payload.action === "SUBSCRIBE" &&
        message.payload.accepted.some(
          ({ subscription: accepted, state }) =>
            accepted.pair === subscription.pair &&
            accepted.timeframe === subscription.timeframe &&
            (state === "ACTIVE" || state === "ALREADY_ACTIVE"),
        )
      ) {
        listener({
          type: "CONNECTION_STATUS",
          status: {
            provider: "market-websocket",
            status: "CONNECTED",
            lastEventAt: message.sentAt,
          },
        });
      }
    });
  }
}
