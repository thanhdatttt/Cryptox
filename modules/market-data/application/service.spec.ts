import { describe, expect, it, vi } from "vitest";
import type { Candle } from "../domain/contracts";
import type { DatasetSnapshotRecord, MarketDataModuleDependencies, MarketDataProvider, MarketDataProviderUpdate } from "./ports";
import { MarketDataApplicationError, MarketDataApplicationService } from "./service";

const range = { from: "2026-01-01T00:00:00.000Z", to: "2026-01-01T00:20:00.000Z" };

function candle(timestamp: string, close: number, isClosed = true): Candle {
  return {
    pair: "BTCUSDT",
    timeframe: "5m",
    timestamp,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
    isClosed,
  };
}

function dependencies(provider: MarketDataProvider): MarketDataModuleDependencies & { stored: Candle[]; events: unknown[] } {
  const stored: Candle[] = [];
  const events: unknown[] = [];
  const snapshots = new Map<string, DatasetSnapshotRecord>();
  return {
    providers: [provider],
    stored,
    events,
    candleRepository: {
      upsertMany: async (items) => {
        for (const item of items) {
          const index = stored.findIndex((existing) => existing.timestamp === item.timestamp);
          if (index === -1) stored.push(item);
          else stored[index] = item;
        }
      },
      read: async () => stored,
    },
    snapshotRepository: {
      create: async (input) => {
        const snapshot: DatasetSnapshotRecord = {
          id: "snapshot-1",
          provider: input.provider,
          pair: input.pair,
          timeframe: input.timeframe,
          range: input.range,
          candleCount: stored.length,
          replayGuarantee: "EXACT_REPLAY_AVAILABLE",
          version: "1",
          createdAt: "2026-01-01T00:30:00.000Z",
        };
        snapshots.set(snapshot.id, snapshot);
        return snapshot;
      },
      read: async ({ snapshotId, limit = 1_000 }) => {
        const snapshot = snapshots.get(snapshotId);
        return snapshot
          ? { snapshot, candles: stored.slice(0, limit) }
          : undefined;
      },
    },
    clock: { now: () => "2026-01-01T00:30:00.000Z" },
    observability: { record: (event) => events.push(event) },
  };
}

function providerFor(candles: Candle[], id = "fixture"): MarketDataProvider {
  return {
    id,
    readCandles: async (request) => ({
      range: request.range,
      candles,
      complete: true,
      missingRanges: [],
      formingIncluded: Boolean(request.includeForming && candles.some((item) => !item.isClosed)),
      observedAt: "2026-01-01T00:30:00.000Z",
    }),
    subscribe: async () => async () => undefined,
    shutdown: async () => undefined,
  };
}

function pushProvider(id = "fixture"): { provider: MarketDataProvider; emit: (update: MarketDataProviderUpdate) => void } {
  let deliver: ((update: MarketDataProviderUpdate) => void) | undefined;
  const provider: MarketDataProvider = {
    id,
    readCandles: async (request) => ({
      range: request.range,
      candles: [],
      complete: true,
      missingRanges: [],
      formingIncluded: false,
      observedAt: "2026-01-01T00:30:00.000Z",
    }),
    subscribe: async (_subscriptions, sink) => {
      deliver = sink;
      return async () => undefined;
    },
    shutdown: async () => undefined,
  };
  return {
    provider,
    emit: (update) => deliver?.(update),
  };
}

function realtimeCandle(
  pair: string,
  timeframe: Candle["timeframe"],
  timestamp: string,
  close: number,
  isClosed: boolean,
): Candle {
  return { pair, timeframe, timestamp, open: close, high: close, low: close, close, volume: 1, isClosed };
}

