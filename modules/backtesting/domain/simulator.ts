import type { Candle, Pair, Timeframe } from "modules/market-data/api";
import type { Strategy, StrategyCandle, StrategyContext } from "modules/strategy/api";
import type { CompletedBacktestResult, Trade } from "./contracts";

export interface SimulationInput {
  candidateId: string;
  attemptId: string;
  pair: Pair;
  settlementAsset: string;
  timeframe: Timeframe;
  candles: Candle[];
  /** Number of leading sealed candles reserved for indicator warm-up. */
  warmupCandles?: number;
  strategy: Strategy;
  /** Exact sealed as-of lookup supplied by Backtesting's Sentiment boundary. */
  sentimentAt?: (candleCloseTime: string) => StrategyContext["sentiment"];
  initialCapital: number;
  feeRatePercent: number;
  slippageBps?: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
  workerRuntimeVersion: string;
  workerRuntimeSha256: string;
  startedAt: string;
  completedAt: string;
}

type Action = "BUY" | "SELL";
type Decimal = { units: bigint; scale: number };
type Position = {
  signal: "LONG" | "SHORT";
  entryIndex: number;
  marketEntryPrice: Decimal;
  entryPrice: Decimal;
  entryTime: string;
  quantity: Decimal;
  equityBeforeTrade: Decimal;
  stopLoss: Decimal | null;
  takeProfit: Decimal | null;
};

const TIMEFRAME_MS: Record<Timeframe, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
};

const powerOfTen = (exponent: number): bigint => 10n ** BigInt(exponent);

const normalize = (value: Decimal): Decimal => {
  let { units, scale } = value;
  while (scale > 0 && units % 10n === 0n) {
    units /= 10n;
    scale -= 1;
  }
  return { units, scale };
};

