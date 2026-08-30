import { describe, expect, it } from "vitest";
import { createEvaluationModule } from "@cryptox/evaluation/bootstrap";
import { getLeaderboardScope, score, submit } from "@cryptox/leaderboard";
import * as marketData from "@cryptox/market-data";
import * as strategy from "@cryptox/strategy";
import type { BacktestExecutionRequest, BacktestRunner } from "./bootstrap";
import {
  createBacktestingModule,
  createInMemoryBacktestingRepositories,
  createBoundedLocalBacktestExecutor,
} from "./bootstrap";

interface TestRequest extends BacktestExecutionRequest {
  readonly value: number;
}

class ControlledRunner implements BacktestRunner<TestRequest, number> {
  private readonly pending = new Map<
    string,
    { resolve(value: number): void; reject(error: Error): void }
  >();

  readonly signals = new Map<string, AbortSignal>();

  run(request: TestRequest, signal: AbortSignal): Promise<number> {
    this.signals.set(request.candidateId, signal);
    return new Promise<number>((resolve, reject) => {
      this.pending.set(request.candidateId, { resolve, reject });
    });
  }

  succeed(candidateId: string, value: number): void {
    this.take(candidateId).resolve(value);
  }

  fail(candidateId: string, error: Error): void {
    this.take(candidateId).reject(error);
  }

  private take(candidateId: string): { resolve(value: number): void; reject(error: Error): void } {
    const pending = this.pending.get(candidateId);
    if (!pending) throw new Error(`no pending runner for ${candidateId}`);
    this.pending.delete(candidateId);
    return pending;
  }
}

const clock = { now: () => "2026-08-31T00:00:00.000Z" };

describe("Backtesting public composition", () => {
  it("creates an execution port accepted by createBacktestingModule", () => {
    const execution = createBoundedLocalBacktestExecutor({
      capacity: 1,
      runner: {
        run: async (request: BacktestExecutionRequest) => request.candidateId,
      },
      clock,
    });
    const repositories = createInMemoryBacktestingRepositories();
    const module = createBacktestingModule(
      repositories.createDependencies({
        execution,
        marketData: {
          createDatasetSnapshot: marketData.createDatasetSnapshot,
          readDatasetSnapshot: marketData.readDatasetSnapshot,
        },
        strategy: {
          readStrategyDefinition: strategy.readStrategyDefinition,
          readCompositeDefinition: strategy.readCompositeDefinition,
          resolveStrategy: strategy.resolveStrategy,
          combineSignals: strategy.combineSignals,
        },
        evaluation: createEvaluationModule(),
        leaderboard: { getLeaderboardScope, score, submit },
      }),
    );

    expect(module.startManual).toBeTypeOf("function");
    expect(module.cancelCandidate).toBeTypeOf("function");
  });

  it("preserves bounded capacity and terminal success/failure outcomes", async () => {
    const runner = new ControlledRunner();
    const execution = createBoundedLocalBacktestExecutor<TestRequest, number>({
      capacity: 1,
      runner,
      clock,
    });

    const first = await execution.submit({ candidateId: "candidate-1", value: 1 });
    expect(await execution.status("candidate-1")).toMatchObject({
      candidateId: "candidate-1",
      state: "RUNNING",
    });
    await expect(execution.submit({ candidateId: "candidate-2", value: 2 })).resolves.toMatchObject({
      accepted: false,
      candidateId: "candidate-2",
      status: "SATURATED",
      capacity: { maximum: 1, active: 1, available: 0 },
    });

    runner.succeed("candidate-1", 10);
    if (!first.accepted) throw new Error("expected first submission to be accepted");
    await expect(first.outcome).resolves.toMatchObject({
      candidateId: "candidate-1",
      state: "SUCCEEDED",
      result: 10,
      completedAt: clock.now(),
      durationMs: 0,
    });

    const failed = await execution.submit({ candidateId: "candidate-3", value: 3 });
    runner.fail("candidate-3", new Error("runner failed"));
    if (!failed.accepted) throw new Error("expected failed submission to be accepted");
    await expect(failed.outcome).resolves.toMatchObject({
      candidateId: "candidate-3",
      state: "FAILED",
      failure: { code: "RUNNER_FAILED", message: "runner failed" },
    });
    await expect(execution.capacity()).resolves.toEqual({ maximum: 1, active: 0, available: 1 });
  });

  it("preserves cancellation as the single terminal outcome and retains capacity until settlement", async () => {
    const runner = new ControlledRunner();
    const execution = createBoundedLocalBacktestExecutor<TestRequest, number>({
      capacity: 1,
      runner,
      clock,
    });
    const submission = await execution.submit({ candidateId: "candidate-1", value: 1 });
    if (!submission.accepted) throw new Error("expected submission to be accepted");

    await expect(execution.cancel("candidate-1")).resolves.toBe(true);
    await expect(submission.outcome).resolves.toMatchObject({
      candidateId: "candidate-1",
      state: "CANCELLED",
      completedAt: clock.now(),
    });
    expect(runner.signals.get("candidate-1")?.aborted).toBe(true);
    await expect(execution.capacity()).resolves.toEqual({ maximum: 1, active: 1, available: 0 });

    runner.succeed("candidate-1", 10);
    await Promise.resolve();
    await Promise.resolve();
    await expect(execution.status("candidate-1")).resolves.toMatchObject({ state: "CANCELLED" });
    await expect(execution.cancel("candidate-1")).resolves.toBe(false);
    await expect(execution.capacity()).resolves.toEqual({ maximum: 1, active: 0, available: 1 });
  });
});
