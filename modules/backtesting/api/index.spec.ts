import { describe, expect, it } from "vitest";
import { simulateBacktest } from "./index";
import { createBacktestingService, InMemoryBacktestQueue, createInMemoryBacktestingDependencies } from "../application/service";
import { createEvaluationModule } from "modules/evaluation/api/bootstrap";
import type { Candle } from "modules/market-data/api";

const candle = (timestamp: string, open: number, close: number): Candle => ({
  pair: "BTCUSDT",
  timeframe: "1h",
  timestamp,
  open,
  high: Math.max(open, close) + 1,
  low: Math.min(open, close) - 1,
  close,
  volume: 10,
  isClosed: true,
});

describe("backtesting runtime", () => {
  it("runs a no-look-ahead next-open simulation and closes at range end", () => {
    const result = simulateBacktest({
      candidateId: "c",
      attemptId: "a",
      pair: "BTCUSDT",
      settlementAsset: "USDT",
      timeframe: "1h",
      candles: [
        candle("2025-01-01T00:00:00.000Z", 100, 101),
        candle("2025-01-01T01:00:00.000Z", 102, 105),
        candle("2025-01-01T02:00:00.000Z", 106, 110),
      ],
      strategy: { name: "test", category: "TREND", analyze: (context) => context.candles.length === 1 ? "BUY" : "HOLD" },
      initialCapital: 1000,
      feeRatePercent: 0,
      slippageBps: 0,
      workerRuntimeVersion: "1",
      workerRuntimeSha256: "a".repeat(64),
      startedAt: "2025-01-01T00:00:00.000Z",
      completedAt: "2025-01-01T03:00:00.000Z",
    });
    expect(result.trades).toHaveLength(1);
    expect(result.initialCapital).toBe(1000);
    expect(result.trades[0]).toMatchObject({ entryTime: "2025-01-01T01:00:00.000Z", marketEntryPrice: 102, marketExitPrice: 110, exitReason: "RANGE_END", result: "WIN" });
  });

  it("applies stop loss before take profit when both occur", () => {
    const result = simulateBacktest({
      candidateId: "c",
      attemptId: "a",
      pair: "BTCUSDT",
      settlementAsset: "USDT",
      timeframe: "1h",
      candles: [
        candle("2025-01-01T00:00:00.000Z", 100, 101),
        candle("2025-01-01T01:00:00.000Z", 100, 100),
        { ...candle("2025-01-01T02:00:00.000Z", 100, 100), high: 110, low: 90 },
      ],
      strategy: { name: "test", category: "TREND", analyze: (context) => context.candles.length === 1 ? "BUY" : "HOLD" },
      initialCapital: 1000,
      feeRatePercent: 0,
      slippageBps: 0,
      stopLossPercent: 5,
      takeProfitPercent: 5,
      workerRuntimeVersion: "1",
      workerRuntimeSha256: "a".repeat(64),
      startedAt: "2025-01-01T00:00:00.000Z",
      completedAt: "2025-01-01T03:00:00.000Z",
    });
    expect(result.trades[0]).toMatchObject({
      exitReason: "STOP_LOSS",
      marketExitPrice: 95,
      exitTime: "2025-01-01T02:00:00.000Z",
      stopLoss: 95,
      takeProfit: 105,
    });
  });

  it("stores positive entry-time risk prices for short trades", () => {
    const result = simulateBacktest({
      candidateId: "c",
      attemptId: "a",
      pair: "BTCUSDT",
      settlementAsset: "USDT",
      timeframe: "1h",
      candles: [candle("2025-01-01T00:00:00.000Z", 100, 101), candle("2025-01-01T01:00:00.000Z", 100, 100), candle("2025-01-01T02:00:00.000Z", 100, 100)],
      strategy: { name: "test", category: "TREND", analyze: (context) => context.candles.length === 1 ? "SELL" : "HOLD" },
      initialCapital: 1000,
      feeRatePercent: 0,
      slippageBps: 0,
      stopLossPercent: 5,
      takeProfitPercent: 5,
      workerRuntimeVersion: "1",
      workerRuntimeSha256: "a".repeat(64),
      startedAt: "2025-01-01T00:00:00.000Z",
      completedAt: "2025-01-01T03:00:00.000Z",
    });

    expect(result.trades[0]).toMatchObject({ signal: "SHORT", stopLoss: 105, takeProfit: 95 });
  });

  it("rounds entry and exit costs deterministically and persists equity audit fields", () => {
    const result = simulateBacktest({
      candidateId: "c",
      attemptId: "a",
      pair: "BTCUSDT",
      settlementAsset: "USDT",
      timeframe: "1h",
      candles: [
        candle("2025-01-01T00:00:00.000Z", 100, 100),
        candle("2025-01-01T01:00:00.000Z", 100, 100),
        candle("2025-01-01T02:00:00.000Z", 110, 110),
      ],
      strategy: { name: "test", category: "TREND", analyze: (context) => context.candles.length === 1 ? "BUY" : "HOLD" },
      initialCapital: 1000,
      feeRatePercent: 1,
      slippageBps: 100,
      workerRuntimeVersion: "1",
      workerRuntimeSha256: "a".repeat(64),
      startedAt: "2025-01-01T00:00:00.000Z",
      completedAt: "2025-01-01T03:00:00.000Z",
    });

    expect(result.trades[0]).toMatchObject({
      settlementAsset: "USDT",
      entryPrice: 101,
      exitPrice: 108.9,
      quantity: 9.80296049,
      notionalEntryValue: 990.1,
      grossProfit: 98.03,
      slippageBps: 100,
      slippageAmount: 20.58,
      feeAmount: 20.58,
      profit: 56.87,
      resultPercent: 5.687,
      equityBeforeTrade: 1000,
      equityAfterTrade: 1056.87,
    });
  });

  it("closes a scheduled reversal on the final candle without opening a synthetic new trade", () => {
    const result = simulateBacktest({
      candidateId: "c",
      attemptId: "a",
      pair: "BTCUSDT",
      settlementAsset: "USDT",
      timeframe: "1h",
      candles: [
        candle("2025-01-01T00:00:00.000Z", 100, 100),
        candle("2025-01-01T01:00:00.000Z", 102, 102),
        candle("2025-01-01T02:00:00.000Z", 105, 104),
      ],
      strategy: {
        name: "test",
        category: "TREND",
        analyze: (context) => context.candles.length === 1 ? "BUY" : context.candles.length === 2 ? "SELL" : "HOLD",
      },
      initialCapital: 1000,
      feeRatePercent: 0,
      slippageBps: 0,
      workerRuntimeVersion: "1",
      workerRuntimeSha256: "a".repeat(64),
      startedAt: "2025-01-01T00:00:00.000Z",
      completedAt: "2025-01-01T03:00:00.000Z",
    });

    expect(result.trades).toEqual([
      expect.objectContaining({
        signal: "LONG",
        exitReason: "STRATEGY_CLOSE",
        marketExitPrice: 105,
        exitTime: "2025-01-01T02:00:00.000Z",
      }),
    ]);
  });

  it("creates a sealed scope and persists a manual simulator result, trade audit, and evaluation", async () => {
    const snapshot = { id: "snapshot-1", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h" as const, range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T03:00:00.000Z" }, candleCount: 3, sha256: "s".repeat(64), createdAt: "2025-01-01T00:00:00.000Z" };
    const candles = [candle("2025-01-01T00:00:00.000Z", 100, 101), candle("2025-01-01T01:00:00.000Z", 102, 105), candle("2025-01-01T02:00:00.000Z", 106, 110)];
    let sequence = 0;
    const queue = new InMemoryBacktestQueue();
    let transientFailures = 1;
    const service = createBacktestingService({
      ...createInMemoryBacktestingDependencies(),
      queue,
      marketData: { readDatasetSnapshot: async () => ({ snapshot, candles }) },
      strategy: {
        readDefinitions: async (userId, ids) => ids.map((id) => ({ id, userId, logicalFamilyKey: "strategy:test", strategyName: "TEST", implementationVersion: "1", implementationSha256: "a".repeat(64), version: 1, parameters: {}, createdAt: "2025-01-01T00:00:00.000Z" })),
        readComposite: async (userId, id) => ({ id, userId, logicalFamilyKey: "composite:test", version: 1, method: "MAJORITY_VOTE" as const, components: [{ strategyDefinitionId: "definition-1", weight: 0 }], createdAt: "2025-01-01T00:00:00.000Z" }),
        resolveStrategy: async () => {
          if (transientFailures-- > 0) throw new Error("TRANSIENT_STRATEGY_ARTIFACT_FAILURE");
          return { name: "test", category: "TREND", analyze: (context) => context.candles.length === 1 ? "BUY" : "HOLD" };
        },
        combineSignals: (_definition, signals) => signals[0]?.signal ?? "HOLD",
      },
      evaluation: createEvaluationModule(),
      clock: { now: () => "2025-01-01T00:00:00.000Z" },
      idGenerator: () => `id-${sequence++}`,
    });
    const definition = { id: "definition-1", userId: "user-1", logicalFamilyKey: "strategy:test", strategyName: "TEST", implementationVersion: "1", implementationSha256: "a".repeat(64), version: 1, parameters: {}, createdAt: "2025-01-01T00:00:00.000Z" };
    const composite = { id: "composite-1", userId: "user-1", logicalFamilyKey: "composite:test", version: 1, method: "MAJORITY_VOTE" as const, components: [{ strategyDefinitionId: definition.id, weight: 0 }], createdAt: "2025-01-01T00:00:00.000Z" };
    const scope = await service.createBenchmarkScope({ userId: "user-1" }, { name: "BTC fixture", datasetSnapshot: snapshot, initialCapital: 1000, feeRatePercent: 0, slippageBps: 0, scoreFormulaId: "MVP_MANUAL_V1", workerRuntimeVersion: "1", workerRuntimeSha256: "b".repeat(64), evaluationRuntimeVersion: "1", evaluationRuntimeSha256: "c".repeat(64) }, { scopeIdempotencyKey: "scope-key" });
    const accepted = await service.startManual({ userId: "user-1" }, { leaderboardScopeId: scope.id, strategyDefinitionIds: [definition.id], compositeDefinitionId: composite.id, executionPolicy: { stopLossPercent: 5, takeProfitPercent: 5 }, maxAttempts: 2 }, { submissionIdempotencyKey: "submission-key" });

    expect(accepted).toMatchObject({ candidateId: accepted.jobId, status: "QUEUED" });
    await expect(service.startManual({ userId: "user-1" }, { leaderboardScopeId: scope.id, strategyDefinitionIds: [definition.id], compositeDefinitionId: composite.id, executionPolicy: { stopLossPercent: 5, takeProfitPercent: 5 }, maxAttempts: 2 }, { submissionIdempotencyKey: "submission-key" })).resolves.toEqual(accepted);
    const job = queue.jobs.get(accepted.jobId);
    expect(job).toMatchObject({ jobId: accepted.candidateId, maxAttempts: 2 });
    await expect(service.processQueueJob(job!, { attemptNumber: 1, fenceToken: "worker-claim-1" })).rejects.toThrow("TRANSIENT_STRATEGY_ARTIFACT_FAILURE");
    await expect(service.status({ userId: "user-1" }, accepted.candidateId)).resolves.toMatchObject({ status: "RETRY_WAIT", attempts: [{ status: "FAILED", failureCategory: "RETRYABLE" }] });
    const workerReturn = await service.processQueueJob(job!, { attemptNumber: 2, fenceToken: "worker-claim-2" });
    expect(workerReturn).toMatchObject({ status: "COMPLETED", candidateId: accepted.candidateId });
    await expect(service.status({ userId: "user-1" }, accepted.candidateId)).resolves.toMatchObject({ status: "PROCESSING_RESULT", attempts: [{ status: "FAILED" }, { status: "COMPLETED" }] });
    await expect(service.processQueueTerminalSignal({ schemaVersion: 1, jobId: accepted.candidateId, status: "COMPLETED", returnValue: workerReturn })).resolves.toMatchObject({ status: "COMPLETED", candidateId: accepted.candidateId });
    await expect(service.processQueueTerminalSignal({ schemaVersion: 1, jobId: accepted.candidateId, status: "COMPLETED", returnValue: workerReturn })).resolves.toMatchObject({ status: "COMPLETED", candidateId: accepted.candidateId });
    await expect(service.processQueueJob(job!, { attemptNumber: 2, fenceToken: "stale-claim" })).resolves.toMatchObject({ status: "IGNORED", reason: "ALREADY_TERMINAL" });
    const progress = await service.status({ userId: "user-1" }, accepted.candidateId);
    expect(progress).toMatchObject({ status: "COMPLETED", attempts: [{ status: "FAILED" }, { status: "COMPLETED" }] });
    const completedProgress = progress.attempts.find((attempt) => attempt.status === "COMPLETED")!;
    const attempt = await service.readAttempt({ userId: "user-1" }, completedProgress.attemptId);
    const trades = await service.listAttemptTrades({ userId: "user-1" }, attempt.attemptId, { limit: 10 });
    expect(trades.items).toHaveLength(1);
    const experiment = await service.readExperimentSummary({ userId: "user-1" }, progress.experimentResultId!);
    expect(experiment.metrics).toMatchObject({ numberOfTrades: 1, candidateId: accepted.candidateId });
    expect(experiment).toMatchObject({ initialCapital: 1000, wins: 1, losses: 0, breakevens: 0, simulatorVersion: "1.0.0", benchmarkTimezone: "UTC", fillPolicyId: "NEXT_OPEN_OHLC_STOP_FIRST_V2", decimalPolicyId: "MVP_DECIMAL_HALF_UP_V1" });
    expect(experiment.executionPolicy?.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(experiment.endingEquity).toBeCloseTo(1000 + (experiment.totalProfitAmount ?? 0), 8);
    await expect(service.verifyReplay({ userId: "user-1" }, experiment.id)).resolves.toMatchObject({ status: "MATCH", comparedTradeCount: 1 });
    const replayAccepted = await service.startReplayVerification({ userId: "user-1" }, experiment.id);
    expect(replayAccepted).toMatchObject({ experimentId: experiment.id, status: "QUEUED" });
    expect(queue.jobs.get(replayAccepted.replayJobId)).toMatchObject({ replayJobId: replayAccepted.replayJobId, experimentId: experiment.id, mismatchSampleLimit: 50 });
    await expect(service.readReplayVerification({ userId: "user-1" }, replayAccepted.replayJobId)).resolves.toMatchObject({ status: "QUEUED", sourceAttemptId: experiment.backtestAttemptId });
    await service.processReplayVerification(replayAccepted.replayJobId);
    await expect(service.readReplayVerification({ userId: "user-1" }, replayAccepted.replayJobId)).resolves.toMatchObject({ status: "MATCH", comparedTradeCount: 1, totalMismatchCount: 0, truncated: false, mismatches: [] });
    await expect(service.processReplayVerification(replayAccepted.replayJobId)).resolves.toBeUndefined();
    await expect(service.readReplayVerification({ userId: "another-user" }, replayAccepted.replayJobId)).rejects.toThrow("REPLAY_VERIFICATION_NOT_FOUND");
    await expect(service.status({ userId: "another-user" }, accepted.candidateId)).rejects.toThrow("BACKTEST_CANDIDATE_NOT_FOUND");

    transientFailures = 1;
    const failed = await service.startManual({ userId: "user-1" }, { leaderboardScopeId: scope.id, strategyDefinitions: [definition], compositeDefinition: composite, maxAttempts: 1 }, { submissionIdempotencyKey: "terminal-failure-key" });
    await expect(service.processQueueJob(queue.jobs.get(failed.jobId)!, { attemptNumber: 1, fenceToken: "terminal-worker" })).rejects.toThrow("TRANSIENT_STRATEGY_ARTIFACT_FAILURE");
    await expect(service.status({ userId: "user-1" }, failed.candidateId)).resolves.toMatchObject({ status: "TERMINAL_FAILURE_PENDING", failureKind: "RETRY_EXHAUSTED" });
    await expect(service.processQueueTerminalSignal({ schemaVersion: 1, jobId: failed.candidateId, status: "RETRIES_EXHAUSTED", attemptsMade: 1 })).resolves.toMatchObject({ status: "FAILED" });
    await expect(service.status({ userId: "user-1" }, failed.candidateId)).resolves.toMatchObject({ status: "FAILED", failureKind: "RETRY_EXHAUSTED" });
  });

  it("lets a matching in-flight worker finish audit trades after cancellation without reopening the candidate", async () => {
    const dependencies = createInMemoryBacktestingDependencies();
    const repository = dependencies.repository;
    const now = "2025-01-01T00:00:00.000Z";
    const candidate = {
      candidateId: "cancelled-candidate", ownerUserId: "user-1", origin: "MANUAL" as const, selectionMode: "SINGLE" as const,
      leaderboardScopeId: "scope-1", status: "QUEUED" as const, attempts: [], maxAttempts: 1, completionAttemptCount: 0,
      completionMaxAttempts: 5, strategyDefinitions: [], compositeDefinition: { id: "composite-1", userId: "user-1", logicalFamilyKey: "test", version: 1, method: "WEIGHTED_SCORE" as const, components: [], createdAt: now },
      queueJobId: "cancelled-candidate", createdAt: now, updatedAt: now,
    };
    await repository.createCandidate(candidate);
    const claim = await repository.claimWorkerAttempt({ candidateId: candidate.candidateId, queueJobId: candidate.queueJobId, deliveryAttempt: 1, attemptId: "cancelled-candidate:attempt:1", fenceToken: "fence-1", now, leaseExpiresAt: "2025-01-01T00:01:00.000Z", workerRuntimeVersion: "worker-1", workerRuntimeSha256: "a".repeat(64) });
    expect(claim).toBeDefined();
    await repository.updateCandidate({ ...claim!.candidate, status: "CANCELLED", activeLeaseExpiresAt: undefined });
    const trade = { id: "audit-trade", sequence: 1, pair: "BTCUSDT" as const, settlementAsset: "USDT", backtestAttemptId: claim!.attempt.attemptId, signal: "LONG" as const, entryTime: now, marketEntryPrice: 100, entryPrice: 100, stopLoss: null, takeProfit: null, exitTime: "2025-01-01T00:00:30.000Z", marketExitPrice: 101, exitPrice: 101, exitReason: "RANGE_END" as const, quantity: 1, notionalEntryValue: 100, equityBeforeTrade: 100, equityAfterTrade: 101, grossProfit: 1, feeAmount: 0, slippageBps: 0, slippageAmount: 0, profit: 1, resultPercent: 1, result: "WIN" as const };
    await repository.persistWorkerSuccess({ candidate: claim!.candidate, attempt: claim!.attempt, fenceToken: "fence-1", result: { status: "COMPLETED", candidateId: candidate.candidateId, attemptId: claim!.attempt.attemptId, workerRuntimeVersion: "worker-1", workerRuntimeSha256: "a".repeat(64), startedAt: now, completedAt: "2025-01-01T00:00:30.000Z", trades: [trade] } });
    const storedCandidate = await repository.readCandidate(candidate.candidateId);
    expect(storedCandidate?.status).toBe("CANCELLED");
    expect(storedCandidate?.activeFenceToken).toBeUndefined();
    await expect(repository.readAttempt(claim!.attempt.attemptId)).resolves.toMatchObject({ status: "COMPLETED", auditOnly: true, tradeCount: 1 });
    await expect(repository.listTrades(claim!.attempt.attemptId)).resolves.toHaveLength(1);
    await expect(repository.findExperimentByCandidate(candidate.candidateId)).resolves.toBeUndefined();
  });

  it("reconciles an expired worker lease into one failed Attempt and a bounded retry", async () => {
    const dependencies = createInMemoryBacktestingDependencies();
    const repository = dependencies.repository;
    const queue = dependencies.queue as InMemoryBacktestQueue;
    const service = createBacktestingService(dependencies);
    const now = "2025-01-01T00:00:00.000Z";
    const candidate = {
      candidateId: "expired-candidate", ownerUserId: "user-1", origin: "MANUAL" as const, selectionMode: "SINGLE" as const,
      leaderboardScopeId: "scope-1", status: "QUEUED" as const, attempts: [], maxAttempts: 2, completionAttemptCount: 0,
      completionMaxAttempts: 5, strategyDefinitions: [], compositeDefinition: { id: "composite-1", userId: "user-1", logicalFamilyKey: "test", version: 1, method: "WEIGHTED_SCORE" as const, components: [], createdAt: now },
      queueJobId: "expired-candidate", createdAt: now, updatedAt: now,
    };
    const job = { schemaVersion: 1 as const, jobId: candidate.queueJobId, candidateId: candidate.candidateId, leaderboardScopeId: candidate.leaderboardScopeId, maxAttempts: candidate.maxAttempts, workerRuntimeVersion: "worker-1", workerRuntimeSha256: "a".repeat(64), enqueuedAt: now };
    await repository.createQueuedSubmission({ candidate, dispatch: { job, state: "DISPATCHED", dispatchAttempts: 1, createdAt: now, updatedAt: now } });
    const claim = await repository.claimWorkerAttempt({ candidateId: candidate.candidateId, queueJobId: candidate.queueJobId, deliveryAttempt: 1, attemptId: "expired-candidate:attempt:1", fenceToken: "fence-1", now, leaseExpiresAt: "2025-01-01T00:01:00.000Z", workerRuntimeVersion: "worker-1", workerRuntimeSha256: "a".repeat(64) });
    expect(claim).toBeDefined();
    await expect(service.reconcileQueue()).resolves.toMatchObject({ dispatched: 1, pending: 0 });
    const recoveredCandidate = await repository.readCandidate(candidate.candidateId);
    expect(recoveredCandidate?.status).toBe("RETRY_WAIT");
    expect(recoveredCandidate).not.toHaveProperty("activeFenceToken");
    await expect(repository.readAttempt(claim!.attempt.attemptId)).resolves.toMatchObject({ status: "FAILED", failureCategory: "INFRASTRUCTURE", failureCode: "BACKTEST_WORKER_LEASE_EXPIRED" });
    expect(queue.jobs.has(candidate.queueJobId)).toBe(true);
    await expect(repository.recoverAbandonedAttempt({ candidateId: candidate.candidateId, now: "2025-01-01T00:02:00.000Z", error: "duplicate" })).resolves.toBe(false);
  });

  it("creates one synthetic infrastructure Attempt when terminal queue evidence has no Attempt row", async () => {
    const dependencies = createInMemoryBacktestingDependencies();
    const repository = dependencies.repository;
    const now = "2025-01-01T00:00:00.000Z";
    const candidate = {
      candidateId: "synthetic-candidate", ownerUserId: "user-1", origin: "MANUAL" as const, selectionMode: "SINGLE" as const,
      leaderboardScopeId: "scope-1", status: "QUEUED" as const, attempts: [], maxAttempts: 1, completionAttemptCount: 0,
      completionMaxAttempts: 5, strategyDefinitions: [], compositeDefinition: { id: "composite-1", userId: "user-1", logicalFamilyKey: "test", version: 1, method: "WEIGHTED_SCORE" as const, components: [], createdAt: now },
      queueJobId: "synthetic-candidate", createdAt: now, updatedAt: now,
    };
    await repository.createCandidate(candidate);
    await repository.repairTerminalQueueFailure({ candidateId: candidate.candidateId, error: "BACKTEST_QUEUE_TERMINAL_FAILURE", now });
    await repository.repairTerminalQueueFailure({ candidateId: candidate.candidateId, error: "duplicate", now });
    await expect(repository.readCandidate(candidate.candidateId)).resolves.toMatchObject({ status: "TERMINAL_FAILURE_PENDING", failureKind: "INFRASTRUCTURE" });
    const attempts = await repository.listAttempts(candidate.candidateId);
    expect(attempts).toHaveLength(1);
    await expect(repository.readAttempt(`${candidate.candidateId}:recovery:attempt:1`)).resolves.toMatchObject({ status: "FAILED", failureCategory: "INFRASTRUCTURE", failureCode: "BACKTEST_QUEUE_TERMINAL_FAILURE" });
  });
});
