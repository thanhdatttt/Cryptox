"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BullMqBacktestCompletionListener = exports.BullMqBacktestWorker = exports.forwardTerminalSignal = exports.BullMqBacktestQueue = exports.BACKTEST_QUEUE_NAME = void 0;
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
const forwardTerminalSignal = async (runtime, signal) => {
    await runtime.processQueueTerminalSignal(signal);
};
exports.forwardTerminalSignal = forwardTerminalSignal;
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
class BullMqBacktestCompletionListener {
    runtime;
    queue;
    events;
    constructor(redisUrl, runtime) {
        this.runtime = runtime;
        this.queue = new bullmq_1.Queue(exports.BACKTEST_QUEUE_NAME, { connection: { url: redisUrl } });
        this.events = new bullmq_1.QueueEvents(exports.BACKTEST_QUEUE_NAME, { connection: { url: redisUrl } });
        this.events.on("completed", ({ jobId, returnvalue }) => {
            try {
                const parsed = JSON.parse(returnvalue);
                void (0, exports.forwardTerminalSignal)(this.runtime, { schemaVersion: 1, jobId, status: "COMPLETED", returnValue: parsed }).catch(() => undefined);
            }
            catch { /* malformed return values are ignored; durable reconciliation remains authoritative */ }
        });
        this.events.on("failed", ({ jobId, failedReason }) => { void this.forwardVerifiedFailure(jobId, failedReason); });
    }
    async forwardVerifiedFailure(jobId, failedReason) {
        const job = await this.queue.getJob(jobId);
        if (!job || await job.getState() !== "failed")
            return;
        const attempts = typeof job.opts.attempts === "number" ? job.opts.attempts : 1;
        if (job.attemptsMade < attempts)
            return;
        await (0, exports.forwardTerminalSignal)(this.runtime, { schemaVersion: 1, jobId, status: "VERIFIED_TERMINAL_FAILED", failedReason });
    }
    async reconcileTerminalJobs(limit = 100) {
        const candidateIds = await this.runtime.listQueueRecoveryCandidates(limit);
        let forwarded = 0;
        for (const jobId of candidateIds) {
            const job = await this.queue.getJob(jobId);
            if (!job)
                continue;
            const state = await job.getState();
            if (state === "completed") {
                const returnValue = (job.returnvalue ?? { candidateId: jobId, status: "IGNORED", reason: "PENDING_COMPLETION" });
                await (0, exports.forwardTerminalSignal)(this.runtime, { schemaVersion: 1, jobId, status: "COMPLETED", returnValue });
                forwarded += 1;
            }
            else if (state === "failed") {
                const attempts = typeof job.opts.attempts === "number" ? job.opts.attempts : 1;
                if (job.attemptsMade >= attempts) {
                    await (0, exports.forwardTerminalSignal)(this.runtime, { schemaVersion: 1, jobId, status: "VERIFIED_TERMINAL_FAILED", failedReason: job.failedReason ?? "BACKTEST_QUEUE_TERMINAL_FAILURE" });
                    forwarded += 1;
                }
            }
        }
        return forwarded;
    }
    async waitUntilReady() { await this.events.waitUntilReady(); }
    async close() { await this.events.close(); await this.queue.close(); }
}
exports.BullMqBacktestCompletionListener = BullMqBacktestCompletionListener;
