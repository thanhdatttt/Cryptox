import type {
  DatasetSnapshotCreateCommand,
  DatasetSnapshotPage,
  DatasetSnapshotReadQuery,
  DatasetSnapshotRef,
  HistoricalCandlePage,
  HistoricalCandleQuery,
  MarketDataModulePublicApi,
  MarketDataProvenance,
  MarketDataUpdate,
  MarketSubscription,
} from "../api/contracts";
import { MARKET_TIMEFRAMES } from "../api/contracts";
import type {
  Candle,
} from "../domain/contracts";
import type {
  DatasetSnapshotRecord,
  MarketDataHistoryRequest,
  MarketDataHistoryResult,
  MarketDataModuleDependencies,
  MarketDataProvider,
} from "./ports";

const DEFAULT_MAX_RANGE_CANDLES = 100_000;
const DEFAULT_PAGE_LIMIT = 1_000;
const CURSOR_MAX_LENGTH = 1_024;

const TIMEFRAME_MS: Record<(typeof MARKET_TIMEFRAMES)[number], number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

export type MarketDataFailureCode =
  | "INVALID_PAIR"
  | "INVALID_TIMEFRAME"
  | "INVALID_RANGE"
  | "RANGE_TOO_LARGE"
  | "INVALID_CURSOR"
  | "INCOMPLETE_HISTORY"
  | "PROVIDER_UNAVAILABLE"
  | "PERSISTENCE_UNAVAILABLE";

export class MarketDataApplicationError extends Error {
  public readonly name = "MarketDataApplicationError";

  public constructor(
    public readonly code: MarketDataFailureCode,
    message: string,
    public readonly details?: { missingRanges?: readonly { from: string; to: string }[] },
  ) {
    super(message);
  }
}

export interface MarketDataApplicationOptions {
  readonly maxRangeCandles?: number;
  readonly defaultPageLimit?: number;
}

interface ValidatedHistoryQuery {
  pair: string;
  timeframe: (typeof MARKET_TIMEFRAMES)[number];
  range: { from: string; to: string };
  fromMs: number;
  toMs: number;
  limit: number;
  cursor?: string;
  includeForming: boolean;
  completeness: "ALLOW_PARTIAL" | "REQUIRE_COMPLETE";
}

interface ValidatedSnapshotReadQuery {
  snapshotId: string;
  cursor?: string;
  limit: number;
}

function invalid(code: MarketDataFailureCode, message: string): never {
  throw new MarketDataApplicationError(code, message);
}

function canonicalTimestamp(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    invalid("INVALID_RANGE", `${field} must be an ISO timestamp`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    invalid("INVALID_RANGE", `${field} must be an ISO timestamp`);
  }
  return new Date(parsed).toISOString();
}

function canonicalPair(value: unknown): string {
  if (typeof value !== "string") invalid("INVALID_PAIR", "pair must be a string");
  const pair = value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._/-]{1,39}$/.test(pair)) {
    invalid("INVALID_PAIR", "pair must be a non-empty market symbol");
  }
  return pair;
}

function canonicalTimeframe(value: unknown): (typeof MARKET_TIMEFRAMES)[number] {
  if (!MARKET_TIMEFRAMES.includes(value as (typeof MARKET_TIMEFRAMES)[number])) {
    invalid("INVALID_TIMEFRAME", "unsupported market timeframe");
  }
  return value as (typeof MARKET_TIMEFRAMES)[number];
}

function validateLimit(value: unknown, defaultLimit: number, maxLimit: number): number {
  if (value === undefined) return Math.min(defaultLimit, maxLimit);
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > maxLimit) {
    invalid("INVALID_RANGE", `limit must be an integer between 1 and ${maxLimit}`);
  }
  return value;
}

function validateCursor(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim() || value.length > CURSOR_MAX_LENGTH) {
    invalid("INVALID_CURSOR", "cursor must be a non-empty opaque value");
  }
  return value;
}

