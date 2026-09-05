import { describe, expect, it } from "vitest";
import { createInMemorySearchDependencies, createSearchModule } from "./service";

const auth = { userId: "owner-1" };
const config = {
  searchSpace: { availableStrategies: [{ id: "strategy-1", userId: auth.userId }] as never[] },
  stopCondition: { maxCandidates: 3 },
  generatorType: "RANDOM" as const,
  leaderboardScopeId: "scope-1",
  maxInFlight: 1,
};

describe("Search lifecycle projections", () => {
  it("keeps status projection-only and does not generate or persist", async () => {
    const dependencies = createInMemorySearchDependencies();
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
    const runtime = createSearchModule(dependencies);
    const started = await runtime.start(auth, config);
    await runtime.fillAvailableSlots(started.searchRunId);
    const beforeStatus = { generated, submitted, saves };

    await expect(runtime.status(auth, started.searchRunId)).resolves.toMatchObject({
      searchRunId: started.searchRunId,
      state: "RUNNING",
      queuedCount: 1,
    });

    expect({ generated, submitted, saves }).toEqual(beforeStatus);
  });

  it("passes the Backtesting average duration through the Search status projection", async () => {
    const dependencies = createInMemorySearchDependencies();
    dependencies.generators.RANDOM = {
      type: "RANDOM",
      generate: (_space, context) => ({
        generatedBy: "RANDOM",
        strategyDefinitions: [],
        compositeDefinition: {} as never,
        executionPolicyIntent: { mode: "TWO_SIDED_ONE_X_V1" },
        fingerprint: `duration-projection-${context?.iterationNumber ?? 0}`,
      }),
    };
    dependencies.backtestCoordinator = {
      ...dependencies.backtestCoordinator,
      summarizeSearchCandidates: async (_auth, searchRunId) => ({
        searchRunId,
        active: [],
        queuedCount: 0,
        runningCount: 0,
        candidatesTested: 1,
        failedCandidateCount: 0,
        retryExhaustedCandidateCount: 0,
        infrastructureFailureCandidateCount: 0,
        completionProcessingFailureCandidateCount: 0,
        failedAttemptCount: 0,
        averageBacktestDurationMs: 275,
      }),
    };
    const runtime = createSearchModule(dependencies);
    const started = await runtime.start(auth, config);
    await runtime.fillAvailableSlots(started.searchRunId);

    await expect(runtime.status(auth, started.searchRunId)).resolves.toMatchObject({ candidatesTested: 1, averageBacktestDurationMs: 275 });
  });

  it("fills from the post-commit completion callback", async () => {
    const dependencies = createInMemorySearchDependencies();
    let active = 0;
    let submitted = 0;
    dependencies.generators.RANDOM = {
      type: "RANDOM",
      generate: (_space, context) => ({
        generatedBy: "RANDOM",
        strategyDefinitions: [],
        compositeDefinition: {} as never,
        executionPolicyIntent: { mode: "TWO_SIDED_ONE_X_V1" },
        fingerprint: `fixture-fingerprint-${context?.iterationNumber ?? 0}`,
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
        active: active === 0 ? [] : [{ candidateId: "active", origin: "SEARCH", selectionMode: "COMPOSITE" as const, searchRunId, leaderboardScopeId: "scope-1", status: "QUEUED", attempts: [], maxAttempts: 1, completionAttemptCount: 0, completionMaxAttempts: 5, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" }],
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
    const runtime = createSearchModule(dependencies);
    const started = await runtime.start(auth, config);
    await runtime.fillAvailableSlots(started.searchRunId);
    expect(submitted).toBe(1);

    active = 0;
    await runtime.onCandidateFinished(started.searchRunId);

    expect(submitted).toBe(2);
  });

  it("retries a downstream draft-validation rejection within the bounded fill budget", async () => {
    const dependencies = createInMemorySearchDependencies();
    const originalSubmit = dependencies.backtestCoordinator.submitSearchCandidate;
    let submissions = 0;
    dependencies.backtestCoordinator = {
      ...dependencies.backtestCoordinator,
      submitSearchCandidate: async (owner, command) => {
        submissions += 1;
        if (submissions === 1) throw new Error("INVALID_STRATEGY_PARAMETERS");
        return originalSubmit(owner, command);
      },
    };
    const runtime = createSearchModule(dependencies);
    const started = await runtime.start(auth, config);
    await runtime.fillAvailableSlots(started.searchRunId);

    expect(submissions).toBeGreaterThanOrEqual(2);
    await expect(runtime.status(auth, started.searchRunId)).resolves.toMatchObject({ state: "RUNNING", queuedCount: 1 });
  });

  it("never submits more than maxInFlight candidates and refills one slot after completion", async () => {
    const dependencies = createInMemorySearchDependencies();
    let active = 0;
    let submitted = 0;
    let maximumObserved = 0;
    dependencies.generators.RANDOM = {
      type: "RANDOM",
      generate: (_space, context) => ({
        generatedBy: "RANDOM",
        strategyDefinitions: [],
        compositeDefinition: {} as never,
        executionPolicyIntent: { mode: "TWO_SIDED_ONE_X_V1" },
        fingerprint: `bounded-fingerprint-${context?.iterationNumber ?? 0}`,
      }),
    };
    dependencies.backtestCoordinator = {
      ...dependencies.backtestCoordinator,
      submitSearchCandidate: async (_auth, _command) => {
        submitted += 1;
        active += 1;
        maximumObserved = Math.max(maximumObserved, active);
        return { candidateId: `candidate-${submitted}`, jobId: `candidate-${submitted}`, status: "QUEUED" };
      },
      summarizeSearchCandidates: async (_auth, searchRunId) => ({
        searchRunId,
        active: Array.from({ length: active }, (_, index) => ({ candidateId: `active-${index}`, origin: "SEARCH", selectionMode: "COMPOSITE" as const, leaderboardScopeId: "scope-1", status: "QUEUED", attempts: [], maxAttempts: 1, completionAttemptCount: 0, completionMaxAttempts: 5, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" })),
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
    const runtime = createSearchModule(dependencies);
    const started = await runtime.start(auth, { ...config, maxInFlight: 2, stopCondition: { maxCandidates: 5 } });
    await runtime.fillAvailableSlots(started.searchRunId);
    expect({ submitted, maximumObserved }).toEqual({ submitted: 2, maximumObserved: 2 });

    active = 1;
    await runtime.onCandidateFinished(started.searchRunId);

    expect({ submitted, maximumObserved }).toEqual({ submitted: 3, maximumObserved: 2 });
  });

  it("fails explicitly when every bounded generator attempt is a duplicate", async () => {
    const dependencies = createInMemorySearchDependencies();
    dependencies.generators.RANDOM = {
      type: "RANDOM",
      generate: () => ({
        generatedBy: "RANDOM",
        strategyDefinitions: [],
        compositeDefinition: {} as never,
        executionPolicyIntent: { mode: "TWO_SIDED_ONE_X_V1" },
        fingerprint: "already-generated",
      }),
    };
    const runtime = createSearchModule(dependencies);
    const started = await runtime.start(auth, { ...config, searchSpace: { ...config.searchSpace, generatedFingerprints: ["already-generated"] } });

    let status = await runtime.status(auth, started.searchRunId);
    for (let attempt = 0; status.state !== "FAILED" && attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1));
      status = await runtime.status(auth, started.searchRunId);
    }

    expect(status).toMatchObject({ state: "FAILED", stopReason: "ERROR", lastError: "SEARCH_GENERATION_EXHAUSTED" });
  });
});
