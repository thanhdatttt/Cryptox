"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("./index");
const snapshot = {
    id: "snapshot",
    pair: "BTCUSDT",
    pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" },
    timeframe: "1h",
    range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-02T00:00:00.000Z" },
    candleCount: 24,
    sha256: "a".repeat(64),
    createdAt: "2025-01-02T00:00:00.000Z",
};
const metrics = (overrides = {}) => ({
    candidateId: "candidate",
    totalReturnPercent: 10,
    winRatePercent: 50,
    numberOfTrades: 2,
    maxDrawdownPercent: 10,
    profitFactor: 2,
    profitFactorStatus: "FINITE",
    sharpeRatio: 1,
    sharpeRatioStatus: "FINITE",
    evaluationPolicyId: "MVP_EVALUATION_V1",
    evaluationRuntimeVersion: "1",
    evaluationRuntimeSha256: "b".repeat(64),
    ...overrides,
});
const experiment = (id, scopeId, score, ownerUserId = "user-1") => ({
    id,
    ownerUserId,
    candidateId: `candidate-${id}`,
    leaderboardScopeId: scopeId,
    scoreFormulaId: index_1.DEFAULT_SCORE_FORMULA.id,
    overallScore: score,
    rankEligible: true,
});
async function createRuntime() {
    const dependencies = (0, index_1.createInMemoryLeaderboardDependencies)();
    dependencies.clock = { now: () => "2025-01-02T00:00:00.000Z" };
    const runtime = (0, index_1.createLeaderboardModule)(dependencies);
    const scope = await runtime.createLeaderboardScope("user-1", {
        name: "BTC baseline",
        datasetSnapshot: snapshot,
        workerRuntimeVersion: "1",
        workerRuntimeSha256: "c".repeat(64),
        evaluationRuntimeVersion: "1",
        evaluationRuntimeSha256: "b".repeat(64),
        initialCapital: 1000,
        feeRatePercent: 0.08,
        slippageBps: 5,
        scoreFormulaId: index_1.DEFAULT_SCORE_FORMULA.id,
    });
    return { dependencies, runtime, scope };
}
(0, vitest_1.describe)("leaderboard runtime", () => {
    (0, vitest_1.it)("scores finite metrics deterministically and excludes zero-trade results", async () => {
        const { runtime, scope } = await createRuntime();
        await (0, vitest_1.expect)(runtime.score(scope.id, metrics())).resolves.toEqual({ leaderboardScopeId: scope.id, scoreFormulaId: index_1.DEFAULT_SCORE_FORMULA.id, overallScore: 30, rankEligible: true });
        await (0, vitest_1.expect)(runtime.score(scope.id, metrics({ numberOfTrades: 0, totalReturnPercent: Number.NaN }))).resolves.toEqual({ leaderboardScopeId: scope.id, scoreFormulaId: index_1.DEFAULT_SCORE_FORMULA.id, overallScore: 0, rankEligible: false, rankExclusionReason: "NO_TRADES" });
        await (0, vitest_1.expect)(runtime.score(scope.id, metrics({ totalReturnPercent: Number.POSITIVE_INFINITY }))).rejects.toThrow("INVALID_SCORE");
    });
    (0, vitest_1.it)("admits strictly better experiments, keeps only Top-10 active, and is idempotent", async () => {
        const { runtime, scope } = await createRuntime();
        const unitOfWork = { kind: "COMPLETION", id: "uow", candidateId: "candidate", completionAttemptCount: 1, completionClaimToken: "claim", enlist: () => undefined };
        for (let score = 0; score < 10; score += 1)
            await (0, vitest_1.expect)(runtime.submit(experiment(`experiment-${score}`, scope.id, score), unitOfWork)).resolves.toMatchObject({ admitted: true });
        await (0, vitest_1.expect)(runtime.submit(experiment("tied", scope.id, 0), unitOfWork)).resolves.toEqual({ admitted: false });
        await (0, vitest_1.expect)(runtime.submit(experiment("winner", scope.id, 20), unitOfWork)).resolves.toMatchObject({ admitted: true, evictedExperimentResultId: "experiment-0" });
        await (0, vitest_1.expect)(runtime.submit(experiment("winner", scope.id, 20), unitOfWork)).resolves.toMatchObject({ admitted: true });
        const top = await runtime.topK("user-1", scope.id);
        (0, vitest_1.expect)(top[0]).toMatchObject({ rank: 1, experimentResultId: "winner", score: 20 });
        (0, vitest_1.expect)(top).toHaveLength(10);
        (0, vitest_1.expect)(top.some((entry) => entry.experimentResultId === "experiment-0")).toBe(false);
    });
    (0, vitest_1.it)("returns only rank-eligible experiments in stable search-run score order", async () => {
        const { dependencies, runtime, scope } = await createRuntime();
        dependencies.experimentReader = {
            getBySearchRunId: async () => [
                { ...experiment("lower", scope.id, 4), searchRunId: "run" },
                { ...experiment("excluded", scope.id, 99), searchRunId: "run", rankEligible: false },
                { ...experiment("higher", scope.id, 9), searchRunId: "run" },
            ],
        };
        await (0, vitest_1.expect)(runtime.rankSearchRun("user-1", "run")).resolves.toEqual([
            { rank: 1, searchRunId: "run", leaderboardScopeId: scope.id, candidateId: "candidate-higher", experimentResultId: "higher", scoreFormulaId: index_1.DEFAULT_SCORE_FORMULA.id, score: 9 },
            { rank: 2, searchRunId: "run", leaderboardScopeId: scope.id, candidateId: "candidate-lower", experimentResultId: "lower", scoreFormulaId: index_1.DEFAULT_SCORE_FORMULA.id, score: 4 },
        ]);
    });
    (0, vitest_1.it)("isolates private scopes and rankings by owner", async () => {
        const dependencies = (0, index_1.createInMemoryLeaderboardDependencies)();
        const runtime = (0, index_1.createLeaderboardModule)(dependencies);
        const scopeA = await runtime.createLeaderboardScope("user-a", { name: "same", datasetSnapshot: snapshot, workerRuntimeVersion: "1", workerRuntimeSha256: "c".repeat(64), evaluationRuntimeVersion: "1", evaluationRuntimeSha256: "b".repeat(64), initialCapital: 1000, feeRatePercent: 0, slippageBps: 5, scoreFormulaId: index_1.DEFAULT_SCORE_FORMULA.id });
        const scopeB = await runtime.createLeaderboardScope("user-b", { name: "same", datasetSnapshot: snapshot, workerRuntimeVersion: "1", workerRuntimeSha256: "c".repeat(64), evaluationRuntimeVersion: "1", evaluationRuntimeSha256: "b".repeat(64), initialCapital: 1000, feeRatePercent: 0, slippageBps: 5, scoreFormulaId: index_1.DEFAULT_SCORE_FORMULA.id });
        const uow = { kind: "COMPLETION", id: "uow-isolation", candidateId: "candidate", completionAttemptCount: 1, completionClaimToken: "claim", enlist: () => undefined };
        await runtime.submit(experiment("owner-a", scopeA.id, 100, "user-a"), uow);
        await runtime.submit(experiment("owner-b", scopeB.id, 1, "user-b"), uow);
        await (0, vitest_1.expect)(runtime.topK("user-a", scopeB.id)).rejects.toThrow("SCOPE_NOT_FOUND");
        await (0, vitest_1.expect)(runtime.topK("user-a", scopeA.id)).resolves.toHaveLength(1);
    });
});