const expandScientificNotation = (value: string): string => {
  if (!/[eE]/.test(value)) return value;
  const [coefficient, rawExponent] = value.toLowerCase().split("e");
  const negative = coefficient.startsWith("-");
  const unsigned = negative || coefficient.startsWith("+") ? coefficient.slice(1) : coefficient;
  const [whole, fraction = ""] = unsigned.split(".");
  const rawDigits = `${whole}${fraction}`;
  const leadingZeroCount = rawDigits.length - rawDigits.replace(/^0+/, "").length;
  const digits = rawDigits.replace(/^0+(?=\d)/, "") || "0";
  const decimalIndex = whole.length + Number(rawExponent) - leadingZeroCount;
  const sign = negative ? "-" : "";
  if (decimalIndex <= 0) return `${sign}0.${"0".repeat(-decimalIndex)}${digits}`;
  if (decimalIndex >= digits.length) return `${sign}${digits}${"0".repeat(decimalIndex - digits.length)}`;
  return `${sign}${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
};

const decimal = (value: number): Decimal => {
  if (!Number.isFinite(value)) throw new Error("INVALID_INPUT");
  const text = expandScientificNotation(String(value));
  const negative = text.startsWith("-");
  const unsigned = negative || text.startsWith("+") ? text.slice(1) : text;
  const [whole, fraction = ""] = unsigned.split(".");
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, "") || "0";
  return normalize({ units: BigInt(`${negative ? "-" : ""}${digits}`), scale: fraction.length });
};

const fromInteger = (value: number): Decimal => ({ units: BigInt(value), scale: 0 });
const add = (left: Decimal, right: Decimal): Decimal => {
  const scale = Math.max(left.scale, right.scale);
  return normalize({
    units: left.units * powerOfTen(scale - left.scale) + right.units * powerOfTen(scale - right.scale),
    scale,
  });
};
const subtract = (left: Decimal, right: Decimal): Decimal => add(left, { units: -right.units, scale: right.scale });
const multiply = (left: Decimal, right: Decimal): Decimal => normalize({ units: left.units * right.units, scale: left.scale + right.scale });
const absolute = (value: Decimal): Decimal => value.units < 0n ? { units: -value.units, scale: value.scale } : value;

const roundedDivision = (numerator: bigint, denominator: bigint): bigint => {
  if (denominator === 0n) throw new Error("INVALID_INPUT");
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (absolute({ units: remainder, scale: 0 }).units * 2n < absolute({ units: denominator, scale: 0 }).units) return quotient;
  return quotient + (numerator === 0n || (numerator > 0n) === (denominator > 0n) ? 1n : -1n);
};

const round = (value: Decimal, scale: number): Decimal => {
  if (value.scale <= scale) return { units: value.units * powerOfTen(scale - value.scale), scale };
  return { units: roundedDivision(value.units, powerOfTen(value.scale - scale)), scale };
};

const divide = (left: Decimal, right: Decimal, scale: number): Decimal => {
  const exponent = right.scale + scale - left.scale;
  const numerator = exponent >= 0 ? left.units * powerOfTen(exponent) : left.units;
  const denominator = exponent >= 0 ? right.units : right.units * powerOfTen(-exponent);
  return { units: roundedDivision(numerator, denominator), scale };
};

const asNumber = (value: Decimal): number => Number(value.units) / 10 ** value.scale;
const side = (action: Action): "LONG" | "SHORT" => action === "BUY" ? "LONG" : "SHORT";
const direction = (signal: "LONG" | "SHORT"): Decimal => fromInteger(signal === "LONG" ? 1 : -1);
const toStrategyCandle = (candle: Candle): StrategyCandle => ({ timestamp: candle.timestamp, open: candle.open, high: candle.high, low: candle.low, close: candle.close, volume: candle.volume });

const assertPositivePercent = (value: number | undefined): void => {
  if (value !== undefined && (!Number.isFinite(value) || value <= 0 || value >= 100)) throw new Error("INVALID_INPUT");
};

const candleCloseTime = (timestamp: string, timeframe: Timeframe): string => {
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) throw new Error("INVALID_INPUT");
  return new Date(parsed + TIMEFRAME_MS[timeframe]).toISOString();
};
const assertPositivePrice = (value: Decimal | null): void => {
  if (value !== null && value.units <= 0n) throw new Error("INVALID_INPUT");
};

const validateCandle = (candle: Candle, input: SimulationInput): void => {
  if (candle.pair !== input.pair || candle.timeframe !== input.timeframe || !Number.isFinite(Date.parse(candle.timestamp))) throw new Error("INVALID_INPUT");
  if (![candle.open, candle.high, candle.low, candle.close].every((value) => Number.isFinite(value) && value > 0) || !Number.isFinite(candle.volume) || candle.volume < 0) throw new Error("INVALID_INPUT");
  if (candle.high < Math.max(candle.open, candle.close) || candle.low > Math.min(candle.open, candle.close)) throw new Error("INVALID_INPUT");
};

export function simulateBacktest(input: SimulationInput): CompletedBacktestResult {
  if (!input.settlementAsset.trim() || !Number.isFinite(input.initialCapital) || input.initialCapital <= 0 || !Number.isFinite(input.feeRatePercent) || input.feeRatePercent < 0) throw new Error("INVALID_INPUT");
  assertPositivePercent(input.stopLossPercent);
  assertPositivePercent(input.takeProfitPercent);

  const slippageBps = input.slippageBps ?? 5;
  if (!Number.isFinite(slippageBps) || slippageBps < 0) throw new Error("INVALID_INPUT");
  const warmupCandles = input.warmupCandles ?? 0;
  if (!Number.isInteger(warmupCandles) || warmupCandles < 0) throw new Error("INVALID_INPUT");

  const candles = [...input.candles]
    .filter((candle) => candle.isClosed)
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  candles.forEach((candle, index) => {
    validateCandle(candle, input);
    if (index > 0 && candles[index - 1].timestamp >= candle.timestamp) throw new Error("INVALID_INPUT");
  });
  if (warmupCandles > candles.length) throw new Error("SNAPSHOT_INCOMPLETE");

  const feeRate = divide(decimal(input.feeRatePercent), fromInteger(100), 20);
  const slippageRate = divide(decimal(slippageBps), fromInteger(10_000), 20);
  let equity = round(decimal(input.initialCapital), 2);
  let position: Position | undefined;
  let scheduled: Action | undefined;
  let sequence = 0;
  const trades: Trade[] = [];

  const closePosition = (marketExitPrice: Decimal, exitTime: string, exitReason: Trade["exitReason"]): void => {
    if (!position) return;
    const tradeDirection = direction(position.signal);
    const exitPrice = round(multiply(marketExitPrice, subtract(fromInteger(1), multiply(tradeDirection, slippageRate))), 8);
    const entryNotional = round(multiply(position.entryPrice, position.quantity), 2);
    const exitNotional = round(multiply(exitPrice, position.quantity), 2);
    const grossProfit = round(multiply(tradeDirection, multiply(subtract(marketExitPrice, position.marketEntryPrice), position.quantity)), 2);
    const entrySlippage = round(multiply(absolute(subtract(position.entryPrice, position.marketEntryPrice)), position.quantity), 2);
    const exitSlippage = round(multiply(absolute(subtract(exitPrice, marketExitPrice)), position.quantity), 2);
    const slippageAmount = round(add(entrySlippage, exitSlippage), 2);
    const entryFee = round(multiply(feeRate, entryNotional), 2);
    const exitFee = round(multiply(feeRate, exitNotional), 2);
    const feeAmount = round(add(entryFee, exitFee), 2);
    const profit = round(subtract(subtract(grossProfit, slippageAmount), feeAmount), 2);
    const equityAfterTrade = round(add(position.equityBeforeTrade, profit), 2);
    const resultPercent = divide(multiply(profit, fromInteger(100)), position.equityBeforeTrade, 8);

    equity = equityAfterTrade;
    sequence += 1;
    trades.push({
      id: `${input.attemptId}-trade-${sequence}`,
      sequence,
      pair: input.pair,
      settlementAsset: input.settlementAsset,
      backtestAttemptId: input.attemptId,
      signal: position.signal,
      entryTime: position.entryTime,
      marketEntryPrice: asNumber(position.marketEntryPrice),
      entryPrice: asNumber(position.entryPrice),
      stopLoss: position.stopLoss === null ? null : asNumber(position.stopLoss),
      takeProfit: position.takeProfit === null ? null : asNumber(position.takeProfit),
      exitTime,
      marketExitPrice: asNumber(marketExitPrice),
      exitPrice: asNumber(exitPrice),
      exitReason,
      quantity: asNumber(position.quantity),
      notionalEntryValue: asNumber(entryNotional),
      equityBeforeTrade: asNumber(position.equityBeforeTrade),
      equityAfterTrade: asNumber(equityAfterTrade),
      grossProfit: asNumber(grossProfit),
      feeAmount: asNumber(feeAmount),
      slippageBps,
      slippageAmount: asNumber(slippageAmount),
      profit: asNumber(profit),
      resultPercent: asNumber(resultPercent),
      result: profit.units > 0n ? "WIN" : profit.units < 0n ? "LOSS" : "BREAKEVEN",
    });
    position = undefined;
  };

  const openPosition = (action: Action, candle: Candle, index: number): void => {
    const signal = side(action);
    const tradeDirection = direction(signal);
    const marketEntryPrice = round(decimal(candle.open), 8);
    const entryPrice = round(multiply(marketEntryPrice, add(fromInteger(1), multiply(tradeDirection, slippageRate))), 8);
    const quantity = divide(equity, multiply(entryPrice, add(fromInteger(1), feeRate)), 8);
    if (quantity.units <= 0n) return;
    const stopLoss = input.stopLossPercent === undefined ? null : round(multiply(marketEntryPrice, subtract(fromInteger(1), multiply(tradeDirection, divide(decimal(input.stopLossPercent), fromInteger(100), 20)))), 8);
    const takeProfit = input.takeProfitPercent === undefined ? null : round(multiply(marketEntryPrice, add(fromInteger(1), multiply(tradeDirection, divide(decimal(input.takeProfitPercent), fromInteger(100), 20)))), 8);
    assertPositivePrice(stopLoss);
    assertPositivePrice(takeProfit);
    position = { signal, entryIndex: index, marketEntryPrice, entryPrice, entryTime: candle.timestamp, quantity, equityBeforeTrade: equity, stopLoss, takeProfit };
  };

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    if (scheduled && index >= warmupCandles) {
      const desired = side(scheduled);
      if (position && position.signal !== desired) closePosition(round(decimal(candle.open), 8), candle.timestamp, "STRATEGY_CLOSE");
      if (!position && index < candles.length - 1) openPosition(scheduled, candle, index);
      scheduled = undefined;
    }

    if (position && position.entryIndex < index) {
      const marketOpen = round(decimal(candle.open), 8);
      const marketHigh = round(decimal(candle.high), 8);
      const marketLow = round(decimal(candle.low), 8);
      const stopTriggered = position.signal === "LONG" ? position.stopLoss !== null && marketLow.units <= position.stopLoss.units : position.stopLoss !== null && marketHigh.units >= position.stopLoss.units;
      const takeTriggered = position.signal === "LONG" ? position.takeProfit !== null && marketHigh.units >= position.takeProfit.units : position.takeProfit !== null && marketLow.units <= position.takeProfit.units;
      if (stopTriggered) {
        const gap = position.signal === "LONG" ? marketOpen.units <= position.stopLoss!.units : marketOpen.units >= position.stopLoss!.units;
        closePosition(gap ? marketOpen : position.stopLoss!, candle.timestamp, "STOP_LOSS");
      } else if (takeTriggered) {
        const gap = position.signal === "LONG" ? marketOpen.units >= position.takeProfit!.units : marketOpen.units <= position.takeProfit!.units;
        closePosition(gap ? marketOpen : position.takeProfit!, candle.timestamp, "TAKE_PROFIT");
      }
    }

    if (index < warmupCandles || index === candles.length - 1) continue;
    const sentiment = input.sentimentAt?.(candleCloseTime(candle.timestamp, input.timeframe));
    const context: StrategyContext = {
      pair: input.pair,
      timeframe: input.timeframe,
      candles: candles.slice(0, index + 1).map(toStrategyCandle),
      currentPrice: candle.close,
      indicators: {},
      ...(sentiment ? { sentiment } : {}),
    };
    const signal = input.strategy.analyze(context);
    if (signal === "HOLD") continue;
    if (signal !== "BUY" && signal !== "SELL") throw new Error("INVALID_SIGNAL");
    if (!position || position.signal !== side(signal)) scheduled = signal;
  }

  if (position && candles.length > 0) {
    const finalCandle = candles[candles.length - 1];
    closePosition(round(decimal(finalCandle.close), 8), new Date(Date.parse(finalCandle.timestamp) + TIMEFRAME_MS[input.timeframe]).toISOString(), "RANGE_END");
  }

  return {
    status: "COMPLETED",
    candidateId: input.candidateId,
    attemptId: input.attemptId,
    workerRuntimeVersion: input.workerRuntimeVersion,
    workerRuntimeSha256: input.workerRuntimeSha256,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    initialCapital: input.initialCapital,
    trades,
  };
}
