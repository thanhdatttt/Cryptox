export type { SearchModuleDependencies } from "../application/ports";
import type { SearchModuleDependencies } from "../application/ports";
import type { SearchModulePublicApi } from "./index";
import { cancel, leaderboard, pause, resume, start, status } from "./index";
export function createSearchModule(_deps: SearchModuleDependencies): SearchModulePublicApi & {
  onCandidateFinished(searchRunId: string): Promise<void>;
  fillAvailableSlots(searchRunId: string): Promise<void>;
} {
  return {
    start,
    pause,
    resume,
    cancel,
    status,
    leaderboard,
    onCandidateFinished: async () => {
      throw new Error("NOT_IMPLEMENTED");
    },
    fillAvailableSlots: async () => {
      throw new Error("NOT_IMPLEMENTED");
    },
  };
}
