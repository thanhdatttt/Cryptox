import { describe, expect, it } from "vitest";
import type { EvaluationInput, EvaluationMetrics, Evaluator } from "./contracts";

describe("evaluation public contracts", () => {
  it("accepts a neutral metric input independent of Backtesting", () => {
    const input: EvaluationInput = {
      candidateId: "candidate-1",
      initialCapital: 100,
      endingCapital: 100,
      trades: [],
      equityCurve: [],
    };
    const expected: EvaluationMetrics = {
      candidateId: "candidate-1",
      totalReturnPercent: 0,
      winRatePercent: 0,
      numberOfTrades: 0,
      maxDrawdownPercent: 0,
      profitFactor: null,
      profitFactorStatus: "NO_TRADES",
      sharpeRatio: null,
      sharpeRatioStatus: "INSUFFICIENT_OBSERVATIONS",
      evaluationVersion: "test",
    };
    const evaluator: Evaluator = { evaluate: () => expected };

    expect(evaluator.evaluate(input)).toEqual(expected);
  });
});
