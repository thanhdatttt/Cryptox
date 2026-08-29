"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SCORE_FORMULA = void 0;
exports.createInMemoryLeaderboardDependencies = createInMemoryLeaderboardDependencies;
exports.createLeaderboardModule = createLeaderboardModule;
const ranking_1 = require("../domain/ranking");
const TOP_K = 10;
const isSha256 = (value) => /^[a-f0-9]{64}$/i.test(value);
const rankEntries = (entries) => [...entries]
    .sort((left, right) => right.score - left.score || left.addedAt.localeCompare(right.addedAt) || left.id.localeCompare(right.id))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
exports.DEFAULT_SCORE_FORMULA = {
    id: "MVP_MANUAL_V1",
    version: 1,
    name: "MVP Return / Win Rate / Risk",
    weights: { return: 0.5, winRate: 0.2, riskScore: 0.3 },
    riskScoreMethod: "MVP_SHARPE_DRAWDOWN_V1",
    riskScoreParameters: {},
    createdAt: "2025-01-01T00:00:00.000Z",
};
function createInMemoryLeaderboardDependencies() {
    const scopes = new Map();
    const formulas = new Map([[exports.DEFAULT_SCORE_FORMULA.id, exports.DEFAULT_SCORE_FORMULA]]);
    const entries = new Map();
    let sequence = 0;
    return {
        scopeRepository: {
            insert: async (scope) => { scopes.set(scope.id, scope); return scope; },
            getById: async (userId, id) => { const scope = scopes.get(id); return scope?.userId === userId ? scope : undefined; },
        },
        formulaRepository: {
            getById: async (id) => formulas.get(id),
            listAll: async () => [...formulas.values()],
        },
        entryRepository: {
            getActiveTopK: async (scopeId, limit) => rankEntries([...entries.values()].filter((record) => record.active && record.entry.leaderboardScopeId === scopeId).map((record) => record.entry)).slice(0, limit),
            getByExperimentResultId: async (experimentResultId) => entries.get(experimentResultId)?.entry,
            insert: async (entry) => {
                const created = { ...entry, id: `leaderboard-entry-${++sequence}`, rank: 0 };
                entries.set(created.experimentResultId, { entry: created, active: true });
                return created;
            },
            deactivate: async (entryId) => {
                for (const record of entries.values())
                    if (record.entry.id === entryId)
                        record.active = false;
            },
        },
        experimentReader: { getBySearchRunId: async () => [] },
        clock: { now: () => new Date().toISOString() },
        initialFormulas: [exports.DEFAULT_SCORE_FORMULA],
        idGenerator: () => `leaderboard-scope-${++sequence}`,
    };
}
const validateScopeCommand = (command) => {
    if (!command.name.trim() || !command.datasetSnapshot.id || !command.datasetSnapshot.pair || command.datasetSnapshot.candleCount < 0 || !isSha256(command.datasetSnapshot.sha256))
        throw new Error("INVALID_SCOPE");
    if (![command.initialCapital, command.feeRatePercent, command.slippageBps].every(Number.isFinite) || command.initialCapital <= 0 || command.feeRatePercent < 0 || command.slippageBps < 0)
        throw new Error("INVALID_SCOPE");
    if (![command.workerRuntimeVersion, command.evaluationRuntimeVersion].every((value) => value.trim().length > 0) || !isSha256(command.workerRuntimeSha256) || !isSha256(command.evaluationRuntimeSha256))
        throw new Error("INVALID_SCOPE");
};
function createLeaderboardModule(dependencies = createInMemoryLeaderboardDependencies()) {
    const scopeCache = new Map((dependencies.initialScopes ?? []).map((scope) => [scope.id, scope]));
    const formulaCache = new Map((dependencies.initialFormulas ?? []).map((formula) => [formula.id, formula]));
    const idGenerator = dependencies.idGenerator ?? (() => `leaderboard-scope-${crypto.randomUUID()}`);
    const assertOwner = (userId) => { if (!userId?.trim())
        throw new Error("INVALID_AUTH_CONTEXT"); };
    const cacheScopeAndFormula = async (scope) => {
        scopeCache.set(scope.id, scope);
        const cached = formulaCache.get(scope.scoreFormulaId);
        if (cached)
            return cached;
        const formula = await dependencies.formulaRepository.getById(scope.scoreFormulaId);
        if (!formula)
            throw new Error("SCORE_FORMULA_NOT_FOUND");
        formulaCache.set(formula.id, formula);
        return formula;
    };
    return {
        score: async (leaderboardScopeId, metrics) => {
            const scope = scopeCache.get(leaderboardScopeId);
            const formula = scope ? await cacheScopeAndFormula(scope) : formulaCache.get(exports.DEFAULT_SCORE_FORMULA.id) ?? exports.DEFAULT_SCORE_FORMULA;
            return (0, ranking_1.scoreEvaluation)(leaderboardScopeId, formula, metrics);
        },
        topK: async (userId, leaderboardScopeId) => {
            assertOwner(userId);
            const scope = await dependencies.scopeRepository.getById(userId, leaderboardScopeId);
            if (!scope)
                throw new Error("SCOPE_NOT_FOUND");
            await cacheScopeAndFormula(scope);
            return rankEntries(await dependencies.entryRepository.getActiveTopK(leaderboardScopeId, TOP_K));
        },
        rankSearchRun: async (userId, searchRunId) => {
            assertOwner(userId);
            if (dependencies.searchRunReader && !await dependencies.searchRunReader.getByOwner(userId, searchRunId))
                throw new Error("SEARCH_RUN_NOT_FOUND");
            const experiments = await dependencies.experimentReader.getBySearchRunId(userId, searchRunId);
            return experiments
                .filter((experiment) => experiment.rankEligible && Number.isFinite(experiment.overallScore))
                .sort((left, right) => right.overallScore - left.overallScore || left.id.localeCompare(right.id))
                .map((experiment, index) => ({ rank: index + 1, searchRunId, leaderboardScopeId: experiment.leaderboardScopeId, candidateId: experiment.candidateId, experimentResultId: experiment.id, scoreFormulaId: experiment.scoreFormulaId, score: experiment.overallScore }));
        },
        submit: async (experiment, _unitOfWork) => {
            if (!experiment.rankEligible)
                return { admitted: false };
            if (!Number.isFinite(experiment.overallScore))
                throw new Error("INVALID_SCORE");
            if (!experiment.ownerUserId?.trim())
                throw new Error("EXPERIMENT_OWNER_REQUIRED");
            const scope = await dependencies.scopeRepository.getById(experiment.ownerUserId, experiment.leaderboardScopeId);
            if (!scope)
                throw new Error("SCOPE_NOT_FOUND");
            await cacheScopeAndFormula(scope);
            const existing = await dependencies.entryRepository.getByExperimentResultId(experiment.id);
            if (existing)
                return { admitted: existing.leaderboardScopeId === experiment.leaderboardScopeId, entry: existing.leaderboardScopeId === experiment.leaderboardScopeId ? existing : undefined };
            const activeEntries = rankEntries(await dependencies.entryRepository.getActiveTopK(experiment.leaderboardScopeId, TOP_K));
            const lowest = activeEntries[activeEntries.length - 1];
            if (activeEntries.length === TOP_K && experiment.overallScore <= lowest.score)
                return { admitted: false };
            if (lowest && activeEntries.length === TOP_K)
                await dependencies.entryRepository.deactivate(lowest.id);
            const inserted = await dependencies.entryRepository.insert({ experimentResultId: experiment.id, leaderboardScopeId: experiment.leaderboardScopeId, scoreFormulaId: experiment.scoreFormulaId, score: experiment.overallScore, addedAt: dependencies.clock.now() });
            const entry = rankEntries(await dependencies.entryRepository.getActiveTopK(experiment.leaderboardScopeId, TOP_K)).find((candidate) => candidate.id === inserted.id) ?? inserted;
            return { admitted: true, entry, evictedExperimentResultId: lowest?.experimentResultId };
        },
        createLeaderboardScope: async (userId, command) => {
            assertOwner(userId);
            validateScopeCommand(command);
            const formula = await dependencies.formulaRepository.getById(command.scoreFormulaId);
            if (!formula)
                throw new Error("SCORE_FORMULA_NOT_FOUND");
            formulaCache.set(formula.id, formula);
            const scope = { id: idGenerator(), userId, name: command.name, version: 1, datasetSnapshot: command.datasetSnapshot, sentimentDatasetSnapshot: command.sentimentDatasetSnapshot, workerRuntimeVersion: command.workerRuntimeVersion, workerRuntimeSha256: command.workerRuntimeSha256, evaluationRuntimeVersion: command.evaluationRuntimeVersion, evaluationRuntimeSha256: command.evaluationRuntimeSha256, initialCapital: command.initialCapital, feeRatePercent: command.feeRatePercent, slippageBps: command.slippageBps, scoreFormulaId: command.scoreFormulaId, createdAt: dependencies.clock.now() };
            const saved = await dependencies.scopeRepository.insert(scope);
            scopeCache.set(saved.id, saved);
            return saved;
        },
        getLeaderboardScope: async (userId, id) => {
            assertOwner(userId);
            const scope = await dependencies.scopeRepository.getById(userId, id);
            if (!scope)
                throw new Error("SCOPE_NOT_FOUND");
            await cacheScopeAndFormula(scope);
            return scope;
        },
    };
}
