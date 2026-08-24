"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("./index");
const summary = (searchRunId, tested = 0) => ({ searchRunId, active: [], queuedCount: 0, runningCount: 0, candidatesTested: tested, failedCandidateCount: 0, retryExhaustedCandidateCount: 0, infrastructureFailureCandidateCount: 0, completionProcessingFailureCandidateCount: 0, failedAttemptCount: 0, averageBacktestDurationMs: null });
function dependencies(tested = 0) {
    const deps = (0, index_1.createInMemorySearchDependencies)();
    let submissions = 0;
    let cancellations = 0;
    deps.generators.RANDOM = { type: "RANDOM", generate: () => ({ generatedBy: "RANDOM", strategyDefinitions: [], compositeDefinition: {} }) };
    deps.backtestCoordinator = {
        submitSearchCandidate: async () => { submissions += 1; return { candidateId: `candidate-${submissions}`, jobId: `job-${submissions}`, status: "QUEUED" }; },
        summarizeSearchCandidates: async (searchRunId) => summary(searchRunId, tested),
        cancelSearchCandidates: async () => { cancellations += 1; return { candidateIds: ["candidate-1"] }; },
        removePendingJobs: async () => undefined,
    };
    deps.leaderboardService = { rankSearchRun: async () => [] };
    deps.clock = { now: () => "2025-01-01T00:00:00.000Z" };
    return { deps, submissions: () => submissions, cancellations: () => cancellations };
}
const config = { searchSpace: { availableStrategies: [] }, stopCondition: { maxCandidates: 3 }, generatorType: "RANDOM", leaderboardScopeId: "scope", maxInFlight: 2 };
(0, vitest_1.describe)("search runtime", () => {
    (0, vitest_1.it)("fills only the available bounded slots and persists a pollable running status", async () => {
        const fixture = dependencies();
        const runtime = (0, index_1.createSearchModule)(fixture.deps);
        const { searchRunId } = await runtime.start(config);
        (0, vitest_1.expect)(fixture.submissions()).toBe(2);
        (0, vitest_1.expect)(await runtime.status(searchRunId)).toMatchObject({ state: "RUNNING", maxInFlight: 2, nextIteration: 3 });
    });
    (0, vitest_1.it)("completes immediately when a stop boundary is drained and cancels idempotently", async () => {
        const stopped = dependencies(3);
        const stoppedRuntime = (0, index_1.createSearchModule)(stopped.deps);
        const stoppedRun = await stoppedRuntime.start(config);
        await (0, vitest_1.expect)(stoppedRuntime.status(stoppedRun.searchRunId)).resolves.toMatchObject({ state: "COMPLETED", stopReason: "MAX_CANDIDATES" });
        const active = dependencies();
        const activeRuntime = (0, index_1.createSearchModule)(active.deps);
        const activeRun = await activeRuntime.start(config);
        await activeRuntime.cancel(activeRun.searchRunId);
        await activeRuntime.cancel(activeRun.searchRunId);
        await (0, vitest_1.expect)(activeRuntime.status(activeRun.searchRunId)).resolves.toMatchObject({ state: "CANCELLED", stopReason: "USER_CANCELLED" });
        (0, vitest_1.expect)(active.cancellations()).toBe(1);
    });
    (0, vitest_1.it)("keeps the static lifecycle facade explicit while composed loops are stateful", async () => {
        await (0, vitest_1.expect)((0, index_1.start)(config)).rejects.toThrow("NOT_IMPLEMENTED");
    });
});
