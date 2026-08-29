import type { LeaderboardApplicationDependencies } from "../application/ports";
import type {
  CreateLeaderboardScopeCommand,
  LeaderboardEntry,
  LeaderboardModulePublicApi,
  LeaderboardScope,
  RankingConfiguration,
} from "./contracts";
import {
  createLeaderboardApplication,
} from "../application/service";
export type LeaderboardModuleDependencies = LeaderboardApplicationDependencies<
  LeaderboardScope,
  CreateLeaderboardScopeCommand,
  LeaderboardEntry,
  RankingConfiguration
>;
export function createLeaderboardModule(
  deps: LeaderboardModuleDependencies,
): LeaderboardModulePublicApi {
  return createLeaderboardApplication(deps);
}
export { createPostgresLeaderboardDependencies } from "../infrastructure/postgres";
export { DEFAULT_LINEAR_REQUIRED_RANKING_CONFIGURATION } from "../infrastructure/postgres";
export type {
  PostgresLeaderboardDependencies,
  PostgresLeaderboardOptions,
  PostgresPool,
  PostgresQueryResult,
} from "../infrastructure/postgres";
