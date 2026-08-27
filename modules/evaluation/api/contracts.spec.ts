import { describe, expect, it } from "vitest";
import {
  REQUIRED_METRICS_V1,
  type EvaluationInput,
  type EvaluationMetrics,
  type Evaluator,
} from "./contracts";

describe("evaluation public contracts", () => {
  it("freezes exactly the four required finite metrics and magnitude convention", () => {
    expect(REQUIRED_METRICS_V1).toMatchObject({
      id: "REQUIRED_METRICS_V1",
      zeroTradesWinRatePercent: 0,
      flatEquityDrawdownMagnitudePercent: 0,
      finiteOutputsRequired: true,
    });

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
      maxDrawdownMagnitudePercent: 0,
      evaluationProfileId: "REQUIRED_METRICS_V1",
    };
    const evaluator: Evaluator = { evaluate: () => expected };

    expect(Object.keys(evaluator.evaluate(input)).sort()).toEqual(
      [
        "candidateId",
        "evaluationProfileId",
        "maxDrawdownMagnitudePercent",
        "numberOfTrades",
        "totalReturnPercent",
        "winRatePercent",
      ].sort(),
    );
  });
});
