"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleMovingAverage = simpleMovingAverage;
exports.relativeStrengthIndex = relativeStrengthIndex;
exports.bollingerBands = bollingerBands;
exports.supportResistance = supportResistance;
function simpleMovingAverage(values, period) {
    if (!Number.isInteger(period) || period <= 0 || values.length < period)
        return undefined;
    const window = values.slice(-period);
    return window.reduce((sum, value) => sum + value, 0) / period;
}
function relativeStrengthIndex(values, period) {
    if (!Number.isInteger(period) || period <= 0 || values.length <= period)
        return undefined;
    let gains = 0;
    let losses = 0;
    for (let index = values.length - period; index < values.length; index += 1) {
        const change = values[index] - values[index - 1];
        if (change >= 0)
            gains += change;
        else
            losses -= change;
    }
    if (losses === 0)
        return gains === 0 ? 50 : 100;
    return 100 - 100 / (1 + gains / losses);
}
function bollingerBands(values, period, deviations) {
    const middle = simpleMovingAverage(values, period);
    if (middle === undefined)
        return undefined;
    const window = values.slice(-period);
    const variance = window.reduce((sum, value) => sum + (value - middle) ** 2, 0) / period;
    const spread = Math.sqrt(variance) * deviations;
    return { middle, upper: middle + spread, lower: middle - spread };
}
function supportResistance(candles, lookback) {
    if (!Number.isInteger(lookback) || lookback <= 0 || candles.length < lookback)
        return undefined;
    const window = candles.slice(-lookback);
    return {
        support: Math.min(...window.map((candle) => candle.low)),
        resistance: Math.max(...window.map((candle) => candle.high)),
    };
}
