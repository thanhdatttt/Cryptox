export const REQUIRED_METRICS_V1_ID = "REQUIRED_METRICS_V1" as const;

export const REQUIRED_METRICS_V1 = {
  id: REQUIRED_METRICS_V1_ID,
  totalReturnPercent: "(ENDING_CAPITAL - INITIAL_CAPITAL) / INITIAL_CAPITAL * 100",
  winRatePercent: "WINNING_CLOSED_TRADES / CLOSED_TRADES * 100",
  numberOfTrades: "COUNT_OF_CLOSED_TRADES",
  maxDrawdownMagnitudePercent: "LARGEST_PEAK_TO_TROUGH_DECLINE_MAGNITUDE_PERCENT",
  zeroTradesWinRatePercent: 0,
  flatEquityDrawdownMagnitudePercent: 0,
  finiteOutputsRequired: true,
} as const;

export interface TradeEvaluationInput {
  profit: number;
  result: "WIN" | "LOSS" | "BREAKEVEN";
  decimalScale?: 8;
}

export interface EquityPoint {
  timestamp: string;
  value: number;
}

export interface EvaluationInput {
  candidateId: string;
  initialCapital: number;
  endingCapital: number;
  trades: readonly TradeEvaluationInput[];
  equityCurve: readonly EquityPoint[];
}

export interface EvaluationMetrics {
  candidateId: string;
  totalReturnPercent: number;
  winRatePercent: number;
  numberOfTrades: number;
  maxDrawdownMagnitudePercent: number;
  evaluationProfileId: typeof REQUIRED_METRICS_V1_ID;
}

export interface Evaluator {
  evaluate(input: EvaluationInput): EvaluationMetrics;
}

export interface EvaluationError {
  code: "EVALUATION_FINITE_METRIC_VIOLATION" | "INVALID_INPUT";
  message: string;
}

export interface EvaluatorModulePublicApi {
  readonly evaluator: Evaluator;
  readonly runtimeVersion: string;
}
