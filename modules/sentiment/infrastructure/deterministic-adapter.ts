import { createHash } from "node:crypto";
import type { SentimentAnalysisService } from "../application/ports";
import type { SentimentInput, SentimentLabel, SentimentResult } from "../domain/contracts";

const positive = ["adoption", "approval", "bullish", "confidence", "gain", "growth", "inflow", "positive", "rally", "support", "upgrade"];
const negative = ["bearish", "crash", "exploit", "hack", "loss", "negative", "outflow", "risk", "sell", "shutdown"];
export const LOCAL_SENTIMENT_MODEL_NAME = "LOCAL_LEXICON";
export const LOCAL_SENTIMENT_MODEL_VERSION = "1.0.0";
export const LOCAL_SENTIMENT_MODEL_SHA256 = createHash("sha256").update(JSON.stringify({ positive, negative }), "utf8").digest("hex");

const label = (score: number): SentimentLabel => score >= 0.15 ? "POSITIVE" : score <= -0.15 ? "NEGATIVE" : "NEUTRAL";
const words = (input: string): string[] => input.toLowerCase().match(/[a-z0-9]+/g) ?? [];

export function createDeterministicSentimentAdapter(clock: { now(): string } = { now: () => new Date().toISOString() }): SentimentAnalysisService {
  return {
    async analyze(input: SentimentInput): Promise<SentimentResult> {
      const tokens = words(`${input.title} ${input.content}`);
      const gains = tokens.filter((token) => positive.includes(token)).length;
      const losses = tokens.filter((token) => negative.includes(token)).length;
      const score = Number(Math.max(-1, Math.min(1, (gains - losses) / Math.max(1, gains + losses))).toFixed(12));
      return { newsId: input.newsId, label: label(score), score, modelName: LOCAL_SENTIMENT_MODEL_NAME, modelVersion: LOCAL_SENTIMENT_MODEL_VERSION, analyzedAt: clock.now() };
    },
  };
}
