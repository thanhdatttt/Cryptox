"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketDataSubscriptionManager = void 0;
const subscriptionKey = (subscription) => `${subscription.pair}|${subscription.timeframe}`;
const normalize = (subscriptions) => [...new Map(subscriptions.map((subscription) => [subscriptionKey(subscription), subscription])).values()].sort((left, right) => subscriptionKey(left).localeCompare(subscriptionKey(right)));
/** Maintains one upstream connection for the complete union of active chart subscriptions. */
class MarketDataSubscriptionManager {
    options;
    desired = [];
    connection;
    reconnectTimer;
    generation = 0;
    reconnectAttempt = 0;
    stopped = false;
    schedule;
    cancel;
    base;
    maximum;
    maximumAttempts;
    constructor(options) {
        this.options = options;
        this.schedule = options.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs));
        this.cancel = options.cancel ?? ((handle) => clearTimeout(handle));
        this.base = options.reconnectBaseMs ?? 500;
        this.maximum = options.reconnectMaxMs ?? 30_000;
        this.maximumAttempts = options.reconnectMaxAttempts ?? 8;
    }
    async setSubscriptions(subscriptions) {
        if (this.stopped)
            return;
        const next = normalize(subscriptions);
        if (JSON.stringify(next) === JSON.stringify(this.desired) && (next.length === 0 || this.connection || this.reconnectTimer))
            return;
        this.desired = next;
        const generation = ++this.generation;
        this.clearReconnectTimer();
        const old = this.connection;
        this.connection = undefined;
        await old?.close();
        if (generation !== this.generation || this.stopped)
            return;
        this.reconnectAttempt = 0;
        if (next.length === 0) {
            this.options.onStatus("DISCONNECTED");
            return;
        }
        await this.connect(generation);
    }
    async stop() {
        if (this.stopped)
            return;
        this.stopped = true;
        ++this.generation;
        this.clearReconnectTimer();
        const old = this.connection;
        this.connection = undefined;
        await old?.close();
        this.desired = [];
        this.options.onStatus("DISCONNECTED");
    }
    clearReconnectTimer() {
        if (this.reconnectTimer !== undefined)
            this.cancel(this.reconnectTimer);
        this.reconnectTimer = undefined;
    }
    async connect(generation) {
        if (generation !== this.generation || this.stopped || this.desired.length === 0)
            return;
        this.options.onStatus("RECONNECTING");
        let readiness;
        const markConnected = () => {
            if (readiness || generation !== this.generation || this.stopped)
                return;
            readiness = this.finishConnection(generation);
        };
        try {
            const connection = await this.options.provider.connectRealtime({
                subscriptions: [...this.desired],
                onTick: this.options.onTick,
                onCandle: this.options.onCandle,
                onConnect: markConnected,
                onDisconnect: (failure) => this.handleDisconnect(generation, failure),
            });
            if (generation !== this.generation || this.stopped || this.desired.length === 0) {
                await connection.close();
                return;
            }
            this.connection = connection;
            if (!readiness && connection.ready)
                await connection.ready.then(markConnected);
            if (!readiness)
                markConnected();
            await readiness;
        }
        catch (error) {
            this.connection = undefined;
            if (generation !== this.generation || this.stopped || this.desired.length === 0)
                return;
            this.options.onStatus("DISCONNECTED", { code: "UNAVAILABLE", retryable: true, safeMessage: error instanceof Error ? error.message : "The market-data provider is unavailable." });
            this.scheduleReconnect(generation);
        }
    }
    async finishConnection(generation) {
        if (generation !== this.generation || this.stopped || this.desired.length === 0)
            return;
        try {
            await this.options.onConnected?.([...this.desired]);
            if (generation !== this.generation || this.stopped || this.desired.length === 0)
                return;
            this.reconnectAttempt = 0;
            this.options.onStatus("CONNECTED");
        }
        catch (error) {
            if (generation !== this.generation || this.stopped || this.desired.length === 0)
                return;
            const failure = { code: "UNAVAILABLE", retryable: true, safeMessage: error instanceof Error ? error.message : "The market-data provider is unavailable." };
            this.options.onStatus("RECONNECTING", failure);
            this.scheduleReconnect(generation);
        }
    }
    handleDisconnect(generation, failure) {
        if (generation !== this.generation || this.stopped || this.desired.length === 0)
            return;
        const reconnectGeneration = ++this.generation;
        this.connection = undefined;
        this.options.onStatus("RECONNECTING", failure);
        this.scheduleReconnect(reconnectGeneration);
    }
    scheduleReconnect(generation) {
        if (this.reconnectTimer !== undefined || generation !== this.generation || this.stopped || this.desired.length === 0)
            return;
        if (this.reconnectAttempt >= this.maximumAttempts) {
            this.options.onStatus("DISCONNECTED", { code: "UNAVAILABLE", retryable: false, safeMessage: "The market-data provider did not recover after bounded retries." });
            return;
        }
        const attempt = this.reconnectAttempt + 1;
        const baseDelay = Math.min(this.maximum, this.base * (2 ** Math.min(this.reconnectAttempt, 10)));
        const delay = Math.max(0, Math.min(this.maximum, this.options.reconnectJitterMs?.(baseDelay, attempt) ?? baseDelay));
        this.reconnectAttempt += 1;
        this.reconnectTimer = this.schedule(() => { this.reconnectTimer = undefined; void this.connect(generation); }, delay);
    }
}
exports.MarketDataSubscriptionManager = MarketDataSubscriptionManager;
