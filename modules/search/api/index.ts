import type {
  SearchRunStatus,
  StartSearchCommand,
} from "./contracts";
import type { SearchRunRankingEntry } from "@cryptox/leaderboard";

export * from "./contracts";

const notImplemented = (): never => {
  throw new Error("NOT_IMPLEMENTED");
};

export const start = async (_command: StartSearchCommand): Promise<{ searchRunId: string }> =>
  notImplemented();
export const pause = async (_searchRunId: string): Promise<void> => notImplemented();
export const resume = async (_searchRunId: string): Promise<void> => notImplemented();
export const cancel = async (_searchRunId: string): Promise<void> => notImplemented();
export const status = async (_searchRunId: string): Promise<SearchRunStatus> => notImplemented();
export const leaderboard = async (
  _searchRunId: string,
): Promise<readonly SearchRunRankingEntry[]> => notImplemented();
