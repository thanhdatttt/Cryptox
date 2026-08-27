export type { BacktestingModuleDependencies } from "../application/ports";
import type { BacktestingModuleDependencies } from "../application/ports";
import type { BacktestingModulePublicApi } from "./contracts";
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
