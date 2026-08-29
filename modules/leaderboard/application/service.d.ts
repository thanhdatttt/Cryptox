import type { ExperimentResult } from "modules/backtesting/api";
import type { EvaluationMetrics } from "modules/evaluation/api";
import type { CreateLeaderboardScopeCommand, LeaderboardEntry, LeaderboardScope, LeaderboardSubmissionResult, ScoreFormula, ScoredEvaluation, SearchRunRankingEntry } from "../domain/contracts";
import type { LeaderboardModuleDependencies } from "./ports";
export declare const DEFAULT_SCORE_FORMULA: ScoreFormula;
export interface LeaderboardModuleRuntime {
    score(leaderboardScopeId: string, metrics: EvaluationMetrics): Promise<ScoredEvaluation>;
    topK(userId: string, leaderboardScopeId: string): Promise<LeaderboardEntry[]>;
    rankSearchRun(userId: string, searchRunId: string): Promise<SearchRunRankingEntry[]>;
    submit(experiment: ExperimentResult, unitOfWork: import("modules/backtesting/api").CompletionUnitOfWork): Promise<LeaderboardSubmissionResult>;
    createLeaderboardScope(userId: string, command: CreateLeaderboardScopeCommand): Promise<LeaderboardScope>;
    getLeaderboardScope(userId: string, id: string): Promise<LeaderboardScope>;
}
export declare function createInMemoryLeaderboardDependencies(): LeaderboardModuleDependencies;
export declare function createLeaderboardModule(dependencies?: LeaderboardModuleDependencies): LeaderboardModuleRuntime;
