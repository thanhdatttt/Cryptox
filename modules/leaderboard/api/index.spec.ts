import { describe, expect, it } from "vitest";
import type { ExperimentResult } from "modules/backtesting/api";
import type { EvaluationMetrics } from "modules/evaluation/api";
import { createInMemoryLeaderboardDependencies, createLeaderboardModule, DEFAULT_SCORE_FORMULA } from "./index";

const snapshot = {
  id: "snapshot",
  pair: "BTCUSDT",
  pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" },
  timeframe: "1h" as const,
  range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-02T00:00:00.000Z" },
  candleCount: 24,
  sha256: "a".repeat(64),
  createdAt: "2025-01-02T00:00:00.000Z",
};

const metrics = (overrides: Partial<EvaluationMetrics> = {}): EvaluationMetrics => ({
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

const experiment = (id: string, scopeId: string, score: number): ExperimentResult => ({
  id,
  candidateId: `candidate-${id}`,
  leaderboardScopeId: scopeId,
  scoreFormulaId: DEFAULT_SCORE_FORMULA.id,
  overallScore: score,
  rankEligible: true,
});

async function createRuntime() {
  const dependencies = createInMemoryLeaderboardDependencies();
  dependencies.clock = { now: () => "2025-01-02T00:00:00.000Z" };
  const runtime = createLeaderboardModule(dependencies);
  const scope = await runtime.createLeaderboardScope({
    name: "BTC baseline",
    datasetSnapshot: snapshot,
    workerRuntimeVersion: "1",
    workerRuntimeSha256: "c".repeat(64),
    evaluationRuntimeVersion: "1",
    evaluationRuntimeSha256: "b".repeat(64),
    initialCapital: 1000,
    feeRatePercent: 0.08,
    slippageBps: 5,
    scoreFormulaId: DEFAULT_SCORE_FORMULA.id,
  });
  return { dependencies, runtime, scope };
}

describe("leaderboard runtime", () => {
  it("scores finite metrics deterministically and excludes zero-trade results", async () => {
    const { runtime, scope } = await createRuntime();

    expect(runtime.score(scope.id, metrics())).toEqual({ leaderboardScopeId: scope.id, scoreFormulaId: DEFAULT_SCORE_FORMULA.id, overallScore: 30, rankEligible: true });
    expect(runtime.score(scope.id, metrics({ numberOfTrades: 0, totalReturnPercent: Number.NaN }))).toEqual({ leaderboardScopeId: scope.id, scoreFormulaId: DEFAULT_SCORE_FORMULA.id, overallScore: 0, rankEligible: false, rankExclusionReason: "NO_TRADES" });
    expect(() => runtime.score(scope.id, metrics({ totalReturnPercent: Number.POSITIVE_INFINITY }))).toThrow("INVALID_SCORE");
  });

  it("admits strictly better experiments, keeps only Top-10 active, and is idempotent", async () => {
    const { runtime, scope } = await createRuntime();
    const unitOfWork = { kind: "COMPLETION", id: "uow", candidateId: "candidate", completionAttemptCount: 1, completionClaimToken: "claim", enlist: () => undefined } as const;

    for (let score = 0; score < 10; score += 1) await expect(runtime.submit(experiment(`experiment-${score}`, scope.id, score), unitOfWork)).resolves.toMatchObject({ admitted: true });
    await expect(runtime.submit(experiment("tied", scope.id, 0), unitOfWork)).resolves.toEqual({ admitted: false });
    await expect(runtime.submit(experiment("winner", scope.id, 20), unitOfWork)).resolves.toMatchObject({ admitted: true, evictedExperimentResultId: "experiment-0" });
    await expect(runtime.submit(experiment("winner", scope.id, 20), unitOfWork)).resolves.toMatchObject({ admitted: true });

    const top = await runtime.topK(scope.id);
    expect(top[0]).toMatchObject({ rank: 1, experimentResultId: "winner", score: 20 });
    expect(top).toHaveLength(10);
    expect(top.some((entry) => entry.experimentResultId === "experiment-0")).toBe(false);
  });

  it("returns only rank-eligible experiments in stable search-run score order", async () => {
    const { dependencies, runtime, scope } = await createRuntime();
    dependencies.experimentReader = {
      getBySearchRunId: async () => [
        { ...experiment("lower", scope.id, 4), searchRunId: "run" },
        { ...experiment("excluded", scope.id, 99), searchRunId: "run", rankEligible: false },
        { ...experiment("higher", scope.id, 9), searchRunId: "run" },
      ],
    };

    await expect(runtime.rankSearchRun("run")).resolves.toEqual([
      { rank: 1, searchRunId: "run", leaderboardScopeId: scope.id, candidateId: "candidate-higher", experimentResultId: "higher", scoreFormulaId: DEFAULT_SCORE_FORMULA.id, score: 9 },
      { rank: 2, searchRunId: "run", leaderboardScopeId: scope.id, candidateId: "candidate-lower", experimentResultId: "lower", scoreFormulaId: DEFAULT_SCORE_FORMULA.id, score: 4 },
    ]);
  });
});