function validateHistoryQuery(
  query: HistoricalCandleQuery,
  options: Required<MarketDataApplicationOptions>,
): ValidatedHistoryQuery {
  if (!query || typeof query !== "object") invalid("INVALID_RANGE", "history query must be an object");
  const pair = canonicalPair(query.pair);
  const timeframe = canonicalTimeframe(query.timeframe);
  if (!query.range || typeof query.range !== "object") {
    invalid("INVALID_RANGE", "range must be an object");
  }
  const from = canonicalTimestamp(query.range.from, "range.from");
  const to = canonicalTimestamp(query.range.to, "range.to");
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (fromMs >= toMs) invalid("INVALID_RANGE", "range must be half-open with from before to");
  const rangeCandles = Math.ceil((toMs - fromMs) / TIMEFRAME_MS[timeframe]);
  if (rangeCandles > options.maxRangeCandles) {
    invalid("RANGE_TOO_LARGE", "requested historical range exceeds the configured bound");
  }
  if (query.includeForming !== undefined && typeof query.includeForming !== "boolean") {
    invalid("INVALID_RANGE", "includeForming must be boolean");
  }
  if (query.completeness !== undefined && query.completeness !== "ALLOW_PARTIAL" && query.completeness !== "REQUIRE_COMPLETE") {
    invalid("INVALID_RANGE", "completeness must be ALLOW_PARTIAL or REQUIRE_COMPLETE");
  }
  return {
    pair,
    timeframe,
    range: { from, to },
    fromMs,
    toMs,
    limit: validateLimit(query.limit, options.defaultPageLimit, options.maxRangeCandles),
    cursor: validateCursor(query.cursor),
    includeForming: query.includeForming ?? false,
    completeness: query.completeness ?? "ALLOW_PARTIAL",
  };
}

function validateSnapshotReadQuery(
  query: DatasetSnapshotReadQuery,
  options: Required<MarketDataApplicationOptions>,
): ValidatedSnapshotReadQuery {
  if (!query || typeof query !== "object" || typeof query.snapshotId !== "string" || !query.snapshotId.trim()) {
    invalid("INVALID_RANGE", "snapshotId must be a non-empty string");
  }
  return {
    snapshotId: query.snapshotId,
    cursor: validateCursor(query.cursor),
    limit: validateLimit(query.limit, options.defaultPageLimit, options.maxRangeCandles),
  };
}

function candleKey(candle: Candle): string {
  return [
    candle.isClosed ? "1" : "0",
    candle.open,
    candle.high,
    candle.low,
    candle.close,
    candle.volume,
  ].join("|");
}

function canonicalCandle(value: unknown, expected: { pair: string; timeframe: (typeof MARKET_TIMEFRAMES)[number] }): Candle {
  if (!value || typeof value !== "object") {
    throw new Error("provider returned a malformed candle");
  }
  const candle = value as Partial<Candle>;
  if (candle.pair !== expected.pair || candle.timeframe !== expected.timeframe) {
    throw new Error("provider returned a candle for the wrong market");
  }
  const timestamp = Date.parse(String(candle.timestamp));
  const numbers = [candle.open, candle.high, candle.low, candle.close, candle.volume];
  if (!Number.isFinite(timestamp) || numbers.some((number) => typeof number !== "number" || !Number.isFinite(number))) {
    throw new Error("provider returned a non-finite candle");
  }
  if (candle.high! < Math.max(candle.open!, candle.close!, candle.low!) || candle.low! > Math.min(candle.open!, candle.close!, candle.high!)) {
    throw new Error("provider returned an invalid candle range");
  }
  if (candle.volume! < 0 || typeof candle.isClosed !== "boolean") {
    throw new Error("provider returned an invalid candle state");
  }
  return {
    pair: expected.pair,
    timeframe: expected.timeframe,
    timestamp: new Date(timestamp).toISOString(),
    open: candle.open!,
    high: candle.high!,
    low: candle.low!,
    close: candle.close!,
    volume: candle.volume!,
    isClosed: candle.isClosed,
  };
}

