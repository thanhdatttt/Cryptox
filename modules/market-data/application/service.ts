import { createHash, randomUUID } from "node:crypto";
import type { MarketDataModuleDependencies, MarketDataProviderAdapter, NormalizedProviderCandleObservation } from "./ports";
import { MarketDataSubscriptionManager } from "./subscription-manager";
import type { Candle, DatasetSnapshotRef, MarketDataConnectionStatus, MarketPairMetadata, MarketTick, Timeframe } from "../domain/contracts";
import { MarketDataException } from "../domain/errors";
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, TIMEFRAME_SECONDS, missingRanges, parseTimestamp, snapshotSerialization, validateCandle, validateLimit, validatePair, validateRange, validateTimeframe } from "../domain/rules";
import type { DatasetSnapshotCreateCommand, DatasetSnapshotPage, DatasetSnapshotReadQuery, HistoricalCandlePage, HistoricalCandleQuery, MarketCapabilities, MarketDataModulePublicApi, MarketDataUpdate, MarketSubscription } from "../api";

type InternalDeps = Partial<MarketDataModuleDependencies>;
const key = (candle: Pick<Candle, "pair" | "timeframe" | "timestamp">) => `${candle.pair}|${candle.timeframe}|${candle.timestamp}`;
// Binance timestamps can lead the application clock by a small amount; keep validation bounded.
const MAX_TICK_FUTURE_SKEW_MS = 5_000;

class MemoryCandleRepository {
  private readonly rows = new Map<string, Candle>();
  async read(query: { pair: string; timeframe: Timeframe }): Promise<Candle[]> { return [...this.rows.values()].filter((candle) => candle.pair === query.pair && candle.timeframe === query.timeframe).sort((a, b) => a.timestamp.localeCompare(b.timestamp)); }
  async upsert(candle: Candle): Promise<void> { const existing = this.rows.get(key(candle)); if (!existing?.isClosed || candle.isClosed) this.rows.set(key(candle), candle); }
}

class MarketDataService implements MarketDataModulePublicApi {
  private readonly candles: { read(query: { pair: string; timeframe: Timeframe; includeForming?: boolean }): Promise<Candle[]>; upsert(candle: Candle): Promise<void> };
  private readonly snapshots = new Map<string, { snapshot: DatasetSnapshotRef; candles: Candle[] }>();
  private readonly subscribers = new Map<number, { subscriptions: Set<string>; sink: (update: MarketDataUpdate) => void }>();
  private sequence = 0;
  private provider?: MarketDataProviderAdapter;
  private providerResolved = false;
  private subscriptionManager?: MarketDataSubscriptionManager;
  private subscriptionProvider?: MarketDataProviderAdapter;
  private reconcilePromise: Promise<void> = Promise.resolve();
  private readonly historySyncs = new Map<string, Promise<void>>();
  private status: MarketDataConnectionStatus;
  private stopped = false;

