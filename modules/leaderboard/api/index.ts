import type { CompletionUnitOfWork, ExperimentResult } from "modules/backtesting/api";
import type { EvaluationMetrics } from "modules/evaluation/api";
import type { LeaderboardEntry, LeaderboardScope, LeaderboardSubmissionResult, ScoredEvaluation, SearchRunRankingEntry, CreateLeaderboardScopeCommand } from "../domain/contracts";
export { createLeaderboardModule, createInMemoryLeaderboardDependencies, DEFAULT_SCORE_FORMULA } from "../application/service";
export type { LeaderboardModuleRuntime } from "../application/service";
export type { ScoreFormula, LeaderboardScope, ScoredEvaluation, LeaderboardEntry, SearchRunRankingEntry, LeaderboardSubmissionResult, CreateLeaderboardScopeCommand } from "../domain/contracts";
export interface LeaderboardModulePublicApi { score(leaderboardScopeId: string, metrics: EvaluationMetrics): Promise<ScoredEvaluation>; topK(leaderboardScopeId: string): Promise<LeaderboardEntry[]>; rankSearchRun(searchRunId: string): Promise<SearchRunRankingEntry[]>; submit(experiment: ExperimentResult, unitOfWork: CompletionUnitOfWork): Promise<LeaderboardSubmissionResult>; }
import { createInMemoryLeaderboardDependencies, createLeaderboardModule } from "../application/service";
const defaultService = createLeaderboardModule(createInMemoryLeaderboardDependencies());
export const score: LeaderboardModulePublicApi["score"] = (leaderboardScopeId, metrics) => defaultService.score(leaderboardScopeId, metrics);
export const topK: LeaderboardModulePublicApi["topK"] = (leaderboardScopeId) => defaultService.topK(leaderboardScopeId);
export const rankSearchRun: LeaderboardModulePublicApi["rankSearchRun"] = (searchRunId) => defaultService.rankSearchRun(searchRunId);
export const submit: LeaderboardModulePublicApi["submit"] = (experiment, unitOfWork) => defaultService.submit(experiment, unitOfWork);
