"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMarketDataService = createMarketDataService;
const node_crypto_1 = require("node:crypto");
const subscription_manager_1 = require("./subscription-manager");
const errors_1 = require("../domain/errors");
const rules_1 = require("../domain/rules");
const key = (candle) => `${candle.pair}|${candle.timeframe}|${candle.timestamp}`;
// Binance timestamps can lead the application clock by a small amount; keep validation bounded.
const MAX_TICK_FUTURE_SKEW_MS = 5_000;
const CACHE_SCHEMA_VERSION = 1;
const LATEST_CANDLE_CACHE_WINDOW = 1_000;
const candleCacheKey = (pair, timeframe) => `candles:latest:${pair}:${timeframe}`;
const tickCacheKey = (pair) => `ticks:latest:${pair}`;
const statusCacheKey = (provider) => `connection:status:${provider}`;
const sameCandle = (left, right) => left.pair === right.pair && left.timeframe === right.timeframe && left.timestamp === right.timestamp && left.open === right.open && left.high === right.high && left.low === right.low && left.close === right.close && left.volume === right.volume && left.isClosed === right.isClosed;
class MemoryCandleRepository {
    rows = new Map();
    async read(query) { return [...this.rows.values()].filter((candle) => candle.pair === query.pair && candle.timeframe === query.timeframe).sort((a, b) => a.timestamp.localeCompare(b.timestamp)); }
    async upsert(candle) { const existing = this.rows.get(key(candle)); if (!existing?.isClosed || candle.isClosed)
        this.rows.set(key(candle), candle); }
}
class MarketDataService {
    deps;
    candles;
    snapshots = new Map();
    subscribers = new Map();
    sequence = 0;
    provider;
    providerResolved = false;
    subscriptionManager;
    subscriptionProvider;
    reconcilePromise = Promise.resolve();
    historySyncs = new Map();
    status;
    stopped = false;
    constructor(deps) {
        this.deps = deps;
        const memory = new MemoryCandleRepository();
        this.candles = deps.candleRepository ?? memory;
        this.status = { provider: deps.providerRegistry?.defaultProviderId ?? deps.providerRegistry?.defaultProvider?.id ?? "BINANCE", status: "DISCONNECTED", lastEventAt: this.now() };
    }
    now() { return this.deps.clock?.now() ?? new Date().toISOString(); }
    async resolveProvider() { if (this.providerResolved)
        return this.provider; this.providerResolved = true; const registry = this.deps.providerRegistry; this.provider = registry?.defaultProvider ?? await registry?.getDefault?.(); return this.provider; }
    async validateProvider(pair, timeframe) {
        const provider = await this.resolveProvider();
        if (!provider)
            return undefined;
        const capabilities = await provider.capabilities();
        if (!capabilities.pairs.includes(pair))
            throw new errors_1.MarketDataException("UNSUPPORTED_PAIR", "Pair is not supported by the selected provider.");
        if (!capabilities.timeframes.includes(timeframe))
            throw new errors_1.MarketDataException("UNSUPPORTED_TIMEFRAME", "Timeframe is not supported by the selected provider.");
        return provider;
    }
    async readCapabilities() {
        const provider = await this.resolveProvider();
        if (!provider)
            return { provider: this.status.provider, pairs: [], timeframes: [] };
        const capabilities = await provider.capabilities();
        return { provider: provider.id, pairs: [...capabilities.pairs], timeframes: [...capabilities.timeframes] };
    }
    async readRows(pair, timeframe) { return (await this.candles.read({ pair, timeframe, includeForming: true })).map((candle) => (0, rules_1.validateCandle)(candle, this.now(), true)).sort((a, b) => a.timestamp.localeCompare(b.timestamp)); }
    record(event) { this.deps.observability?.record(event); }
    cache() { return this.deps.latestValueCache; }
    async invalidateCandleCache(pair, timeframe) {
        const cache = this.cache();
        if (!cache?.delete)
            return;
        try {
            await cache.delete(candleCacheKey(pair, timeframe));
        }
        catch {
            this.record("market_data.cache_unavailable");
        }
    }
    async refreshCandleCache(pair, timeframe) {
        const cache = this.cache();
        if (!cache?.set)
            return;
        try {
            const rows = await this.readRows(pair, timeframe);
            const closed = rows.filter((candle) => candle.isClosed).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
            const forming = rows.filter((candle) => !candle.isClosed).slice(-1);
            const latestClosed = closed.slice(-LATEST_CANDLE_CACHE_WINDOW);
            const interval = rules_1.TIMEFRAME_SECONDS[timeframe] * 1000;
            const timestamps = new Set(closed.map((candle) => Date.parse(candle.timestamp)));
            let completeThrough = Math.floor(Date.parse(this.now()) / interval) * interval;
            if (latestClosed.length > 0) {
                completeThrough = Date.parse(latestClosed[0].timestamp) + interval;
                while (timestamps.has(completeThrough))
                    completeThrough += interval;
            }
            const payload = { schemaVersion: CACHE_SCHEMA_VERSION, asOf: this.now(), completeThrough: new Date(completeThrough).toISOString(), candles: [...latestClosed, ...forming].sort((left, right) => left.timestamp.localeCompare(right.timestamp)) };
            await cache.set(candleCacheKey(pair, timeframe), payload);
        }
        catch {
            this.record("market_data.cache_write_error");
        }
    }
    async readCachedCandleWindow(pair, timeframe, range, includeForming, now) {
        const cache = this.cache();
        if (!cache?.get || !range)
            return undefined;
        let raw;
        try {
            raw = await cache.get(candleCacheKey(pair, timeframe));
        }
        catch {
            this.record("market_data.cache_unavailable");
            return undefined;
        }
        if (raw === undefined || raw === null) {
            this.record("market_data.cache_miss");
            return undefined;
        }
        try {
            const payload = (typeof raw === "string" ? JSON.parse(raw) : raw);
            if (payload.schemaVersion !== CACHE_SCHEMA_VERSION || typeof payload.asOf !== "string" || typeof payload.completeThrough !== "string" || !Array.isArray(payload.candles) || payload.candles.length > LATEST_CANDLE_CACHE_WINDOW + 1)
                throw new Error("invalid candle cache envelope");
            const asOf = Date.parse(payload.asOf);
            if (!Number.isFinite(asOf) || asOf > Date.parse(now) + MAX_TICK_FUTURE_SKEW_MS || Date.parse(now) - asOf > rules_1.TIMEFRAME_SECONDS[timeframe] * 2 * 1000)
                throw new Error("stale candle cache");
            const completeThrough = (0, rules_1.parseTimestamp)(payload.completeThrough, timeframe, now, true);
            if (Date.parse(completeThrough) > Date.parse(now) + MAX_TICK_FUTURE_SKEW_MS)
                throw new Error("future candle cache boundary");
            const candles = payload.candles.map((candle) => (0, rules_1.validateCandle)(candle, now, true));
            if (new Set(candles.map((candle) => candle.timestamp)).size !== candles.length || candles.some((candle) => candle.pair !== pair || candle.timeframe !== timeframe))
                throw new Error("invalid candle cache rows");
            const closed = candles.filter((candle) => candle.isClosed && candle.timestamp >= range.from && candle.timestamp < range.to);
            if (candles.filter((candle) => candle.isClosed).length === 0 || Date.parse(range.from) < Date.parse(candles.find((candle) => candle.isClosed)?.timestamp ?? range.from) || Date.parse(range.to) > Date.parse(completeThrough) || (0, rules_1.missingRanges)(closed, range, timeframe).length > 0)
                throw new Error("candle cache does not cover range");
            if (includeForming && !candles.some((candle) => !candle.isClosed && candle.timestamp >= range.from && candle.timestamp < range.to))
                throw new Error("forming candle cache is incomplete");
            this.record("market_data.cache_hit");
            return candles;
        }
        catch {
            this.record("market_data.cache_invalid");
            return undefined;
        }
    }
    async persist(observation) {
        const provider = await this.resolveProvider();
        const source = observation.source.includes(":") ? observation.source : `${provider?.id ?? "UNKNOWN"}:${observation.source}`;
        const candle = (0, rules_1.validateCandle)({ ...observation.candle, source }, this.now());
        const existing = (await this.candles.read({ pair: candle.pair, timeframe: candle.timeframe, includeForming: true })).find((item) => item.timestamp === candle.timestamp);
        if (existing?.isClosed && !candle.isClosed) {
            this.record("market_data.out_of_order_candle");
            return undefined;
        }
        if (existing && sameCandle(existing, candle))
            return undefined;
        const historical = observation.source.endsWith("HISTORICAL_SYNC");
        if (existing?.isClosed && !historical) {
            this.record("market_data.realtime_closed_correction_ignored");
            return undefined;
        }
        if (existing?.isClosed && historical) {
            this.record("market_data.correction_detected");
            await this.invalidateCandleCache(candle.pair, candle.timeframe);
        }
        await this.candles.upsert(candle);
        await this.refreshCandleCache(candle.pair, candle.timeframe);
        return candle;
    }
    latestClosedRange(now, timeframe, limit) {
        const interval = rules_1.TIMEFRAME_SECONDS[timeframe] * 1000;
        const end = Math.floor(Date.parse(now) / interval) * interval;
        return { from: new Date(end - limit * interval).toISOString(), to: new Date(end).toISOString() };
    }
    async syncMissing(provider, pair, timeframe, range) {
        const syncKey = `${provider.id}|${pair}|${timeframe}|${range.from}|${range.to}`;
        const running = this.historySyncs.get(syncKey);
        if (running)
            return running;
        const operation = (async () => {
            const rows = await this.readRows(pair, timeframe);
            const missing = (0, rules_1.missingRanges)(rows.filter((candle) => candle.timestamp >= range.from && candle.timestamp < range.to), range, timeframe);
            for (const missingRange of missing) {
                const observations = await provider.fetchHistorical({ pair, timeframe, range: missingRange });
                for (const observation of observations)
                    await this.persist(observation);
            }
        })();
        this.historySyncs.set(syncKey, operation);
        try {
            await operation;
        }
        finally {
            this.historySyncs.delete(syncKey);
        }
    }
    async reconcileProviderSubscriptions(provider, subscriptions) {
        if (!provider.getClosedThrough) {
            this.record("market_data.reconciliation_skipped");
            return;
        }
        for (const subscription of subscriptions) {
            const now = this.now();
            const closedThrough = (0, rules_1.parseTimestamp)(await provider.getClosedThrough(subscription), subscription.timeframe, now, true);
            if (Date.parse(closedThrough) > Date.parse(now) + MAX_TICK_FUTURE_SKEW_MS)
                throw new errors_1.MarketDataException("HISTORY_INCOMPLETE", "Provider reconciliation boundary is in the future.", true);
            const rows = await this.readRows(subscription.pair, subscription.timeframe);
            const closed = rows.filter((candle) => candle.isClosed).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
            const interval = rules_1.TIMEFRAME_SECONDS[subscription.timeframe] * 1000;
            const from = closed.at(-1)?.timestamp ?? new Date(Date.parse(closedThrough) - interval).toISOString();
            if (Date.parse(from) >= Date.parse(closedThrough))
                continue;
            const range = { from, to: closedThrough };
            const observations = await provider.fetchHistorical({ pair: subscription.pair, timeframe: subscription.timeframe, range });
            for (const observation of observations)
                await this.persist({ candle: observation.candle, orderKey: observation.orderKey, source: "HISTORICAL_SYNC" });
            const reconciled = await this.readRows(subscription.pair, subscription.timeframe);
            const missing = (0, rules_1.missingRanges)(reconciled.filter((candle) => candle.timestamp >= range.from && candle.timestamp < range.to), range, subscription.timeframe);
            if (missing.length > 0)
                throw new errors_1.MarketDataException("HISTORY_INCOMPLETE", "Provider reconciliation contains missing candles.", true, { missingRanges: missing });
            await this.refreshCandleCache(subscription.pair, subscription.timeframe);
        }
    }
    fingerprint(query) { return JSON.stringify({ pair: query.pair, timeframe: query.timeframe, range: query.range, limit: query.limit ?? rules_1.DEFAULT_HISTORICAL_CANDLE_LIMIT, includeForming: query.includeForming ?? false, completeness: query.completeness ?? "ALLOW_PARTIAL" }); }
    encodeCursor(query, offset) { return Buffer.from(JSON.stringify({ fingerprint: this.fingerprint(query), offset }), "utf8").toString("base64url"); }
    decodeCursor(query, cursor) {
        if (!cursor)
            return 0;
        try {
            const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
            if (decoded.fingerprint !== this.fingerprint(query) || !Number.isInteger(decoded.offset) || decoded.offset < 0)
                throw new Error();
            return decoded.offset;
        }
        catch {
            throw new errors_1.MarketDataException("INVALID_CURSOR", "Cursor is invalid or bound to another query.");
        }
    }
    async readPairMetadata(pairInput) {
        const pair = (0, rules_1.validatePair)(pairInput);
        const provider = await this.resolveProvider();
        if (provider?.readPairMetadata)
            return provider.readPairMetadata(pair);
        return { pair, baseAsset: pair, quoteAsset: "", settlementAsset: "" };
    }
    async readCandles(query) {
        const pair = (0, rules_1.validatePair)(query.pair);
        const timeframe = (0, rules_1.validateTimeframe)(query.timeframe);
        const now = this.now();
        const range = query.range ? (0, rules_1.validateRange)(query.range, timeframe, now) : undefined;
        const limit = (0, rules_1.validateLimit)(query.limit);
        const normalizedQuery = { ...query, pair, timeframe, range };
        this.decodeCursor(normalizedQuery, query.cursor);
        const provider = await this.validateProvider(pair, timeframe);
        const requestedRange = range ?? (provider ? this.latestClosedRange(now, timeframe, limit) : undefined);
        const cachedRows = await this.readCachedCandleWindow(pair, timeframe, requestedRange, query.includeForming ?? false, now);
        let rows = cachedRows ?? await this.readRows(pair, timeframe);
        let providerFailure;
        if (!cachedRows && provider && requestedRange) {
            try {
                await this.syncMissing(provider, pair, timeframe, requestedRange);
                rows = await this.readRows(pair, timeframe);
            }
            catch (error) {
                providerFailure = error;
                if (query.completeness === "REQUIRE_COMPLETE")
                    throw new errors_1.MarketDataException("HISTORY_UNAVAILABLE", "Historical market data is unavailable.", true, { cause: error instanceof Error ? error.message : "provider failure" });
            }
        }
        if (!cachedRows && requestedRange)
            await this.refreshCandleCache(pair, timeframe);
        const closed = rows.filter((candle) => candle.isClosed && (!requestedRange || (candle.timestamp >= requestedRange.from && candle.timestamp < requestedRange.to)));
        const forming = query.includeForming ? rows.filter((candle) => !candle.isClosed && (!requestedRange || (range ? (candle.timestamp >= range.from && candle.timestamp < range.to) : (candle.timestamp >= requestedRange.from && candle.timestamp <= requestedRange.to)))) : [];
        const page = [...closed, ...forming].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        const effectiveRange = requestedRange ?? (page.length > 0 ? { from: page[0].timestamp, to: new Date(Date.parse(page[page.length - 1].timestamp) + rules_1.TIMEFRAME_SECONDS[timeframe] * 1000).toISOString() } : { from: now, to: now });
        const gaps = (0, rules_1.missingRanges)(closed, effectiveRange, timeframe);
        if (query.completeness === "REQUIRE_COMPLETE" && gaps.length > 0)
            throw new errors_1.MarketDataException("HISTORY_INCOMPLETE", "Historical data contains missing candles.", true, { missingRanges: gaps });
        if (!range && page.length === 0)
            throw new errors_1.MarketDataException(providerFailure ? "HISTORY_UNAVAILABLE" : "NO_DATA", providerFailure ? "Historical market data is unavailable." : "No historical candles are available.", Boolean(providerFailure), providerFailure ? { cause: providerFailure instanceof Error ? providerFailure.message : "provider failure" } : undefined);
        const offset = query.cursor ? this.decodeCursor(normalizedQuery, query.cursor) : (range ? 0 : Math.max(0, page.length - limit));
        const selected = page.slice(offset, offset + limit);
        const responseRange = range ?? (selected.length > 0 ? { from: selected[0].timestamp, to: new Date(Date.parse(selected[selected.length - 1].timestamp) + rules_1.TIMEFRAME_SECONDS[timeframe] * 1000).toISOString() } : effectiveRange);
        return { pair, timeframe, range: responseRange, candles: selected, complete: gaps.length === 0, missingRanges: gaps, formingIncluded: selected.some((candle) => !candle.isClosed), asOf: now, nextCursor: offset + limit < page.length ? this.encodeCursor(normalizedQuery, offset + limit) : undefined };
    }
    async createDatasetSnapshot(command) {
        const pair = (0, rules_1.validatePair)(command.pair);
        const timeframe = (0, rules_1.validateTimeframe)(command.timeframe);
        const range = (0, rules_1.validateRange)(command.range, timeframe, this.now());
        const page = await this.readCandles({ pair, timeframe, range, completeness: "REQUIRE_COMPLETE", includeForming: false, limit: rules_1.MAX_PAGE_LIMIT });
        if (page.candles.length === 0)
            throw new errors_1.MarketDataException("DATASET_EMPTY", "Cannot create an empty dataset snapshot.");
        const serialization = (0, rules_1.snapshotSerialization)(pair, timeframe, range, page.candles);
        const sha256 = (0, node_crypto_1.createHash)("sha256").update(serialization, "utf8").digest("hex");
        const existing = [...this.snapshots.values()].find((entry) => entry.snapshot.sha256 === sha256);
        if (existing)
            return existing.snapshot;
        const snapshot = { id: (0, node_crypto_1.randomUUID)(), pair, pairMetadata: await this.readPairMetadata(pair), timeframe, range, candleCount: page.candles.length, sha256, createdAt: this.now() };
        if (this.deps.snapshotRepository) {
            const persisted = await this.deps.snapshotRepository.create({ snapshot, candles: page.candles });
            this.snapshots.set(persisted.id, { snapshot: persisted, candles: page.candles.map((candle) => ({ ...candle })) });
            return persisted;
        }
        this.snapshots.set(snapshot.id, { snapshot, candles: page.candles.map((candle) => ({ ...candle })) });
        return snapshot;
    }
    async readDatasetSnapshot(query) {
        const limit = (0, rules_1.validateLimit)(query.limit);
        let entry = this.snapshots.get(query.snapshotId);
        if (!entry && this.deps.snapshotRepository) {
            const result = await this.deps.snapshotRepository.read(query);
            if (result && typeof result === "object" && "snapshot" in result && "candles" in result)
                entry = result;
        }
        if (!entry)
            throw new errors_1.MarketDataException("DATASET_NOT_FOUND", "Dataset snapshot was not found.");
        const synthetic = { pair: entry.snapshot.pair, timeframe: entry.snapshot.timeframe, limit };
        const offset = this.decodeCursor(synthetic, query.cursor);
        const candles = entry.candles.slice(offset, offset + limit);
        return { snapshot: entry.snapshot, candles, nextCursor: offset + limit < entry.candles.length ? this.encodeCursor(synthetic, offset + limit) : undefined };
    }
    async subscribeMarketData(subscriptions, sink) {
        if (this.stopped)
            throw new errors_1.MarketDataException("SUBSCRIPTION_REJECTED", "Market Data module is shut down.");
        const validated = subscriptions.map((subscription) => ({ pair: (0, rules_1.validatePair)(subscription.pair), timeframe: (0, rules_1.validateTimeframe)(subscription.timeframe) }));
        for (const subscription of validated)
            await this.validateProvider(subscription.pair, subscription.timeframe);
        const id = ++this.sequence;
        this.subscribers.set(id, { subscriptions: new Set(validated.map((subscription) => `${subscription.pair}|${subscription.timeframe}`)), sink });
        this.deliver(sink, { kind: "CONNECTION_STATUS", payload: this.status });
        await this.reconcileRealtime();
        let active = true;
        return async () => {
            if (!active)
                return;
            active = false;
            this.subscribers.delete(id);
            await this.reconcileRealtime();
        };
    }
    unionSubscriptions() {
        const values = new Map();
        for (const subscriber of this.subscribers.values())
            for (const value of subscriber.subscriptions) {
                const [pair, timeframe] = value.split("|");
                values.set(value, { pair, timeframe: timeframe });
            }
        return [...values.values()].sort((left, right) => `${left.pair}|${left.timeframe}`.localeCompare(`${right.pair}|${right.timeframe}`));
    }
    async reconcileRealtime() {
        const operation = this.reconcilePromise.then(async () => {
            const subscriptions = this.unionSubscriptions();
            const provider = await this.resolveProvider();
            if (!provider || subscriptions.length === 0) {
                await this.subscriptionManager?.setSubscriptions([]);
                if (subscriptions.length > 0)
                    this.setStatus({ provider: this.status.provider, status: "DISCONNECTED" });
                return;
            }
            if (!this.subscriptionManager || this.subscriptionProvider !== provider) {
                await this.subscriptionManager?.stop();
                this.subscriptionProvider = provider;
                this.subscriptionManager = new subscription_manager_1.MarketDataSubscriptionManager({
                    provider,
                    onTick: (observation) => { void this.handleTick(observation.tick); },
                    onCandle: (observation) => { void this.handleCandle(observation); },
                    onStatus: (status, failure) => this.setStatus({ provider: provider.id, status, ...(failure ? { errorCode: failure.code } : {}) }),
                    onConnected: (activeSubscriptions) => this.reconcileProviderSubscriptions(provider, activeSubscriptions),
                });
            }
            await this.subscriptionManager.setSubscriptions(subscriptions);
        });
        this.reconcilePromise = operation.catch(() => undefined);
        await operation;
    }
    setStatus(next) {
        this.status = { ...next, lastEventAt: this.now() };
        void this.writeStatusCache(this.status);
        this.broadcast({ kind: "CONNECTION_STATUS", payload: this.status });
    }
    async writeStatusCache(status) {
        const cache = this.cache();
        if (!cache?.set)
            return;
        try {
            await cache.set(statusCacheKey(status.provider), { schemaVersion: CACHE_SCHEMA_VERSION, asOf: status.lastEventAt, status });
        }
        catch {
            this.record("market_data.cache_write_error");
        }
    }
    deliver(sink, update) { try {
        sink(update);
    }
    catch {
        this.deps.observability?.record("market_data.sink_error");
    } }
    broadcast(update) { for (const subscriber of this.subscribers.values())
        this.deliver(subscriber.sink, update); }
    async handleTick(tick) { try {
        const pair = (0, rules_1.validatePair)(tick.pair);
        const timestamp = Date.parse(tick.timestamp);
        if (typeof tick.timestamp !== "string" || !tick.timestamp.endsWith("Z") || !Number.isFinite(timestamp) || timestamp > Date.parse(this.now()) + MAX_TICK_FUTURE_SKEW_MS)
            throw new Error("invalid future tick");
        if (!Number.isFinite(tick.price) || tick.price <= 0)
            throw new Error("invalid tick price");
        if (!Number.isFinite(tick.quantity) || tick.quantity <= 0)
            throw new Error("invalid tick quantity");
        if (tick.side !== "BUY" && tick.side !== "SELL")
            throw new Error("invalid tick side");
        const normalized = { ...tick, pair, timestamp: new Date(timestamp).toISOString() };
        const cache = this.cache();
        if (cache?.set) {
            try {
                await cache.set(tickCacheKey(pair), { schemaVersion: CACHE_SCHEMA_VERSION, asOf: this.now(), tick: normalized });
            }
            catch {
                this.record("market_data.cache_write_error");
            }
        }
        this.broadcast({ kind: "TICK", payload: normalized });
    }
    catch {
        this.record("market_data.invalid_tick");
    } }
    async handleCandle(observation) { try {
        const candle = await this.persist(observation);
        if (candle)
            this.broadcast({ kind: "CANDLE", payload: candle });
    }
    catch {
        this.deps.observability?.record("market_data.invalid_candle");
    } }
    async shutdown() { if (this.stopped)
        return; this.stopped = true; await this.subscriptionManager?.stop(); this.subscriptionManager = undefined; this.subscriptionProvider = undefined; this.subscribers.clear(); await this.cache()?.close?.(); }
}
function createMarketDataService(deps = {}) { return new MarketDataService(deps); }
