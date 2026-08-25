"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BullMqBacktestWorker = exports.BullMqBacktestQueue = exports.BACKTEST_QUEUE_NAME = void 0;
const bullmq_1 = require("bullmq");
exports.BACKTEST_QUEUE_NAME = "backtest-execution-v1";
const validate = (value) => {
    if (!value || typeof value !== "object")
        throw new Error("INVALID_BACKTEST_QUEUE_JOB");
    const job = value;
    const maxAttempts = job.maxAttempts;
    if (job.schemaVersion !== 1 || typeof job.jobId !== "string" || job.jobId.length === 0 || job.candidateId !== job.jobId || typeof job.leaderboardScopeId !== "string" || typeof maxAttempts !== "number" || !Number.isInteger(maxAttempts) || maxAttempts < 1 || typeof job.workerRuntimeVersion !== "string" || typeof job.workerRuntimeSha256 !== "string" || typeof job.enqueuedAt !== "string")
        throw new Error("INVALID_BACKTEST_QUEUE_JOB");
    return job;
};
class BullMqBacktestQueue {
    queue;
    constructor(redisUrl) {
        this.queue = new bullmq_1.Queue(exports.BACKTEST_QUEUE_NAME, { connection: { url: redisUrl } });
    }
    async enqueue(value) {
        const job = validate(value);
        await this.queue.add("execute", job, {
            jobId: job.jobId,
            attempts: job.maxAttempts,
            backoff: { type: "exponential", delay: 1_000 },
            removeOnComplete: false,
            removeOnFail: false,
        });
    }
    async remove(jobId) {
        const job = await this.queue.getJob(jobId);
        if (job)
            await job.remove();
    }
    async close() { await this.queue.close(); }
}
exports.BullMqBacktestQueue = BullMqBacktestQueue;
class BullMqBacktestWorker {
    worker;
    constructor(redisUrl, runtime, concurrency = 1) {
        if (!Number.isInteger(concurrency) || concurrency < 1)
            throw new Error("INVALID_BACKTEST_WORKER_CONCURRENCY");
        this.worker = new bullmq_1.Worker(exports.BACKTEST_QUEUE_NAME, async (nativeJob) => {
            const job = validate(nativeJob.data);
            return runtime.processQueueJob(job, { attemptNumber: nativeJob.attemptsMade + 1, fenceToken: `${job.jobId}:${nativeJob.attemptsMade + 1}:${nativeJob.token ?? "delivery"}` });
        }, { connection: { url: redisUrl }, concurrency, maxStalledCount: 1 });
    }
    async waitUntilReady() { await this.worker.waitUntilReady(); }
    async close() { await this.worker.close(); }
}
exports.BullMqBacktestWorker = BullMqBacktestWorker;