function compressedMissingRanges(
  candles: readonly Candle[],
  range: { from: string; to: string },
  timeframe: (typeof MARKET_TIMEFRAMES)[number],
): Array<{ from: string; to: string }> {
  const fromMs = Date.parse(range.from);
  const toMs = Date.parse(range.to);
  const interval = TIMEFRAME_MS[timeframe];
  const timestamps = new Set(candles.map((candle) => Date.parse(candle.timestamp)));
  const missing: Array<{ from: string; to: string }> = [];
  let gapStart: number | undefined;
  for (let timestamp = fromMs; timestamp < toMs; timestamp += interval) {
    if (timestamps.has(timestamp)) {
      if (gapStart !== undefined) {
        missing.push({ from: new Date(gapStart).toISOString(), to: new Date(timestamp).toISOString() });
        gapStart = undefined;
      }
    } else if (gapStart === undefined) {
      gapStart = timestamp;
    }
  }
  if (gapStart !== undefined) {
    missing.push({ from: new Date(gapStart).toISOString(), to: new Date(toMs).toISOString() });
  }
  return missing;
}

function providerFailure(): MarketDataApplicationError {
  return new MarketDataApplicationError("PROVIDER_UNAVAILABLE", "historical market data provider is unavailable", {
    missingRanges: undefined,
  });
}

function snapshotRef(record: DatasetSnapshotRecord): DatasetSnapshotRef {
  return {
    id: record.id,
    provider: record.provider,
    pair: record.pair,
    timeframe: record.timeframe,
    range: record.range,
    candleCount: record.candleCount,
    createdAt: record.createdAt,
    ...(record.replayGuarantee === "EXACT_REPLAY_AVAILABLE"
      ? { replayGuarantee: record.replayGuarantee, version: record.version }
      : {
          replayGuarantee: record.replayGuarantee,
          ...(record.version ? { version: record.version } : {}),
          replayLimitation: record.replayLimitation,
        }),
  };
}

function assertSnapshotRecord(record: DatasetSnapshotRecord): void {
  if (!record || typeof record.id !== "string" || !record.id || !Number.isSafeInteger(record.candleCount) || record.candleCount < 0) {
    throw new MarketDataApplicationError("PERSISTENCE_UNAVAILABLE", "dataset snapshot persistence returned malformed metadata");
  }
  canonicalPair(record.pair);
  canonicalTimeframe(record.timeframe);
  const from = Date.parse(record.range.from);
  const to = Date.parse(record.range.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
    throw new MarketDataApplicationError("PERSISTENCE_UNAVAILABLE", "dataset snapshot persistence returned an invalid range");
  }
  if (record.replayGuarantee === "EXACT_REPLAY_AVAILABLE") {
    if (!record.version) throw new MarketDataApplicationError("PERSISTENCE_UNAVAILABLE", "exact dataset snapshot has no version");
  } else if (!record.replayLimitation) {
    throw new MarketDataApplicationError("PERSISTENCE_UNAVAILABLE", "traceable dataset snapshot has no limitation");
  }
}

export class MarketDataApplicationService implements MarketDataModulePublicApi {
  private readonly options: Required<MarketDataApplicationOptions>;
  private stopped = false;

  public constructor(private readonly dependencies: MarketDataModuleDependencies, options: MarketDataApplicationOptions = {}) {
    const maxRangeCandles = options.maxRangeCandles ?? DEFAULT_MAX_RANGE_CANDLES;
    const defaultPageLimit = options.defaultPageLimit ?? DEFAULT_PAGE_LIMIT;
    if (!Number.isSafeInteger(maxRangeCandles) || maxRangeCandles < 1 || !Number.isSafeInteger(defaultPageLimit) || defaultPageLimit < 1) {
      throw new Error("market data bounds must be positive safe integers");
    }
    this.options = { maxRangeCandles, defaultPageLimit };
  }

  private provider(): MarketDataProvider {
    if (this.stopped || this.dependencies.providers.length === 0) {
      throw new MarketDataApplicationError("PROVIDER_UNAVAILABLE", "no historical market data provider is configured");
    }
    const provider = this.dependencies.providers[0];
    if (!provider || typeof provider.id !== "string" || !provider.id.trim()) {
      throw new MarketDataApplicationError("PROVIDER_UNAVAILABLE", "configured market data provider is invalid");
    }
    return provider;
  }

