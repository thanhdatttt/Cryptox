"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const postgres_repository_1 = require("./postgres-repository");
const run = {
    searchRunId: "run-1", ownerUserId: "00000000-0000-0000-0000-000000000001", leaderboardScopeId: "scope-1", generatorType: "RANDOM",
    searchSpace: { availableStrategies: [] }, stopCondition: { maxCandidates: 2 }, maxInFlight: 1, state: "RUNNING",
    nextIteration: 2, activeDurationMs: 0, activeSince: "2025-01-01T00:00:00.000Z", createdAt: "2025-01-01T00:00:00.000Z", startedAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z",
    activeCandidates: [], queuedCount: 0, runningCount: 0, candidatesTested: 0, failedCandidateCount: 0, retryExhaustedCandidateCount: 0, infrastructureFailureCandidateCount: 0, completionProcessingFailureCandidateCount: 0, failedAttemptCount: 0, averageBacktestDurationMs: 0,
};
(0, vitest_1.describe)("PostgresSearchRunRepository", () => {
    (0, vitest_1.it)("persists owner-bound deterministic run configuration and lifecycle updates with parameterized SQL", async () => {
        const calls = [];
        const repository = new postgres_repository_1.PostgresSearchRunRepository({ query: async (text, values) => { calls.push({ text, values }); return { rows: [] }; } });
        await repository.insert(run);
        await repository.save({ ...run, state: "COMPLETED", nextIteration: 3, endedAt: "2025-01-01T00:01:00.000Z", stopReason: "MAX_CANDIDATES", updatedAt: "2025-01-01T00:01:00.000Z" });
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO search_runs") && call.values.includes(run.ownerUserId))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("UPDATE search_runs") && call.values.includes("COMPLETED"))).toBe(true);
        (0, vitest_1.expect)(calls.flatMap((call) => call.values)).toContain(JSON.stringify(run.searchSpace));
    });
    (0, vitest_1.it)("uses unique UUID run IDs for PostgreSQL composition instead of the in-memory sequence", () => {
        const dependencies = (0, postgres_repository_1.createPostgresSearchDependencies)({ query: async () => ({ rows: [] }) }, {
            backtestCoordinator: {},
            leaderboardService: {},
            clock: { now: () => "2025-01-01T00:00:00.000Z" },
        });
        const first = dependencies.idGenerator?.();
        const second = dependencies.idGenerator?.();
        (0, vitest_1.expect)(first).toMatch(/^[0-9a-f-]{36}$/);
        (0, vitest_1.expect)(second).toMatch(/^[0-9a-f-]{36}$/);
        (0, vitest_1.expect)(second).not.toBe(first);
    });
    (0, vitest_1.it)("holds a PostgreSQL row lock while filling and commits the same unit of work", async () => {
        const calls = [];
        const row = {
            id: run.searchRunId,
            owner_user_id: run.ownerUserId,
            leaderboard_scope_id: run.leaderboardScopeId,
            generator_type: run.generatorType,
            search_space: run.searchSpace,
            stop_condition: run.stopCondition,
            max_in_flight: run.maxInFlight,
            state: run.state,
            next_iteration: run.nextIteration,
            active_duration_ms: run.activeDurationMs,
            active_since: run.activeSince,
            best_score: null,
            last_improvement_at_candidates: null,
            created_at: run.createdAt,
            started_at: run.startedAt,
            updated_at: run.updatedAt,
            ended_at: null,
            stop_reason: null,
            last_error: null,
        };
        const client = {
            query: async (text, _values) => { calls.push(text); return { rows: text.includes("FOR UPDATE") ? [row] : [] }; },
            release: () => { calls.push("RELEASE"); },
        };
        const repository = new postgres_repository_1.PostgresSearchRunRepository({
            query: async (text, _values) => ({ rows: [] }),
            connect: async () => client,
        });
        await repository.withRunLock(run.ownerUserId, run.searchRunId, async (locked, unitOfWork) => {
            (0, vitest_1.expect)(locked?.searchRunId).toBe(run.searchRunId);
            (0, vitest_1.expect)(unitOfWork?.kind).toBe("CANCELLATION");
            await repository.save({ ...locked, nextIteration: 3 }, unitOfWork);
        });
        (0, vitest_1.expect)(calls[0]).toBe("BEGIN");
        (0, vitest_1.expect)(calls.some((text) => text.includes("FOR UPDATE"))).toBe(true);
        (0, vitest_1.expect)(calls.some((text) => text.startsWith("UPDATE search_runs"))).toBe(true);
        (0, vitest_1.expect)(calls).toContain("COMMIT");
        (0, vitest_1.expect)(calls.at(-1)).toBe("RELEASE");
    });
});
