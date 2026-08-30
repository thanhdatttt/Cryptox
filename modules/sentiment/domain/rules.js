"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sentimentLabelFor = exports.sentimentSnapshotSerialization = exports.validateSnapshotPoint = exports.validateSnapshotCommand = exports.validateSentimentResult = exports.validateSentimentInput = void 0;
const errors_1 = require("./errors");
const labels = ["POSITIVE", "NEUTRAL", "NEGATIVE"];
const sha256 = /^[a-f0-9]{64}$/i;
const canonicalTimestamp = (value) => {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) && value.endsWith("Z") && new Date(parsed).toISOString() === value;
};
const requiredText = (value) => typeof value === "string" && value.trim().length > 0;
const validateSentimentInput = (input) => {
    if (!input || ![input.newsId, input.title, input.content, input.source].every(requiredText)) {
        throw new errors_1.SentimentException("INVALID_INPUT", "Sentiment input must contain News provenance and content.");
    }
    if (!canonicalTimestamp(input.publishedAt) || !Array.isArray(input.relatedCoins) || input.relatedCoins.some((coin) => !requiredText(coin))) {
        throw new errors_1.SentimentException("INVALID_INPUT", "Sentiment input timestamps and related coins must be normalized.");
    }
    return { ...input, relatedCoins: [...input.relatedCoins] };
};
exports.validateSentimentInput = validateSentimentInput;
const validateSentimentResult = (result, input) => {
    if (!result || !requiredText(result.newsId) || !labels.includes(result.label) || !Number.isFinite(result.score) || result.score < -1 || result.score > 1) {
        throw new errors_1.SentimentException("INVALID_RESULT", "Sentiment result label and score are invalid.");
    }
    if (![result.modelName, result.modelVersion].every(requiredText) || !canonicalTimestamp(result.analyzedAt)) {
        throw new errors_1.SentimentException("INVALID_RESULT", "Sentiment result provenance is invalid.");
    }
    if (input && result.newsId !== input.newsId)
        throw new errors_1.SentimentException("INVALID_RESULT", "Sentiment result must belong to the analyzed News item.");
    return { ...result };
};
exports.validateSentimentResult = validateSentimentResult;
const validateSnapshotCommand = (command) => {
    if (!command || !requiredText(command.relatedCoin) || command.relatedCoin !== command.relatedCoin.toUpperCase() || /(?:USDT|USDC|BUSD|FDUSD|USD)$/.test(command.relatedCoin) || !/^[A-Z0-9]{2,12}$/.test(command.relatedCoin)) {
        throw new errors_1.SentimentException("INVALID_SNAPSHOT", "Snapshot relatedCoin must be a canonical base asset.");
    }
    if (!canonicalTimestamp(command.range.from) || !canonicalTimestamp(command.range.to) || Date.parse(command.range.to) <= Date.parse(command.range.from)) {
        throw new errors_1.SentimentException("INVALID_SNAPSHOT", "Snapshot range must be a valid half-open interval.");
    }
    if (!Number.isInteger(command.aggregationWindowSeconds) || command.aggregationWindowSeconds <= 0 || ![command.modelName, command.modelVersion].every(requiredText) || !sha256.test(command.modelSha256)) {
        throw new errors_1.SentimentException("INVALID_SNAPSHOT", "Snapshot aggregation or model provenance is invalid.");
    }
    return { ...command, range: { ...command.range }, modelSha256: command.modelSha256.toLowerCase() };
};
exports.validateSnapshotCommand = validateSnapshotCommand;
const validateSnapshotPoint = (point) => {
    if (!point || !canonicalTimestamp(point.timestamp) || !labels.includes(point.label) || !Number.isFinite(point.averageScore) || point.averageScore < -1 || point.averageScore > 1) {
        throw new errors_1.SentimentException("INVALID_SNAPSHOT", "Snapshot point is invalid.");
    }
    return { ...point };
};
exports.validateSnapshotPoint = validateSnapshotPoint;
const sentimentSnapshotSerialization = (command, points) => JSON.stringify({
    relatedCoin: command.relatedCoin,
    range: command.range,
    aggregationWindowSeconds: command.aggregationWindowSeconds,
    modelName: command.modelName,
    modelVersion: command.modelVersion,
    modelSha256: command.modelSha256,
    points: points.map((point) => [point.timestamp, point.label, point.averageScore]),
});
exports.sentimentSnapshotSerialization = sentimentSnapshotSerialization;
const sentimentLabelFor = (score) => score > 0 ? "POSITIVE" : score < 0 ? "NEGATIVE" : "NEUTRAL";
exports.sentimentLabelFor = sentimentLabelFor;
