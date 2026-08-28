export type EvaluationFailureCode =
  | "EVALUATION_FINITE_METRIC_VIOLATION"
  | "INVALID_INPUT";

export class EvaluationDomainError extends Error {
  public readonly name = "EvaluationDomainError";

  public constructor(
    public readonly code: EvaluationFailureCode,
    message: string,
  ) {
    super(message);
  }
}

export interface RequiredMetricsCalculationInput {
  initialCapital: number;
  endingCapital: number;
  trades: readonly {
    profit: number;
    result: "WIN" | "LOSS" | "BREAKEVEN";
  }[];
  equityCurve: readonly {
    timestamp: string;
    value: number;
  }[];
}

export interface RequiredMetricsCalculation {
  totalReturnPercent: number;
  winRatePercent: number;
  numberOfTrades: number;
  maxDrawdownMagnitudePercent: number;
}

const TRADE_RESULTS = new Set(["WIN", "LOSS", "BREAKEVEN"]);

function invalidInput(message: string): never {
  throw new EvaluationDomainError("INVALID_INPUT", message);
}

function assertFiniteNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    invalidInput(`${field} must be a finite number`);
  }
}

function assertFiniteMetric(value: number, metric: string): number {
  if (!Number.isFinite(value)) {
    throw new EvaluationDomainError(
      "EVALUATION_FINITE_METRIC_VIOLATION",
      `${metric} calculation produced a non-finite value`,
    );
  }

  return value;
}

function validateInput(input: RequiredMetricsCalculationInput): void {
  if (input === null || typeof input !== "object") {
    invalidInput("evaluation input must be an object");
  }

  assertFiniteNumber(input.initialCapital, "initialCapital");
  if (input.initialCapital <= 0) {
    invalidInput("initialCapital must be greater than zero");
  }

  assertFiniteNumber(input.endingCapital, "endingCapital");

  if (!Array.isArray(input.trades)) {
    invalidInput("trades must be an array");
  }

  for (let index = 0; index < input.trades.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(input.trades, index)) {
      invalidInput(`trades[${index}] must be present`);
    }

    const trade = input.trades[index];
    if (trade === null || typeof trade !== "object") {
      invalidInput(`trades[${index}] must be an object`);
    }
    assertFiniteNumber(trade.profit, `trades[${index}].profit`);
    if (!TRADE_RESULTS.has(trade.result)) {
      invalidInput(`trades[${index}].result is invalid`);
    }
  }

  if (!Array.isArray(input.equityCurve)) {
    invalidInput("equityCurve must be an array");
  }

  for (let index = 0; index < input.equityCurve.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(input.equityCurve, index)) {
      invalidInput(`equityCurve[${index}] must be present`);
    }

    const point = input.equityCurve[index];
    if (point === null || typeof point !== "object") {
      invalidInput(`equityCurve[${index}] must be an object`);
    }
    if (typeof point.timestamp !== "string" || point.timestamp.length === 0) {
      invalidInput(`equityCurve[${index}].timestamp must be a non-empty string`);
    }
    assertFiniteNumber(point.value, `equityCurve[${index}].value`);
    if (point.value < 0) {
      invalidInput(`equityCurve[${index}].value must not be negative`);
    }
  }
}

function calculateMaximumDrawdown(
  equityCurve: RequiredMetricsCalculationInput["equityCurve"],
): number {
  let peak: number | undefined;
  let maximumDrawdown = 0;

  for (const point of equityCurve) {
    if (peak === undefined || point.value > peak) {
      peak = point.value;
      continue;
    }

    // A zero-valued curve has no decline relative to a positive peak. Once a
    // positive peak appears, the standard peak-to-trough percentage applies.
    const drawdown = peak === 0 ? 0 : ((peak - point.value) / peak) * 100;
    maximumDrawdown = Math.max(maximumDrawdown, drawdown);
  }

  return assertFiniteMetric(maximumDrawdown, "maxDrawdownMagnitudePercent");
}

/**
 * Calculates the frozen REQUIRED_METRICS_V1 profile without mutating its input.
 * Trades are completed trades. Drawdown is a non-negative magnitude over the
 * supplied equity-point order; an empty, singleton, or flat curve returns zero.
 */
export function calculateRequiredMetrics(
  input: RequiredMetricsCalculationInput,
): RequiredMetricsCalculation {
  validateInput(input);

  const numberOfTrades = input.trades.length;
  const winningTrades = input.trades.reduce(
    (count, trade) => count + (trade.result === "WIN" ? 1 : 0),
    0,
  );

  return {
    totalReturnPercent: assertFiniteMetric(
      ((input.endingCapital - input.initialCapital) / input.initialCapital) * 100,
      "totalReturnPercent",
    ),
    winRatePercent: assertFiniteMetric(
      numberOfTrades === 0 ? 0 : (winningTrades / numberOfTrades) * 100,
      "winRatePercent",
    ),
    numberOfTrades,
    maxDrawdownMagnitudePercent: calculateMaximumDrawdown(input.equityCurve),
  };
}
