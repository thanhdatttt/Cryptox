import { randomUUID } from "node:crypto";
import type { SearchModuleDependencies, SearchRunRepository } from "../application/ports";
import { createInMemorySearchDependencies } from "../application/service";
import type { SearchRun } from "../domain/contracts";
import type { CancellationUnitOfWork } from "modules/backtesting/api";

export interface SearchSqlClient { query<Row>(text: string, values: unknown[]): Promise<{ rows: Row[] }>; connect?(): Promise<{ query<Row>(text: string, values: unknown[]): Promise<{ rows: Row[] }>; release(): void }>; }
export const createPostgresCancellationUnitOfWork = async (pool: SearchSqlClient): Promise<CancellationUnitOfWork> => {
  if (!pool.connect) return createInMemorySearchDependencies().beginCancellation();
  const client = await pool.connect();
  await client.query("BEGIN", []);
  const rollbacks: Array<() => Promise<void>> = [];
  let closed = false;
  return {
    kind: "CANCELLATION",
    id: `cancellation-${randomUUID()}`,
    query: <Row>(text: string, values: unknown[]) => client.query<Row>(text, values),
    run: async <T>(operation: () => Promise<T>) => operation(),
    onRollback: (operation) => { if (!closed) rollbacks.push(operation); },
    commit: async () => { if (closed) return; await client.query("COMMIT", []); closed = true; rollbacks.length = 0; client.release(); },
    rollback: async () => { if (closed) return; try { await client.query("ROLLBACK", []); } finally { closed = true; client.release(); for (const operation of rollbacks.reverse()) await operation(); rollbacks.length = 0; } },
  };
};
interface SearchRunRow { id: string; owner_user_id: string; leaderboard_scope_id: string; generator_type: SearchRun["generatorType"]; search_space: SearchRun["searchSpace"] | string; stop_condition: SearchRun["stopCondition"] | string; max_in_flight: number; state: SearchRun["state"]; next_iteration: number; active_duration_ms: number | string; active_since: Date | string | null; best_score: number | string | null; last_improvement_at_candidates: number | null; created_at: Date | string; started_at: Date | string | null; updated_at: Date | string; ended_at: Date | string | null; stop_reason: SearchRun["stopReason"] | null; last_error: string | null; }
const value = <T>(input: T | string): T => typeof input === "string" ? JSON.parse(input) as T : input;
const date = (input: Date | string | null): string | undefined => input === null ? undefined : new Date(input).toISOString();
const number = (input: number | string): number => typeof input === "number" ? input : Number(input);
const run = (row: SearchRunRow): SearchRun => ({ searchRunId: row.id, ownerUserId: row.owner_user_id, leaderboardScopeId: row.leaderboard_scope_id, generatorType: row.generator_type, searchSpace: value<SearchRun["searchSpace"]>(row.search_space), stopCondition: value<SearchRun["stopCondition"]>(row.stop_condition), maxInFlight: row.max_in_flight, state: row.state, nextIteration: row.next_iteration, activeDurationMs: number(row.active_duration_ms), activeSince: date(row.active_since), bestScore: row.best_score === null ? undefined : number(row.best_score), lastImprovementAtCandidates: row.last_improvement_at_candidates ?? undefined, createdAt: date(row.created_at)!, startedAt: date(row.started_at), updatedAt: date(row.updated_at)!, endedAt: date(row.ended_at), stopReason: row.stop_reason ?? undefined, lastError: row.last_error ?? undefined, activeCandidates: [], queuedCount: 0, runningCount: 0, candidatesTested: 0, failedCandidateCount: 0, retryExhaustedCandidateCount: 0, infrastructureFailureCandidateCount: 0, completionProcessingFailureCandidateCount: 0, failedAttemptCount: 0, averageBacktestDurationMs: null });

