export interface TradeEvaluationInput {
  profit: number;
  result: "WIN" | "LOSS" | "BREAKEVEN";
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
  maxDrawdownPercent: number;
  profitFactor: number | null;
  profitFactorStatus: "FINITE" | "NO_TRADES" | "NO_LOSSES" | "NO_GROSS_MOVEMENT";
  sharpeRatio: number | null;
  sharpeRatioStatus: "FINITE" | "INSUFFICIENT_OBSERVATIONS" | "ZERO_VARIANCE";
  evaluationVersion: string;
}

export interface Evaluator {
  evaluate(input: EvaluationInput): EvaluationMetrics;
}

export type EvaluationError = {
  code: "EVALUATION_FINITE_METRIC_VIOLATION" | "INVALID_INPUT";
  message: string;
};

export interface EvaluatorModulePublicApi {
  readonly evaluator: Evaluator;
  readonly runtimeVersion: string;
}
