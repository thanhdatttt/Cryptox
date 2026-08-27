import { describe, expect, it } from "vitest";
import { SEARCH_GENERATOR_TYPES, type SearchRunStatus } from "./contracts";

describe("search public contracts", () => {
  it("owns a RANDOM-only SearchRun projection without Candidate state", () => {
    const status: SearchRunStatus = {
      searchRunId: "run-1",
      generatorType: "RANDOM",
      searchSpace: { availableStrategyDefinitionIds: ["strategy-1"] },
      stopCondition: { maxCandidates: 10 },
      leaderboardScopeId: "scope-1",
      maxInFlight: 2,
      state: "RUNNING",
      activeCandidateIds: ["candidate-1"],
      submittedCandidateCount: 1,
      completedCandidateCount: 0,
      failedCandidateCount: 0,
      averageBacktestDurationMs: null,
      createdAt: "2026-08-27T00:00:00.000Z",
      updatedAt: "2026-08-27T00:00:00.000Z",
    };

    expect(SEARCH_GENERATOR_TYPES).toEqual(["RANDOM"]);
    expect(status.activeCandidateIds).toEqual(["candidate-1"]);
    expect(status).not.toHaveProperty("activeCandidates");
  });
});
