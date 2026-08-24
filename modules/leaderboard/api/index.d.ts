import type { CompletionUnitOfWork, ExperimentResult } from "modules/backtesting/api";
import type { EvaluationMetrics } from "modules/evaluation/api";
import type { LeaderboardModuleDependencies } from "./bootstrap";
import type {
  LeaderboardEntry,
  LeaderboardScope,
  LeaderboardSubmissionResult,
  ScoredEvaluation,
  SearchRunRankingEntry,
  CreateLeaderboardScopeCommand,
} from "../domain/contracts";
export type {
  ScoreFormula,
  LeaderboardScope,
  ScoredEvaluation,
  LeaderboardEntry,
  SearchRunRankingEntry,
  LeaderboardSubmissionResult,
  CreateLeaderboardScopeCommand,
} from "../domain/contracts";
export interface LeaderboardModulePublicApi {
  score(leaderboardScopeId: string, metrics: EvaluationMetrics): ScoredEvaluation;
  topK(leaderboardScopeId: string): Promise<LeaderboardEntry[]>;
  rankSearchRun(searchRunId: string): Promise<SearchRunRankingEntry[]>;
  submit(
    experiment: ExperimentResult,
    unitOfWork: CompletionUnitOfWork,
  ): Promise<LeaderboardSubmissionResult>;
}
export declare const score: LeaderboardModulePublicApi["score"];
export declare const topK: LeaderboardModulePublicApi["topK"];
export declare const rankSearchRun: LeaderboardModulePublicApi["rankSearchRun"];
export declare const submit: LeaderboardModulePublicApi["submit"];
export declare function createLeaderboardModule(
  _deps: LeaderboardModuleDependencies,
): LeaderboardModulePublicApi & {
  createLeaderboardScope(command: CreateLeaderboardScopeCommand): Promise<LeaderboardScope>;
  getLeaderboardScope(id: string): Promise<LeaderboardScope>;
};
