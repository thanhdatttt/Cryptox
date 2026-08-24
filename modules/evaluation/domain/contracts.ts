import type { CompletedBacktestResult } from "modules/backtesting/api";
export interface EvaluationMetrics { candidateId: string; totalReturnPercent: number; winRatePercent: number; numberOfTrades: number; maxDrawdownPercent: number; profitFactor: number | null; profitFactorStatus: "FINITE" | "NO_TRADES" | "NO_LOSSES" | "NO_GROSS_MOVEMENT"; sharpeRatio: number; sharpeRatioStatus: "FINITE" | "INSUFFICIENT_OBSERVATIONS" | "ZERO_VARIANCE"; evaluationRuntimeVersion: string; evaluationRuntimeSha256: string; }
export interface Evaluator { evaluate(result: CompletedBacktestResult): EvaluationMetrics; }
export type EvaluationError = { code: "EVALUATION_FINITE_METRIC_VIOLATION" | "INVALID_INPUT"; message: string };
