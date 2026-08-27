import { describe, expect, it } from "vitest";
import { CANDIDATE_STATUSES, type Trade } from "./contracts";

describe("backtesting public contracts", () => {
  it("uses mechanism-neutral Candidate states and an MVP Trade shape", () => {
    const trade: Trade = {
      id: "trade-1",
      experimentId: "experiment-1",
      sequence: 1,
      pair: "BTCUSDT",
      entryTime: "2026-08-27T00:00:00.000Z",
      entryPrice: 100,
      exitTime: "2026-08-27T01:00:00.000Z",
      exitPrice: 110,
      exitReason: "STRATEGY_EXIT",
      quantity: 1,
      notionalEntryValue: 100,
      grossProfit: 10,
      feeAmount: 0.2,
      slippageBps: 5,
      slippageAmount: 0.05,
      profit: 9.75,
      resultPercent: 9.75,
      result: "WIN",
    };

    expect(CANDIDATE_STATUSES).toEqual([
      "ACCEPTED",
      "RUNNING",
      "SUCCEEDED",
      "FAILED",
      "CANCELLED",
    ]);
    expect(trade).not.toHaveProperty("stopLoss");
    expect(trade).not.toHaveProperty("takeProfit");
    expect(trade).not.toHaveProperty("signal");
  });
});
