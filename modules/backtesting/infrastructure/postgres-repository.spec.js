"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_crypto_1 = require("node:crypto");
const api_1 = require("../../market-data/api");
const postgres_repository_1 = require("./postgres-repository");
(0, vitest_1.describe)("PostgresBacktestingRepository", () => {
    (0, vitest_1.it)("persists scope inputs, candidates, attempts, trades, and results with parameterized SQL", async () => {
        const calls = [];
        const repository = new postgres_repository_1.PostgresBacktestingRepository({ query: async (text, values) => { calls.push({ text, values }); return { rows: (text.startsWith("SELECT COUNT") ? [{ count: 1 }] : []) }; } });
        const snapshotCandle = { pair: "BTCUSDT", timeframe: "1h", timestamp: "2025-01-01T00:00:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1, isClosed: true };
        const snapshot = { id: "snapshot-1", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h", range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T01:00:00.000Z" }, candleCount: 1, sha256: (0, node_crypto_1.createHash)("sha256").update((0, api_1.snapshotSerialization)("BTCUSDT", "1h", { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T01:00:00.000Z" }, [snapshotCandle]), "utf8").digest("hex"), createdAt: "2025-01-01T00:00:00.000Z" };
        const scope = { id: "scope-1", ownerUserId: "00000000-0000-0000-0000-000000000001", name: "fixture", version: 1, datasetSnapshot: snapshot, workerRuntimeVersion: "1", workerRuntimeSha256: "b".repeat(64), evaluationRuntimeVersion: "1", evaluationRuntimeSha256: "c".repeat(64), pair: "BTCUSDT", timeframe: "1h", datasetRange: snapshot.range, datasetSnapshotId: snapshot.id, datasetSnapshotSha256: snapshot.sha256, warmupCapacityCandles: 500, initialCapital: 1000, feeRatePercent: 0, slippageBps: 0, decimalPolicyId: "MVP_DECIMAL_HALF_UP_V1", evaluationPolicyId: "MVP_EVALUATION_V1", scoreFormulaId: "MVP_MANUAL_V1", createdAt: snapshot.createdAt };
        const candidate = { candidateId: "candidate-1", ownerUserId: scope.ownerUserId, origin: "MANUAL", selectionMode: "COMPOSITE", leaderboardScopeId: scope.id, status: "COMPLETED", attempts: [], maxAttempts: 1, completionAttemptCount: 1, completionMaxAttempts: 1, strategyDefinitions: [], compositeDefinition: { id: "composite-1", userId: scope.ownerUserId, logicalFamilyKey: "composite", version: 1, method: "MAJORITY_VOTE", components: [], createdAt: snapshot.createdAt }, queueJobId: "candidate-1", experimentResultId: "experiment-1", createdAt: snapshot.createdAt, updatedAt: snapshot.createdAt };
        const attempt = { attemptId: "attempt-1", candidateId: candidate.candidateId, queueJobId: candidate.queueJobId, attemptNumber: 1, workerRuntimeVersion: "1", workerRuntimeSha256: "d".repeat(64), status: "COMPLETED", tradeCount: 1, auditOnly: false, startedAt: snapshot.createdAt, completedAt: "2025-01-01T03:00:00.000Z" };
        const trade = { id: "trade-1", sequence: 1, pair: "BTCUSDT", settlementAsset: "USDT", backtestAttemptId: attempt.attemptId, signal: "LONG", entryTime: "2025-01-01T01:00:00.000Z", marketEntryPrice: 100, entryPrice: 100, stopLoss: null, takeProfit: null, exitTime: "2025-01-01T02:00:00.000Z", marketExitPrice: 110, exitPrice: 110, exitReason: "RANGE_END", quantity: 10, notionalEntryValue: 1000, equityBeforeTrade: 1000, equityAfterTrade: 1100, grossProfit: 100, feeAmount: 0, slippageBps: 0, slippageAmount: 0, profit: 100, resultPercent: 10, result: "WIN" };
        const metrics = { candidateId: candidate.candidateId, totalReturnPercent: 10, winRatePercent: 100, numberOfTrades: 1, maxDrawdownPercent: 0, profitFactor: null, profitFactorStatus: "NO_LOSSES", sharpeRatio: 0, sharpeRatioStatus: "INSUFFICIENT_OBSERVATIONS", evaluationPolicyId: "MVP_EVALUATION_V1", evaluationRuntimeVersion: "1", evaluationRuntimeSha256: "e".repeat(64) };
        const experiment = { id: "experiment-1", ownerUserId: scope.ownerUserId, candidateId: candidate.candidateId, leaderboardScopeId: scope.id, scoreFormulaId: scope.scoreFormulaId, overallScore: 0, rankEligible: true, backtestAttemptId: attempt.attemptId, compositeDefinitionId: candidate.compositeDefinition.id, compositeDefinition: candidate.compositeDefinition, datasetSnapshot: snapshot, strategyDefinitions: [], metrics, trades: [trade], createdAt: attempt.completedAt };
        await repository.createInputSnapshot(snapshot, [snapshotCandle]);
        await repository.createScope(scope, "scope-key");
        await repository.createQueuedSubmission({ candidate, submissionIdempotencyKey: "submission-key", dispatch: { job: { schemaVersion: 1, jobId: candidate.candidateId, candidateId: candidate.candidateId, leaderboardScopeId: scope.id, maxAttempts: 1, workerRuntimeVersion: "1", workerRuntimeSha256: "d".repeat(64), enqueuedAt: snapshot.createdAt }, state: "PENDING", dispatchAttempts: 0, createdAt: snapshot.createdAt, updatedAt: snapshot.createdAt } });
        await repository.createAttempt(attempt);
        await repository.completeAttempt({ candidate, attempt, result: { status: "COMPLETED", candidateId: candidate.candidateId, attemptId: attempt.attemptId, workerRuntimeVersion: attempt.workerRuntimeVersion, workerRuntimeSha256: attempt.workerRuntimeSha256, startedAt: attempt.startedAt, completedAt: attempt.completedAt, trades: [trade] }, metrics, experiment });
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO backtest_input_snapshots") && call.values.includes(snapshot.id))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO backtest_benchmark_scopes") && call.values.includes(scope.ownerUserId))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.includes("ON CONFLICT (search_run_id, iteration_number) DO NOTHING"))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO backtest_candidates") && call.values.includes("submission-key"))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO backtest_queue_dispatches") && call.values.includes(candidate.candidateId))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO backtest_attempts") && call.values.includes(attempt.attemptId))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO backtest_trades") && call.values.includes(trade.id))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO backtest_experiment_results") && call.values.includes(experiment.id))).toBe(true);
    });
    (0, vitest_1.it)("rehydrates a scope with the immutable input snapshot timestamp", async () => {
        const calls = [];
        const repository = new postgres_repository_1.PostgresBacktestingRepository({
            query: async (text) => {
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
                        }] : [],
                };
            },
        });
        await (0, vitest_1.expect)(repository.readScope("scope-1")).resolves.toMatchObject({
            id: "scope-1",
            createdAt: "2025-02-01T00:00:00.000Z",
            datasetSnapshot: { id: "snapshot-1", createdAt: "2025-01-01T00:00:00.000Z" },
        });
        (0, vitest_1.expect)(calls[0]).toContain("i.created_at AS snapshot_created_at");
    });
    (0, vitest_1.it)("hydrates positive numeric risk fields and preserves legacy nulls", async () => {
        const row = {
            id: "trade-1", sequence: 1, pair: "BTCUSDT", settlement_asset: "USDT", backtest_attempt_id: "attempt-1", signal: "LONG",
            entry_time: "2025-01-01T01:00:00.000Z", market_entry_price: "100", entry_price: "100", stop_loss: "95", take_profit: "105",
            exit_time: "2025-01-01T02:00:00.000Z", market_exit_price: "105", exit_price: "105", exit_reason: "TAKE_PROFIT", quantity: "10",
            notional_entry_value: "1000", equity_before_trade: "1000", equity_after_trade: "1050", gross_profit: "50", fee_amount: "0",
            slippage_bps: 0, slippage_amount: "0", profit: "50", result_percent: "5", result: "WIN",
        };
        const repository = new postgres_repository_1.PostgresBacktestingRepository({ query: async () => ({ rows: [row] }) });
        await (0, vitest_1.expect)(repository.listTrades("attempt-1")).resolves.toMatchObject([{ stopLoss: 95, takeProfit: 105 }]);
        row.stop_loss = null;
        row.take_profit = null;
        await (0, vitest_1.expect)(repository.listTrades("attempt-1")).resolves.toMatchObject([{ stopLoss: null, takeProfit: null }]);
        row.stop_loss = "0";
        await (0, vitest_1.expect)(repository.listTrades("attempt-1")).rejects.toThrow("BACKTEST_INVALID_TRADE_RISK_FIELD");
        row.stop_loss = "95";
        row.take_profit = "-1";
        await (0, vitest_1.expect)(repository.listTrades("attempt-1")).rejects.toThrow("BACKTEST_INVALID_TRADE_RISK_FIELD");
    });
    (0, vitest_1.it)("rejects forming, incomplete, and hash-mismatched input snapshots before persistence", async () => {
        const calls = [];
        const repository = new postgres_repository_1.PostgresBacktestingRepository({ query: async (text) => { calls.push(text); return { rows: [] }; } });
        const snapshot = { id: "snapshot-integrity", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h", range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T02:00:00.000Z" }, candleCount: 2, sha256: "a".repeat(64), createdAt: "2025-01-01T00:00:00.000Z" };
        const candles = [
            { pair: "BTCUSDT", timeframe: "1h", timestamp: "2025-01-01T00:00:00.000Z", open: 100, high: 101, low: 99, close: 100, volume: 1, isClosed: true },
            { pair: "BTCUSDT", timeframe: "1h", timestamp: "2025-01-01T01:00:00.000Z", open: 100, high: 101, low: 99, close: 100, volume: 1, isClosed: false },
        ];
        await (0, vitest_1.expect)(repository.createInputSnapshot(snapshot, candles)).rejects.toThrow("BACKTEST_INPUT_SNAPSHOT_INTEGRITY_FAILURE");
        (0, vitest_1.expect)(calls).toHaveLength(0);
        const closed = candles.map((item) => ({ ...item, isClosed: true }));
        await (0, vitest_1.expect)(repository.createInputSnapshot({ ...snapshot, range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T02:00:00.000Z" }, sha256: "a".repeat(64) }, closed)).rejects.toThrow("BACKTEST_INPUT_SNAPSHOT_INTEGRITY_FAILURE");
    });
    (0, vitest_1.it)("rejects a tampered persisted snapshot on read", async () => {
        const snapshot = { id: "snapshot-read", pair: "BTCUSDT", pair_metadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h", dataset_from: "2025-01-01T00:00:00.000Z", dataset_to: "2025-01-01T01:00:00.000Z", candle_count: 1, sha256: "a".repeat(64), created_at: "2025-01-01T00:00:00.000Z" };
        const repository = new postgres_repository_1.PostgresBacktestingRepository({ query: async (text) => ({ rows: (text.includes("FROM backtest_input_snapshots") ? [snapshot] : [{ timestamp: "2025-01-01T00:00:00.000Z", open: 100, high: 100, low: 100, close: 99, volume: 1, is_closed: true }]) }) });
        await (0, vitest_1.expect)(repository.readInputSnapshot(snapshot.id)).rejects.toThrow("BACKTEST_INPUT_SNAPSHOT_INTEGRITY_FAILURE");
    });
    (0, vitest_1.it)("requires the matching completion generation, claim, and unexpired lease", async () => {
        let statement = "";
        let values = [];
        const repository = new postgres_repository_1.PostgresBacktestingRepository({ query: async (text, input) => { statement = text; values = input; return { rows: [{ id: "candidate-1" }] }; } });
        await repository.finalizeCompletion({ candidate: { candidateId: "candidate-1", completionGeneration: 4 }, experimentId: "experiment-1", claimToken: "claim-1", now: "2025-01-01T00:00:00.000Z" });
        (0, vitest_1.expect)(statement).toContain("completion_generation = $3");
        (0, vitest_1.expect)(statement).toContain("active_completion_lease_expires_at > $4");
        (0, vitest_1.expect)(values).toEqual(["candidate-1", "claim-1", 4, "2025-01-01T00:00:00.000Z", "experiment-1", "2025-01-01T00:00:00.000Z"]);
    });
    (0, vitest_1.it)("transactionally closes an expired Attempt and returns it to the queue when budget remains", async () => {
        const calls = [];
        const repository = new postgres_repository_1.PostgresBacktestingRepository({ query: async (text, values) => {
                calls.push({ text, values });
                if (text.startsWith("SELECT status, active_attempt_number"))
                    return { rows: [{ status: "BACKTESTING", active_attempt_number: 1, max_attempts: 2, queue_job_id: "candidate-1" }] };
                if (text.startsWith("SELECT id, attempt_number"))
                    return { rows: [{ id: "attempt-1", attempt_number: 1 }] };
                return { rows: [] };
            } });
        await (0, vitest_1.expect)(repository.recoverAbandonedAttempt({ candidateId: "candidate-1", now: "2025-01-01T00:02:00.000Z", error: "BACKTEST_WORKER_LEASE_EXPIRED" })).resolves.toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.includes("failure_category = 'INFRASTRUCTURE'") && call.values.includes("BACKTEST_WORKER_LEASE_EXPIRED"))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.includes("state = 'PENDING'") && call.values.includes("candidate-1"))).toBe(true);
    });
    (0, vitest_1.it)("records a synthetic failed Attempt when terminal recovery finds no Attempt row", async () => {
        const calls = [];
        const repository = new postgres_repository_1.PostgresBacktestingRepository({ query: async (text, values) => {
                calls.push({ text, values });
                if (text.startsWith("SELECT status, queue_job_id"))
                    return { rows: [{ status: "QUEUED", queue_job_id: "candidate-1" }] };
                if (text.startsWith("SELECT COUNT(*)"))
                    return { rows: [{ count: 0 }] };
                return { rows: [] };
            } });
        await repository.repairTerminalQueueFailure({ candidateId: "candidate-1", now: "2025-01-01T00:00:00.000Z", error: "BACKTEST_QUEUE_TERMINAL_FAILURE" });
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO backtest_attempts") && call.values.includes("candidate-1:recovery:attempt:1"))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.includes("status = 'TERMINAL_FAILURE_PENDING'") && call.values.includes("candidate-1"))).toBe(true);
    });
    (0, vitest_1.it)("routes completion Experiment staging and finalization through the supplied transaction client", async () => {
        const calls = [];
        const repository = new postgres_repository_1.PostgresBacktestingRepository({ query: async () => { throw new Error("pool should not be used"); } });
        const unitOfWork = { kind: "COMPLETION", id: "completion-1", candidateId: "candidate-1", completionAttemptCount: 1, completionClaimToken: "claim-1", query: async (text) => { calls.push(text); return { rows: [] }; }, enlist: () => undefined };
        const experiment = { id: "experiment-1", candidateId: "candidate-1" };
        await (0, vitest_1.expect)(repository.stageCompletionExperiment(experiment, unitOfWork)).resolves.toBe(experiment);
        const candidate = { candidateId: "candidate-1", completionGeneration: 2 };
        const finalCalls = [];
        const finalUnitOfWork = { kind: "COMPLETION", id: "completion-1", candidateId: "candidate-1", completionAttemptCount: 1, completionClaimToken: "claim-1", query: async (text) => { finalCalls.push(text); return { rows: [{ id: "candidate-1" }] }; }, enlist: () => undefined };
        await repository.finalizeCompletion({ candidate, experimentId: "experiment-1", claimToken: "claim-1", now: "2025-01-01T00:00:00.000Z" }, finalUnitOfWork);
        (0, vitest_1.expect)(calls).toHaveLength(3);
        (0, vitest_1.expect)(calls[0]).toContain("FROM backtest_experiment_results");
        (0, vitest_1.expect)(calls[1]).toContain("INSERT INTO backtest_experiment_results");
        (0, vitest_1.expect)(finalCalls[0]).toContain("UPDATE backtest_candidates");
    });
    (0, vitest_1.it)("persists replay jobs and fences duplicate or expired worker claims", async () => {
        const calls = [];
        const row = { id: "replay-1", owner_user_id: "user-1", experiment_result_id: "experiment-1", status: "RUNNING", mismatch_sample_limit: 50, compared_trade_count: null, mismatch_sample: null, total_mismatch_count: null, truncated: null, failure_code: null, claim_token: "claim-1", lease_expires_at: "2025-01-01T00:01:00.000Z", created_at: "2025-01-01T00:00:00.000Z", started_at: "2025-01-01T00:00:00.000Z", completed_at: null, backtest_attempt_id: "attempt-1" };
        const repository = new postgres_repository_1.PostgresBacktestingRepository({ query: async (text, values) => {
                calls.push({ text, values });
                if (text.startsWith("UPDATE backtest_replay_verifications"))
                    return { rows: [row] };
                if (text.startsWith("SELECT backtest_attempt_id"))
                    return { rows: [{ backtest_attempt_id: "attempt-1" }] };
                if (text.startsWith("UPDATE backtest_replay_verifications SET status"))
                    return { rows: [{ id: "replay-1" }] };
                return { rows: [] };
            } });
        await repository.createReplayVerification({ replayJobId: "replay-1", experimentId: "experiment-1", sourceAttemptId: "attempt-1", ownerUserId: "user-1", status: "QUEUED", mismatchSampleLimit: 50, requestedAt: "2025-01-01T00:00:00.000Z" });
        await (0, vitest_1.expect)(repository.claimReplayVerification({ replayJobId: "replay-1", claimToken: "claim-1", now: "2025-01-01T00:00:00.000Z", leaseExpiresAt: "2025-01-01T00:01:00.000Z" })).resolves.toMatchObject({ replayJobId: "replay-1", status: "RUNNING", sourceAttemptId: "attempt-1" });
        await repository.completeReplayVerification({ replayJobId: "replay-1", claimToken: "claim-1", now: "2025-01-01T00:00:30.000Z", result: { replayJobId: "replay-1", experimentId: "experiment-1", sourceAttemptId: "attempt-1", status: "MATCH", comparedTradeCount: 0, mismatches: [], totalMismatchCount: 0, truncated: false } });
        (0, vitest_1.expect)(calls.some((call) => call.text.startsWith("INSERT INTO backtest_replay_verifications"))).toBe(true);
        (0, vitest_1.expect)(calls.some((call) => call.text.includes("claim_token = $2") && call.text.includes("lease_expires_at > $3"))).toBe(true);
    });
});
