import assert from "node:assert/strict";
import test from "node:test";
import { createMarketDataService } from "../modules/market-data/application/service.js";
import { buildSeedCandles, DEV_SEED_CANDLE_COUNT, DEV_SEED_END, DEV_SEED_PAIR, DEV_SEED_SOURCE, DEV_SEED_TIMEFRAMES, seedDevMarket } from "./seed-dev-market.mjs";

const intervalMs = { "1m": 60_000, "5m": 300_000, "15m": 900_000, "1h": 3_600_000 };

test("builds deterministic, aligned OHLCV candles for every Market timeframe", () => {
  for (const timeframe of DEV_SEED_TIMEFRAMES) {
    const candles = buildSeedCandles(timeframe);
    assert.equal(candles.length, DEV_SEED_CANDLE_COUNT);
    assert.equal(candles.at(-1).timestamp, DEV_SEED_END);
    for (let index = 0; index < candles.length; index += 1) {
      const candle = candles[index];
      assert.equal(candle.source, DEV_SEED_SOURCE);
      assert.equal(Date.parse(candle.timestamp) % intervalMs[timeframe], 0);
      if (index > 0) assert.equal(Date.parse(candle.timestamp) - Date.parse(candles[index - 1].timestamp), intervalMs[timeframe]);
      assert.ok(candle.high >= Math.max(candle.open, candle.close, candle.low));
      assert.ok(candle.low <= Math.min(candle.open, candle.close, candle.high));
      assert.ok(candle.volume >= 0);
    }
  }
  assert.deepEqual(buildSeedCandles("5m"), buildSeedCandles("5m"));
});

test("uses conflict-safe inserts so repeated seeds are idempotent", async () => {
  let calls = 0;
  const client = { query: async (text, values) => {
    calls += 1;
    assert.match(text, /ON CONFLICT \(pair, timeframe, timestamp\) DO NOTHING/);
    assert.ok(values.includes(DEV_SEED_PAIR));
    assert.ok(values.includes(DEV_SEED_SOURCE));
    return { rows: [], rowCount: calls <= DEV_SEED_TIMEFRAMES.length ? DEV_SEED_CANDLE_COUNT : 0 };
  } };
  const first = await seedDevMarket(client);
  const second = await seedDevMarket(client);
  assert.equal(first.inserted, DEV_SEED_TIMEFRAMES.length * DEV_SEED_CANDLE_COUNT);
  assert.equal(first.skipped, 0);
  assert.equal(second.inserted, 0);
  assert.equal(second.skipped, DEV_SEED_TIMEFRAMES.length * DEV_SEED_CANDLE_COUNT);
});

test("seed candles are returned through the Market Data historical read contract", async () => {
  const rows = DEV_SEED_TIMEFRAMES.flatMap((timeframe) => buildSeedCandles(timeframe));
  const repository = {
    async read({ pair, timeframe }) { return rows.filter((candle) => candle.pair === pair && candle.timeframe === timeframe); },
    async upsert() {},
  };
  const service = createMarketDataService({ candleRepository: repository, clock: { now: () => "2025-02-01T00:00:00.000Z" } });
  const page = await service.readCandles({ pair: DEV_SEED_PAIR, timeframe: "1h" });
  assert.equal(page.candles.length, DEV_SEED_CANDLE_COUNT);
  assert.equal(page.candles[0].timestamp, buildSeedCandles("1h")[0].timestamp);
  assert.equal(page.candles.at(-1).source, DEV_SEED_SOURCE);
  assert.equal(page.complete, true);
});
