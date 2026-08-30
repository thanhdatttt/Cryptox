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
    decimalScale?: number;
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

interface Rational {
  numerator: bigint;
  denominator: bigint;
}

interface ValidatedInput {
  initialCapital: Rational;
  endingCapital: Rational;
  winningTrades: number;
  numberOfTrades: number;
  equityCurve: readonly Rational[];
}

const TRADE_RESULTS = new Set(["WIN", "LOSS", "BREAKEVEN"]);
const DECIMAL_PATTERN = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i;
const DECIMAL_PRECISION = 17;
const TEN_TO_DECIMAL_PRECISION = 10n ** BigInt(DECIMAL_PRECISION);

function invalidInput(message: string): never {
  throw new EvaluationDomainError("INVALID_INPUT", message);
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

function assertRecord(value: unknown, field: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    invalidInput(`${field} must be an object`);
  }
}

function requiredProperty(record: Record<string, unknown>, property: string, field: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(record, property)) {
    invalidInput(`${field}.${property} must be present`);
  }

  return record[property];
}

function assertFiniteNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    invalidInput(`${field} must be a finite number`);
  }
}

function absolute(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let a = absolute(left);
  let b = absolute(right);

  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a;
}

function rational(numerator: bigint, denominator: bigint): Rational {
  if (denominator === 0n) {
    throw new EvaluationDomainError(
      "EVALUATION_FINITE_METRIC_VIOLATION",
      "rational calculation produced a zero denominator",
    );
  }

  if (numerator === 0n) return { numerator: 0n, denominator: 1n };

  const sign = denominator < 0n ? -1n : 1n;
  const divisor = greatestCommonDivisor(numerator, denominator);
  return {
    numerator: (numerator * sign) / divisor,
    denominator: (denominator * sign) / divisor,
  };
}

