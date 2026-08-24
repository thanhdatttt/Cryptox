export type { BacktestingModuleDependencies } from "../application/ports";
import type { BacktestingModuleDependencies } from "../application/ports";
import type { BacktestLogApi } from "./index";
import {
  cancelManualCandidate,
  cancelSearchCandidates,
  createBenchmarkScope,
  listAttemptTrades,
  listExperimentTrades,
  listSearchCandidates,
  readAttempt,
  readExperimentSummary,
  removePendingJobs,
  startManual,
  status,
  submitSearchCandidate,
  summarizeSearchCandidates,
  verifyReplay,
} from "./index";
export function createBacktestingModule(_deps: BacktestingModuleDependencies): BacktestLogApi {
  return {
    createBenchmarkScope,
    startManual,
    submitSearchCandidate,
    status,
    summarizeSearchCandidates,
    listSearchCandidates,
    cancelSearchCandidates,
    cancelManualCandidate,
    removePendingJobs,
    readAttempt,
    listAttemptTrades,
    readExperimentSummary,
    listExperimentTrades,
    verifyReplay,
  };
}
