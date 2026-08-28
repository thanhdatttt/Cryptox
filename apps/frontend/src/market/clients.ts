import {
  REST_SCHEMA_VERSION,
  type MarketHistoryRequestDto,
  type MarketHistoryResponseDto,
} from "@cryptox/contracts/rest";
import {
  parseMarketWebSocketServerMessage,
  type MarketSubscription,
  type MarketWebSocketClientMessage,
  type MarketWebSocketServerMessage,
} from "@cryptox/contracts/websocket";
import type { Unsubscribe } from "./types";

export interface FetchLike {
  (input: string, init?: RequestInit): Promise<Pick<Response, "ok" | "status" | "json">>;
}

export class RestMarketDataClient {
  public constructor(
    private readonly baseUrl: string,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  public async readHistory(
    request: MarketHistoryRequestDto,
  ): Promise<MarketHistoryResponseDto> {
    const response = await this.fetcher(`${this.baseUrl}/market-data/history`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`Market history request failed with status ${response.status}`);
    }
    return marketHistoryResponse(await response.json(), request);
  }
}

function marketHistoryResponse(
  value: unknown,
  request: MarketHistoryRequestDto,
): MarketHistoryResponseDto {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid market history response");
  }
  const response = value as Partial<MarketHistoryResponseDto>;
  if (
    response.schemaVersion !== REST_SCHEMA_VERSION ||
    response.pair !== request.pair ||
    response.timeframe !== request.timeframe ||
    !Array.isArray(response.candles) ||
    !Array.isArray(response.missingRanges)
  ) {
    throw new Error("Market history response does not match the requested market");
  }
  return response as MarketHistoryResponseDto;
}

export interface WebSocketLike {
  readonly readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent<string>) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  send(data: string): void;
  close(): void;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

interface SubscriptionListener {
  subscription: MarketSubscription;
  listener: (message: MarketWebSocketServerMessage) => void;
}

export class MarketWebSocketClient {
  private socket?: WebSocketLike;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private readonly listeners = new Map<number, SubscriptionListener>();
  private nextListenerId = 1;
  private requestNumber = 1;
  private reconnectAttempt = 0;
  private intentionallyClosed = false;

  public constructor(
    private readonly url: string,
    private readonly createSocket: WebSocketFactory = (socketUrl) => new WebSocket(socketUrl),
    private readonly reconnectDelayMs = 750,
    private readonly maxReconnectAttempts = 8,
  ) {}

  public subscribe(
    subscription: MarketSubscription,
    listener: (message: MarketWebSocketServerMessage) => void,
  ): Unsubscribe {
    const id = this.nextListenerId++;
    this.listeners.set(id, { subscription, listener });
    this.intentionallyClosed = false;
    this.ensureConnected();
    if (this.socket?.readyState === 1 && this.listenerCount(subscription) === 1) {
      this.send("SUBSCRIBE", [subscription]);
    }

    return () => {
      const removed = this.listeners.get(id);
      if (!removed) return;
      this.listeners.delete(id);
      if (this.socket?.readyState === 1 && this.listenerCount(removed.subscription) === 0) {
        this.send("UNSUBSCRIBE", [removed.subscription]);
      }
      if (this.listeners.size === 0) this.shutdown();
    };
  }

  public shutdown(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.socket?.close();
    this.socket = undefined;
  }

  private ensureConnected(): void {
    if (this.socket && (this.socket.readyState === 0 || this.socket.readyState === 1)) return;
    const socket = this.createSocket(this.url);
    this.socket = socket;
    socket.onopen = () => {
      for (const subscription of this.uniqueSubscriptions()) {
        this.send("SUBSCRIBE", [subscription]);
      }
    };
    socket.onmessage = (event) => {
      try {
        this.dispatch(parseMarketWebSocketServerMessage(JSON.parse(event.data)));
      } catch (error) {
        this.dispatch({
          schemaVersion: 1,
          type: "ERROR",
          sentAt: new Date().toISOString(),
          payload: {
            code: "PROVIDER_UNAVAILABLE",
            message: error instanceof Error ? error.message : "Invalid market message",
          },
        });
      }
    };
    socket.onerror = () => undefined;
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = undefined;
      this.broadcastConnection("DISCONNECTED");
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (
      this.intentionallyClosed ||
      this.listeners.size === 0 ||
      this.reconnectAttempt >= this.maxReconnectAttempts
    ) {
      return;
    }
    this.reconnectAttempt += 1;
    this.broadcastConnection("RECONNECTING");
    this.reconnectTimer = setTimeout(() => this.ensureConnected(), this.reconnectDelayMs);
  }

  private dispatch(message: MarketWebSocketServerMessage): void {
    if (
      (message.type === "CONNECTION_STATUS" && message.payload.status === "CONNECTED") ||
      (message.type === "SUBSCRIPTION_ACK" &&
        message.payload.action === "SUBSCRIBE" &&
        message.payload.accepted.some(
          ({ state }) => state === "ACTIVE" || state === "ALREADY_ACTIVE",
        ))
    ) {
      this.reconnectAttempt = 0;
    }
    for (const { subscription, listener } of this.listeners.values()) {
      if (
        message.type !== "CANDLE" ||
        (message.payload.pair === subscription.pair &&
          message.payload.timeframe === subscription.timeframe)
      ) {
        listener(message);
      }
    }
  }

  private broadcastConnection(status: "RECONNECTING" | "DISCONNECTED"): void {
    const now = new Date().toISOString();
    this.dispatch({
      schemaVersion: 1,
      type: "CONNECTION_STATUS",
      sentAt: now,
      payload: { provider: "market-websocket", status, lastEventAt: now },
    });
  }

  private send(
    type: "SUBSCRIBE" | "UNSUBSCRIBE",
    subscriptions: readonly MarketSubscription[],
  ): void {
    if (this.socket?.readyState !== 1) return;
    const message: MarketWebSocketClientMessage = {
      schemaVersion: 1,
      type,
      requestId: `market-${this.requestNumber++}`,
      payload: { subscriptions: [...subscriptions] },
    };
    this.socket.send(JSON.stringify(message));
  }

  private listenerCount(subscription: MarketSubscription): number {
    return [...this.listeners.values()].filter(
      (entry) =>
        entry.subscription.pair === subscription.pair &&
        entry.subscription.timeframe === subscription.timeframe,
    ).length;
  }

  private uniqueSubscriptions(): MarketSubscription[] {
    const unique = new Map<string, MarketSubscription>();
    for (const { subscription } of this.listeners.values()) {
      unique.set(`${subscription.pair}:${subscription.timeframe}`, subscription);
    }
    return [...unique.values()];
  }
}
