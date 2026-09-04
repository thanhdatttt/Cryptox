import type { BacktestLogApi } from "modules/backtesting/api";
import type { CompletionUnitOfWork } from "modules/backtesting/api";
import { DEFAULT_SCORE_FORMULA } from "../application/service";
import type { ExperimentResultReader, LeaderboardEntryRepository, LeaderboardModuleDependencies, LeaderboardScopeRepository, SearchRunOwnerReader } from "../application/ports";
import type { LeaderboardEntry, LeaderboardScope, ScoreFormula } from "../domain/contracts";

export interface LeaderboardSqlClient { query<Row>(text: string, values: unknown[]): Promise<{ rows: Row[] }>; }
interface EntryRow { id: string; experiment_result_id: string; leaderboard_scope_id: string; score_formula_id: string; score: number | string; added_at: Date | string; }
const date = (value: Date | string): string => new Date(value).toISOString();
const number = (value: number | string): number => typeof value === "number" ? value : Number(value);
const entry = (row: EntryRow): LeaderboardEntry => ({ id: row.id, rank: 0, experimentResultId: row.experiment_result_id, leaderboardScopeId: row.leaderboard_scope_id, scoreFormulaId: row.score_formula_id, score: number(row.score), addedAt: date(row.added_at) });

export class PostgresLeaderboardEntryRepository implements LeaderboardEntryRepository {
  constructor(private readonly pool: LeaderboardSqlClient) {}
  async getActiveTopK(scopeId: string, limit: number, unitOfWork?: CompletionUnitOfWork): Promise<LeaderboardEntry[]> { const client: LeaderboardSqlClient = unitOfWork?.query ? { query: (text, values) => unitOfWork.query!(text, values) } : this.pool; const result = await client.query<EntryRow>("SELECT le.id, le.experiment_result_id, le.leaderboard_scope_id, le.score_formula_id, le.score, le.added_at FROM leaderboard_entries le JOIN backtest_experiment_results er ON er.id = le.experiment_result_id JOIN backtest_candidates c ON c.id = er.candidate_id WHERE le.leaderboard_scope_id = $1 AND le.active = TRUE AND c.origin = 'SEARCH' AND c.search_run_id IS NOT NULL ORDER BY le.score DESC, le.added_at ASC, le.id ASC LIMIT $2", [scopeId, limit]); return result.rows.map(entry); }
  async getByExperimentResultId(experimentResultId: string, unitOfWork?: CompletionUnitOfWork): Promise<LeaderboardEntry | undefined> { const client: LeaderboardSqlClient = unitOfWork?.query ? { query: (text, values) => unitOfWork.query!(text, values) } : this.pool; const result = await client.query<EntryRow>("SELECT id, experiment_result_id, leaderboard_scope_id, score_formula_id, score, added_at FROM leaderboard_entries WHERE experiment_result_id = $1", [experimentResultId]); return result.rows[0] ? entry(result.rows[0]) : undefined; }
  async insert(input: Omit<LeaderboardEntry, "id" | "rank">, unitOfWork?: CompletionUnitOfWork): Promise<LeaderboardEntry> { const client: LeaderboardSqlClient = unitOfWork?.query ? { query: (text, values) => unitOfWork.query!(text, values) } : this.pool; const result = await client.query<EntryRow>("INSERT INTO leaderboard_entries (id, experiment_result_id, leaderboard_scope_id, score_formula_id, score, added_at, active) VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id, experiment_result_id, leaderboard_scope_id, score_formula_id, score, added_at", [`leaderboard-entry-${crypto.randomUUID()}`, input.experimentResultId, input.leaderboardScopeId, input.scoreFormulaId, input.score, input.addedAt]); return entry(result.rows[0]!); }
  async deactivate(entryId: string, unitOfWork?: CompletionUnitOfWork): Promise<void> { const client: LeaderboardSqlClient = unitOfWork?.query ? { query: (text, values) => unitOfWork.query!(text, values) } : this.pool; await client.query("UPDATE leaderboard_entries SET active = FALSE WHERE id = $1", [entryId]); }
}

export const createBacktestingScopeRepository = (backtesting: Pick<BacktestLogApi, "readBenchmarkScope">): LeaderboardScopeRepository => ({
  insert: async () => { throw new Error("LEADERBOARD_SCOPE_CREATION_REQUIRES_BACKTESTING"); },
  getById: async (userId, id) => {
    try {
      const source = await backtesting.readBenchmarkScope({ userId }, id);
      return { id: source.id, userId, name: source.name, version: source.version, datasetSnapshot: source.datasetSnapshot, sentimentDatasetSnapshot: source.sentimentDatasetSnapshot, workerRuntimeVersion: source.workerRuntimeVersion, workerRuntimeSha256: source.workerRuntimeSha256, evaluationRuntimeVersion: source.evaluationRuntimeVersion, evaluationRuntimeSha256: source.evaluationRuntimeSha256, initialCapital: source.initialCapital, feeRatePercent: source.feeRatePercent, slippageBps: source.slippageBps, scoreFormulaId: source.scoreFormulaId, createdAt: source.createdAt } satisfies LeaderboardScope;
    } catch (error) { if (error instanceof Error && error.message === "BACKTEST_SCOPE_NOT_FOUND") return undefined; throw error; }
  },
});

export const createBacktestingExperimentReader = (backtesting: Pick<BacktestLogApi, "listSearchExperimentSummaries">): ExperimentResultReader => ({
  getBySearchRunId: async (userId, searchRunId) => (await backtesting.listSearchExperimentSummaries({ userId }, searchRunId)).map((experiment) => ({ id: experiment.id, candidateId: experiment.candidateId, searchRunId: experiment.searchRunId ?? searchRunId, leaderboardScopeId: experiment.leaderboardScopeId, scoreFormulaId: experiment.scoreFormulaId, overallScore: experiment.overallScore, rankEligible: experiment.rankEligible })),
});

export const createPostgresLeaderboardDependencies = (pool: LeaderboardSqlClient, input: { scopeRepository: LeaderboardScopeRepository; experimentReader: ExperimentResultReader; searchRunReader?: SearchRunOwnerReader; clock: { now(): string } }): LeaderboardModuleDependencies => ({
  scopeRepository: input.scopeRepository,
  entryRepository: new PostgresLeaderboardEntryRepository(pool),
  formulaRepository: { getById: async (id) => id === DEFAULT_SCORE_FORMULA.id ? DEFAULT_SCORE_FORMULA : undefined, listAll: async (): Promise<ScoreFormula[]> => [DEFAULT_SCORE_FORMULA] },
  experimentReader: input.experimentReader,
  searchRunReader: input.searchRunReader,
  clock: input.clock,
  initialFormulas: [DEFAULT_SCORE_FORMULA],
});
