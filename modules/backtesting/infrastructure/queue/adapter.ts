import { Queue, QueueEvents, Worker, type Job } from "bullmq";
import type { BacktestQueueJob, BacktestQueueReturn, BacktestQueueTerminalSignal } from "@cryptox/contracts/queue";
import type { BacktestQueuePort } from "../../application/ports";

export const BACKTEST_QUEUE_NAME = "backtest-execution-v1";

const validate = (value: unknown): BacktestQueueJob => {
  if (!value || typeof value !== "object") throw new Error("INVALID_BACKTEST_QUEUE_JOB");
  const job = value as Partial<BacktestQueueJob>;
  const maxAttempts = job.maxAttempts;
  if (job.schemaVersion !== 1 || typeof job.jobId !== "string" || job.jobId.length === 0 || job.candidateId !== job.jobId || typeof job.leaderboardScopeId !== "string" || typeof maxAttempts !== "number" || !Number.isInteger(maxAttempts) || maxAttempts < 1 || typeof job.workerRuntimeVersion !== "string" || typeof job.workerRuntimeSha256 !== "string" || typeof job.enqueuedAt !== "string") throw new Error("INVALID_BACKTEST_QUEUE_JOB");
  return job as BacktestQueueJob;
};

export class BullMqBacktestQueue implements BacktestQueuePort {
  private readonly queue: Queue<BacktestQueueJob, BacktestQueueReturn, "execute">;

  constructor(redisUrl: string) {
    this.queue = new Queue<BacktestQueueJob, BacktestQueueReturn, "execute">(BACKTEST_QUEUE_NAME, { connection: { url: redisUrl } });
  }

  async enqueue(value: BacktestQueueJob): Promise<void> {
    const job = validate(value);
    await this.queue.add("execute", job, {
      jobId: job.jobId,
      attempts: job.maxAttempts,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: false,
      removeOnFail: false,
    });
  }

  async remove(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) await job.remove();
  }

  async close(): Promise<void> { await this.queue.close(); }
}

export interface BacktestQueueWorkerRuntime {
  processQueueJob(job: BacktestQueueJob, delivery: { attemptNumber: number; fenceToken?: string }): Promise<BacktestQueueReturn>;
}

export interface BacktestQueueCompletionRuntime {
  processQueueTerminalSignal(signal: BacktestQueueTerminalSignal): Promise<unknown>;
}

export interface BacktestQueueRecoveryRuntime extends BacktestQueueCompletionRuntime {
  listQueueRecoveryCandidates(limit?: number): Promise<string[]>;
}

export const forwardTerminalSignal = async (runtime: BacktestQueueCompletionRuntime, signal: BacktestQueueTerminalSignal): Promise<void> => {
  await runtime.processQueueTerminalSignal(signal);
};

export class BullMqBacktestWorker {
  private readonly worker: Worker<BacktestQueueJob, BacktestQueueReturn, "execute">;

  constructor(redisUrl: string, runtime: BacktestQueueWorkerRuntime, concurrency = 1) {
    if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error("INVALID_BACKTEST_WORKER_CONCURRENCY");
    this.worker = new Worker<BacktestQueueJob, BacktestQueueReturn, "execute">(BACKTEST_QUEUE_NAME, async (nativeJob: Job<BacktestQueueJob, BacktestQueueReturn, "execute">) => {
      const job = validate(nativeJob.data);
      return runtime.processQueueJob(job, { attemptNumber: nativeJob.attemptsMade + 1, fenceToken: `${job.jobId}:${nativeJob.attemptsMade + 1}:${nativeJob.token ?? "delivery"}` });
    }, { connection: { url: redisUrl }, concurrency, maxStalledCount: 1 });
  }

  async waitUntilReady(): Promise<void> { await this.worker.waitUntilReady(); }
  async close(): Promise<void> { await this.worker.close(); }
}

export class BullMqBacktestCompletionListener {
  private readonly queue: Queue<BacktestQueueJob, BacktestQueueReturn, "execute">;
  private readonly events: QueueEvents;

  constructor(redisUrl: string, private readonly runtime: BacktestQueueRecoveryRuntime) {
    this.queue = new Queue<BacktestQueueJob, BacktestQueueReturn, "execute">(BACKTEST_QUEUE_NAME, { connection: { url: redisUrl } });
    this.events = new QueueEvents(BACKTEST_QUEUE_NAME, { connection: { url: redisUrl } });
    this.events.on("completed", ({ jobId, returnvalue }: { jobId: string; returnvalue: string }) => {
      try {
        const parsed = JSON.parse(returnvalue) as BacktestQueueReturn;
        void forwardTerminalSignal(this.runtime, { schemaVersion: 1, jobId, status: "COMPLETED", returnValue: parsed }).catch(() => undefined);
      } catch { /* malformed return values are ignored; durable reconciliation remains authoritative */ }
    });
    this.events.on("failed", ({ jobId, failedReason }: { jobId: string; failedReason: string }) => { void this.forwardVerifiedFailure(jobId, failedReason); });
  }

  private async forwardVerifiedFailure(jobId: string, failedReason: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (!job || await job.getState() !== "failed") return;
    const attempts = typeof job.opts.attempts === "number" ? job.opts.attempts : 1;
    if (job.attemptsMade < attempts) return;
    await forwardTerminalSignal(this.runtime, { schemaVersion: 1, jobId, status: "VERIFIED_TERMINAL_FAILED", failedReason });
  }

  async reconcileTerminalJobs(limit = 100): Promise<number> {
    const candidateIds = await this.runtime.listQueueRecoveryCandidates(limit);
    let forwarded = 0;
    for (const jobId of candidateIds) {
      const job = await this.queue.getJob(jobId);
      if (!job) continue;
      const state = await job.getState();
      if (state === "completed") {
        const returnValue = (job.returnvalue ?? { candidateId: jobId, status: "IGNORED", reason: "PENDING_COMPLETION" }) as BacktestQueueReturn;
        await forwardTerminalSignal(this.runtime, { schemaVersion: 1, jobId, status: "COMPLETED", returnValue });
        forwarded += 1;
      } else if (state === "failed") {
        const attempts = typeof job.opts.attempts === "number" ? job.opts.attempts : 1;
        if (job.attemptsMade >= attempts) {
          await forwardTerminalSignal(this.runtime, { schemaVersion: 1, jobId, status: "VERIFIED_TERMINAL_FAILED", failedReason: job.failedReason ?? "BACKTEST_QUEUE_TERMINAL_FAILURE" });
          forwarded += 1;
        }
      }
    }
    return forwarded;
  }

  async waitUntilReady(): Promise<void> { await this.events.waitUntilReady(); }
  async close(): Promise<void> { await this.events.close(); await this.queue.close(); }
}