  constructor(private readonly deps: InternalDeps) {
    const memory = new MemoryCandleRepository();
    this.candles = deps.candleRepository ?? memory;
    this.status = { provider: deps.providerRegistry?.defaultProviderId ?? deps.providerRegistry?.defaultProvider?.id ?? "BINANCE", status: "DISCONNECTED", lastEventAt: this.now() };
  }
  private now(): string { return this.deps.clock?.now() ?? new Date().toISOString(); }
  private async resolveProvider(): Promise<MarketDataProviderAdapter | undefined> { if (this.providerResolved) return this.provider; this.providerResolved = true; const registry = this.deps.providerRegistry; this.provider = registry?.defaultProvider ?? await registry?.getDefault?.(); return this.provider; }
  private async validateProvider(pair: string, timeframe: Timeframe): Promise<MarketDataProviderAdapter | undefined> {
    const provider = await this.resolveProvider();
    if (!provider) return undefined;
    const capabilities = await provider.capabilities();
    if (!capabilities.pairs.includes(pair)) throw new MarketDataException("UNSUPPORTED_PAIR", "Pair is not supported by the selected provider.");
    if (!capabilities.timeframes.includes(timeframe)) throw new MarketDataException("UNSUPPORTED_TIMEFRAME", "Timeframe is not supported by the selected provider.");
    return provider;
  }
  async readCapabilities(): Promise<MarketCapabilities> {
    const provider = await this.resolveProvider();
    if (!provider) return { provider: this.status.provider, pairs: [], timeframes: [] };
    const capabilities = await provider.capabilities();
    return { provider: provider.id, pairs: [...capabilities.pairs], timeframes: [...capabilities.timeframes] };
  }
  private async readRows(pair: string, timeframe: Timeframe): Promise<Candle[]> { return (await this.candles.read({ pair, timeframe, includeForming: true })).map((candle) => validateCandle(candle, this.now(), true)).sort((a, b) => a.timestamp.localeCompare(b.timestamp)); }
  private async persist(observation: NormalizedProviderCandleObservation): Promise<Candle | undefined> {
    const provider = await this.resolveProvider();
    const source = observation.source.includes(":") ? observation.source : `${provider?.id ?? "UNKNOWN"}:${observation.source}`;
    const candle = validateCandle({ ...observation.candle, source }, this.now());
    const existing = (await this.candles.read({ pair: candle.pair, timeframe: candle.timeframe, includeForming: true })).find((item) => item.timestamp === candle.timestamp);
    if (existing?.isClosed && !candle.isClosed) return undefined;
    await this.candles.upsert(candle);
    return candle;
  }
  private latestClosedRange(now: string, timeframe: Timeframe, limit: number): { from: string; to: string } {
    const interval = TIMEFRAME_SECONDS[timeframe] * 1000;
    const end = Math.floor(Date.parse(now) / interval) * interval;
    return { from: new Date(end - limit * interval).toISOString(), to: new Date(end).toISOString() };
  }
  private async syncMissing(provider: MarketDataProviderAdapter, pair: string, timeframe: Timeframe, range: { from: string; to: string }): Promise<void> {
    const syncKey = `${provider.id}|${pair}|${timeframe}|${range.from}|${range.to}`;
    const running = this.historySyncs.get(syncKey);
    if (running) return running;
    const operation = (async () => {
      const rows = await this.readRows(pair, timeframe);
      const missing = missingRanges(rows.filter((candle) => candle.timestamp >= range.from && candle.timestamp < range.to), range, timeframe);
      for (const missingRange of missing) {
        const observations = await provider.fetchHistorical({ pair, timeframe, range: missingRange });
        for (const observation of observations) await this.persist(observation);
      }
    })();
    this.historySyncs.set(syncKey, operation);
    try { await operation; } finally { this.historySyncs.delete(syncKey); }
  }
  private fingerprint(query: HistoricalCandleQuery): string { return JSON.stringify({ pair: query.pair, timeframe: query.timeframe, range: query.range, limit: query.limit ?? DEFAULT_PAGE_LIMIT, includeForming: query.includeForming ?? false, completeness: query.completeness ?? "ALLOW_PARTIAL" }); }
  private encodeCursor(query: HistoricalCandleQuery, offset: number): string { return Buffer.from(JSON.stringify({ fingerprint: this.fingerprint(query), offset }), "utf8").toString("base64url"); }
  private decodeCursor(query: HistoricalCandleQuery, cursor?: string): number {
    if (!cursor) return 0;
    try { const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { fingerprint: string; offset: number }; if (decoded.fingerprint !== this.fingerprint(query) || !Number.isInteger(decoded.offset) || decoded.offset < 0) throw new Error(); return decoded.offset; }
    catch { throw new MarketDataException("INVALID_CURSOR", "Cursor is invalid or bound to another query."); }
  }

  async readPairMetadata(pairInput: string): Promise<MarketPairMetadata> {
    const pair = validatePair(pairInput); const provider = await this.resolveProvider();
    if (provider?.readPairMetadata) return provider.readPairMetadata(pair);
    return { pair, baseAsset: pair, quoteAsset: "", settlementAsset: "" };
  }

