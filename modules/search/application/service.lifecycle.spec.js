"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const service_1 = require("./service");
const auth = { userId: "owner-1" };
const config = {
    searchSpace: { availableStrategies: [{ id: "strategy-1", userId: auth.userId }] },
    stopCondition: { maxCandidates: 3 },
    generatorType: "RANDOM",
    leaderboardScopeId: "scope-1",
    maxInFlight: 1,
};
(0, vitest_1.describe)("Search lifecycle projections", () => {
    (0, vitest_1.it)("keeps status projection-only and does not generate or persist", async () => {
        const dependencies = (0, service_1.createInMemorySearchDependencies)();
        let generated = 0;
        let submitted = 0;
        let saves = 0;
        const originalSave = dependencies.searchRunRepository.save;
        const originalGenerator = dependencies.generators.RANDOM;
        dependencies.generators.RANDOM = {
            ...originalGenerator,
            generate: (searchSpace) => {
                generated += 1;
                return originalGenerator.generate(searchSpace);
            },
        };
        dependencies.searchRunRepository = {
            ...dependencies.searchRunRepository,
            save: async (run) => {
                saves += 1;
                return originalSave(run);
            },
        };
        dependencies.backtestCoordinator = {
            ...dependencies.backtestCoordinator,
            submitSearchCandidate: async (_auth, command) => {
                submitted += 1;
                return { candidateId: `candidate-${submitted}`, jobId: `candidate-${submitted}`, status: "QUEUED" };
            },
            summarizeSearchCandidates: async (_auth, searchRunId) => ({
                searchRunId,
                active: [],
                queuedCount: 1,
                runningCount: 0,
                candidatesTested: 0,
                failedCandidateCount: 0,
                retryExhaustedCandidateCount: 0,
                infrastructureFailureCandidateCount: 0,
                completionProcessingFailureCandidateCount: 0,
                failedAttemptCount: 0,
                averageBacktestDurationMs: null,
            }),
        };
        const runtime = (0, service_1.createSearchModule)(dependencies);
        const started = await runtime.start(auth, config);
        await runtime.fillAvailableSlots(started.searchRunId);
        const beforeStatus = { generated, submitted, saves };
        await (0, vitest_1.expect)(runtime.status(auth, started.searchRunId)).resolves.toMatchObject({
            searchRunId: started.searchRunId,
            state: "RUNNING",
            queuedCount: 1,
        });
        (0, vitest_1.expect)({ generated, submitted, saves }).toEqual(beforeStatus);
    });
    (0, vitest_1.it)("fills from the post-commit completion callback", async () => {
        const dependencies = (0, service_1.createInMemorySearchDependencies)();
        let active = 0;
        let submitted = 0;
        dependencies.generators.RANDOM = {
            type: "RANDOM",
            generate: () => ({
                generatedBy: "RANDOM",
                strategyDefinitions: [],
                compositeDefinition: {},
                executionPolicyIntent: { mode: "TWO_SIDED_ONE_X_V1" },
            }),
        };
        dependencies.backtestCoordinator = {
            ...dependencies.backtestCoordinator,
            submitSearchCandidate: async (_auth, command) => {
                submitted += 1;
                active = 1;
                return { candidateId: `candidate-${submitted}`, jobId: `candidate-${submitted}`, status: "QUEUED" };
            },
            summarizeSearchCandidates: async (_auth, searchRunId) => ({
                searchRunId,
                active: active === 0 ? [] : [{ candidateId: "active", origin: "SEARCH", selectionMode: "COMPOSITE", searchRunId, leaderboardScopeId: "scope-1", status: "QUEUED", attempts: [], maxAttempts: 1, completionAttemptCount: 0, completionMaxAttempts: 5, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" }],
                queuedCount: active,
                runningCount: 0,
                candidatesTested: 0,
                failedCandidateCount: 0,
                retryExhaustedCandidateCount: 0,
                infrastructureFailureCandidateCount: 0,
                completionProcessingFailureCandidateCount: 0,
                failedAttemptCount: 0,
                averageBacktestDurationMs: null,
            }),
        };
        const runtime = (0, service_1.createSearchModule)(dependencies);
        const started = await runtime.start(auth, config);
        await runtime.fillAvailableSlots(started.searchRunId);
        (0, vitest_1.expect)(submitted).toBe(1);
        active = 0;
        await runtime.onCandidateFinished(started.searchRunId);
        (0, vitest_1.expect)(submitted).toBe(2);
    });
});
