import { describe, expect, it } from "vitest";
import { createInMemorySearchDependencies, createSearchModule, start } from "./index";

const summary = (searchRunId: string, tested = 0) => ({ searchRunId, active: [], queuedCount: 0, runningCount: 0, candidatesTested: tested, failedCandidateCount: 0, retryExhaustedCandidateCount: 0, infrastructureFailureCandidateCount: 0, completionProcessingFailureCandidateCount: 0, failedAttemptCount: 0, averageBacktestDurationMs: null });

function dependencies(tested = 0) {
  const deps = createInMemorySearchDependencies();
  let submissions = 0;
  let cancellations = 0;
  deps.generators.RANDOM = { type: "RANDOM", generate: () => ({ generatedBy: "RANDOM", strategyDefinitions: [], compositeDefinition: {} } as never) };
  deps.backtestCoordinator = {
    submitSearchCandidate: async () => { submissions += 1; return { candidateId: `candidate-${submissions}`, jobId: `job-${submissions}`, status: "QUEUED" as const }; },
    summarizeSearchCandidates: async (searchRunId) => summary(searchRunId, tested),
    cancelSearchCandidates: async () => { cancellations += 1; return { candidateIds: ["candidate-1"] }; },
    removePendingJobs: async () => undefined,
  };
  deps.leaderboardService = { rankSearchRun: async () => [] };
  deps.clock = { now: () => "2025-01-01T00:00:00.000Z" };
  return { deps, submissions: () => submissions, cancellations: () => cancellations };
}

const config = { searchSpace: { availableStrategies: [] }, stopCondition: { maxCandidates: 3 }, generatorType: "RANDOM" as const, leaderboardScopeId: "scope", maxInFlight: 2 };

describe("search runtime", () => {
  it("fills only the available bounded slots and persists a pollable running status", async () => {
    const fixture = dependencies();
    const runtime = createSearchModule(fixture.deps);
    const { searchRunId } = await runtime.start(config);

    expect(fixture.submissions()).toBe(2);
    expect(await runtime.status(searchRunId)).toMatchObject({ state: "RUNNING", maxInFlight: 2, nextIteration: 3 });
  });

  it("completes immediately when a stop boundary is drained and cancels idempotently", async () => {
    const stopped = dependencies(3);
    const stoppedRuntime = createSearchModule(stopped.deps);
    const stoppedRun = await stoppedRuntime.start(config);
    await expect(stoppedRuntime.status(stoppedRun.searchRunId)).resolves.toMatchObject({ state: "COMPLETED", stopReason: "MAX_CANDIDATES" });

    const active = dependencies();
    const activeRuntime = createSearchModule(active.deps);
    const activeRun = await activeRuntime.start(config);
    await activeRuntime.cancel(activeRun.searchRunId);
    await activeRuntime.cancel(activeRun.searchRunId);
    await expect(activeRuntime.status(activeRun.searchRunId)).resolves.toMatchObject({ state: "CANCELLED", stopReason: "USER_CANCELLED" });
    expect(active.cancellations()).toBe(1);
  });

  it("keeps the static lifecycle facade explicit while composed loops are stateful", async () => {
    await expect(start(config)).rejects.toThrow("NOT_IMPLEMENTED");
  });
});
