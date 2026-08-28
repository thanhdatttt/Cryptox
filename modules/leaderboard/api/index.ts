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
import type { AuthenticatedRequestContext } from "modules/auth/api";

export * from "./contracts";

const notImplemented = (): never => {
  throw new Error("NOT_IMPLEMENTED");
};

export const createLeaderboardScope = async (
  _context: AuthenticatedRequestContext,
  _command: CreateLeaderboardScopeCommand,
): Promise<LeaderboardScope> => notImplemented();
export const getLeaderboardScope = async (
  _context: AuthenticatedRequestContext,
  _id: string,
): Promise<LeaderboardScope> => notImplemented();
export const getRankingConfiguration = async (_id: string): Promise<RankingConfiguration> =>
  notImplemented();
export const listRankingConfigurations = async (): Promise<readonly RankingConfiguration[]> =>
  notImplemented();
export const score = (
  _leaderboardScopeId: string,
  _metrics: EvaluationMetrics,
): ScoredEvaluation => notImplemented();
export const topK = async (
  _context: AuthenticatedRequestContext,
  _leaderboardScopeId: string,
): Promise<readonly LeaderboardEntry[]> => notImplemented();
export const rankSearchRun = async (
  _context: AuthenticatedRequestContext,
  _searchRunId: string,
): Promise<readonly SearchRunRankingEntry[]> => notImplemented();
export const submit = async (
  _context: AuthenticatedRequestContext,
  _submission: LeaderboardSubmission,
): Promise<LeaderboardSubmissionResult> => notImplemented();
