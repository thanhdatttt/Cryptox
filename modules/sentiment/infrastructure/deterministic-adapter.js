"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCAL_SENTIMENT_MODEL_SHA256 = exports.LOCAL_SENTIMENT_MODEL_VERSION = exports.LOCAL_SENTIMENT_MODEL_NAME = void 0;
exports.createDeterministicSentimentAdapter = createDeterministicSentimentAdapter;
const node_crypto_1 = require("node:crypto");
const positive = ["adoption", "approval", "bullish", "confidence", "gain", "growth", "inflow", "positive", "rally", "support", "upgrade"];
const negative = ["bearish", "crash", "exploit", "hack", "loss", "negative", "outflow", "risk", "sell", "shutdown"];
exports.LOCAL_SENTIMENT_MODEL_NAME = "LOCAL_LEXICON";
exports.LOCAL_SENTIMENT_MODEL_VERSION = "1.0.0";
exports.LOCAL_SENTIMENT_MODEL_SHA256 = (0, node_crypto_1.createHash)("sha256").update(JSON.stringify({ positive, negative }), "utf8").digest("hex");
const label = (score) => score >= 0.15 ? "POSITIVE" : score <= -0.15 ? "NEGATIVE" : "NEUTRAL";
const words = (input) => input.toLowerCase().match(/[a-z0-9]+/g) ?? [];
function createDeterministicSentimentAdapter(clock = { now: () => new Date().toISOString() }) {
    return {
        async analyze(input) {
            const tokens = words(`${input.title} ${input.content}`);
            const gains = tokens.filter((token) => positive.includes(token)).length;
            const losses = tokens.filter((token) => negative.includes(token)).length;
            const score = Number(Math.max(-1, Math.min(1, (gains - losses) / Math.max(1, gains + losses))).toFixed(12));
            return { newsId: input.newsId, label: label(score), score, modelName: exports.LOCAL_SENTIMENT_MODEL_NAME, modelVersion: exports.LOCAL_SENTIMENT_MODEL_VERSION, analyzedAt: clock.now() };
        },
    };
}
