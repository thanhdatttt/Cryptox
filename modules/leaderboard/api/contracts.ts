import type { EvaluationMetrics } from "@cryptox/evaluation";

export interface RankingConfiguration {
  id: string;
  version: number;
  name: string;
  description?: string;
  createdAt: string;
}

export interface LeaderboardScope {
  id: string;
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
      rankExclusionReason: "NO_TRADES" | "INVALID_METRICS";
    };

export interface LeaderboardEntry {
  id: string;
  rank: number;
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
  experimentId: string;
  candidateId: string;
  searchRunId?: string;
  metrics: EvaluationMetrics;
}

export interface LeaderboardSubmissionResult {
  admitted: boolean;
  entry?: LeaderboardEntry;
  evictedExperimentId?: string;
}

export interface LeaderboardModulePublicApi {
  createLeaderboardScope(command: CreateLeaderboardScopeCommand): Promise<LeaderboardScope>;
  getLeaderboardScope(id: string): Promise<LeaderboardScope>;
  score(leaderboardScopeId: string, metrics: EvaluationMetrics): ScoredEvaluation;
  topK(leaderboardScopeId: string): Promise<readonly LeaderboardEntry[]>;
  rankSearchRun(searchRunId: string): Promise<readonly SearchRunRankingEntry[]>;
  submit(experiment: RankableExperiment): Promise<LeaderboardSubmissionResult>;
}
