import { describe, expect, it } from "vitest";
import type { BacktestExecutionRequest, BacktestRunner } from "../../application/ports";
import { BoundedLocalBacktestExecutor } from "./bounded-local-backtest-executor";

interface TestRequest extends BacktestExecutionRequest {
  value: number;
}

class ControlledRunner implements BacktestRunner<TestRequest, number> {
  private readonly pending = new Map<
    string,
    { resolve(value: number): void; reject(error: Error): void }
  >();
  active = 0;
  maximumActive = 0;
  signals = new Map<string, AbortSignal>();

  run(request: TestRequest, signal: AbortSignal): Promise<number> {
    this.active += 1;
    this.maximumActive = Math.max(this.maximumActive, this.active);
    this.signals.set(request.candidateId, signal);

    return new Promise<number>((resolve, reject) => {
      this.pending.set(request.candidateId, {
        resolve: (value) => {
          this.active -= 1;
          resolve(value);
        },
        reject: (error) => {
          this.active -= 1;
          reject(error);
        },
      });
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

const clock = { now: () => "2026-08-27T00:00:00.000Z" };

describe("BoundedLocalBacktestExecutor", () => {
  it("bounds active runner calls and reports saturation", async () => {
    const runner = new ControlledRunner();
    const executor = new BoundedLocalBacktestExecutor({ capacity: 2, runner, clock });

    const first = await executor.submit({ candidateId: "candidate-1", value: 1 });
    const second = await executor.submit({ candidateId: "candidate-2", value: 2 });
    const saturated = await executor.submit({ candidateId: "candidate-3", value: 3 });

    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(true);
    expect(saturated).toEqual({
      accepted: false,
      candidateId: "candidate-3",
      status: "SATURATED",
      capacity: { maximum: 2, active: 2, available: 0 },
    });
    expect(runner.maximumActive).toBe(2);

    runner.succeed("candidate-1", 10);
    runner.succeed("candidate-2", 20);
    if (!first.accepted || !second.accepted) throw new Error("expected accepted submissions");
    await expect(first.outcome).resolves.toMatchObject({ state: "SUCCEEDED", result: 10 });
    await expect(second.outcome).resolves.toMatchObject({ state: "SUCCEEDED", result: 20 });
    await expect(executor.capacity()).resolves.toEqual({ maximum: 2, active: 0, available: 2 });
  });

  it("exposes running and failed state with the runner failure", async () => {
    const runner = new ControlledRunner();
    const executor = new BoundedLocalBacktestExecutor({ capacity: 1, runner, clock });
    const submission = await executor.submit({ candidateId: "candidate-1", value: 1 });

    await expect(executor.status("candidate-1")).resolves.toEqual({
      candidateId: "candidate-1",
      state: "RUNNING",
    });
    runner.fail("candidate-1", new Error("fake runner failed"));
    if (!submission.accepted) throw new Error("expected accepted submission");
    await expect(submission.outcome).resolves.toMatchObject({
      state: "FAILED",
      failure: { code: "RUNNER_FAILED", message: "fake runner failed" },
    });
    await expect(executor.status("candidate-1")).resolves.toMatchObject({ state: "FAILED" });
  });

  it("publishes cancellation once and retains capacity until the runner settles", async () => {
    const runner = new ControlledRunner();
    const executor = new BoundedLocalBacktestExecutor({ capacity: 1, runner, clock });
    const submission = await executor.submit({ candidateId: "candidate-1", value: 1 });
    if (!submission.accepted) throw new Error("expected accepted submission");
    let terminalDeliveries = 0;
    void submission.outcome.then(() => {
      terminalDeliveries += 1;
    });

    await expect(executor.cancel("candidate-1")).resolves.toBe(true);
    await expect(submission.outcome).resolves.toMatchObject({ state: "CANCELLED" });
    expect(runner.signals.get("candidate-1")?.aborted).toBe(true);
    await expect(executor.capacity()).resolves.toEqual({ maximum: 1, active: 1, available: 0 });
    await expect(executor.submit({ candidateId: "candidate-2", value: 2 })).resolves.toMatchObject({
      accepted: false,
      status: "SATURATED",
    });

    runner.succeed("candidate-1", 10);
    await Promise.resolve();
    await Promise.resolve();

    expect(terminalDeliveries).toBe(1);
    await expect(executor.status("candidate-1")).resolves.toMatchObject({ state: "CANCELLED" });
    await expect(executor.cancel("candidate-1")).resolves.toBe(false);
    await expect(executor.capacity()).resolves.toEqual({ maximum: 1, active: 0, available: 1 });
  });
});
