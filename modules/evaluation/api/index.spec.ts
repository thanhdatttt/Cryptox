import { describe, expect, it } from "vitest";
import { createEvaluationModule } from "./bootstrap";
import type { CompletedBacktestResult, Trade } from "modules/backtesting/api";
const trade = (resultPercent: number): Trade => ({ id: `t-${resultPercent}`, sequence: 1, pair: "BTCUSDT", settlementAsset: "USDT", backtestAttemptId: "a", signal: "LONG", entryTime: "2025-01-01T00:00:00.000Z", marketEntryPrice: 100, entryPrice: 100, stopLoss: null, takeProfit: null, exitTime: "2025-01-01T01:00:00.000Z", marketExitPrice: 100, exitPrice: 100, exitReason: "STRATEGY_CLOSE", quantity: 1, notionalEntryValue: 100, equityBeforeTrade: 1000, equityAfterTrade: 1000 + resultPercent, grossProfit: resultPercent, feeAmount: 0, slippageBps: 5, slippageAmount: 0, profit: resultPercent, resultPercent, result: resultPercent > 0 ? "WIN" : resultPercent < 0 ? "LOSS" : "BREAKEVEN" });
describe("evaluation runtime", () => {
  it("computes compounded return, win rate, drawdown, factor, and Sharpe", () => {
    const result: CompletedBacktestResult = { status: "COMPLETED", candidateId: "candidate", attemptId: "attempt", workerRuntimeVersion: "1", workerRuntimeSha256: "a".repeat(64), startedAt: "2025-01-01T00:00:00.000Z", completedAt: "2025-01-01T02:00:00.000Z", trades: [trade(10), trade(-5), trade(0)] };
    const metrics = createEvaluationModule().evaluator.evaluate(result);
    expect(metrics.totalReturnPercent).toBeCloseTo(4.5);
    expect(metrics.winRatePercent).toBeCloseTo(33.333333);
    expect(metrics.maxDrawdownPercent).toBeCloseTo(5);
    expect(metrics.profitFactor).toBe(2);
    expect(metrics.sharpeRatioStatus).toBe("FINITE");
    expect(metrics.evaluationPolicyId).toBe("MVP_EVALUATION_V1");
  });
  it("keeps zero-trade metrics finite and rejects non-completed results", () => {
    const empty: CompletedBacktestResult = { status: "COMPLETED", candidateId: "candidate", attemptId: "attempt", workerRuntimeVersion: "1", workerRuntimeSha256: "a".repeat(64), startedAt: "now", completedAt: "now", trades: [] };
    expect(createEvaluationModule().evaluator.evaluate(empty)).toMatchObject({ totalReturnPercent: 0, winRatePercent: 0, maxDrawdownPercent: 0, profitFactor: null, profitFactorStatus: "NO_TRADES", sharpeRatio: 0, sharpeRatioStatus: "INSUFFICIENT_OBSERVATIONS" });
    expect(() => createEvaluationModule().evaluator.evaluate({ ...empty, status: "FAILED" } as never)).toThrow("INVALID_INPUT");
  });
});
