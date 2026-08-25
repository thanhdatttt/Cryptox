import { describe, expect, it } from "vitest";
import type { MarketSubscription } from "../api";
import type { MarketDataProviderAdapter, NormalizedProviderCandleObservation, NormalizedProviderTickObservation } from "./ports";
import { MarketDataSubscriptionManager } from "./subscription-manager";

const subscription = (timeframe: MarketSubscription["timeframe"]): MarketSubscription => ({ pair: "BTCUSDT", timeframe });

describe("market-data subscription manager", () => {
  it("connects the complete union and replaces upstream subscriptions cleanly", async () => {
    const connections: Array<{ subscriptions: MarketSubscription[]; disconnect: () => void; close: () => Promise<void> }> = [];
    const statuses: string[] = [];
    const provider: MarketDataProviderAdapter = {
      id: "BINANCE",
      capabilities: async () => ({ pairs: ["BTCUSDT"], timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"] }),
      fetchHistorical: async () => [],
      connectRealtime: async ({ subscriptions: active, onDisconnect }) => {
        const connection = { subscriptions: active, disconnect: () => onDisconnect({ code: "UNAVAILABLE", retryable: true, safeMessage: "offline" }), close: async () => undefined };
        connections.push(connection);
        return { close: connection.close };
      },
    };
    let scheduled: (() => void) | undefined;
    const manager = new MarketDataSubscriptionManager({ provider, onTick: (_value: NormalizedProviderTickObservation) => undefined, onCandle: (_value: NormalizedProviderCandleObservation) => undefined, onStatus: (status) => statuses.push(status), schedule: (callback) => { scheduled = callback; return callback; }, cancel: () => undefined, reconnectBaseMs: 1, reconnectMaxMs: 2 });

    await manager.setSubscriptions([subscription("5m"), subscription("1m"), subscription("1m")]);
    expect(connections[0]?.subscriptions).toEqual([subscription("1m"), subscription("5m")]);
    expect(statuses).toEqual(["RECONNECTING", "CONNECTED"]);

    await manager.setSubscriptions([subscription("1m"), subscription("5m"), subscription("15m")]);
    expect(connections).toHaveLength(2);
    expect(connections[0]?.subscriptions).toEqual([subscription("1m"), subscription("5m")]);
    expect(connections[1]?.subscriptions).toEqual([subscription("1m"), subscription("15m"), subscription("5m")].sort((left, right) => `${left.pair}|${left.timeframe}`.localeCompare(`${right.pair}|${right.timeframe}`)));

    connections[1]!.disconnect();
    expect(statuses.at(-1)).toBe("RECONNECTING");
    scheduled?.();
    await Promise.resolve();
    expect(connections).toHaveLength(3);
    expect(connections[2]?.subscriptions).toEqual(connections[1]?.subscriptions);
    await manager.setSubscriptions([]);
    expect(statuses.at(-1)).toBe("DISCONNECTED");
  });

  it("exposes an offline upstream as disconnected while retaining bounded retry", async () => {
    const statuses: string[] = [];
    const provider: MarketDataProviderAdapter = {
      id: "BINANCE",
      capabilities: async () => ({ pairs: ["BTCUSDT"], timeframes: ["1m"] }),
      fetchHistorical: async () => [],
      connectRealtime: async () => { throw new Error("network blocked"); },
    };
    const manager = new MarketDataSubscriptionManager({ provider, onTick: () => undefined, onCandle: () => undefined, onStatus: (status) => statuses.push(status), schedule: (callback) => callback, cancel: () => undefined, reconnectBaseMs: 1, reconnectMaxMs: 2 });

    await manager.setSubscriptions([subscription("1m")]);
    expect(statuses).toEqual(["RECONNECTING", "DISCONNECTED"]);
    await manager.stop();
  });
});