describe("MarketDataApplicationService", () => {
  it("validates before contacting the provider and enforces bounded ranges", async () => {
    const read = vi.fn(async () => ({
      range,
      candles: [],
      complete: true,
      missingRanges: [],
      formingIncluded: false,
      observedAt: "2026-01-01T00:30:00.000Z",
    }));
    const provider = providerFor([], "fixture");
    provider.readCandles = read;
    const service = new MarketDataApplicationService(dependencies(provider), { maxRangeCandles: 3 });

    await expect(service.readCandles({ pair: "", timeframe: "5m", range })).rejects.toMatchObject({ code: "INVALID_PAIR" });
    await expect(service.readCandles({ pair: "BTCUSDT", timeframe: "5m", range, limit: 4 })).rejects.toMatchObject({ code: "RANGE_TOO_LARGE" });
    expect(read).not.toHaveBeenCalled();
  });

  it("normalizes closed history into ordered, unique candles and reports gaps", async () => {
    const items = [
      candle("2026-01-01T00:10:00Z", 12),
      candle("2026-01-01T00:00:00Z", 10),
      candle("2026-01-01T00:00:00Z", 11),
      candle("2026-01-01T00:15:00Z", 13, false),
    ];
    const deps = dependencies(providerFor(items));
    const page = await new MarketDataApplicationService(deps).readCandles({ pair: "BTCUSDT", timeframe: "5m", range });

    expect(page.candles.map((item) => item.timestamp)).toEqual([
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:10:00.000Z",
    ]);
    expect(page.candles[0]?.close).toBe(11);
    expect(page.complete).toBe(false);
    expect(page.missingRanges).toEqual([
      { from: "2026-01-01T00:05:00.000Z", to: "2026-01-01T00:10:00.000Z" },
      { from: "2026-01-01T00:15:00.000Z", to: "2026-01-01T00:20:00.000Z" },
    ]);
    expect(deps.stored).toHaveLength(2);
  });

  it("fails completeness-required reads explicitly and sanitizes provider failures", async () => {
    const deps = dependencies(providerFor([candle("2026-01-01T00:00:00Z", 10)]));
    await expect(new MarketDataApplicationService(deps).readCandles({ ...{ pair: "BTCUSDT", timeframe: "5m", range }, completeness: "REQUIRE_COMPLETE" }))
      .rejects.toMatchObject({ code: "INCOMPLETE_HISTORY" });

    const failed = dependencies({
      ...providerFor([], "binance"),
      readCandles: async () => { throw new Error("provider payload: secret-looking body"); },
    });
    await expect(new MarketDataApplicationService(failed).readCandles({ pair: "BTCUSDT", timeframe: "5m", range }))
      .rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    await expect(new MarketDataApplicationService(failed).readCandles({ pair: "BTCUSDT", timeframe: "5m", range })).rejects.not.toThrow("secret-looking");
    expect(failed.events).toEqual(expect.arrayContaining([expect.objectContaining({ type: "PROVIDER_FAILURE", providerId: "binance" })]));
  });

  it("supports provider substitution and captures an exact dataset identity", async () => {
    const items = [
      candle("2026-01-01T00:00:00Z", 10),
      candle("2026-01-01T00:05:00Z", 11),
      candle("2026-01-01T00:10:00Z", 12),
      candle("2026-01-01T00:15:00Z", 13),
    ];
    const deps = dependencies(providerFor(items, "second-provider"));
    const service = new MarketDataApplicationService(deps);
    const snapshot = await service.createDatasetSnapshot({ pair: "BTCUSDT", timeframe: "5m", range });

    expect(snapshot).toMatchObject({ provider: "second-provider", candleCount: 4, replayGuarantee: "EXACT_REPLAY_AVAILABLE", version: "1" });
    await expect(service.readDatasetSnapshot({ snapshotId: snapshot.id, limit: 2 })).resolves.toMatchObject({
      snapshot: { id: snapshot.id },
      candles: items.slice(0, 2).map((item) => ({ ...item, timestamp: new Date(item.timestamp).toISOString() })),
    });
  });

  it("follows provider cursors to capture a complete bounded range", async () => {
    const items = [
      candle("2026-01-01T00:00:00Z", 10),
      candle("2026-01-01T00:05:00Z", 11),
      candle("2026-01-01T00:10:00Z", 12),
      candle("2026-01-01T00:15:00Z", 13),
    ];
    const reads: string[] = [];
    const provider = providerFor([], "paged-provider");
    provider.readCandles = async (request) => {
      reads.push(request.cursor ?? "first");
      const page = request.cursor ? items.slice(2) : items.slice(0, 2);
      return {
        range: request.range,
        candles: page,
        complete: !request.cursor,
        missingRanges: [],
        formingIncluded: false,
        observedAt: "2026-01-01T00:30:00.000Z",
        ...(request.cursor ? {} : { nextCursor: "page-2" }),
      };
    };
    const deps = dependencies(provider);
    const snapshot = await new MarketDataApplicationService(deps, { defaultPageLimit: 2 }).createDatasetSnapshot({ pair: "BTCUSDT", timeframe: "5m", range });

    expect(reads).toEqual(["first", "page-2"]);
    expect(snapshot.candleCount).toBe(4);
  });
});

