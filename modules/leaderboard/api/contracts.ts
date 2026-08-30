import type { EvaluationMetrics } from "@cryptox/evaluation";
import type { AuthenticatedRequestContext } from "modules/auth/api";
import type {
  CreateLeaderboardScopeCommand,
  LeaderboardEntry,
  LeaderboardScope,
  LeaderboardSubmission,
  LeaderboardSubmissionResult,
  RankableExperiment,
  SearchRunRankingEntry,
} from "../application/ports";
import type {
  RankingConfiguration,
  ScoredEvaluation,
} from "../domain/ranking";

export { LINEAR_REQUIRED_V1, LINEAR_REQUIRED_V1_ID } from "../domain/ranking";
export type { RankingConfiguration, RankingFormula, ScoredEvaluation } from "../domain/ranking";
export type {
  CreateLeaderboardScopeCommand,
  LeaderboardEntry,
  LeaderboardScope,
  LeaderboardSubmission,
  LeaderboardSubmissionResult,
  RankableExperiment,
  SearchRunRankingEntry,
} from "../application/ports";

export const LEADERBOARD_COMPARISON_IDENTITY_V1 = {
  id: "LEADERBOARD_COMPARISON_IDENTITY_V1",
  comparisonKey: "CALLER_DECLARED_NON_EMPTY_OPAQUE_STRING",
  equivalence: "EXACT_STRING_EQUALITY",
  submissionPolicy: "SAME_LEADERBOARD_SCOPE_ID_ONLY",
} as const;

export interface LeaderboardScoringError {
  code: "INVALID_METRICS";
  message: string;
}

export interface LeaderboardModulePublicApi {
  createLeaderboardScope(
    context: AuthenticatedRequestContext,
    command: CreateLeaderboardScopeCommand,
  ): Promise<LeaderboardScope>;
  getLeaderboardScope(
    context: AuthenticatedRequestContext,
    id: string,
  ): Promise<LeaderboardScope>;
  getRankingConfiguration(id: string): Promise<RankingConfiguration>;
  listRankingConfigurations(): Promise<readonly RankingConfiguration[]>;
  score(leaderboardScopeId: string, metrics: EvaluationMetrics): ScoredEvaluation;
  topK(
    context: AuthenticatedRequestContext,
    leaderboardScopeId: string,
  ): Promise<readonly LeaderboardEntry[]>;
  rankSearchRun(
    context: AuthenticatedRequestContext,
    searchRunId: string,
  ): Promise<readonly SearchRunRankingEntry[]>;
  submit(
    context: AuthenticatedRequestContext,
    submission: LeaderboardSubmission,
  ): Promise<LeaderboardSubmissionResult>;
}
