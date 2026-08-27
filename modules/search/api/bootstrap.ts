import type { SearchApplicationDependencies } from "../application/ports";
import type {
  GeneratedCandidate,
  SearchModulePublicApi,
  SearchRunStatus,
  SearchSpaceConfig,
} from "./contracts";
import { cancel, leaderboard, pause, resume, start, status } from "./index";
export type SearchModuleDependencies = SearchApplicationDependencies<
  SearchRunStatus,
  SearchSpaceConfig,
  GeneratedCandidate
>;
export function createSearchModule(_deps: SearchModuleDependencies): SearchModulePublicApi {
  return {
    start,
    pause,
    resume,
    cancel,
    status,
    leaderboard,
  };
}
