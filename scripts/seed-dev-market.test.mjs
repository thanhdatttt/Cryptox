import assert from "node:assert/strict";
import test from "node:test";
import { createMarketDataService } from "../modules/market-data/dist/application/service.js";
import { buildSeedCandles, DEV_SEED_CANDLE_COUNT, DEV_SEED_END, DEV_SEED_PAIR, DEV_SEED_SOURCE, DEV_SEED_TIMEFRAMES, seedDevMarket } from "./seed-dev-market.mjs";

const intervalMs = { "1m": 60_000, "5m": 300_000, "15m": 900_000, "1h": 3_600_000 };
const volatility = { "1m": 18, "5m": 35, "15m": 70, "1h": 150 };

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

test("market walk includes seeded irregular gaps, regimes, wicks, and impulses", () => {
  for (const timeframe of DEV_SEED_TIMEFRAMES) {
    const candles = buildSeedCandles(timeframe);
    const scale = volatility[timeframe];
    const returns = candles.slice(1).map((candle, index) => candle.close - candles[index].close);
    const gaps = candles.slice(1).map((candle, index) => candle.open - candles[index].close);
    const impulses = candles.filter((candle) => Math.abs(candle.close - candle.open) > scale * 1.5);
    const largeWicks = candles.filter((candle) => Math.max(candle.high - candle.open, candle.high - candle.close, candle.open - candle.low, candle.close - candle.low) > scale * 1.5);
    let quietRun = 0;
    let longestQuietRun = 0;
    for (const value of returns) {
      quietRun = Math.abs(value) < scale * 0.2 ? quietRun + 1 : 0;
      longestQuietRun = Math.max(longestQuietRun, quietRun);
    }

    assert.ok(new Set(returns.map((value) => value.toFixed(3))).size > 100, `${timeframe} should not repeat a smooth waveform`);
    assert.ok(new Set(gaps.map((value) => value.toFixed(3))).size > 100, `${timeframe} should have irregular open gaps`);
    assert.ok(returns.some((value) => value > 0) && returns.some((value) => value < 0), `${timeframe} should change direction`);
    assert.ok(longestQuietRun >= 8, `${timeframe} should contain a consolidation`);
    assert.ok(largeWicks.length >= 5, `${timeframe} should contain occasional large wicks`);
    assert.ok(impulses.length >= 5, `${timeframe} should contain rare impulse candles`);
  }
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
