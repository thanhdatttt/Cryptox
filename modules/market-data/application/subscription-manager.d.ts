import type { MarketSubscription } from "../api";
import type { MarketDataProviderAdapter, NormalizedProviderCandleObservation, NormalizedProviderTickObservation, ProviderAdapterFailure } from "./ports";
export type SubscriptionManagerStatus = "CONNECTED" | "RECONNECTING" | "DISCONNECTED";
export interface MarketDataSubscriptionManagerOptions {
    provider: MarketDataProviderAdapter;
    onTick(observation: NormalizedProviderTickObservation): void;
    onCandle(observation: NormalizedProviderCandleObservation): void;
    onStatus(status: SubscriptionManagerStatus, failure?: ProviderAdapterFailure): void;
    onConnected?(subscriptions: MarketSubscription[]): Promise<void> | void;
    schedule?: (callback: () => void, delayMs: number) => unknown;
    cancel?: (handle: unknown) => void;
    reconnectBaseMs?: number;
    reconnectMaxMs?: number;
    reconnectMaxAttempts?: number;
    reconnectJitterMs?: (delayMs: number, attempt: number) => number;
}
/** Maintains one upstream connection for the complete union of active chart subscriptions. */
export declare class MarketDataSubscriptionManager {
    private readonly options;
    private desired;
    private connection?;
    private reconnectTimer?;
    private generation;
    private reconnectAttempt;
    private stopped;
    private readonly schedule;
    private readonly cancel;
    private readonly base;
    private readonly maximum;
    private readonly maximumAttempts;
    constructor(options: MarketDataSubscriptionManagerOptions);
    setSubscriptions(subscriptions: MarketSubscription[]): Promise<void>;
    stop(): Promise<void>;
    private clearReconnectTimer;
    private connect;
    private finishConnection;
    private handleDisconnect;
    private scheduleReconnect;
}
