import { describe, expect, it } from "vitest";
import type { SentimentInput } from "../domain/contracts";
import type { SentimentProvider } from "./ports";

const input: SentimentInput = {
  newsId: "news-1",
  title: "Bitcoin update",
  content: "A normalized news item",
  source: "provider-a",
  publishedAt: "2026-01-01T00:00:00Z",
  relatedCoins: ["BTC"],
};

function fakeProvider(id: string, modelVersion: string): SentimentProvider {
  return {
    id,
    analyze: async () => ({
      label: "NEUTRAL",
      score: 0,
      modelName: "fake-model",
      modelVersion,
    }),
  };
}

describe("SentimentProvider", () => {
  it("allows model providers to be substituted behind one neutral result", async () => {
    const first = await fakeProvider("provider-a", "1").analyze(input);
    const second = await fakeProvider("provider-b", "2").analyze(input);

    expect(first).toMatchObject({ label: "NEUTRAL", modelVersion: "1" });
    expect(second).toMatchObject({ label: "NEUTRAL", modelVersion: "2" });
  });
});
