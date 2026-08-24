"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMarketDataService = createMarketDataService;
const node_crypto_1 = require("node:crypto");
const errors_1 = require("../domain/errors");
const rules_1 = require("../domain/rules");
const key = (candle) => `${candle.pair}|${candle.timeframe}|${candle.timestamp}`;
class MemoryCandleRepository {
    rows = new Map();
    async read(query) { return [...this.rows.values()].filter((candle) => candle.pair === query.pair && candle.timeframe === query.timeframe).sort((a, b) => a.timestamp.localeCompare(b.timestamp)); }
    async upsert(candle) { this.rows.set(key(candle), candle); }
}
class MarketDataService {
    deps;
    candles;
    snapshots = new Map();
    subscribers = new Map();
    sequence = 0;
    connection;
    provider;
    status;
    stopped = false;
    constructor(deps) {
        this.deps = deps;
        const memory = new MemoryCandleRepository();
        this.candles = deps.candleRepository ?? memory;
        this.status = { provider: "BINANCE", status: "DISCONNECTED", lastEventAt: this.now() };
    }
    now() { return this.deps.clock?.now() ?? new Date().toISOString(); }
    async resolveProvider() { if (this.provider)
        return this.provider; const registry = this.deps.providerRegistry; this.provider = registry?.defaultProvider ?? await registry?.getDefault?.(); return this.provider; }
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
    async readRows(pair, timeframe) { return (await this.candles.read({ pair, timeframe, includeForming: true })).map((candle) => (0, rules_1.validateCandle)(candle, this.now(), true)).sort((a, b) => a.timestamp.localeCompare(b.timestamp)); }
    async persist(observation) { const candle = (0, rules_1.validateCandle)(observation.candle, this.now(), true); await this.candles.upsert(candle); return candle; }
    fingerprint(query) { return JSON.stringify({ pair: query.pair, timeframe: query.timeframe, range: query.range, limit: query.limit ?? rules_1.DEFAULT_PAGE_LIMIT, includeForming: query.includeForming ?? false, completeness: query.completeness ?? "ALLOW_PARTIAL" }); }
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
        let rows = await this.readRows(pair, timeframe);
        if (range && provider && (0, rules_1.missingRanges)(rows.filter((candle) => candle.timestamp >= range.from && candle.timestamp < range.to), range, timeframe).length > 0) {
            try {
                for (const observation of await provider.fetchHistorical({ pair, timeframe, range }))
                    await this.persist(observation);
                rows = await this.readRows(pair, timeframe);
            }
            catch (error) {
                if (query.completeness === "REQUIRE_COMPLETE")
                    throw new errors_1.MarketDataException("HISTORY_UNAVAILABLE", "Historical market data is unavailable.", true, { cause: error instanceof Error ? error.message : "provider failure" });
            }
        }
        const closed = rows.filter((candle) => candle.isClosed && (!range || (candle.timestamp >= range.from && candle.timestamp < range.to)));
        const forming = query.includeForming ? rows.filter((candle) => !candle.isClosed && (!range || (candle.timestamp >= range.from && candle.timestamp < range.to))) : [];
        const page = [...closed, ...forming].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        const effectiveRange = range ?? (page.length > 0 ? { from: page[0].timestamp, to: new Date(Date.parse(page[page.length - 1].timestamp) + rules_1.TIMEFRAME_SECONDS[timeframe] * 1000).toISOString() } : { from: now, to: now });
        const gaps = (0, rules_1.missingRanges)(closed, effectiveRange, timeframe);
        if (range && query.completeness === "REQUIRE_COMPLETE" && gaps.length > 0)
            throw new errors_1.MarketDataException("HISTORY_INCOMPLETE", "Historical data contains missing candles.", true, { missingRanges: gaps });
        if (!range && page.length === 0)
            throw new errors_1.MarketDataException("NO_DATA", "No historical candles are available.");
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
        this.snapshots.set(snapshot.id, { snapshot, candles: page.candles.map((candle) => ({ ...candle })) });
        if (this.deps.snapshotRepository) {
            const persisted = await this.deps.snapshotRepository.create({ snapshot, candles: page.candles });
            this.snapshots.set(persisted.id, { snapshot: persisted, candles: page.candles });
            return persisted;
        }
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
        const id = ++this.sequence;
        this.subscribers.set(id, { subscriptions: new Set(validated.map((subscription) => `${subscription.pair}|${subscription.timeframe}`)), sink });
        this.deliver(sink, { kind: "CONNECTION_STATUS", payload: this.status });
        const provider = await this.validateProvider(validated[0]?.pair ?? "BTCUSDT", validated[0]?.timeframe ?? "1m");
        if (provider && !this.connection) {
            this.provider = provider;
            this.status = { provider: provider.id, status: "RECONNECTING", lastEventAt: this.now() };
            this.broadcast({ kind: "CONNECTION_STATUS", payload: this.status });
            this.connection = await provider.connectRealtime({ subscriptions: validated, onTick: (observation) => this.handleTick(observation.tick), onCandle: (observation) => void this.handleCandle(observation), onDisconnect: () => { this.status = { provider: provider.id, status: "DISCONNECTED", lastEventAt: this.now() }; this.broadcast({ kind: "CONNECTION_STATUS", payload: this.status }); } });
            this.status = { provider: provider.id, status: "CONNECTED", lastEventAt: this.now() };
            this.broadcast({ kind: "CONNECTION_STATUS", payload: this.status });
        }
        let active = true;
        return async () => { if (!active)
            return; active = false; this.subscribers.delete(id); if (this.subscribers.size === 0 && this.connection) {
            await this.connection.close();
            this.connection = undefined;
            this.status = { provider: this.provider?.id ?? "BINANCE", status: "DISCONNECTED", lastEventAt: this.now() };
        } };
    }
    deliver(sink, update) { try {
        sink(update);
    }
    catch {
        this.deps.observability?.record("market_data.sink_error");
    } }
    broadcast(update) { for (const subscriber of this.subscribers.values())
        this.deliver(subscriber.sink, update); }
    handleTick(tick) { try {
        const pair = (0, rules_1.validatePair)(tick.pair);
        if (typeof tick.timestamp !== "string" || !tick.timestamp.endsWith("Z") || Date.parse(tick.timestamp) > Date.parse(this.now()))
            throw new Error("invalid future tick");
        if (!Number.isFinite(tick.price) || tick.price <= 0)
            throw new Error("invalid tick price");
        this.broadcast({ kind: "TICK", payload: { ...tick, pair, timestamp: new Date(Date.parse(tick.timestamp)).toISOString() } });
    }
    catch {
        this.deps.observability?.record("market_data.invalid_tick");
    } }
    async handleCandle(observation) { try {
        const candle = await this.persist(observation);
        this.broadcast({ kind: "CANDLE", payload: candle });
    }
    catch {
        this.deps.observability?.record("market_data.invalid_candle");
    } }
    async shutdown() { if (this.stopped)
        return; this.stopped = true; if (this.connection)
        await this.connection.close(); this.connection = undefined; this.subscribers.clear(); }
}
function createMarketDataService(deps = {}) { return new MarketDataService(deps); }