  private async readPage(query: ValidatedHistoryQuery): Promise<HistoricalCandlePage> {
    const provider = this.provider();
    const request: MarketDataHistoryRequest = {
      pair: query.pair,
      timeframe: query.timeframe,
      range: query.range,
      limit: query.limit,
      ...(query.cursor ? { cursor: query.cursor } : {}),
      includeForming: query.includeForming,
    };
    let result: MarketDataHistoryResult;
    try {
      result = await provider.readCandles(request);
    } catch (error) {
      this.dependencies.observability.record({ type: "PROVIDER_FAILURE", providerId: provider.id, detail: "historical read failed" });
      throw providerFailure();
    }
    try {
      if (!result || typeof result !== "object" || result.range.from !== query.range.from || result.range.to !== query.range.to) {
        throw new Error("provider returned a mismatched history range");
      }
      const deduplicated = new Map<string, Candle>();
      for (const value of result.candles) {
        const candle = canonicalCandle(value, query);
        const timestamp = Date.parse(candle.timestamp);
        if (timestamp < query.fromMs || timestamp >= query.toMs) continue;
        if (!query.includeForming && !candle.isClosed) continue;
        const previous = deduplicated.get(candle.timestamp);
        if (!previous || candleKey(candle) > candleKey(previous)) deduplicated.set(candle.timestamp, candle);
      }
      const candles = [...deduplicated.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const missingRanges = compressedMissingRanges(candles, query.range, query.timeframe);
      const observedAt = canonicalTimestamp(result.observedAt, "observedAt");
      const page: HistoricalCandlePage = {
        pair: query.pair,
        timeframe: query.timeframe,
        range: query.range,
        candles,
        complete: missingRanges.length === 0,
        missingRanges,
        formingIncluded: query.includeForming && candles.some((candle) => !candle.isClosed),
        asOf: observedAt,
        provenance: {
          provider: provider.id,
          pair: query.pair,
          timeframe: query.timeframe,
          range: query.range,
          replayGuarantee: "TRACEABLE",
          replayLimitation: "Historical provider data is not an immutable dataset snapshot until explicitly captured.",
        },
        ...(result.nextCursor ? { nextCursor: validateCursor(result.nextCursor) } : {}),
      };
      await this.dependencies.candleRepository.upsertMany(candles);
      if (missingRanges.length > 0) {
        this.dependencies.observability.record({
          type: "HISTORY_GAP",
          providerId: provider.id,
          detail: `${missingRanges.length} missing historical range(s)`,
        });
      }
      if (query.completeness === "REQUIRE_COMPLETE" && (!page.complete || page.nextCursor)) {
        throw new MarketDataApplicationError("INCOMPLETE_HISTORY", "historical range is incomplete", { missingRanges });
      }
      return page;
    } catch (error) {
      if (error instanceof MarketDataApplicationError && error.code === "INCOMPLETE_HISTORY") throw error;
      this.dependencies.observability.record({ type: "PROVIDER_FAILURE", providerId: provider.id, detail: "provider payload was malformed" });
      throw new MarketDataApplicationError("PROVIDER_UNAVAILABLE", "historical market data provider returned malformed data");
    }
  }

  public async readCandles(query: HistoricalCandleQuery): Promise<HistoricalCandlePage> {
    return this.readPage(validateHistoryQuery(query, this.options));
  }

  private async readAll(query: ValidatedHistoryQuery): Promise<{ candles: Candle[]; asOf: string; provider: MarketDataProvider }> {
    const provider = this.provider();
    const candles = new Map<string, Candle>();
    let cursor: string | undefined;
    let asOf = this.dependencies.clock.now();
    let pages = 0;
    do {
      if (pages++ >= this.options.maxRangeCandles) {
        invalid("RANGE_TOO_LARGE", "historical pagination exceeded the configured bound");
      }
      const page = await this.readPage({ ...query, completeness: "ALLOW_PARTIAL", cursor });
      asOf = page.asOf;
      for (const candle of page.candles) {
        const previous = candles.get(candle.timestamp);
        if (!previous || candleKey(candle) > candleKey(previous)) candles.set(candle.timestamp, candle);
      }
      cursor = page.nextCursor;
    } while (cursor);
    const ordered = [...candles.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const missingRanges = compressedMissingRanges(ordered, query.range, query.timeframe);
    if (missingRanges.length > 0) {
      this.dependencies.observability.record({ type: "HISTORY_GAP", providerId: provider.id, detail: `${missingRanges.length} missing historical range(s)` });
      throw new MarketDataApplicationError("INCOMPLETE_HISTORY", "historical range is incomplete", { missingRanges });
    }
    return { candles: ordered, asOf, provider };
  }

  public async createDatasetSnapshot(command: DatasetSnapshotCreateCommand): Promise<DatasetSnapshotRef> {
    const query = validateHistoryQuery({ ...command, completeness: "REQUIRE_COMPLETE" }, this.options);
    const { candles, provider } = await this.readAll(query);
    try {
      const record = await this.dependencies.snapshotRepository.create({
        provider: provider.id,
        pair: query.pair,
        timeframe: query.timeframe,
        range: query.range,
      });
      assertSnapshotRecord(record);
      if (record.candleCount !== candles.length) {
        throw new MarketDataApplicationError("PERSISTENCE_UNAVAILABLE", "dataset snapshot candle count does not match the captured history");
      }
      return snapshotRef(record);
    } catch (error) {
      if (error instanceof MarketDataApplicationError) throw error;
      throw new MarketDataApplicationError("PERSISTENCE_UNAVAILABLE", "dataset snapshot persistence failed");
    }
  }

  public async readDatasetSnapshot(query: DatasetSnapshotReadQuery): Promise<DatasetSnapshotPage> {
    const validated = validateSnapshotReadQuery(query, this.options);
    let page: DatasetSnapshotPage | undefined;
    try {
      page = await this.dependencies.snapshotRepository.read(validated);
    } catch {
      throw new MarketDataApplicationError("PERSISTENCE_UNAVAILABLE", "dataset snapshot read failed");
    }
    if (!page) throw new MarketDataApplicationError("PERSISTENCE_UNAVAILABLE", "dataset snapshot was not found");
    try {
      assertSnapshotRecord(page.snapshot);
      const candles = page.candles.map((candle) => canonicalCandle(candle, page.snapshot));
      return { snapshot: snapshotRef(page.snapshot), candles, ...(page.nextCursor ? { nextCursor: validateCursor(page.nextCursor) } : {}) };
    } catch (error) {
      if (error instanceof MarketDataApplicationError) throw error;
      throw new MarketDataApplicationError("PERSISTENCE_UNAVAILABLE", "dataset snapshot persistence returned malformed candles");
    }
  }

  public async subscribeMarketData(
    subscriptions: readonly MarketSubscription[],
    sink: (update: MarketDataUpdate) => void,
  ): Promise<() => Promise<void>> {
    if (this.stopped) throw new MarketDataApplicationError("PROVIDER_UNAVAILABLE", "market data module is shut down");
    if (!Array.isArray(subscriptions) || subscriptions.length === 0 || typeof sink !== "function") {
      invalid("INVALID_RANGE", "subscriptions and sink are required");
    }
    const provider = this.provider();
    try {
      return await provider.subscribe(
        subscriptions.map((subscription) => ({ pair: canonicalPair(subscription.pair), timeframe: canonicalTimeframe(subscription.timeframe) })),
        sink,
      );
    } catch {
      this.dependencies.observability.record({ type: "PROVIDER_FAILURE", providerId: provider.id, detail: "market subscription failed" });
      throw new MarketDataApplicationError("PROVIDER_UNAVAILABLE", "market data provider subscription is unavailable");
    }
  }

  public async shutdown(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    await Promise.allSettled(this.dependencies.providers.map((provider) => provider.shutdown()));
  }
}