describe("MarketDataApplicationError", () => {
  it("has a stable error identity for boundary mapping", () => {
    expect(new MarketDataApplicationError("INVALID_CURSOR", "bad cursor")).toMatchObject({ name: "MarketDataApplicationError", code: "INVALID_CURSOR" });
  });
});

describe("MarketDataApplicationService realtime boundary", () => {
  it("implements same-timestamp updates and later appends without closed-candle duplication (CSL-R-MD-02)", async () => {
    const pushed = pushProvider();
    const deps = dependencies(pushed.provider);
    const updates: Array<{ kind: string; payload: unknown }> = [];
    const service = new MarketDataApplicationService(deps);
    await service.subscribeMarketData([{ pair: "btcusdt", timeframe: "5m" }], (update) => updates.push(update));

    pushed.emit({ kind: "CANDLE", payload: realtimeCandle("BTCUSDT", "5m", "2026-01-01T00:00:00Z", 100, false) });
    pushed.emit({ kind: "CANDLE", payload: realtimeCandle("BTCUSDT", "5m", "2026-01-01T00:00:00Z", 101, false) });
    pushed.emit({ kind: "CANDLE", payload: realtimeCandle("BTCUSDT", "5m", "2026-01-01T00:05:00Z", 102, true) });
    pushed.emit({ kind: "CANDLE", payload: realtimeCandle("BTCUSDT", "5m", "2026-01-01T00:05:00Z", 102, true) });
    pushed.emit({ kind: "CANDLE", payload: realtimeCandle("BTCUSDT", "5m", "2026-01-01T00:02:00Z", 99, true) });
    pushed.emit({ kind: "CANDLE", payload: realtimeCandle("BTCUSDT", "5m", "2026-01-01T00:00:00Z", 103, false) });

    expect(updates.filter((update) => update.kind === "CANDLE").map((update) => (update.payload as Candle).close)).toEqual([100, 101, 102]);
    expect(updates.filter((update) => update.kind === "CANDLE").every((update) => (update.payload as Candle).isClosed || (update.payload as Candle).timestamp === "2026-01-01T00:00:00.000Z")).toBe(true);
  });

  it("keeps four chart subscriptions isolated and rejects a fifth before provider contact (CSL-R-FE-01)", async () => {
    const pushed = pushProvider();
    const subscribe = vi.spyOn(pushed.provider, "subscribe");
    const service = new MarketDataApplicationService(dependencies(pushed.provider));
    const updates: Candle[] = [];
    await service.subscribeMarketData(
      [
        { pair: "BTCUSDT", timeframe: "1m" },
        { pair: "BTCUSDT", timeframe: "5m" },
        { pair: "ETHUSDT", timeframe: "1m" },
        { pair: "ETHUSDT", timeframe: "5m" },
      ],
      (update) => {
        if (update.kind === "CANDLE") updates.push(update.payload);
      },
    );
    expect(subscribe).toHaveBeenCalledTimes(1);

    pushed.emit({ kind: "CANDLE", payload: realtimeCandle("BTCUSDT", "1m", "2026-01-01T00:00:00Z", 10, true) });
    pushed.emit({ kind: "CANDLE", payload: realtimeCandle("BTCUSDT", "5m", "2026-01-01T00:00:00Z", 20, true) });
    pushed.emit({ kind: "CANDLE", payload: realtimeCandle("ETHUSDT", "1m", "2026-01-01T00:00:00Z", 30, true) });
    pushed.emit({ kind: "CANDLE", payload: realtimeCandle("ETHUSDT", "5m", "2026-01-01T00:00:00Z", 40, true) });
    pushed.emit({ kind: "CANDLE", payload: realtimeCandle("BTCUSDT", "1m", "2025-12-31T23:59:00Z", 9, true) });

    expect(updates.map((candle) => `${candle.pair}:${candle.timeframe}:${candle.close}`)).toEqual([
      "BTCUSDT:1m:10",
      "BTCUSDT:5m:20",
      "ETHUSDT:1m:30",
      "ETHUSDT:5m:40",
    ]);
    await expect(
      service.subscribeMarketData(
        [
          { pair: "BTCUSDT", timeframe: "1m" },
          { pair: "BTCUSDT", timeframe: "5m" },
          { pair: "ETHUSDT", timeframe: "1m" },
          { pair: "ETHUSDT", timeframe: "5m" },
          { pair: "SOLUSDT", timeframe: "1m" },
        ],
        () => undefined,
      ),
    ).rejects.toMatchObject({ code: "INVALID_RANGE" });
    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it("keeps provider telemetry ephemeral, capped at 100 ticks, and restart-empty (CSL-R-MD-03)", async () => {
    const pushed = pushProvider();
    const deps = dependencies(pushed.provider);
    const service = new MarketDataApplicationService(deps);
    await service.subscribeMarketData([{ pair: "BTCUSDT", timeframe: "5m" }], () => undefined);
    pushed.emit({ kind: "CONNECTION_STATUS", payload: { provider: "fixture", status: "CONNECTED", lastEventAt: "2026-01-01T00:00:00Z" } });
    for (let price = 0; price < 101; price += 1) {
      pushed.emit({ kind: "TICK", payload: { pair: "btcusdt", price, timestamp: "2026-01-01T00:00:00Z" } });
    }

    const state = await service.readObservability("btcusdt");
    expect(state).toMatchObject({
      profileId: "MARKET_OBSERVABILITY_V1",
      pair: "BTCUSDT",
      connection: { provider: "fixture", status: "CONNECTED" },
      lastLatencyMs: 1_800_000,
      persistence: "EPHEMERAL_IN_MEMORY_ONLY",
    });
    expect(state?.latestTicks).toHaveLength(100);
    expect(state?.latestTicks[0]).toMatchObject({ price: 1, providerEventAt: "2026-01-01T00:00:00.000Z", receivedAt: "2026-01-01T00:30:00.000Z" });
    expect(state?.latestTicks.at(-1)?.price).toBe(100);
    expect(deps.stored).toHaveLength(0);

    service.resetObservability();
    await expect(service.readObservability("BTCUSDT")).resolves.toBeUndefined();
  });

  it("contains malformed provider updates and continues normalized delivery (CSL-R-OB-01)", async () => {
    const pushed = pushProvider();
    const deps = dependencies(pushed.provider);
    const updates: Array<{ kind: string; payload: unknown }> = [];
    const service = new MarketDataApplicationService(deps);
    await service.subscribeMarketData([{ pair: "BTCUSDT", timeframe: "5m" }], (update) => updates.push(update));
    pushed.emit({ kind: "TICK", payload: { pair: "BTCUSDT", price: Number.NaN, timestamp: "2026-01-01T00:00:00Z" } as never });
    pushed.emit({ kind: "TICK", payload: { pair: "BTCUSDT", price: 100, timestamp: "2026-01-01T00:00:00Z" } });

    expect(updates.filter((update) => update.kind === "TICK").map((update) => (update.payload as { price: number }).price)).toEqual([100]);
    expect(deps.events).toEqual(expect.arrayContaining([expect.objectContaining({ type: "PROVIDER_FAILURE", providerId: "fixture" })]));
  });

  it("bounds shutdown and observes provider cleanup failures (CSL-R-OB-01)", async () => {
    const failed = providerFor([], "failed-provider");
    failed.shutdown = async () => { throw new Error("cleanup failed"); };
    const deps = dependencies(failed);
    const service = new MarketDataApplicationService(deps, { shutdownTimeoutMs: 10 });
    await service.shutdown();
    expect(deps.events).toEqual(expect.arrayContaining([expect.objectContaining({
      type: "PROVIDER_FAILURE",
      providerId: "failed-provider",
      detail: "market data provider shutdown failed",
    })]));

    let release!: () => void;
    const hanging = providerFor([], "hanging-provider");
    hanging.shutdown = () => new Promise<void>((resolve) => { release = resolve; });
    const hangingDeps = dependencies(hanging);
    const started = Date.now();
    await new MarketDataApplicationService(hangingDeps, { shutdownTimeoutMs: 10 }).shutdown();
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(hangingDeps.events).toEqual(expect.arrayContaining([expect.objectContaining({
      type: "PROVIDER_FAILURE",
      providerId: "hanging-provider",
      detail: "market data provider shutdown timed out",
    })]));
    release();
  });
});
