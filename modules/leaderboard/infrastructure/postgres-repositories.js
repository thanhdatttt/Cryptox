"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPostgresLeaderboardDependencies = exports.createBacktestingExperimentReader = exports.createBacktestingScopeRepository = exports.PostgresLeaderboardEntryRepository = void 0;
const service_1 = require("../application/service");
const date = (value) => new Date(value).toISOString();
const number = (value) => typeof value === "number" ? value : Number(value);
const entry = (row) => ({ id: row.id, rank: 0, experimentResultId: row.experiment_result_id, leaderboardScopeId: row.leaderboard_scope_id, scoreFormulaId: row.score_formula_id, score: number(row.score), addedAt: date(row.added_at) });
class PostgresLeaderboardEntryRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async getActiveTopK(scopeId, limit) { const result = await this.pool.query("SELECT id, experiment_result_id, leaderboard_scope_id, score_formula_id, score, added_at FROM leaderboard_entries WHERE leaderboard_scope_id = $1 AND active = TRUE ORDER BY score DESC, added_at ASC, id ASC LIMIT $2", [scopeId, limit]); return result.rows.map(entry); }
    async getByExperimentResultId(experimentResultId) { const result = await this.pool.query("SELECT id, experiment_result_id, leaderboard_scope_id, score_formula_id, score, added_at FROM leaderboard_entries WHERE experiment_result_id = $1", [experimentResultId]); return result.rows[0] ? entry(result.rows[0]) : undefined; }
    async insert(input) { const result = await this.pool.query("INSERT INTO leaderboard_entries (id, experiment_result_id, leaderboard_scope_id, score_formula_id, score, added_at, active) VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id, experiment_result_id, leaderboard_scope_id, score_formula_id, score, added_at", [`leaderboard-entry-${crypto.randomUUID()}`, input.experimentResultId, input.leaderboardScopeId, input.scoreFormulaId, input.score, input.addedAt]); return entry(result.rows[0]); }
    async deactivate(entryId) { await this.pool.query("UPDATE leaderboard_entries SET active = FALSE WHERE id = $1", [entryId]); }
}
exports.PostgresLeaderboardEntryRepository = PostgresLeaderboardEntryRepository;
const createBacktestingScopeRepository = (backtesting) => ({
    insert: async () => { throw new Error("LEADERBOARD_SCOPE_CREATION_REQUIRES_BACKTESTING"); },
    getById: async (userId, id) => {
        try {
            const source = await backtesting.readBenchmarkScope({ userId }, id);
            return { id: source.id, userId, name: source.name, version: source.version, datasetSnapshot: source.datasetSnapshot, sentimentDatasetSnapshot: source.sentimentDatasetSnapshot, workerRuntimeVersion: source.workerRuntimeVersion, workerRuntimeSha256: source.workerRuntimeSha256, evaluationRuntimeVersion: source.evaluationRuntimeVersion, evaluationRuntimeSha256: source.evaluationRuntimeSha256, initialCapital: source.initialCapital, feeRatePercent: source.feeRatePercent, slippageBps: source.slippageBps, scoreFormulaId: source.scoreFormulaId, createdAt: source.createdAt };
        }
        catch (error) {
            if (error instanceof Error && error.message === "BACKTEST_SCOPE_NOT_FOUND")
                return undefined;
            throw error;
        }
    },
});
exports.createBacktestingScopeRepository = createBacktestingScopeRepository;
const createBacktestingExperimentReader = (backtesting) => ({
    getBySearchRunId: async (userId, searchRunId) => (await backtesting.listSearchExperimentSummaries({ userId }, searchRunId)).map((experiment) => ({ id: experiment.id, candidateId: experiment.candidateId, searchRunId: experiment.searchRunId ?? searchRunId, leaderboardScopeId: experiment.leaderboardScopeId, scoreFormulaId: experiment.scoreFormulaId, overallScore: experiment.overallScore, rankEligible: experiment.rankEligible })),
});
exports.createBacktestingExperimentReader = createBacktestingExperimentReader;
const createPostgresLeaderboardDependencies = (pool, input) => ({
    scopeRepository: input.scopeRepository,
    entryRepository: new PostgresLeaderboardEntryRepository(pool),
    formulaRepository: { getById: async (id) => id === service_1.DEFAULT_SCORE_FORMULA.id ? service_1.DEFAULT_SCORE_FORMULA : undefined, listAll: async () => [service_1.DEFAULT_SCORE_FORMULA] },
    experimentReader: input.experimentReader,
    searchRunReader: input.searchRunReader,
    clock: input.clock,
    initialFormulas: [service_1.DEFAULT_SCORE_FORMULA],
});
exports.createPostgresLeaderboardDependencies = createPostgresLeaderboardDependencies;
