export type { LeaderboardModuleDependencies } from "../application/ports";
import type { LeaderboardModuleDependencies } from "../application/ports";
import type { LeaderboardModulePublicApi } from "./index";
import { rankSearchRun, score, submit, topK } from "./index";
import type { CreateLeaderboardScopeCommand, LeaderboardScope } from "../domain/contracts";
export function createLeaderboardModule(
  _deps: LeaderboardModuleDependencies,
): LeaderboardModulePublicApi & {
  createLeaderboardScope(command: CreateLeaderboardScopeCommand): Promise<LeaderboardScope>;
  getLeaderboardScope(id: string): Promise<LeaderboardScope>;
} {
  return {
    score,
    topK,
    rankSearchRun,
    submit,
    createLeaderboardScope: async () => {
      throw new Error("NOT_IMPLEMENTED");
    },
    getLeaderboardScope: async () => {
      throw new Error("NOT_IMPLEMENTED");
    },
  };
}
