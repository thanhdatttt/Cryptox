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
import {
  createBacktestingApplication,
  createBacktestRunner,
  type BacktestingCandidate,
  type BacktestingApplication,
  type BacktestingApplicationOptions,
  type CandidateExecutionRequest,
  type CandidateRunResult,
} from "../application/service";
import type {
  BacktestingModulePublicApi,
  Experiment,
  StartManualBacktestCommand,
  SubmitSearchCandidateCommand,
  Trade,
} from "./contracts";
export type BacktestingModuleDependencies = BacktestingApplicationDependencies<
  BacktestingCandidate,
  StartManualBacktestCommand | SubmitSearchCandidateCommand,
  Experiment,
  Trade
>;
export function createBacktestingModule(
  deps: BacktestingModuleDependencies,
  options: BacktestingApplicationOptions = {},
): BacktestingModulePublicApi {
  return createBacktestingApplication(deps, options);
}

export {
  createBacktestingApplication,
  createBacktestRunner,
};
export type {
  BacktestingApplication,
  BacktestingApplicationOptions,
  BacktestingCandidate,
  CandidateExecutionRequest,
  CandidateRunResult,
};
export { createInMemoryBacktestingRepositories, InMemoryBacktestingRepositories } from "../application/memory";
export { createPostgresBacktestingDependencies } from "../infrastructure/postgres";
export type {
  PostgresBacktestingDependencies,
  PostgresBacktestingOptions,
  PostgresPool,
} from "../infrastructure/postgres";
