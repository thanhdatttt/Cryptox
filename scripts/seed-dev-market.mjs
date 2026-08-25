import pg from "pg";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { Client } = pg;

export const DEV_SEED_PAIR = "BTCUSDT";
export const DEV_SEED_SOURCE = "DEV_SEED:realtime-v1";
export const DEV_SEED_CANDLE_COUNT = 1000;
export const DEV_SEED_END = "2025-01-31T00:00:00.000Z";
export const DEV_SEED_TIMEFRAMES = ["1m", "5m", "15m", "1h"];

const intervals = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600 };
const volatility = { "1m": 18, "5m": 35, "15m": 70, "1h": 150 };
const baseVolumes = { "1m": 0.8, "5m": 3, "15m": 9, "1h": 28 };
const basePrice = 68_000;
const seedUpdatedAt = DEV_SEED_END;

const round = (value, digits = 3) => Number(value.toFixed(digits));

export function buildSeedCandles(timeframe, count = DEV_SEED_CANDLE_COUNT) {
  const interval = intervals[timeframe];
  const scale = volatility[timeframe];
  const volumeBase = baseVolumes[timeframe];
  if (!interval || !scale || !volumeBase) throw new Error(`Unsupported development seed timeframe: ${timeframe}`);

  const end = Date.parse(DEV_SEED_END);
  let previousClose = basePrice;
  return Array.from({ length: count }, (_, index) => {
    const phase = index + DEV_SEED_TIMEFRAMES.indexOf(timeframe) * 11;
    const drift = scale * (index / Math.max(count - 1, 1)) * 2;
    const close = round(basePrice + drift + scale * (Math.sin(phase / 23) + 0.35 * Math.cos(phase / 7)));
    const open = round(index === 0 ? close - scale * 0.1 : previousClose + scale * 0.12 * Math.sin(phase / 5));
    const high = round(Math.max(open, close) + scale * (0.22 + 0.08 * Math.abs(Math.sin(phase / 3))));
    const low = round(Math.min(open, close) - scale * (0.2 + 0.07 * Math.abs(Math.cos(phase / 4))));
    const volume = round(volumeBase * (1 + 0.35 * ((Math.sin(phase / 11) + 1) / 2) + 0.15 * ((index * 13) % 10) / 10));
    previousClose = close;
    return {
      pair: DEV_SEED_PAIR,
      timeframe,
      timestamp: new Date(end - (count - 1 - index) * interval * 1000).toISOString(),
      open,
      high,
      low,
      close,
      volume,
      isClosed: true,
      source: DEV_SEED_SOURCE,
    };
  });
}

function insertStatement(candles) {
  const values = [];
  const placeholders = candles.map((candle, index) => {
    const offset = index * 11;
    values.push(candle.pair, candle.timeframe, candle.timestamp, candle.open, candle.high, candle.low, candle.close, candle.volume, candle.isClosed, candle.source, seedUpdatedAt);
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
  });
  return {
    text: `INSERT INTO market_candles (pair, timeframe, timestamp, open, high, low, close, volume, is_closed, source, updated_at) VALUES ${placeholders.join(", ")} ON CONFLICT (pair, timeframe, timestamp) DO NOTHING RETURNING pair, timeframe, timestamp`,
    values,
  };
}

export async function seedDevMarket(client) {
  const timeframes = {};
  let inserted = 0;
  for (const timeframe of DEV_SEED_TIMEFRAMES) {
    const statement = insertStatement(buildSeedCandles(timeframe));
    const result = await client.query(statement.text, statement.values);
    const count = result.rowCount ?? result.rows?.length ?? 0;
    timeframes[timeframe] = { requested: DEV_SEED_CANDLE_COUNT, inserted: count, skipped: DEV_SEED_CANDLE_COUNT - count };
    inserted += count;
  }
  return { pair: DEV_SEED_PAIR, source: DEV_SEED_SOURCE, inserted, skipped: DEV_SEED_TIMEFRAMES.length * DEV_SEED_CANDLE_COUNT - inserted, timeframes };
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Development market seed is disabled when NODE_ENV=production.");
  const client = new Client({ connectionString: process.env.DATABASE_URL ?? "postgres://cryptox:cryptox@localhost:5432/cryptox" });
  await client.connect();
  try {
    console.log(JSON.stringify(await seedDevMarket(client)));
  } finally {
    await client.end();
  }
}

const invokedScript = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (invokedScript && import.meta.url === invokedScript) await main();
