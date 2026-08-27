import type {
  CreateLeaderboardScopeCommand,
  LeaderboardEntry,
  LeaderboardScope,
  LeaderboardSubmission,
  LeaderboardSubmissionResult,
  RankingConfiguration,
  ScoredEvaluation,
  SearchRunRankingEntry,
} from "./contracts";
import type { EvaluationMetrics } from "@cryptox/evaluation";

export * from "./contracts";

const notImplemented = (): never => {
  throw new Error("NOT_IMPLEMENTED");
};

export const createLeaderboardScope = async (
  _command: CreateLeaderboardScopeCommand,
): Promise<LeaderboardScope> => notImplemented();
export const getLeaderboardScope = async (_id: string): Promise<LeaderboardScope> =>
  notImplemented();
export const getRankingConfiguration = async (_id: string): Promise<RankingConfiguration> =>
  notImplemented();
export const listRankingConfigurations = async (): Promise<readonly RankingConfiguration[]> =>
  notImplemented();
export const score = (
  _leaderboardScopeId: string,
  _metrics: EvaluationMetrics,
): ScoredEvaluation => notImplemented();
export const topK = async (_leaderboardScopeId: string): Promise<readonly LeaderboardEntry[]> =>
  notImplemented();
export const rankSearchRun = async (
  _searchRunId: string,
): Promise<readonly SearchRunRankingEntry[]> => notImplemented();
export const submit = async (
  _submission: LeaderboardSubmission,
): Promise<LeaderboardSubmissionResult> => notImplemented();
