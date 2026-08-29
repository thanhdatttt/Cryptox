import type {
  SearchRunStatus,
  SearchRunPage,
  SearchRunPageRequest,
  StartSearchCommand,
} from "./contracts";
import type { SearchRunRankingEntry } from "@cryptox/leaderboard";
import type { AuthenticatedRequestContext } from "modules/auth/api";
import { defineComposite } from "@cryptox/strategy";
import {
  status as backtestStatus,
  submitSearchCandidate,
  summarizeSearchCandidates,
  cancelSearchCandidates,
} from "@cryptox/backtesting";
import { getLeaderboardScope, rankSearchRun } from "@cryptox/leaderboard";
import { createSearchApplication } from "../application/service";
import { InMemorySearchRunRepository } from "../application/memory";
import { SeededRandomStrategyGenerator } from "../domain/random-generator";

export * from "./contracts";

const defaultApplication = createSearchApplication({
  searchRunRepository: new InMemorySearchRunRepository(),
  generators: { RANDOM: new SeededRandomStrategyGenerator() },
  strategy: { defineComposite },
  backtesting: {
    submitSearchCandidate,
    status: backtestStatus,
    summarizeSearchCandidates,
    cancelSearchCandidates,
  },
  leaderboard: { getLeaderboardScope, rankSearchRun },
});

export const start = async (
  context: AuthenticatedRequestContext,
  command: StartSearchCommand,
): Promise<{ searchRunId: string }> => defaultApplication.start(context, command);
export const pause = async (
  context: AuthenticatedRequestContext,
  searchRunId: string,
): Promise<void> => defaultApplication.pause(context, searchRunId);
export const resume = async (
  context: AuthenticatedRequestContext,
  searchRunId: string,
): Promise<void> => defaultApplication.resume(context, searchRunId);
export const cancel = async (
  context: AuthenticatedRequestContext,
  searchRunId: string,
): Promise<void> => defaultApplication.cancel(context, searchRunId);
export const status = async (
  context: AuthenticatedRequestContext,
  searchRunId: string,
): Promise<SearchRunStatus> => defaultApplication.status(context, searchRunId);
export const list = async (
  context: AuthenticatedRequestContext,
  page: SearchRunPageRequest,
): Promise<SearchRunPage> => defaultApplication.list(context, page);
export const leaderboard = async (
  context: AuthenticatedRequestContext,
  searchRunId: string,
): Promise<readonly SearchRunRankingEntry[]> => defaultApplication.leaderboard(context, searchRunId);