  async readCandles(query: HistoricalCandleQuery): Promise<HistoricalCandlePage> {
    const pair = validatePair(query.pair); const timeframe = validateTimeframe(query.timeframe); const now = this.now();
    const range = query.range ? validateRange(query.range, timeframe, now) : undefined; const limit = validateLimit(query.limit);
    const normalizedQuery = { ...query, pair, timeframe, range }; this.decodeCursor(normalizedQuery, query.cursor);
    const provider = await this.validateProvider(pair, timeframe); let rows = await this.readRows(pair, timeframe);
    const requestedRange = range ?? (provider ? this.latestClosedRange(now, timeframe, limit) : undefined);
    let providerFailure: unknown;
    if (provider && requestedRange) {
      try { await this.syncMissing(provider, pair, timeframe, requestedRange); rows = await this.readRows(pair, timeframe); }
      catch (error) { providerFailure = error; if (query.completeness === "REQUIRE_COMPLETE") throw new MarketDataException("HISTORY_UNAVAILABLE", "Historical market data is unavailable.", true, { cause: error instanceof Error ? error.message : "provider failure" }); }
    }
    const closed = rows.filter((candle) => candle.isClosed && (!requestedRange || (candle.timestamp >= requestedRange.from && candle.timestamp < requestedRange.to)));
    const forming = query.includeForming ? rows.filter((candle) => !candle.isClosed && (!requestedRange || (range ? (candle.timestamp >= range.from && candle.timestamp < range.to) : (candle.timestamp >= requestedRange.from && candle.timestamp <= requestedRange.to)))) : [];
    const page = [...closed, ...forming].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const effectiveRange = requestedRange ?? (page.length > 0 ? { from: page[0].timestamp, to: new Date(Date.parse(page[page.length - 1].timestamp) + TIMEFRAME_SECONDS[timeframe] * 1000).toISOString() } : { from: now, to: now });
    const gaps = missingRanges(closed, effectiveRange, timeframe);
    if (query.completeness === "REQUIRE_COMPLETE" && gaps.length > 0) throw new MarketDataException("HISTORY_INCOMPLETE", "Historical data contains missing candles.", true, { missingRanges: gaps });
    if (!range && page.length === 0) throw new MarketDataException(providerFailure ? "HISTORY_UNAVAILABLE" : "NO_DATA", providerFailure ? "Historical market data is unavailable." : "No historical candles are available.", Boolean(providerFailure), providerFailure ? { cause: providerFailure instanceof Error ? providerFailure.message : "provider failure" } : undefined);
    const offset = query.cursor ? this.decodeCursor(normalizedQuery, query.cursor) : (range ? 0 : Math.max(0, page.length - limit)); const selected = page.slice(offset, offset + limit);
    const responseRange = range ?? (selected.length > 0 ? { from: selected[0].timestamp, to: new Date(Date.parse(selected[selected.length - 1].timestamp) + TIMEFRAME_SECONDS[timeframe] * 1000).toISOString() } : effectiveRange);
    return { pair, timeframe, range: responseRange, candles: selected, complete: gaps.length === 0, missingRanges: gaps, formingIncluded: selected.some((candle) => !candle.isClosed), asOf: now, nextCursor: offset + limit < page.length ? this.encodeCursor(normalizedQuery, offset + limit) : undefined };
  }

  async createDatasetSnapshot(command: DatasetSnapshotCreateCommand): Promise<DatasetSnapshotRef> {
    const pair = validatePair(command.pair); const timeframe = validateTimeframe(command.timeframe); const range = validateRange(command.range, timeframe, this.now());
    const page = await this.readCandles({ pair, timeframe, range, completeness: "REQUIRE_COMPLETE", includeForming: false, limit: MAX_PAGE_LIMIT });
    if (page.candles.length === 0) throw new MarketDataException("DATASET_EMPTY", "Cannot create an empty dataset snapshot.");
    const serialization = snapshotSerialization(pair, timeframe, range, page.candles); const sha256 = createHash("sha256").update(serialization, "utf8").digest("hex");
    const existing = [...this.snapshots.values()].find((entry) => entry.snapshot.sha256 === sha256); if (existing) return existing.snapshot;
    const snapshot: DatasetSnapshotRef = { id: randomUUID(), pair, pairMetadata: await this.readPairMetadata(pair), timeframe, range, candleCount: page.candles.length, sha256, createdAt: this.now() };
    this.snapshots.set(snapshot.id, { snapshot, candles: page.candles.map((candle) => ({ ...candle })) });
    if (this.deps.snapshotRepository) { const persisted = await this.deps.snapshotRepository.create({ snapshot, candles: page.candles }); this.snapshots.set(persisted.id, { snapshot: persisted, candles: page.candles }); return persisted; }
    return snapshot;
  }

  async readDatasetSnapshot(query: DatasetSnapshotReadQuery): Promise<DatasetSnapshotPage> {
    const limit = validateLimit(query.limit); let entry = this.snapshots.get(query.snapshotId);
    if (!entry && this.deps.snapshotRepository) { const result = await this.deps.snapshotRepository.read(query); if (result && typeof result === "object" && "snapshot" in result && "candles" in result) entry = result as { snapshot: DatasetSnapshotRef; candles: Candle[] }; }
    if (!entry) throw new MarketDataException("DATASET_NOT_FOUND", "Dataset snapshot was not found.");
    const synthetic: HistoricalCandleQuery = { pair: entry.snapshot.pair, timeframe: entry.snapshot.timeframe, limit }; const offset = this.decodeCursor(synthetic, query.cursor); const candles = entry.candles.slice(offset, offset + limit);
    return { snapshot: entry.snapshot, candles, nextCursor: offset + limit < entry.candles.length ? this.encodeCursor(synthetic, offset + limit) : undefined };
  }

