import type { CompletionUnitOfWork, ExperimentResult } from "modules/backtesting/api";
import type { EvaluationMetrics } from "modules/evaluation/api";
import type { LeaderboardEntry, LeaderboardScope, LeaderboardSubmissionResult, ScoredEvaluation, SearchRunRankingEntry, CreateLeaderboardScopeCommand } from "../domain/contracts";
export type { ScoreFormula, LeaderboardScope, ScoredEvaluation, LeaderboardEntry, SearchRunRankingEntry, LeaderboardSubmissionResult, CreateLeaderboardScopeCommand } from "../domain/contracts";
export interface LeaderboardModulePublicApi { score(leaderboardScopeId: string, metrics: EvaluationMetrics): ScoredEvaluation; topK(leaderboardScopeId: string): Promise<LeaderboardEntry[]>; rankSearchRun(searchRunId: string): Promise<SearchRunRankingEntry[]>; submit(experiment: ExperimentResult, unitOfWork: CompletionUnitOfWork): Promise<LeaderboardSubmissionResult>; }
const notImplemented = (): never => { throw new Error("NOT_IMPLEMENTED"); };
export const score: LeaderboardModulePublicApi["score"] = () => notImplemented();
export const topK: LeaderboardModulePublicApi["topK"] = async () => notImplemented();
export const rankSearchRun: LeaderboardModulePublicApi["rankSearchRun"] = async () => notImplemented();
export const submit: LeaderboardModulePublicApi["submit"] = async () => notImplemented();
