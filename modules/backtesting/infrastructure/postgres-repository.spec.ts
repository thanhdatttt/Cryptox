import { describe, expect, it } from "vitest";
import { PostgresBacktestingRepository } from "./postgres-repository";

describe("PostgresBacktestingRepository", () => {
  it("persists scope inputs, candidates, attempts, trades, and results with parameterized SQL", async () => {
    const calls: Array<{ text: string; values: unknown[] }> = [];
    const repository = new PostgresBacktestingRepository({ query: async <Row>(text: string, values: unknown[]) => { calls.push({ text, values }); return { rows: [] as Row[] }; } });
    const snapshot = { id: "snapshot-1", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h" as const, range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T03:00:00.000Z" }, candleCount: 1, sha256: "a".repeat(64), createdAt: "2025-01-01T00:00:00.000Z" };
    const scope = { id: "scope-1", ownerUserId: "00000000-0000-0000-0000-000000000001", name: "fixture", version: 1, datasetSnapshot: snapshot, workerRuntimeVersion: "1", workerRuntimeSha256: "b".repeat(64), evaluationRuntimeVersion: "1", evaluationRuntimeSha256: "c".repeat(64), pair: "BTCUSDT", timeframe: "1h" as const, datasetRange: snapshot.range, datasetSnapshotId: snapshot.id, datasetSnapshotSha256: snapshot.sha256, initialCapital: 1000, feeRatePercent: 0, slippageBps: 0, decimalPolicyId: "MVP_DECIMAL_HALF_UP_V1" as const, evaluationPolicyId: "MVP_EVALUATION_V1" as const, scoreFormulaId: "MVP_MANUAL_V1", createdAt: snapshot.createdAt };
    const candidate = { candidateId: "candidate-1", ownerUserId: scope.ownerUserId, origin: "MANUAL" as const, selectionMode: "COMPOSITE" as const, leaderboardScopeId: scope.id, status: "COMPLETED" as const, attempts: [], maxAttempts: 1, completionAttemptCount: 1, completionMaxAttempts: 1, strategyDefinitions: [], compositeDefinition: { id: "composite-1", logicalFamilyKey: "composite", version: 1, method: "MAJORITY_VOTE" as const, components: [], createdAt: snapshot.createdAt }, queueJobId: "candidate-1", experimentResultId: "experiment-1", createdAt: snapshot.createdAt, updatedAt: snapshot.createdAt };
    const attempt = { attemptId: "attempt-1", candidateId: candidate.candidateId, queueJobId: candidate.queueJobId, attemptNumber: 1, workerRuntimeVersion: "1", workerRuntimeSha256: "d".repeat(64), status: "COMPLETED" as const, tradeCount: 1, auditOnly: false, startedAt: snapshot.createdAt, completedAt: "2025-01-01T03:00:00.000Z" };
    const trade = { id: "trade-1", sequence: 1, pair: "BTCUSDT", settlementAsset: "USDT", backtestAttemptId: attempt.attemptId, signal: "LONG" as const, entryTime: "2025-01-01T01:00:00.000Z", marketEntryPrice: 100, entryPrice: 100, stopLoss: null, takeProfit: null, exitTime: "2025-01-01T02:00:00.000Z", marketExitPrice: 110, exitPrice: 110, exitReason: "RANGE_END" as const, quantity: 10, notionalEntryValue: 1000, equityBeforeTrade: 1000, equityAfterTrade: 1100, grossProfit: 100, feeAmount: 0, slippageBps: 0, slippageAmount: 0, profit: 100, resultPercent: 10, result: "WIN" as const };
    const metrics = { candidateId: candidate.candidateId, totalReturnPercent: 10, winRatePercent: 100, numberOfTrades: 1, maxDrawdownPercent: 0, profitFactor: null, profitFactorStatus: "NO_LOSSES" as const, sharpeRatio: 0, sharpeRatioStatus: "INSUFFICIENT_OBSERVATIONS" as const, evaluationPolicyId: "MVP_EVALUATION_V1" as const, evaluationRuntimeVersion: "1", evaluationRuntimeSha256: "e".repeat(64) };
    const experiment = { id: "experiment-1", ownerUserId: scope.ownerUserId, candidateId: candidate.candidateId, leaderboardScopeId: scope.id, scoreFormulaId: scope.scoreFormulaId, overallScore: 0, rankEligible: true, backtestAttemptId: attempt.attemptId, compositeDefinitionId: candidate.compositeDefinition.id, compositeDefinition: candidate.compositeDefinition, datasetSnapshot: snapshot, strategyDefinitions: [], metrics, trades: [trade], createdAt: attempt.completedAt };

    await repository.createInputSnapshot(snapshot, [{ pair: "BTCUSDT", timeframe: "1h", timestamp: snapshot.createdAt, open: 100, high: 100, low: 100, close: 100, volume: 1, isClosed: true }]);
    await repository.createScope(scope, "scope-key");
    await repository.createQueuedSubmission({ candidate, submissionIdempotencyKey: "submission-key", dispatch: { job: { schemaVersion: 1, jobId: candidate.candidateId, candidateId: candidate.candidateId, leaderboardScopeId: scope.id, maxAttempts: 1, workerRuntimeVersion: "1", workerRuntimeSha256: "d".repeat(64), enqueuedAt: snapshot.createdAt }, state: "PENDING", dispatchAttempts: 0, createdAt: snapshot.createdAt, updatedAt: snapshot.createdAt } });
    await repository.createAttempt(attempt);
    await repository.completeAttempt({ candidate, attempt, result: { status: "COMPLETED", candidateId: candidate.candidateId, attemptId: attempt.attemptId, workerRuntimeVersion: attempt.workerRuntimeVersion, workerRuntimeSha256: attempt.workerRuntimeSha256, startedAt: attempt.startedAt, completedAt: attempt.completedAt!, trades: [trade] }, metrics, experiment });

    expect(calls.some((call) => call.text.startsWith("INSERT INTO backtest_input_snapshots") && call.values.includes(snapshot.id))).toBe(true);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO backtest_benchmark_scopes") && call.values.includes(scope.ownerUserId))).toBe(true);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO backtest_candidates") && call.values.includes("submission-key"))).toBe(true);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO backtest_queue_dispatches") && call.values.includes(candidate.candidateId))).toBe(true);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO backtest_attempts") && call.values.includes(attempt.attemptId))).toBe(true);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO backtest_trades") && call.values.includes(trade.id))).toBe(true);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO backtest_experiment_results") && call.values.includes(experiment.id))).toBe(true);
  });

  it("rehydrates a scope with the immutable input snapshot timestamp", async () => {
    const calls: string[] = [];
    const repository = new PostgresBacktestingRepository({
      query: async <Row>(text: string) => {
        calls.push(text);
        return {
          rows: text.includes("JOIN backtest_input_snapshots") ? [{
            id: "scope-1", owner_user_id: "user-1", idempotency_key: "scope-key", name: "fixture", version: 1,
            sentiment_dataset_snapshot: null, worker_runtime_version: "1", worker_runtime_sha256: "b".repeat(64),
            evaluation_runtime_version: "1", evaluation_runtime_sha256: "c".repeat(64), initial_capital: "1000",
            fee_rate_percent: "0.08", slippage_bps: 5, risk_policy: null, decimal_policy_id: "MVP_DECIMAL_HALF_UP_V1",
            evaluation_policy_id: "MVP_EVALUATION_V1", score_formula_id: "MVP_MANUAL_V1", created_at: "2025-02-01T00:00:00.000Z",
            snapshot_id: "snapshot-1", snapshot_created_at: "2025-01-01T00:00:00.000Z", pair: "BTCUSDT",
            pair_metadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h",
            dataset_from: "2025-01-01T00:00:00.000Z", dataset_to: "2025-01-02T00:00:00.000Z", candle_count: 24, sha256: "a".repeat(64),
          }] as Row[] : [] as Row[],
        };
      },
    });

    await expect(repository.readScope("scope-1")).resolves.toMatchObject({
      id: "scope-1",
      createdAt: "2025-02-01T00:00:00.000Z",
      datasetSnapshot: { id: "snapshot-1", createdAt: "2025-01-01T00:00:00.000Z" },
    });
    expect(calls[0]).toContain("i.created_at AS snapshot_created_at");
  });
});
