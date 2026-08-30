"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStrategyRegistry = exports.InMemoryStrategyRegistry = exports.builtInFactories = void 0;
const node_crypto_1 = require("node:crypto");
const indicators_1 = require("./indicators");
const descriptor = (name, displayName, description, category, minimumHistoryCandles, parameters, requiresSentiment = false) => {
    if (!Number.isInteger(minimumHistoryCandles) || minimumHistoryCandles < 0)
        throw new Error("INVALID_STRATEGY_DESCRIPTOR");
    return Object.freeze({
        name,
        displayName,
        description,
        category,
        implementationVersion: "1.0.0",
        minimumHistoryCandles,
        parameters: Object.freeze(parameters.map((parameter) => Object.freeze({ ...parameter }))),
        ...(requiresSentiment ? { requiresSentiment: true } : {}),
    });
};
const withArtifactHash = (factory) => {
    const implementationSha256 = (0, node_crypto_1.createHash)("sha256")
        .update(JSON.stringify({ descriptor: factory.descriptor, implementation: factory.create.toString() }), "utf8")
        .digest("hex");
    return Object.freeze({ ...factory, descriptor: Object.freeze({ ...factory.descriptor, implementationSha256 }) });
};
const lastValues = (context) => context.candles.map((candle) => candle.close);
const signalFrom = (condition, inverse) => condition ? (inverse ? "SELL" : "BUY") : "HOLD";
const latest = (context) => {
    const candle = context.candles.at(-1);
    return candle && typeof candle.timestamp === "string" ? { time: candle.timestamp, closes: lastValues(context) } : undefined;
};
const linePoints = (contexts, period) => contexts.flatMap((context) => {
    const point = latest(context);
    const value = point ? (0, indicators_1.simpleMovingAverage)(point.closes, period) : undefined;
    return value !== undefined && Number.isFinite(value) ? [{ time: point.time, value }] : [];
});
const signalPoint = (context, value, signal) => {
    const point = latest(context);
    return point && Number.isFinite(value) ? [{ time: point.time, value, signal }] : [];
};
const nonEmpty = (overlays) => overlays.filter((overlay) => overlay.points.length > 0);
const ma = {
    descriptor: descriptor("MA", "Moving Average", "Trend direction from a fast/slow moving-average crossover.", "TREND", 51, [
        { key: "fastPeriod", label: "Fast period", type: "INTEGER", required: true, defaultValue: 20, minimum: 2, maximum: 500 },
        { key: "slowPeriod", label: "Slow period", type: "INTEGER", required: true, defaultValue: 50, minimum: 3, maximum: 1000 },
    ]),
    create: (parameters) => {
        const fastPeriod = Number(parameters.fastPeriod ?? 20);
        const slowPeriod = Number(parameters.slowPeriod ?? 50);
        const strategy = { name: "MA", category: "TREND", analyze: (context) => {
                const values = lastValues(context);
                if (values.length < slowPeriod + 1)
                    return "HOLD";
                const previous = values.slice(0, -1);
                const fast = (0, indicators_1.simpleMovingAverage)(values, fastPeriod);
                const slow = (0, indicators_1.simpleMovingAverage)(values, slowPeriod);
                const previousFast = (0, indicators_1.simpleMovingAverage)(previous, fastPeriod);
                const previousSlow = (0, indicators_1.simpleMovingAverage)(previous, slowPeriod);
                if ([fast, slow, previousFast, previousSlow].some((value) => value === undefined))
                    return "HOLD";
                if (previousFast <= previousSlow && fast > slow)
                    return "BUY";
                if (previousFast >= previousSlow && fast < slow)
                    return "SELL";
                return "HOLD";
            },
            buildVisualization: (contexts) => nonEmpty([
                { id: "fast", kind: "LINE", label: `MA (${fastPeriod})`, points: linePoints(contexts, fastPeriod) },
                { id: "slow", kind: "LINE", label: `MA (${slowPeriod})`, points: linePoints(contexts, slowPeriod) },
            ]), };
        return strategy;
    },
    validateParameters: (parameters) => {
        if (Number(parameters.fastPeriod) >= Number(parameters.slowPeriod))
            throw new Error("INVALID_STRATEGY_PARAMETERS");
    },
};
const rsi = {
    descriptor: descriptor("RSI", "RSI", "Momentum signal for overbought and oversold conditions.", "MOMENTUM", 15, [
        { key: "period", label: "Period", type: "INTEGER", required: true, defaultValue: 14, minimum: 2, maximum: 200 },
        { key: "buyThreshold", label: "Buy threshold", type: "NUMBER", required: true, defaultValue: 30, minimum: 0, maximum: 50 },
        { key: "sellThreshold", label: "Sell threshold", type: "NUMBER", required: true, defaultValue: 70, minimum: 50, maximum: 100 },
    ]),
    create: (parameters) => {
        const period = Number(parameters.period ?? 14);
        const buyThreshold = Number(parameters.buyThreshold ?? 30);
        const sellThreshold = Number(parameters.sellThreshold ?? 70);
        return { name: "RSI", category: "MOMENTUM", analyze: (context) => {
                const value = (0, indicators_1.relativeStrengthIndex)(lastValues(context), period);
                if (value === undefined)
                    return "HOLD";
                return value < buyThreshold ? "BUY" : value > sellThreshold ? "SELL" : "HOLD";
            }, buildVisualization: (contexts) => nonEmpty([{
                    id: "rsi",
                    kind: "SIGNAL",
                    label: `RSI (${period})`,
                    points: contexts.flatMap((context) => {
                        const value = (0, indicators_1.relativeStrengthIndex)(lastValues(context), period);
                        return value === undefined ? [] : signalPoint(context, value, value < buyThreshold ? "BUY" : value > sellThreshold ? "SELL" : "HOLD");
                    }),
                }]) };
    },
    validateParameters: (parameters) => {
        if (Number(parameters.buyThreshold) >= Number(parameters.sellThreshold))
            throw new Error("INVALID_STRATEGY_PARAMETERS");
    },
};
const bollinger = {
    descriptor: descriptor("BOLLINGER", "Bollinger Bands", "Mean-reversion signal at the outer volatility bands.", "VOLATILITY", 20, [
        { key: "period", label: "Period", type: "INTEGER", required: true, defaultValue: 20, minimum: 2, maximum: 500 },
        { key: "deviations", label: "Standard deviations", type: "NUMBER", required: true, defaultValue: 2, minimum: 0.1, maximum: 5 },
    ]),
    create: (parameters) => {
        const period = Number(parameters.period ?? 20);
        const deviations = Number(parameters.deviations ?? 2);
        return { name: "BOLLINGER", category: "VOLATILITY", analyze: (context) => {
                const bands = (0, indicators_1.bollingerBands)(lastValues(context), period, deviations);
                if (!bands)
                    return "HOLD";
                return signalFrom(context.currentPrice < bands.lower, false) === "BUY" ? "BUY" : context.currentPrice > bands.upper ? "SELL" : "HOLD";
            }, buildVisualization: (contexts) => nonEmpty([
                { id: "middle", kind: "LINE", label: `Bollinger middle (${period})`, points: contexts.flatMap((context) => { const point = latest(context); const bands = (0, indicators_1.bollingerBands)(point?.closes ?? [], period, deviations); return point && bands && Number.isFinite(bands.middle) ? [{ time: point.time, value: bands.middle }] : []; }) },
                { id: "upper", kind: "LINE", label: `Bollinger upper (${period})`, points: contexts.flatMap((context) => { const point = latest(context); const bands = (0, indicators_1.bollingerBands)(point?.closes ?? [], period, deviations); return point && bands && Number.isFinite(bands.upper) ? [{ time: point.time, value: bands.upper }] : []; }) },
                { id: "lower", kind: "LINE", label: `Bollinger lower (${period})`, points: contexts.flatMap((context) => { const point = latest(context); const bands = (0, indicators_1.bollingerBands)(point?.closes ?? [], period, deviations); return point && bands && Number.isFinite(bands.lower) ? [{ time: point.time, value: bands.lower }] : []; }) },
            ]),
        };
    },
};
const supportResistanceFactory = {
    descriptor: descriptor("SUPPORT_RESISTANCE", "Support / Resistance", "Structure signal near recent support and resistance zones.", "STRUCTURE", 20, [
        { key: "lookback", label: "Lookback", type: "INTEGER", required: true, defaultValue: 20, minimum: 2, maximum: 500 },
        { key: "proximityPercent", label: "Proximity %", type: "NUMBER", required: true, defaultValue: 1, minimum: 0.01, maximum: 20 },
    ]),
    create: (parameters) => {
        const lookback = Number(parameters.lookback ?? 20);
        const proximityPercent = Number(parameters.proximityPercent ?? 1) / 100;
        return { name: "SUPPORT_RESISTANCE", category: "STRUCTURE", analyze: (context) => {
                const levels = (0, indicators_1.supportResistance)(context.candles, lookback);
                if (!levels)
                    return "HOLD";
                if (context.currentPrice <= levels.support * (1 + proximityPercent))
                    return "BUY";
                if (context.currentPrice >= levels.resistance * (1 - proximityPercent))
                    return "SELL";
                return "HOLD";
            }, buildVisualization: (contexts) => nonEmpty([
                { id: "support", kind: "ZONE", label: "Support", points: contexts.flatMap((context) => { const point = latest(context); const levels = (0, indicators_1.supportResistance)(context.candles, lookback); return point && levels && Number.isFinite(levels.support) ? [{ time: point.time, low: levels.support, high: levels.support }] : []; }) },
                { id: "resistance", kind: "ZONE", label: "Resistance", points: contexts.flatMap((context) => { const point = latest(context); const levels = (0, indicators_1.supportResistance)(context.candles, lookback); return point && levels && Number.isFinite(levels.resistance) ? [{ time: point.time, low: levels.resistance, high: levels.resistance }] : []; }) },
            ]),
        };
    },
};
const sentimentFactory = {
    descriptor: descriptor("SENTIMENT", "News sentiment", "Reads the sealed sentiment context and emits a directional signal.", "INFORMATION", 0, [
        { key: "buyThreshold", label: "Buy threshold", type: "NUMBER", required: true, defaultValue: 0.2, minimum: 0.01, maximum: 1 },
        { key: "sellThreshold", label: "Sell threshold", type: "NUMBER", required: true, defaultValue: -0.2, minimum: -1, maximum: -0.01 },
    ], true),
    create: (parameters) => {
        const buyThreshold = Number(parameters.buyThreshold ?? 0.2);
        const sellThreshold = Number(parameters.sellThreshold ?? -0.2);
        return { name: "SENTIMENT", category: "INFORMATION", analyze: (context) => !context.sentiment ? "HOLD" : context.sentiment.averageScore >= buyThreshold ? "BUY" : context.sentiment.averageScore <= sellThreshold ? "SELL" : "HOLD",
            buildVisualization: (contexts) => nonEmpty([{ id: "sentiment", kind: "SIGNAL", label: "News sentiment", points: contexts.flatMap((context) => context.sentiment ? signalPoint(context, context.sentiment.averageScore, context.sentiment.averageScore >= buyThreshold ? "BUY" : context.sentiment.averageScore <= sellThreshold ? "SELL" : "HOLD") : []) }]),
        };
    },
    validateParameters: (parameters) => { if (Number(parameters.buyThreshold) <= Number(parameters.sellThreshold))
        throw new Error("INVALID_STRATEGY_PARAMETERS"); },
};
exports.builtInFactories = [ma, rsi, bollinger, supportResistanceFactory, sentimentFactory].map(withArtifactHash);
class InMemoryStrategyRegistry {
    factories = new Map();
    constructor(factories = []) { factories.forEach((factory) => this.register(factory)); }
    register(factory) {
        const key = `${factory.descriptor.name}:${factory.descriptor.implementationSha256}`;
        if (!this.factories.has(key))
            this.factories.set(key, factory);
    }
    get(name, implementationSha256) { return this.factories.get(`${name}:${implementationSha256}`); }
    list() { return [...this.factories.values()].map((factory) => factory.descriptor).sort((left, right) => left.name.localeCompare(right.name)); }
}
exports.InMemoryStrategyRegistry = InMemoryStrategyRegistry;
const createStrategyRegistry = (factories = exports.builtInFactories) => new InMemoryStrategyRegistry(factories);
exports.createStrategyRegistry = createStrategyRegistry;
