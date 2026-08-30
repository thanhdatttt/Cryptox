import { describe, expect, it } from "vitest";
import type { EvaluationInput } from "./contracts";
import { createEvaluationModule } from "./bootstrap";

function validInput(overrides: Partial<EvaluationInput> = {}): EvaluationInput {
  return {
    candidateId: "candidate-1",
    initialCapital: 100,
    endingCapital: 120,
    trades: [
      { profit: 15, result: "WIN" },
      { profit: -5, result: "LOSS" },
      { profit: 0, result: "BREAKEVEN" },
      { profit: 10, result: "WIN" },
    ],
    equityCurve: [
      { timestamp: "2026-01-01T00:00:00Z", value: 100 },
      { timestamp: "2026-01-01T01:00:00Z", value: 125 },
      { timestamp: "2026-01-01T02:00:00Z", value: 100 },
      { timestamp: "2026-01-01T03:00:00Z", value: 120 },
    ],
    ...overrides,
  };
}

describe("REQUIRED_METRICS_V1 evaluator", () => {
  const { evaluator, runtimeVersion } = createEvaluationModule();

  it("evaluates decimal-normalized Long and synthetic Short result projections", () => {
    const long = evaluator.evaluate({
      candidateId: "paper-long",
      initialCapital: 1_000,
      endingCapital: 1_027.32547793,
      trades: [{ profit: 27.32547793, result: "WIN", decimalScale: 8 }],
      equityCurve: [
        { timestamp: "long-start", value: 1_000 },
        { timestamp: "long-end", value: 1_027.32547793 },
      ],
    });
    const short = evaluator.evaluate({
      candidateId: "paper-short",
      initialCapital: 1_000,
      endingCapital: 972.67452207,
      trades: [{ profit: -27.32547793, result: "LOSS", decimalScale: 8 }],
      equityCurve: [
        { timestamp: "short-start", value: 1_000 },
        { timestamp: "short-end", value: 972.67452207 },
      ],
    });

    expect(long).toEqual({
      candidateId: "paper-long",
      totalReturnPercent: 2.732547793,
      winRatePercent: 100,
      numberOfTrades: 1,
      maxDrawdownMagnitudePercent: 0,
      evaluationProfileId: "REQUIRED_METRICS_V1",
    });
    expect(short).toEqual({
      candidateId: "paper-short",
      totalReturnPercent: -2.732547793,
      winRatePercent: 0,
      numberOfTrades: 1,
      maxDrawdownMagnitudePercent: 2.732547793,
      evaluationProfileId: "REQUIRED_METRICS_V1",
    });
  });

  it("keeps eight-place decimal boundaries deterministic without binary drift", () => {
    const metrics = evaluator.evaluate(
      validInput({
        initialCapital: 1_000,
        endingCapital: 1_000.00000001,
        trades: [{ profit: 0.00000001, result: "WIN", decimalScale: 8 }],
        equityCurve: [
          { timestamp: "boundary-start", value: 1_000 },
          { timestamp: "boundary-end", value: 1_000.00000001 },
        ],
      }),
    );

    expect(metrics.totalReturnPercent).toBe(0.000000001);
    expect(metrics.maxDrawdownMagnitudePercent).toBe(0);
    expect(
      Object.values(metrics)
        .filter((value) => typeof value === "number")
        .every(Number.isFinite),
    ).toBe(true);
  });

  it("calculates the four golden metrics using the documented formulas", () => {
    expect(evaluator.evaluate(validInput())).toEqual({
      candidateId: "candidate-1",
      totalReturnPercent: 20,
      winRatePercent: 50,
      numberOfTrades: 4,
      maxDrawdownMagnitudePercent: 20,
      evaluationProfileId: "REQUIRED_METRICS_V1",
    });
    expect(runtimeVersion).toBe("1.0.0");
    expect(runtimeVersion).not.toContain("skeleton");
  });

  it("returns finite zero metrics for zero trades and an empty equity curve", () => {
    const metrics = evaluator.evaluate(
      validInput({ endingCapital: 100, trades: [], equityCurve: [] }),
    );

    expect(metrics).toEqual({
      candidateId: "candidate-1",
      totalReturnPercent: 0,
      winRatePercent: 0,
      numberOfTrades: 0,
      maxDrawdownMagnitudePercent: 0,
      evaluationProfileId: "REQUIRED_METRICS_V1",
    });
    expect(
      Object.values(metrics)
        .filter((value) => typeof value === "number")
        .every(Number.isFinite),
    ).toBe(true);
  });

  it("returns zero drawdown for flat and zero-valued equity curves", () => {
    for (const values of [[100, 100, 100], [0, 0], [0, 100, 100]]) {
      const equityCurve = values.map((value, index) => ({
        timestamp: `point-${index}`,
        value,
      }));
      expect(
        evaluator.evaluate(validInput({ equityCurve })).maxDrawdownMagnitudePercent,
      ).toBe(0);
    }
  });

  it("is deterministic and does not mutate deeply frozen input", () => {
    const input = validInput();
    input.trades.forEach(Object.freeze);
    input.equityCurve.forEach(Object.freeze);
    Object.freeze(input.trades);
    Object.freeze(input.equityCurve);
    Object.freeze(input);

    const first = evaluator.evaluate(input);
    const second = evaluator.evaluate(input);

    expect(second).toEqual(first);
  });

  it.each([
    ["initial capital", validInput({ initialCapital: Number.NaN })],
    ["ending capital", validInput({ endingCapital: Number.POSITIVE_INFINITY })],
    [
      "trade profit",
      validInput({
        trades: [{ profit: Number.NEGATIVE_INFINITY, result: "LOSS" }],
      }),
    ],
    [
      "equity value",
      validInput({
        equityCurve: [{ timestamp: "point-0", value: Number.NaN }],
      }),
    ],
  ])("rejects non-finite %s input explicitly", (_label, input) => {
    expect.assertions(2);

    try {
      evaluator.evaluate(input);
    } catch (error) {
      expect(error).toMatchObject({ code: "INVALID_INPUT" });
      expect(error).toBeInstanceOf(Error);
    }
  });

  it("rejects a zero return denominator as invalid input", () => {
    expect(() => evaluator.evaluate(validInput({ initialCapital: 0 }))).toThrow(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    );
  });

  it("rejects a paper scale marker that is not the approved eight-place boundary", () => {
    expect(() =>
      evaluator.evaluate(
        validInput({
          trades: [{ profit: 1, result: "WIN", decimalScale: 7 as 8 }],
        }),
      ),
    ).toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
  });

  it("keeps equal maximum-capital values finite without overflowing intermediate arithmetic", () => {
    const metrics = evaluator.evaluate(
      validInput({
        initialCapital: Number.MAX_VALUE,
        endingCapital: Number.MAX_VALUE,
        trades: [],
        equityCurve: [{ timestamp: "max-capital", value: Number.MAX_VALUE }],
      }),
    );

    expect(metrics.totalReturnPercent).toBe(0);
    expect(metrics.maxDrawdownMagnitudePercent).toBe(0);
  });

  it("rejects non-finite metric output caused by numeric overflow", () => {
    expect(() =>
      evaluator.evaluate(
        validInput({
          initialCapital: Number.MIN_VALUE,
          endingCapital: Number.MAX_VALUE,
        }),
      ),
    ).toThrow(
      expect.objectContaining({ code: "EVALUATION_FINITE_METRIC_VIOLATION" }),
    );
  });

  it("rejects structurally invalid required result data", () => {
    const invalid = validInput() as unknown as { trades: unknown };
    invalid.trades = undefined;

    expect(() =>
      evaluator.evaluate(invalid as unknown as EvaluationInput),
    ).toThrow(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    );
  });

  it("rejects sparse trades as structurally invalid input", () => {
    const trades = new Array<EvaluationInput["trades"][number]>(1);

    expect(() => evaluator.evaluate(validInput({ trades }))).toThrow(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    );
  });

  it("rejects sparse equity curves as structurally invalid input", () => {
    const equityCurve = new Array<EvaluationInput["equityCurve"][number]>(1);

    expect(() => evaluator.evaluate(validInput({ equityCurve }))).toThrow(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    );
  });
});
