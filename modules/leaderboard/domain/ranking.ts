import type { EvaluationMetrics } from "modules/evaluation/api";
import type { ScoreFormula, ScoredEvaluation } from "./contracts";

const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));

const assertFinite = (value: number): void => {
  if (!Number.isFinite(value)) throw new Error("INVALID_SCORE");
};

export function scoreEvaluation(leaderboardScopeId: string, formula: ScoreFormula, metrics: EvaluationMetrics): ScoredEvaluation {
  if (metrics.numberOfTrades === 0) return { leaderboardScopeId, scoreFormulaId: formula.id, overallScore: 0, rankEligible: false, rankExclusionReason: "NO_TRADES" };
  if (!Number.isInteger(metrics.numberOfTrades) || metrics.numberOfTrades < 0) throw new Error("INVALID_SCORE");
  [metrics.totalReturnPercent, metrics.winRatePercent, metrics.maxDrawdownPercent, metrics.sharpeRatio, formula.weights.return, formula.weights.winRate, formula.weights.riskScore].forEach(assertFinite);
  if (formula.riskScoreMethod !== "MVP_SHARPE_DRAWDOWN_V1") throw new Error("UNSUPPORTED_SCORE_FORMULA");
  const riskScore = clamp(50 + 10 * metrics.sharpeRatio - metrics.maxDrawdownPercent, 0, 100);
  const overallScore = formula.weights.return * metrics.totalReturnPercent + formula.weights.winRate * metrics.winRatePercent + formula.weights.riskScore * riskScore;
  assertFinite(overallScore);
  return { leaderboardScopeId, scoreFormulaId: formula.id, overallScore, rankEligible: true };
}