export class PostgresSearchRunRepository implements SearchRunRepository {
  constructor(private readonly pool: SearchSqlClient) {}
  private fields(): string { return "id, owner_user_id, leaderboard_scope_id, generator_type, search_space, stop_condition, max_in_flight, state, next_iteration, active_duration_ms, active_since, best_score, last_improvement_at_candidates, created_at, started_at, updated_at, ended_at, stop_reason, last_error"; }
  async get(id: string): Promise<SearchRun | undefined> { const result = await this.pool.query<SearchRunRow>(`SELECT ${this.fields()} FROM search_runs WHERE id = $1`, [id]); return result.rows[0] ? run(result.rows[0]) : undefined; }
  async getByOwner(ownerUserId: string, id: string): Promise<SearchRun | undefined> { const result = await this.pool.query<SearchRunRow>(`SELECT ${this.fields()} FROM search_runs WHERE id = $1 AND owner_user_id = $2`, [id, ownerUserId]); return result.rows[0] ? run(result.rows[0]) : undefined; }
  async getByOwnerForUpdate(ownerUserId: string, id: string, unitOfWork: CancellationUnitOfWork): Promise<SearchRun | undefined> { const client: SearchSqlClient = unitOfWork.query ? { query: (text, values) => unitOfWork.query!(text, values) } : this.pool; const result = await client.query<SearchRunRow>(`SELECT ${this.fields()} FROM search_runs WHERE id = $1 AND owner_user_id = $2 FOR UPDATE`, [id, ownerUserId]); return result.rows[0] ? run(result.rows[0]) : undefined; }
  async insert(input: SearchRun): Promise<SearchRun> { await this.pool.query("INSERT INTO search_runs (id, owner_user_id, leaderboard_scope_id, generator_type, search_space, stop_condition, max_in_flight, state, next_iteration, active_duration_ms, active_since, best_score, last_improvement_at_candidates, created_at, started_at, updated_at, ended_at, stop_reason, last_error) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)", [input.searchRunId, input.ownerUserId, input.leaderboardScopeId, input.generatorType, JSON.stringify(input.searchSpace), JSON.stringify(input.stopCondition), input.maxInFlight, input.state, input.nextIteration, input.activeDurationMs, input.activeSince ?? null, input.bestScore ?? null, input.lastImprovementAtCandidates ?? null, input.createdAt, input.startedAt ?? null, input.updatedAt, input.endedAt ?? null, input.stopReason ?? null, input.lastError ?? null]); return input; }
  async save(input: SearchRun, unitOfWork?: CancellationUnitOfWork): Promise<SearchRun> { const client: SearchSqlClient = unitOfWork?.query ? { query: (text, values) => unitOfWork.query!(text, values) } : this.pool; await client.query("UPDATE search_runs SET state = $2, search_space = $3::jsonb, next_iteration = $4, active_duration_ms = $5, active_since = $6, best_score = $7, last_improvement_at_candidates = $8, updated_at = $9, ended_at = $10, stop_reason = $11, last_error = $12 WHERE id = $1", [input.searchRunId, input.state, JSON.stringify(input.searchSpace), input.nextIteration, input.activeDurationMs, input.activeSince ?? null, input.bestScore ?? null, input.lastImprovementAtCandidates ?? null, input.updatedAt, input.endedAt ?? null, input.stopReason ?? null, input.lastError ?? null]); return input; }
  async listRunning(): Promise<SearchRun[]> { const result = await this.pool.query<SearchRunRow>(`SELECT ${this.fields()} FROM search_runs WHERE state = 'RUNNING'`, []); return result.rows.map(run); }
  async listByOwner(ownerUserId: string, limit = 50): Promise<SearchRun[]> {
    const result = await this.pool.query<SearchRunRow>(
      `SELECT s.id, s.owner_user_id, s.leaderboard_scope_id, s.generator_type, s.search_space, s.stop_condition, s.max_in_flight, s.state, s.next_iteration, s.active_duration_ms, s.active_since,
        (
          SELECT MAX(r.overall_score)
          FROM backtest_experiment_results r
          JOIN backtest_candidates c ON c.id = r.candidate_id
          WHERE c.search_run_id = s.id AND r.rank_eligible = true
        ) AS best_score,
        s.last_improvement_at_candidates, s.created_at, s.started_at, s.updated_at, s.ended_at, s.stop_reason, s.last_error
      FROM search_runs s
      WHERE s.owner_user_id = $1
      ORDER BY s.created_at DESC
      LIMIT $2`,
      [ownerUserId, limit]
    );
    return result.rows.map(run);
  }
  async withRunLock<T>(ownerUserId: string, id: string, operation: (run: SearchRun | undefined, unitOfWork?: CancellationUnitOfWork) => Promise<T>): Promise<T> {
    if (!this.pool.connect) return operation(await this.getByOwner(ownerUserId, id));
    const client = await this.pool.connect();
    await client.query("BEGIN", []);
    let closed = false;
    const unitOfWork: CancellationUnitOfWork = { kind: "CANCELLATION", id: `search-fill-${randomUUID()}`, query: <Row>(text: string, values: unknown[]) => client.query<Row>(text, values), run: async <R>(callback: () => Promise<R>) => callback(), onRollback: () => undefined, commit: async () => { if (!closed) { await client.query("COMMIT", []); closed = true; client.release(); } }, rollback: async () => { if (!closed) { try { await client.query("ROLLBACK", []); } finally { closed = true; client.release(); } } } };
    try {
      const result = await client.query<SearchRunRow>(`SELECT ${this.fields()} FROM search_runs WHERE id = $1 AND owner_user_id = $2 FOR NO KEY UPDATE`, [id, ownerUserId]);
      const value = await operation(result.rows[0] ? run(result.rows[0]) : undefined, unitOfWork);
      await unitOfWork.commit();
      return value;
    } catch (error) {
      await unitOfWork.rollback();
      throw error;
    }
  }
}

export const createPostgresSearchDependencies = (pool: SearchSqlClient, input: Omit<SearchModuleDependencies, "searchRunRepository" | "generators" | "beginCancellation"> & { generators?: SearchModuleDependencies["generators"]; idGenerator?: () => string; beginCancellation?: SearchModuleDependencies["beginCancellation"] }): SearchModuleDependencies => ({ ...createInMemorySearchDependencies(), ...input, idGenerator: input.idGenerator ?? randomUUID, generators: input.generators ?? createInMemorySearchDependencies().generators, searchRunRepository: new PostgresSearchRunRepository(pool) });
