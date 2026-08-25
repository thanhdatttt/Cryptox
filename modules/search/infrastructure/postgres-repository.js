"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPostgresSearchDependencies = exports.PostgresSearchRunRepository = void 0;
const node_crypto_1 = require("node:crypto");
const service_1 = require("../application/service");
const value = (input) => typeof input === "string" ? JSON.parse(input) : input;
const date = (input) => input === null ? undefined : new Date(input).toISOString();
const number = (input) => typeof input === "number" ? input : Number(input);
const run = (row) => ({ searchRunId: row.id, ownerUserId: row.owner_user_id, leaderboardScopeId: row.leaderboard_scope_id, generatorType: row.generator_type, searchSpace: value(row.search_space), stopCondition: value(row.stop_condition), maxInFlight: row.max_in_flight, state: row.state, nextIteration: row.next_iteration, activeDurationMs: number(row.active_duration_ms), activeSince: date(row.active_since), bestScore: row.best_score === null ? undefined : number(row.best_score), lastImprovementAtCandidates: row.last_improvement_at_candidates ?? undefined, createdAt: date(row.created_at), startedAt: date(row.started_at), updatedAt: date(row.updated_at), endedAt: date(row.ended_at), stopReason: row.stop_reason ?? undefined, lastError: row.last_error ?? undefined, activeCandidates: [], queuedCount: 0, runningCount: 0, candidatesTested: 0, failedCandidateCount: 0, retryExhaustedCandidateCount: 0, infrastructureFailureCandidateCount: 0, completionProcessingFailureCandidateCount: 0, failedAttemptCount: 0, averageBacktestDurationMs: 0 });
class PostgresSearchRunRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    fields() { return "id, owner_user_id, leaderboard_scope_id, generator_type, search_space, stop_condition, max_in_flight, state, next_iteration, active_duration_ms, active_since, best_score, last_improvement_at_candidates, created_at, started_at, updated_at, ended_at, stop_reason, last_error"; }
    async get(id) { const result = await this.pool.query(`SELECT ${this.fields()} FROM search_runs WHERE id = $1`, [id]); return result.rows[0] ? run(result.rows[0]) : undefined; }
    async insert(input) { await this.pool.query("INSERT INTO search_runs (id, owner_user_id, leaderboard_scope_id, generator_type, search_space, stop_condition, max_in_flight, state, next_iteration, active_duration_ms, active_since, best_score, last_improvement_at_candidates, created_at, started_at, updated_at, ended_at, stop_reason, last_error) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)", [input.searchRunId, input.ownerUserId, input.leaderboardScopeId, input.generatorType, JSON.stringify(input.searchSpace), JSON.stringify(input.stopCondition), input.maxInFlight, input.state, input.nextIteration, input.activeDurationMs, input.activeSince ?? null, input.bestScore ?? null, input.lastImprovementAtCandidates ?? null, input.createdAt, input.startedAt ?? null, input.updatedAt, input.endedAt ?? null, input.stopReason ?? null, input.lastError ?? null]); return input; }
    async save(input) { await this.pool.query("UPDATE search_runs SET state = $2, next_iteration = $3, active_duration_ms = $4, active_since = $5, best_score = $6, last_improvement_at_candidates = $7, updated_at = $8, ended_at = $9, stop_reason = $10, last_error = $11 WHERE id = $1", [input.searchRunId, input.state, input.nextIteration, input.activeDurationMs, input.activeSince ?? null, input.bestScore ?? null, input.lastImprovementAtCandidates ?? null, input.updatedAt, input.endedAt ?? null, input.stopReason ?? null, input.lastError ?? null]); return input; }
    async listRunning() { const result = await this.pool.query(`SELECT ${this.fields()} FROM search_runs WHERE state = 'RUNNING'`, []); return result.rows.map(run); }
}
exports.PostgresSearchRunRepository = PostgresSearchRunRepository;
const createPostgresSearchDependencies = (pool, input) => ({ ...(0, service_1.createInMemorySearchDependencies)(), ...input, idGenerator: input.idGenerator ?? node_crypto_1.randomUUID, generators: input.generators ?? (0, service_1.createInMemorySearchDependencies)().generators, searchRunRepository: new PostgresSearchRunRepository(pool) });
exports.createPostgresSearchDependencies = createPostgresSearchDependencies;
