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

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function seedFor(timeframe) {
  return [...timeframe].reduce((seed, character) => Math.imul(seed ^ character.charCodeAt(0), 16_777_619), 2_166_136_261);
}

const signedNoise = (random) => random() + random() + random() - 1.5;

export function buildSeedCandles(timeframe, count = DEV_SEED_CANDLE_COUNT) {
  const interval = intervals[timeframe];
  const scale = volatility[timeframe];
  const volumeBase = baseVolumes[timeframe];
  if (!interval || !scale || !volumeBase) throw new Error(`Unsupported development seed timeframe: ${timeframe}`);

  const end = Date.parse(DEV_SEED_END);
  const random = createRandom(seedFor(timeframe));
  let previousClose = basePrice;
  let regime = { trend: 0, volatility: 0.65, remaining: 0 };
  return Array.from({ length: count }, (_, index) => {
    if (regime.remaining <= 0) {
      const trendRoll = random();
      regime = {
        trend: trendRoll < 0.34 ? -1 : trendRoll > 0.66 ? 1 : 0,
        volatility: 0.45 + random() * 1.25,
        remaining: 28 + Math.floor(random() * 125),
      };
    }
    regime.remaining -= 1;

    const gap = index === 0 ? -0.08 * scale : signedNoise(random) * scale * 0.055 * regime.volatility;
    const open = round(previousClose + gap);
    const impulse = random() < 0.018;
    const impulseDirection = random() < 0.5 ? -1 : 1;
    const returnSize = scale * regime.volatility * (0.28 + random() * 0.52);
    const drift = regime.trend * scale * (regime.volatility < 0.7 ? 0.015 : 0.075);
    const impulseMove = impulse ? impulseDirection * scale * (1.8 + random() * 2.2) : 0;
    const close = round(Math.max(scale, open + drift + signedNoise(random) * returnSize + impulseMove));
    const wickEvent = random() < 0.045;
    const wickScale = scale * regime.volatility * (wickEvent ? 0.9 + random() * 1.6 : 0.18 + random() * 0.34);
    const high = round(Math.max(open, close) + wickScale * (0.7 + random() * 0.55));
    const low = round(Math.max(scale, Math.min(open, close) - wickScale * (0.7 + random() * 0.55)));
    const volumeMultiplier = impulse ? 2.2 + random() * 1.8 : regime.trend === 0 ? 0.65 + random() * 0.65 : 0.9 + random() * 0.9;
    const volume = round(volumeBase * volumeMultiplier * (0.85 + random() * 0.3));
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
  if (process.env.MARKET_DATA_SEED_MODE !== "DEMO") throw new Error("Development market seed requires MARKET_DATA_SEED_MODE=DEMO.");
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
