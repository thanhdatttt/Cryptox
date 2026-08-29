import { describe, expect, it, vi } from "vitest";
import type { Candle } from "../domain/contracts";
import type { DatasetSnapshotRecord, MarketDataModuleDependencies, MarketDataProvider } from "./ports";
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
