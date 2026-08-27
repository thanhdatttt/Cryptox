import type { LeaderboardApplicationDependencies } from "../application/ports";
import type {
  CreateLeaderboardScopeCommand,
  LeaderboardEntry,
  LeaderboardModulePublicApi,
  LeaderboardScope,
  RankingConfiguration,
} from "./contracts";
import {
  createLeaderboardScope,
  getLeaderboardScope,
  getRankingConfiguration,
  listRankingConfigurations,
  rankSearchRun,
  score,
  submit,
  topK,
} from "./index";
export type LeaderboardModuleDependencies = LeaderboardApplicationDependencies<
  LeaderboardScope,
  CreateLeaderboardScopeCommand,
  LeaderboardEntry,
  RankingConfiguration
>;
export function createLeaderboardModule(
  _deps: LeaderboardModuleDependencies,
): LeaderboardModulePublicApi {
  return {
    createLeaderboardScope,
    getLeaderboardScope,
    getRankingConfiguration,
    listRankingConfigurations,
    score,
    topK,
    rankSearchRun,
    submit,
  };
}
