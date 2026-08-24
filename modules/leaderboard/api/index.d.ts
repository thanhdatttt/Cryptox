import type { CompletionUnitOfWork, ExperimentResult } from "modules/backtesting/api";
import type { EvaluationMetrics } from "modules/evaluation/api";
import type { LeaderboardEntry, LeaderboardSubmissionResult, ScoredEvaluation, SearchRunRankingEntry } from "../domain/contracts";
export { createLeaderboardModule, createInMemoryLeaderboardDependencies, DEFAULT_SCORE_FORMULA } from "../application/service";
export type { LeaderboardModuleRuntime } from "../application/service";
export type { ScoreFormula, LeaderboardScope, ScoredEvaluation, LeaderboardEntry, SearchRunRankingEntry, LeaderboardSubmissionResult, CreateLeaderboardScopeCommand } from "../domain/contracts";
export interface LeaderboardModulePublicApi {
    score(leaderboardScopeId: string, metrics: EvaluationMetrics): Promise<ScoredEvaluation>;
    topK(leaderboardScopeId: string): Promise<LeaderboardEntry[]>;
    rankSearchRun(searchRunId: string): Promise<SearchRunRankingEntry[]>;
    submit(experiment: ExperimentResult, unitOfWork: CompletionUnitOfWork): Promise<LeaderboardSubmissionResult>;
}
export declare const score: LeaderboardModulePublicApi["score"];
export declare const topK: LeaderboardModulePublicApi["topK"];
export declare const rankSearchRun: LeaderboardModulePublicApi["rankSearchRun"];
export declare const submit: LeaderboardModulePublicApi["submit"];
