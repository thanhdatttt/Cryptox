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
  _command: StartManualBacktestCommand,
) => notImplemented();
export const submitSearchCandidate: BacktestingModulePublicApi["submitSearchCandidate"] = async (
  _command: SubmitSearchCandidateCommand,
) => notImplemented();
export const status = async (_candidateId: string): Promise<CandidateProgress> => notImplemented();
export const summarizeSearchCandidates = async (
  _searchRunId: string,
): Promise<SearchCandidateSummary> => notImplemented();
export const listSearchCandidates = async (
  _searchRunId: string,
  _page: CandidatePageRequest,
): Promise<CandidatePage> => notImplemented();
export const cancelSearchCandidates: BacktestingModulePublicApi["cancelSearchCandidates"] = async () =>
  notImplemented();
export const cancelCandidate: BacktestingModulePublicApi["cancelCandidate"] = async () =>
  notImplemented();
export const readExperiment = async (_experimentId: string): Promise<Experiment> =>
  notImplemented();
export const listSearchExperiments = async (
  _searchRunId: string,
): Promise<readonly Experiment[]> => notImplemented();
export const listExperimentTrades = async (
  _experimentId: string,
  _page: TradePageRequest,
): Promise<TradePage> => notImplemented();
