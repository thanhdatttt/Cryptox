import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Candle } from "../domain/contracts";
import { createPostgresMarketDataDependencies, type PostgresMarketDataDependencies } from "./postgres";

const databaseUrl = process.env.DATABASE_URL;
const shouldRun = Boolean(databaseUrl);

describe.skipIf(!shouldRun)("PostgreSQL market-data persistence", () => {
  let dependencies: PostgresMarketDataDependencies;
  const pair = `M01TEST${Date.now()}`;
  const range = { from: "2026-01-01T00:00:00.000Z", to: "2026-01-01T00:10:00.000Z" };
  let snapshotId: string | undefined;

  beforeAll(async () => {
    dependencies = createPostgresMarketDataDependencies({ connectionString: databaseUrl! });
    await dependencies.pool.query("SELECT 1");
  });

  afterAll(async () => {
    if (!dependencies) return;
    if (snapshotId) {
      await dependencies.pool.query("DELETE FROM market_dataset_snapshot_candles WHERE snapshot_id = $1::uuid", [snapshotId]);
      await dependencies.pool.query("DELETE FROM market_dataset_snapshots WHERE id = $1::uuid", [snapshotId]);
    }
    await dependencies.pool.query("DELETE FROM market_candles WHERE pair = $1", [pair]);
    await dependencies.close();
  });

  it("persists closed candles and copies an exact, paginable dataset snapshot", async () => {
    const candles: Candle[] = [0, 5].map((minute) => {
      const timestamp = `2026-01-01T00:0${minute}:00.000Z`;
      return { pair, timeframe: "5m", timestamp, open: 1, high: 2, low: 1, close: 2, volume: 3, isClosed: true };
    });
    await dependencies.candleRepository.upsertMany(candles);
    await expect(dependencies.candleRepository.read({ pair, timeframe: "5m", range, limit: 10 })).resolves.toHaveLength(2);

    const snapshot = await dependencies.snapshotRepository.create({ provider: "binance", pair, timeframe: "5m", range });
    snapshotId = snapshot.id;
    expect(snapshot).toMatchObject({ provider: "binance", candleCount: 2, replayGuarantee: "EXACT_REPLAY_AVAILABLE", version: "1" });
    const page = await dependencies.snapshotRepository.read({ snapshotId: snapshot.id, limit: 1 });
    expect(page?.candles).toHaveLength(1);
    expect(page?.nextCursor).toEqual(expect.any(String));
    const secondPage = await dependencies.snapshotRepository.read({ snapshotId: snapshot.id, cursor: page?.nextCursor, limit: 1 });
    expect(secondPage?.candles).toHaveLength(1);
  });
});

