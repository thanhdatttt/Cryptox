import type { Strategy, StrategyCategory, StrategyContext, StrategyFactory, StrategyPluginDescriptor, Signal } from "./contracts";
import { bollingerBands, relativeStrengthIndex, simpleMovingAverage, supportResistance } from "./indicators";

const descriptor = (name: string, displayName: string, description: string, category: StrategyCategory, parameters: StrategyPluginDescriptor["parameters"]): StrategyPluginDescriptor => ({ name, displayName, description, category, implementationVersion: "1.0.0", implementationSha256: `builtin:${name}:1.0.0`, parameters });
const lastValues = (context: StrategyContext) => context.candles.map((candle) => candle.close);
const signalFrom = (condition: boolean, inverse: boolean): Signal => condition ? (inverse ? "SELL" : "BUY") : "HOLD";

const ma: StrategyFactory = {
  descriptor: descriptor("MA", "Moving Average", "Trend direction from a fast/slow moving-average crossover.", "TREND", [
    { key: "fastPeriod", label: "Fast period", type: "INTEGER", required: true, defaultValue: 20, minimum: 2, maximum: 500 },
    { key: "slowPeriod", label: "Slow period", type: "INTEGER", required: true, defaultValue: 50, minimum: 3, maximum: 1000 },
  ]),
  create: (parameters) => {
    const fastPeriod = Number(parameters.fastPeriod ?? 20);
    const slowPeriod = Number(parameters.slowPeriod ?? 50);
    const strategy: Strategy = { name: "MA", category: "TREND", analyze: (context) => {
      const values = lastValues(context);
      if (values.length < slowPeriod + 1) return "HOLD";
      const previous = values.slice(0, -1);
      const fast = simpleMovingAverage(values, fastPeriod);
      const slow = simpleMovingAverage(values, slowPeriod);
      const previousFast = simpleMovingAverage(previous, fastPeriod);
      const previousSlow = simpleMovingAverage(previous, slowPeriod);
      if ([fast, slow, previousFast, previousSlow].some((value) => value === undefined)) return "HOLD";
      if (previousFast! <= previousSlow! && fast! > slow!) return "BUY";
      if (previousFast! >= previousSlow! && fast! < slow!) return "SELL";
      return "HOLD";
    }};
    return strategy;
  },
};

const rsi: StrategyFactory = {
  descriptor: descriptor("RSI", "RSI", "Momentum signal for overbought and oversold conditions.", "MOMENTUM", [
    { key: "period", label: "Period", type: "INTEGER", required: true, defaultValue: 14, minimum: 2, maximum: 200 },
    { key: "buyThreshold", label: "Buy threshold", type: "NUMBER", required: true, defaultValue: 30, minimum: 0, maximum: 50 },
    { key: "sellThreshold", label: "Sell threshold", type: "NUMBER", required: true, defaultValue: 70, minimum: 50, maximum: 100 },
  ]),
  create: (parameters) => {
    const period = Number(parameters.period ?? 14);
    const buyThreshold = Number(parameters.buyThreshold ?? 30);
    const sellThreshold = Number(parameters.sellThreshold ?? 70);
    return { name: "RSI", category: "MOMENTUM", analyze: (context) => {
      const value = relativeStrengthIndex(lastValues(context), period);
      if (value === undefined) return "HOLD";
      return value < buyThreshold ? "BUY" : value > sellThreshold ? "SELL" : "HOLD";
    }};
  },
};

const bollinger: StrategyFactory = {
  descriptor: descriptor("BOLLINGER", "Bollinger Bands", "Mean-reversion signal at the outer volatility bands.", "VOLATILITY", [
    { key: "period", label: "Period", type: "INTEGER", required: true, defaultValue: 20, minimum: 2, maximum: 500 },
    { key: "deviations", label: "Standard deviations", type: "NUMBER", required: true, defaultValue: 2, minimum: 0.1, maximum: 5 },
  ]),
  create: (parameters) => {
    const period = Number(parameters.period ?? 20);
    const deviations = Number(parameters.deviations ?? 2);
    return { name: "BOLLINGER", category: "VOLATILITY", analyze: (context) => {
      const bands = bollingerBands(lastValues(context), period, deviations);
      if (!bands) return "HOLD";
      return signalFrom(context.currentPrice < bands.lower, false) === "BUY" ? "BUY" : context.currentPrice > bands.upper ? "SELL" : "HOLD";
    }};
  },
};

const supportResistanceFactory: StrategyFactory = {
  descriptor: descriptor("SUPPORT_RESISTANCE", "Support / Resistance", "Structure signal near recent support and resistance zones.", "STRUCTURE", [
    { key: "lookback", label: "Lookback", type: "INTEGER", required: true, defaultValue: 20, minimum: 2, maximum: 500 },
    { key: "proximityPercent", label: "Proximity %", type: "NUMBER", required: true, defaultValue: 1, minimum: 0.01, maximum: 20 },
  ]),
  create: (parameters) => {
    const lookback = Number(parameters.lookback ?? 20);
    const proximityPercent = Number(parameters.proximityPercent ?? 1) / 100;
    return { name: "SUPPORT_RESISTANCE", category: "STRUCTURE", analyze: (context) => {
      const levels = supportResistance(context.candles, lookback);
      if (!levels) return "HOLD";
      if (context.currentPrice <= levels.support * (1 + proximityPercent)) return "BUY";
      if (context.currentPrice >= levels.resistance * (1 - proximityPercent)) return "SELL";
      return "HOLD";
    }};
  },
};

export const builtInFactories: readonly StrategyFactory[] = [ma, rsi, bollinger, supportResistanceFactory];
