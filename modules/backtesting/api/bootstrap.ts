export type {
  BacktestExecutionCapacity,
  BacktestExecutionPort,
  BacktestExecutionRequest,
  BacktestExecutionState,
  BacktestExecutionStatus,
  BacktestRunner,
  BacktestSubmission,
  BacktestTerminalOutcome,
  BacktestingApplicationDependencies,
  BacktestingUnitOfWork,
  CandidateRepository,
  ExperimentRepository,
} from "../application/ports";
import type { BacktestingApplicationDependencies } from "../application/ports";
import type {
  BacktestingModulePublicApi,
  CandidateProgress,
  Experiment,
  StartManualBacktestCommand,
  SubmitSearchCandidateCommand,
  Trade,
} from "./contracts";
import {
  cancelCandidate,
  cancelSearchCandidates,
  listSearchCandidates,
  listExperimentTrades,
  listSearchExperiments,
  readExperiment,
  startManual,
  status,
  submitSearchCandidate,
  summarizeSearchCandidates,
} from "./index";
export type BacktestingModuleDependencies = BacktestingApplicationDependencies<
  CandidateProgress,
  StartManualBacktestCommand | SubmitSearchCandidateCommand,
  Experiment,
  Trade
>;
export function createBacktestingModule(
  _deps: BacktestingModuleDependencies,
): BacktestingModulePublicApi {
  return {
    startManual,
    submitSearchCandidate,
    status,
    summarizeSearchCandidates,
    listSearchCandidates,
    cancelSearchCandidates,
    cancelCandidate,
    readExperiment,
    listSearchExperiments,
    listExperimentTrades,
  };
}
