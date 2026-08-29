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
import { createLeaderboardApplication } from "../application/service";
import { createInMemoryLeaderboardDependencies } from "../application/memory";

export * from "./contracts";

const defaultLeaderboardApplication = createLeaderboardApplication(
  createInMemoryLeaderboardDependencies(),
);

export const createLeaderboardScope = async (
  context: AuthenticatedRequestContext,
  command: CreateLeaderboardScopeCommand,
): Promise<LeaderboardScope> => defaultLeaderboardApplication.createLeaderboardScope(context, command);
export const getLeaderboardScope = async (
  context: AuthenticatedRequestContext,
  id: string,
): Promise<LeaderboardScope> => defaultLeaderboardApplication.getLeaderboardScope(context, id);
export const getRankingConfiguration = async (id: string): Promise<RankingConfiguration> =>
  defaultLeaderboardApplication.getRankingConfiguration(id);
export const listRankingConfigurations = async (): Promise<readonly RankingConfiguration[]> =>
  defaultLeaderboardApplication.listRankingConfigurations();
export const score = (
  leaderboardScopeId: string,
  metrics: EvaluationMetrics,
): ScoredEvaluation => defaultLeaderboardApplication.score(leaderboardScopeId, metrics);
export const topK = async (
  context: AuthenticatedRequestContext,
  leaderboardScopeId: string,
): Promise<readonly LeaderboardEntry[]> => defaultLeaderboardApplication.topK(context, leaderboardScopeId);
export const rankSearchRun = async (
  context: AuthenticatedRequestContext,
  searchRunId: string,
): Promise<readonly SearchRunRankingEntry[]> => defaultLeaderboardApplication.rankSearchRun(context, searchRunId);
export const submit = async (
  context: AuthenticatedRequestContext,
  submission: LeaderboardSubmission,
): Promise<LeaderboardSubmissionResult> => defaultLeaderboardApplication.submit(context, submission);
