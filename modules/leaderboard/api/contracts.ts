import type { EvaluationMetrics } from "@cryptox/evaluation";
import type {
  AuthenticatedRequestContext,
  AuthenticatedUserId,
} from "modules/auth/api";
import type { RankingConfiguration } from "../domain/ranking";

export { LINEAR_REQUIRED_V1, LINEAR_REQUIRED_V1_ID } from "../domain/ranking";
export type { RankingConfiguration, RankingFormula } from "../domain/ranking";

export const LEADERBOARD_COMPARISON_IDENTITY_V1 = {
  id: "LEADERBOARD_COMPARISON_IDENTITY_V1",
  comparisonKey: "CALLER_DECLARED_NON_EMPTY_OPAQUE_STRING",
  equivalence: "EXACT_STRING_EQUALITY",
  submissionPolicy: "SAME_LEADERBOARD_SCOPE_ID_ONLY",
} as const;

export interface LeaderboardScope {
  id: string;
  ownerUserId: AuthenticatedUserId;
  name: string;
  k: number;
  rankingConfigurationId: string;
  comparisonKey: string;
  createdAt: string;
}

export interface CreateLeaderboardScopeCommand {
  name: string;
  k?: number;
  rankingConfigurationId: string;
  comparisonKey: string;
}

export type ScoredEvaluation =
  | {
      leaderboardScopeId: string;
      rankingConfigurationId: string;
      overallScore: number;
      rankEligible: true;
    }
  | {
      leaderboardScopeId: string;
      rankingConfigurationId: string;
      overallScore: number;
      rankEligible: false;
      rankExclusionReason: "NO_TRADES";
    };

export interface LeaderboardScoringError {
  code: "INVALID_METRICS";
  message: string;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  candidateId: string;
  searchRunId?: string;
  experimentId: string;
  leaderboardScopeId: string;
  rankingConfigurationId: string;
  score: number;
  addedAt: string;
}

export interface SearchRunRankingEntry {
  rank: number;
  searchRunId: string;
  leaderboardScopeId: string;
  candidateId: string;
  experimentId: string;
  rankingConfigurationId: string;
  score: number;
}

export interface RankableExperiment {
  executionState: "SUCCEEDED";
  experimentId: string;
  candidateId: string;
  searchRunId?: string;
  metrics: EvaluationMetrics;
  /** Read-only provenance reference; ranking must not alter execution provenance. */
  extensionProvenance?: {
    searchProfileId?: string;
    paperExecutionProfileId?: string;
    newsExtractionTemplateVersion?: number;
  };
}

export interface LeaderboardSubmissionResult {
  admitted: boolean;
  entry?: LeaderboardEntry;
  evictedExperimentId?: string;
}

export interface LeaderboardSubmission {
  leaderboardScopeId: string;
  experiment: RankableExperiment;
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
