import { Queue, Worker, type Job } from "bullmq";
import type { BacktestQueueJob, BacktestQueueReturn } from "@cryptox/contracts/queue";
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