  async subscribeMarketData(subscriptions: MarketSubscription[], sink: (update: MarketDataUpdate) => void): Promise<() => Promise<void>> {
    if (this.stopped) throw new MarketDataException("SUBSCRIPTION_REJECTED", "Market Data module is shut down.");
    const validated = subscriptions.map((subscription) => ({ pair: validatePair(subscription.pair), timeframe: validateTimeframe(subscription.timeframe) }));
    for (const subscription of validated) await this.validateProvider(subscription.pair, subscription.timeframe);
    const id = ++this.sequence;
    this.subscribers.set(id, { subscriptions: new Set(validated.map((subscription) => `${subscription.pair}|${subscription.timeframe}`)), sink });
    this.deliver(sink, { kind: "CONNECTION_STATUS", payload: this.status });
    await this.reconcileRealtime();
    let active = true;
    return async () => {
      if (!active) return;
      active = false;
      this.subscribers.delete(id);
      await this.reconcileRealtime();
    };
  }
  private unionSubscriptions(): MarketSubscription[] {
    const values = new Map<string, MarketSubscription>();
    for (const subscriber of this.subscribers.values()) for (const value of subscriber.subscriptions) {
      const [pair, timeframe] = value.split("|");
      values.set(value, { pair, timeframe: timeframe as Timeframe });
    }
    return [...values.values()].sort((left, right) => `${left.pair}|${left.timeframe}`.localeCompare(`${right.pair}|${right.timeframe}`));
  }
  private async reconcileRealtime(): Promise<void> {
    const operation = this.reconcilePromise.then(async () => {
      const subscriptions = this.unionSubscriptions();
      const provider = await this.resolveProvider();
      if (!provider || subscriptions.length === 0) {
        await this.subscriptionManager?.setSubscriptions([]);
        if (subscriptions.length > 0) this.setStatus({ provider: this.status.provider, status: "DISCONNECTED" });
        return;
      }
      if (!this.subscriptionManager || this.subscriptionProvider !== provider) {
        await this.subscriptionManager?.stop();
        this.subscriptionProvider = provider;
        this.subscriptionManager = new MarketDataSubscriptionManager({
          provider,
          onTick: (observation) => this.handleTick(observation.tick),
          onCandle: (observation) => { void this.handleCandle(observation); },
          onStatus: (status, failure) => this.setStatus({ provider: provider.id, status, ...(failure ? { errorCode: failure.code } : {}) }),
        });
      }
      await this.subscriptionManager.setSubscriptions(subscriptions);
    });
    this.reconcilePromise = operation.catch(() => undefined);
    await operation;
  }
  private setStatus(next: Pick<MarketDataConnectionStatus, "provider" | "status"> & { errorCode?: string }): void {
    this.status = { ...next, lastEventAt: this.now() };
    this.broadcast({ kind: "CONNECTION_STATUS", payload: this.status });
  }
  private deliver(sink: (update: MarketDataUpdate) => void, update: MarketDataUpdate): void { try { sink(update); } catch { this.deps.observability?.record("market_data.sink_error"); } }
  private broadcast(update: MarketDataUpdate): void { for (const subscriber of this.subscribers.values()) this.deliver(subscriber.sink, update); }
  private handleTick(tick: MarketTick): void { try { const pair = validatePair(tick.pair); const timestamp = Date.parse(tick.timestamp); if (typeof tick.timestamp !== "string" || !tick.timestamp.endsWith("Z") || !Number.isFinite(timestamp) || timestamp > Date.parse(this.now()) + MAX_TICK_FUTURE_SKEW_MS) throw new Error("invalid future tick"); if (!Number.isFinite(tick.price) || tick.price <= 0) throw new Error("invalid tick price"); if (!Number.isFinite(tick.quantity) || tick.quantity <= 0) throw new Error("invalid tick quantity"); if (tick.side !== "BUY" && tick.side !== "SELL") throw new Error("invalid tick side"); this.broadcast({ kind: "TICK", payload: { ...tick, pair, timestamp: new Date(timestamp).toISOString() } }); } catch { this.deps.observability?.record("market_data.invalid_tick"); } }
  private async handleCandle(observation: NormalizedProviderCandleObservation): Promise<void> { try { const candle = await this.persist(observation); if (candle) this.broadcast({ kind: "CANDLE", payload: candle }); } catch { this.deps.observability?.record("market_data.invalid_candle"); } }
  async shutdown(): Promise<void> { if (this.stopped) return; this.stopped = true; await this.subscriptionManager?.stop(); this.subscriptionManager = undefined; this.subscriptionProvider = undefined; this.subscribers.clear(); }
}

export function createMarketDataService(deps: InternalDeps = {}): MarketDataModulePublicApi { return new MarketDataService(deps); }
