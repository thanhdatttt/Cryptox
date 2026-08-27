import { describe, expect, it } from "vitest";
import * as backtestingApi from "./index";

describe("backtesting public entrypoint", () => {
  it("allowlists the Candidate, Experiment, and execution-port facade", async () => {
    expect(Object.keys(backtestingApi).sort()).toEqual(
      [
        "CANDIDATE_STATUSES",
        "BACKTEST_EXECUTION_V1",
        "BACKTEST_EXECUTION_V1_ID",
        "cancelCandidate",
        "cancelSearchCandidates",
        "listExperimentTrades",
        "listSearchCandidates",
        "listSearchExperiments",
        "readExperiment",
        "startManual",
        "status",
        "submitSearchCandidate",
        "summarizeSearchCandidates",
      ].sort(),
    );
    await expect(backtestingApi.status("candidate")).rejects.toThrow("NOT_IMPLEMENTED");
  });
});
