import { Inject } from "@nestjs/common";
import { MessageBody, SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
import type { MarketWebSocketClientMessage, MarketWebSocketServerMessage } from "@cryptox/contracts/websocket/market-data";
import type { MarketDataUpdate, MarketSubscription, Timeframe } from "modules/market-data/api";
import type { BackendModules } from "./compose";

export interface MarketSocketClient {
  id: string;
  handshake: { auth?: Record<string, unknown>; headers?: Record<string, string | string[] | undefined> };
  data: { userId?: string; subscriptions?: MarketSubscription[]; unsubscribe?: () => Promise<void> };
  emit(event: string, payload: unknown): void;
  disconnect(close?: boolean): void;
}

const timeframes = new Set<Timeframe>(["1m", "5m", "15m", "1h", "4h", "1d"]);
const validSubscription = (value: unknown): value is MarketSubscription => Boolean(value) && typeof value === "object" && typeof (value as MarketSubscription).pair === "string" && /^[A-Z0-9][A-Z0-9_-]*$/.test((value as MarketSubscription).pair) && timeframes.has((value as MarketSubscription).timeframe);
const tokenFrom = (client: MarketSocketClient): string | undefined => {
  const authToken = client.handshake.auth?.token;
  if (typeof authToken === "string") return authToken;
  const header = client.handshake.headers?.authorization;
  return typeof header === "string" && header.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
};

@WebSocketGateway({ namespace: "/market", transports: ["websocket"] })
export class MarketGateway {
  constructor(@Inject("BACKEND_MODULES") private readonly modules: BackendModules) {}

  async handleConnection(client: MarketSocketClient): Promise<void> {
    try {
      const token = tokenFrom(client);
      if (!token) throw new Error("INVALID_TOKEN");
      client.data.userId = (await this.modules.auth.verify(token)).userId;
    } catch {
      this.send(client, { schemaVersion: 1, type: "ERROR", sentAt: new Date().toISOString(), payload: { code: "INVALID_TOKEN", message: "Bearer token is required.", retryable: false } });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: MarketSocketClient): Promise<void> {
    await client.data.unsubscribe?.();
    client.data.unsubscribe = undefined;
    client.data.subscriptions = [];
  }

  @SubscribeMessage("market")
  async command(client: MarketSocketClient, @MessageBody() message: MarketWebSocketClientMessage): Promise<void> {
    if (!client.data.userId) return;
    if (!message || message.schemaVersion !== 1 || (message.action !== "SUBSCRIBE" && message.action !== "UNSUBSCRIBE") || typeof message.requestId !== "string" || !Array.isArray(message.subscriptions)) {
      this.send(client, { schemaVersion: 1, type: "ERROR", sentAt: new Date().toISOString(), payload: { code: "INVALID_SUBSCRIPTION", message: "The market subscription command is invalid.", retryable: false } });
      return;
    }
    const current = client.data.subscriptions ?? [];
    const accepted: Array<{ subscription: MarketSubscription; state: "ACTIVE" | "ALREADY_ACTIVE" | "ABSENT" }> = [];
    const rejected: Array<{ subscription: MarketSubscription; code: "INVALID_SUBSCRIPTION" }> = [];
    const valid = message.subscriptions.filter((item): item is MarketSubscription => {
      if (validSubscription(item)) return true;
      rejected.push({ subscription: item as MarketSubscription, code: "INVALID_SUBSCRIPTION" });
      return false;
    });
    const next = [...current];
    for (const subscription of valid) {
      const key = `${subscription.pair}|${subscription.timeframe}`;
      const index = next.findIndex((item) => `${item.pair}|${item.timeframe}` === key);
      if (message.action === "SUBSCRIBE") {
        if (index >= 0) accepted.push({ subscription, state: "ALREADY_ACTIVE" });
        else { next.push(subscription); accepted.push({ subscription, state: "ACTIVE" }); }
      } else if (index < 0) accepted.push({ subscription, state: "ABSENT" });
      else { next.splice(index, 1); accepted.push({ subscription, state: "ABSENT" }); }
    }
    if (next.length !== current.length || (message.action === "UNSUBSCRIBE" && valid.length > 0)) {
      await client.data.unsubscribe?.();
      client.data.unsubscribe = undefined;
      if (next.length > 0) {
        try {
          client.data.unsubscribe = await this.modules.marketData.subscribeMarketData(next, (update) => this.forward(client, update));
        } catch (error) {
          client.data.subscriptions = [];
          const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : "MARKET_DATA_UNAVAILABLE";
          this.send(client, { schemaVersion: 1, type: "ERROR", sentAt: new Date().toISOString(), requestId: message.requestId, payload: { code, message: "Market data subscription failed.", retryable: true } });
          return;
        }
      }
      client.data.subscriptions = next;
    }
    this.send(client, { schemaVersion: 1, type: "SUBSCRIPTION_ACK", sentAt: new Date().toISOString(), requestId: message.requestId, payload: { action: message.action, accepted, rejected } });
  }

  private forward(client: MarketSocketClient, update: MarketDataUpdate): void {
    const type = update.kind === "TICK" ? "MARKET_TICK" : update.kind;
    this.send(client, { schemaVersion: 1, type, sentAt: new Date().toISOString(), payload: update.payload } as MarketWebSocketServerMessage);
  }

  private send(client: MarketSocketClient, message: MarketWebSocketServerMessage): void { client.emit("market", message); }
}
