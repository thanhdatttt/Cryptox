import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type { BacktestQueueJob, BacktestQueueReturn } from "@cryptox/contracts/queue";
import { BullMqBacktestQueue, BullMqBacktestWorker } from "./adapter";

const redisUrl = process.env.BACKTEST_QUEUE_INTEGRATION_REDIS_URL;
const describeIntegration = redisUrl ? describe : describe.skip;
const sha256 = "a".repeat(64);

const job = (candidateId: string, maxAttempts = 1): BacktestQueueJob => ({
  schemaVersion: 1,
  jobId: candidateId,
  candidateId,
  leaderboardScopeId: "queue-integration-scope",
  maxAttempts,
  workerRuntimeVersion: "queue-integration",
  workerRuntimeSha256: sha256,
  enqueuedAt: new Date().toISOString(),
});

const waitFor = async (predicate: () => boolean, timeoutMs = 15_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("QUEUE_INTEGRATION_TIMEOUT");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

describeIntegration("BullMQ queue integration", () => {
  const resources: Array<{ close(): Promise<void> }> = [];
  let cleanupJobs: (() => Promise<void>) | undefined;

  afterEach(async () => {
    try {
      await cleanupJobs?.();
    } finally {
      cleanupJobs = undefined;
      await Promise.all(resources.splice(0).reverse().map((resource) => resource.close()));
    }
  });

  it("drains one durable queue through two workers, retries once, and completes each candidate once", async () => {
    const queue = new BullMqBacktestQueue(redisUrl!);
    resources.push(queue);
    const suffix = randomUUID();
    const heldCandidate = `queue-integration-held-${suffix}`;
    const secondWorkerCandidate = `queue-integration-second-${suffix}`;
    const retryCandidate = `queue-integration-retry-${suffix}`;
    cleanupJobs = async () => {
      await Promise.all([heldCandidate, secondWorkerCandidate, retryCandidate].map((jobId) => queue.remove(jobId)));
    };
    let releaseFirstWorker: (() => void) | undefined;
    const firstWorkerHeld = new Promise<void>((resolve) => { releaseFirstWorker = resolve; });
    let firstWorkerStarted = false;
    const processedBy = new Map<string, string[]>();
    const completedCandidates = new Set<string>();
    let retryCalls = 0;

    const recordSuccess = (workerId: string, value: BacktestQueueJob): BacktestQueueReturn => {
      const records = processedBy.get(value.candidateId) ?? [];
      records.push(workerId);
      processedBy.set(value.candidateId, records);
      if (completedCandidates.has(value.candidateId)) throw new Error(`DUPLICATE_COMPLETION:${value.candidateId}`);
      completedCandidates.add(value.candidateId);
      return { candidateId: value.candidateId, status: "COMPLETED", attemptId: `${value.candidateId}:attempt:1`, completedAt: new Date().toISOString() };
    };

    const workerOne = new BullMqBacktestWorker(redisUrl!, {
      processQueueJob: async (value) => {
        if (value.candidateId === heldCandidate) {
          firstWorkerStarted = true;
          await firstWorkerHeld;
        }
        return recordSuccess("worker-1", value);
      },
    });
    resources.push(workerOne);
    await workerOne.waitUntilReady();

    await queue.enqueue(job(heldCandidate));
    await waitFor(() => firstWorkerStarted);
    const workerTwo = new BullMqBacktestWorker(redisUrl!, {
      processQueueJob: async (value) => {
        if (value.candidateId === retryCandidate && retryCalls++ === 0) throw new Error("RETRY_ONCE");
        return recordSuccess("worker-2", value);
      },
    });
    resources.push(workerTwo);
    await workerTwo.waitUntilReady();
    await queue.enqueue(job(secondWorkerCandidate));
    await queue.enqueue(job(retryCandidate, 2));
    await waitFor(() => completedCandidates.has(secondWorkerCandidate) && completedCandidates.has(retryCandidate));
    releaseFirstWorker?.();
    await waitFor(() => completedCandidates.size === 3);

    expect(processedBy.get(heldCandidate)).toEqual(["worker-1"]);
    expect(processedBy.get(secondWorkerCandidate)).toEqual(["worker-2"]);
    expect(processedBy.get(retryCandidate)).toEqual(["worker-2"]);
    expect(retryCalls).toBe(2);
    expect(completedCandidates).toEqual(new Set([heldCandidate, secondWorkerCandidate, retryCandidate]));
  }, 30_000);
});
