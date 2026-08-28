import type {
  SearchRunStatus,
  SearchRunPage,
  SearchRunPageRequest,
  StartSearchCommand,
} from "./contracts";
import type { SearchRunRankingEntry } from "@cryptox/leaderboard";
import type { AuthenticatedRequestContext } from "modules/auth/api";

export * from "./contracts";

const notImplemented = (): never => {
  throw new Error("NOT_IMPLEMENTED");
};

export const start = async (
  _context: AuthenticatedRequestContext,
  _command: StartSearchCommand,
): Promise<{ searchRunId: string }> => notImplemented();
export const pause = async (
  _context: AuthenticatedRequestContext,
  _searchRunId: string,
): Promise<void> => notImplemented();
export const resume = async (
  _context: AuthenticatedRequestContext,
  _searchRunId: string,
): Promise<void> => notImplemented();
export const cancel = async (
  _context: AuthenticatedRequestContext,
  _searchRunId: string,
): Promise<void> => notImplemented();
export const status = async (
  _context: AuthenticatedRequestContext,
  _searchRunId: string,
): Promise<SearchRunStatus> => notImplemented();
export const list = async (
  _context: AuthenticatedRequestContext,
  _page: SearchRunPageRequest,
): Promise<SearchRunPage> => notImplemented();
export const leaderboard = async (
  _context: AuthenticatedRequestContext,
  _searchRunId: string,
): Promise<readonly SearchRunRankingEntry[]> => notImplemented();
