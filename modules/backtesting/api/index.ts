import type {
  BacktestingModulePublicApi,
  CandidatePage,
  CandidatePageRequest,
  CandidateProgress,
  Experiment,
  SearchCandidateSummary,
  StartManualBacktestCommand,
  SubmitSearchCandidateCommand,
  TradePage,
  TradePageRequest,
} from "./contracts";
import type { AuthenticatedRequestContext } from "modules/auth/api";

export * from "./contracts";
export type {
  BacktestExecutionCapacity,
  BacktestExecutionPort,
  BacktestExecutionRequest,
  BacktestExecutionState,
  BacktestExecutionStatus,
  BacktestRunner,
  BacktestSubmission,
  BacktestTerminalOutcome,
} from "../application/ports";

const notImplemented = (): never => {
  throw new Error("NOT_IMPLEMENTED");
};

export const startManual: BacktestingModulePublicApi["startManual"] = async (
  _context: AuthenticatedRequestContext,
  _command: StartManualBacktestCommand,
) => notImplemented();
export const submitSearchCandidate: BacktestingModulePublicApi["submitSearchCandidate"] = async (
  _context: AuthenticatedRequestContext,
  _command: SubmitSearchCandidateCommand,
) => notImplemented();
export const status = async (
  _context: AuthenticatedRequestContext,
  _candidateId: string,
): Promise<CandidateProgress> => notImplemented();
export const summarizeSearchCandidates = async (
  _context: AuthenticatedRequestContext,
  _searchRunId: string,
): Promise<SearchCandidateSummary> => notImplemented();
export const listSearchCandidates = async (
  _context: AuthenticatedRequestContext,
  _searchRunId: string,
  _page: CandidatePageRequest,
): Promise<CandidatePage> => notImplemented();
export const cancelSearchCandidates: BacktestingModulePublicApi["cancelSearchCandidates"] =
  async (_context: AuthenticatedRequestContext, _searchRunId: string) => notImplemented();
export const cancelCandidate: BacktestingModulePublicApi["cancelCandidate"] = async (
  _context: AuthenticatedRequestContext,
  _candidateId: string,
) => notImplemented();
export const readExperiment = async (
  _context: AuthenticatedRequestContext,
  _experimentId: string,
): Promise<Experiment> => notImplemented();
export const listSearchExperiments = async (
  _context: AuthenticatedRequestContext,
  _searchRunId: string,
): Promise<readonly Experiment[]> => notImplemented();
export const listExperimentTrades = async (
  _context: AuthenticatedRequestContext,
  _experimentId: string,
  _page: TradePageRequest,
): Promise<TradePage> => notImplemented();
