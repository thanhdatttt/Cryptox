import type { EvaluationMetrics } from "modules/evaluation/api";
import type { CompletionUnitOfWork, ExperimentResult } from "modules/backtesting/api";
import type { DatasetSnapshotRef } from "modules/market-data/api";
import type { SentimentDatasetSnapshotRef } from "modules/sentiment/api";
export interface ScoreFormula {
    id: string;
    version: number;
    name: string;
    weights: {
        return: number;
        winRate: number;
        riskScore: number;
    };
    riskScoreMethod: string;
    riskScoreParameters: Record<string, number>;
    createdAt: string;
}
export interface LeaderboardScope {
    id: string;
    userId: string;
    name: string;
    version: number;
    datasetSnapshot: DatasetSnapshotRef;
    sentimentDatasetSnapshot?: SentimentDatasetSnapshotRef;
    workerRuntimeVersion: string;
    workerRuntimeSha256: string;
    evaluationRuntimeVersion: string;
    evaluationRuntimeSha256: string;
    initialCapital: number;
    feeRatePercent: number;
    slippageBps: number;
    scoreFormulaId: string;
    createdAt: string;
}
export type ScoredEvaluation = {
    leaderboardScopeId: string;
    scoreFormulaId: string;
    overallScore: number;
    rankEligible: true;
} | {
    leaderboardScopeId: string;
    scoreFormulaId: string;
    overallScore: number;
    rankEligible: false;
    rankExclusionReason: "NO_TRADES";
};
export interface LeaderboardEntry {
    id: string;
    rank: number;
    experimentResultId: string;
    leaderboardScopeId: string;
    scoreFormulaId: string;
    score: number;
    addedAt: string;
}
export interface SearchRunRankingEntry {
    rank: number;
    searchRunId: string;
    leaderboardScopeId: string;
    candidateId: string;
    experimentResultId: string;
    scoreFormulaId: string;
    score: number;
}
export interface LeaderboardSubmissionResult {
    admitted: boolean;
    entry?: LeaderboardEntry;
    evictedExperimentResultId?: string;
}
export interface CreateLeaderboardScopeCommand {
    name: string;
    datasetSnapshot: DatasetSnapshotRef;
    sentimentDatasetSnapshot?: SentimentDatasetSnapshotRef;
    workerRuntimeVersion: string;
    workerRuntimeSha256: string;
    evaluationRuntimeVersion: string;
    evaluationRuntimeSha256: string;
    initialCapital: number;
    feeRatePercent: number;
    slippageBps: number;
    scoreFormulaId: string;
}
export type _LeaderboardTypeMarker = EvaluationMetrics | CompletionUnitOfWork | ExperimentResult;
