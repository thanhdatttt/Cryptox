import type { EvaluationMetrics } from "modules/evaluation/api";
import type { ScoreFormula, ScoredEvaluation } from "./contracts";
export declare function scoreEvaluation(leaderboardScopeId: string, formula: ScoreFormula, metrics: EvaluationMetrics): ScoredEvaluation;
