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
    });
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
    const definition = { id: "definition-1", logicalFamilyKey: "strategy:test", strategyName: "TEST", implementationVersion: "1", implementationSha256: "a".repeat(64), version: 1, parameters: {}, createdAt: "2025-01-01T00:00:00.000Z" };
    const composite = { id: "composite-1", logicalFamilyKey: "composite:test", version: 1, method: "MAJORITY_VOTE" as const, components: [{ strategyDefinitionId: definition.id, weight: 0 }], createdAt: "2025-01-01T00:00:00.000Z" };
    const scope = await service.createBenchmarkScope({ name: "BTC fixture", datasetSnapshot: snapshot, initialCapital: 1000, feeRatePercent: 0, slippageBps: 0, scoreFormulaId: "MVP_MANUAL_V1", workerRuntimeVersion: "1", workerRuntimeSha256: "b".repeat(64), evaluationRuntimeVersion: "1", evaluationRuntimeSha256: "c".repeat(64) }, { ownerUserId: "user-1", scopeIdempotencyKey: "scope-key" });
    const accepted = await service.startManual({ leaderboardScopeId: scope.id, strategyDefinitions: [definition], compositeDefinition: composite, maxAttempts: 2 }, { ownerUserId: "user-1", submissionIdempotencyKey: "submission-key" });

    expect(accepted).toMatchObject({ candidateId: accepted.jobId, status: "QUEUED" });
    await expect(service.startManual({ leaderboardScopeId: scope.id, strategyDefinitions: [definition], compositeDefinition: composite, maxAttempts: 2 }, { ownerUserId: "user-1", submissionIdempotencyKey: "submission-key" })).resolves.toEqual(accepted);
    const job = queue.jobs.get(accepted.jobId);
    expect(job).toMatchObject({ jobId: accepted.candidateId, maxAttempts: 2 });
    await expect(service.processQueueJob(job!, { attemptNumber: 1, fenceToken: "worker-claim-1" })).rejects.toThrow("TRANSIENT_STRATEGY_ARTIFACT_FAILURE");
    await expect(service.status(accepted.candidateId, { ownerUserId: "user-1" })).resolves.toMatchObject({ status: "RETRY_WAIT", attempts: [{ status: "FAILED", failureCategory: "RETRYABLE" }] });
    await expect(service.processQueueJob(job!, { attemptNumber: 2, fenceToken: "worker-claim-2" })).resolves.toMatchObject({ status: "COMPLETED", candidateId: accepted.candidateId });
    await expect(service.processQueueJob(job!, { attemptNumber: 2, fenceToken: "stale-claim" })).resolves.toMatchObject({ status: "IGNORED", reason: "ALREADY_TERMINAL" });
    const progress = await service.status(accepted.candidateId, { ownerUserId: "user-1" });
    expect(progress).toMatchObject({ status: "COMPLETED", attempts: [{ status: "FAILED" }, { status: "COMPLETED" }] });
    const completedProgress = progress.attempts.find((attempt) => attempt.status === "COMPLETED")!;
    const attempt = await service.readAttempt(completedProgress.attemptId, { ownerUserId: "user-1" });
    const trades = await service.listAttemptTrades(attempt.attemptId, { limit: 10 }, { ownerUserId: "user-1" });
    expect(trades.items).toHaveLength(1);
    const experiment = await service.readExperimentSummary(progress.experimentResultId!, { ownerUserId: "user-1" });
    expect(experiment.metrics).toMatchObject({ numberOfTrades: 1, candidateId: accepted.candidateId });
    await expect(service.verifyReplay(experiment.id, { ownerUserId: "user-1" })).resolves.toMatchObject({ status: "MATCH", comparedTradeCount: 1 });
    await expect(service.status(accepted.candidateId, { ownerUserId: "another-user" })).rejects.toThrow("BACKTEST_ACCESS_DENIED");
  });
});