function compareRationals(left: Rational, right: Rational): number {
  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

function subtractRationals(left: Rational, right: Rational): Rational {
  return rational(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function divideRationals(left: Rational, right: Rational, label: string): Rational {
  if (right.numerator === 0n) {
    invalidInput(`${label} has a zero denominator`);
  }

  return rational(left.numerator * right.denominator, left.denominator * right.numerator);
}

function multiplyRationalByInteger(value: Rational, multiplier: bigint): Rational {
  return rational(value.numerator * multiplier, value.denominator);
}

function roundPositiveQuotient(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  return numerator % denominator * 2n >= denominator ? quotient + 1n : quotient;
}

/**
 * Converts a finite JavaScript number through its decimal representation.
 * This is a representation step only: Evaluation does not round or recreate
 * the fills that produced the already-normalized paper result.
 */
function rationalFromNumber(value: unknown, field: string): Rational {
  assertFiniteNumber(value, field);

  const match = DECIMAL_PATTERN.exec(String(value));
  if (!match) invalidInput(`${field} must be a finite decimal`);

  const integerDigits = match[2] ?? "";
  const fractionDigits = match[3] ?? match[4] ?? "";
  const exponent = Number(match[5] ?? 0);
  if (!Number.isSafeInteger(exponent)) {
    invalidInput(`${field} has an unsupported decimal exponent`);
  }

  let digits = `${integerDigits}${fractionDigits}`.replace(/^0+(?=\d)/, "");
  if (digits.length === 0) digits = "0";

  let numerator = BigInt(digits);
  let denominator = 1n;
  const decimalPlaces = fractionDigits.length - exponent;
  if (decimalPlaces > 0) {
    denominator = 10n ** BigInt(decimalPlaces);
  } else if (decimalPlaces < 0) {
    numerator *= 10n ** BigInt(-decimalPlaces);
  }

  if (match[1] === "-") numerator = -numerator;
  return rational(numerator, denominator);
}

/**
 * Converts an exact rational metric to the public number contract without
 * first converting large numerators or denominators to binary numbers. The
 * result is rejected when its finite public representation would overflow.
 */
function rationalToFiniteNumber(value: Rational, metric: string): number {
  if (value.numerator === 0n) return 0;

  const negative = value.numerator < 0n;
  const numerator = absolute(value.numerator);
  const denominator = value.denominator;
  const numeratorDigits = numerator.toString().length;
  const denominatorDigits = denominator.toString().length;
  let exponent: number;

  if (numerator >= denominator) {
    exponent = numeratorDigits - denominatorDigits;
    if (numerator < denominator * 10n ** BigInt(exponent)) exponent -= 1;
  } else {
    const digitDifference = denominatorDigits - numeratorDigits;
    exponent = -digitDifference;
    if (numerator * 10n ** BigInt(digitDifference) < denominator) exponent -= 1;
  }

  if (exponent > 308) {
    throw new EvaluationDomainError(
      "EVALUATION_FINITE_METRIC_VIOLATION",
      `${metric} calculation produced a non-finite value`,
    );
  }

  let scaledNumerator = numerator * TEN_TO_DECIMAL_PRECISION;
  let scaledDenominator = denominator;
  if (exponent >= 0) {
    scaledDenominator *= 10n ** BigInt(exponent);
  } else {
    scaledNumerator *= 10n ** BigInt(-exponent);
  }

  let scaled = roundPositiveQuotient(scaledNumerator, scaledDenominator);
  if (scaled >= TEN_TO_DECIMAL_PRECISION * 10n) {
    scaled = roundPositiveQuotient(scaled, 10n);
    exponent += 1;
  }

  if (exponent > 308) {
    throw new EvaluationDomainError(
      "EVALUATION_FINITE_METRIC_VIOLATION",
      `${metric} calculation produced a non-finite value`,
    );
  }

  const mantissa = Number(scaled) / Number(TEN_TO_DECIMAL_PRECISION);
  const result = (negative ? -1 : 1) * mantissa * 10 ** exponent;
  return assertFiniteMetric(result, metric);
}

function validateInput(input: unknown): ValidatedInput {
  assertRecord(input, "evaluation input");

  const initialCapital = rationalFromNumber(
    requiredProperty(input, "initialCapital", "evaluation input"),
    "initialCapital",
  );
  if (initialCapital.numerator <= 0n) {
    invalidInput("initialCapital must be greater than zero");
  }

  const endingCapital = rationalFromNumber(
    requiredProperty(input, "endingCapital", "evaluation input"),
    "endingCapital",
  );

  const rawTrades = requiredProperty(input, "trades", "evaluation input");
  if (!Array.isArray(rawTrades)) {
    invalidInput("trades must be an array");
  }

  let winningTrades = 0;
  for (let index = 0; index < rawTrades.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(rawTrades, index)) {
      invalidInput(`trades[${index}] must be present`);
    }

    const trade = rawTrades[index];
    assertRecord(trade, `trades[${index}]`);
    rationalFromNumber(requiredProperty(trade, "profit", `trades[${index}]`), `trades[${index}].profit`);

    const result = requiredProperty(trade, "result", `trades[${index}]`);
    if (typeof result !== "string" || !TRADE_RESULTS.has(result)) {
      invalidInput(`trades[${index}].result is invalid`);
    }
    if (result === "WIN") winningTrades += 1;

    if (
      Object.prototype.hasOwnProperty.call(trade, "decimalScale") &&
      trade.decimalScale !== 8
    ) {
      invalidInput(`trades[${index}].decimalScale must be 8`);
    }
  }

  const rawEquityCurve = requiredProperty(input, "equityCurve", "evaluation input");
  if (!Array.isArray(rawEquityCurve)) {
    invalidInput("equityCurve must be an array");
  }

  const equityCurve: Rational[] = [];
  for (let index = 0; index < rawEquityCurve.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(rawEquityCurve, index)) {
      invalidInput(`equityCurve[${index}] must be present`);
    }

    const point = rawEquityCurve[index];
    assertRecord(point, `equityCurve[${index}]`);
    const timestamp = requiredProperty(point, "timestamp", `equityCurve[${index}]`);
    if (typeof timestamp !== "string" || timestamp.trim().length === 0) {
      invalidInput(`equityCurve[${index}].timestamp must be a non-empty string`);
    }

    const value = rationalFromNumber(
      requiredProperty(point, "value", `equityCurve[${index}]`),
      `equityCurve[${index}].value`,
    );
    if (value.numerator < 0n) {
      invalidInput(`equityCurve[${index}].value must not be negative`);
    }
    equityCurve.push(value);
  }

  return {
    initialCapital,
    endingCapital,
    winningTrades,
    numberOfTrades: rawTrades.length,
    equityCurve,
  };
}

function calculateMaximumDrawdown(equityCurve: readonly Rational[]): Rational {
  let peak: Rational | undefined;
  let maximumDrawdown = rational(0n, 1n);

  for (const current of equityCurve) {
    if (peak === undefined || compareRationals(current, peak) > 0) {
      peak = current;
      continue;
    }

    if (peak.numerator === 0n) continue;

    const decline = divideRationals(
      subtractRationals(peak, current),
      peak,
      "drawdown",
    );
    const drawdownPercent = multiplyRationalByInteger(decline, 100n);
    if (compareRationals(drawdownPercent, maximumDrawdown) > 0) {
      maximumDrawdown = drawdownPercent;
    }
  }

  return maximumDrawdown;
}

/**
 * Calculates the frozen REQUIRED_METRICS_V1 profile without mutating its input.
 * Trades are completed trades. Drawdown is a non-negative magnitude over the
 * supplied equity-point order; an empty, singleton, or flat curve returns zero.
 */
export function calculateRequiredMetrics(
  input: RequiredMetricsCalculationInput,
): RequiredMetricsCalculation {
  const validated = validateInput(input);
  const totalReturnPercent = rationalToFiniteNumber(
    multiplyRationalByInteger(
      divideRationals(
        subtractRationals(validated.endingCapital, validated.initialCapital),
        validated.initialCapital,
        "return",
      ),
      100n,
    ),
    "totalReturnPercent",
  );
  const winRatePercent = rationalToFiniteNumber(
    validated.numberOfTrades === 0
      ? rational(0n, 1n)
      : rational(BigInt(validated.winningTrades) * 100n, BigInt(validated.numberOfTrades)),
    "winRatePercent",
  );
  const maxDrawdownMagnitudePercent = rationalToFiniteNumber(
    calculateMaximumDrawdown(validated.equityCurve),
    "maxDrawdownMagnitudePercent",
  );

  return {
    totalReturnPercent,
    winRatePercent,
    numberOfTrades: validated.numberOfTrades,
    maxDrawdownMagnitudePercent,
  };
}
