import { describe, expect, it } from "vitest";
import { completedSignalFromStoredJob, forwardTerminalSignal } from "./adapter";

describe("BullMQ terminal signal bridge", () => {
  it("forwards both completed and verified terminal failures to the Backtesting public completion runtime", async () => {
    const received: unknown[] = [];
    const runtime = { processQueueTerminalSignal: async (signal: unknown) => { received.push(signal); } };
    await forwardTerminalSignal(runtime, { schemaVersion: 1, jobId: "candidate-1", status: "COMPLETED", returnValue: { candidateId: "candidate-1", status: "COMPLETED", attemptId: "attempt-1", completedAt: "2025-01-01T00:00:00.000Z" } });
    await forwardTerminalSignal(runtime, { schemaVersion: 1, jobId: "candidate-2", status: "VERIFIED_TERMINAL_FAILED", failedReason: "worker crashed" });
    expect(received).toHaveLength(2);
    expect(received).toEqual(expect.arrayContaining([expect.objectContaining({ jobId: "candidate-1", status: "COMPLETED" }), expect.objectContaining({ jobId: "candidate-2", status: "VERIFIED_TERMINAL_FAILED" })]));
  });

  it("uses the retained job payload rather than parsing a QueueEvents return value", () => {
    const job = { schemaVersion: 1 as const, jobId: "candidate-1", candidateId: "candidate-1", leaderboardScopeId: "scope-1", maxAttempts: 1, workerRuntimeVersion: "1", workerRuntimeSha256: "a".repeat(64), enqueuedAt: "2025-01-01T00:00:00.000Z" };
    expect(completedSignalFromStoredJob(job.jobId, job, undefined)).toMatchObject({ jobId: "candidate-1", status: "COMPLETED", returnValue: { candidateId: "candidate-1", status: "IGNORED", reason: "PENDING_COMPLETION" } });
    expect(completedSignalFromStoredJob("replay-1", { schemaVersion: 1, replayJobId: "replay-1", experimentId: "experiment-1", mismatchSampleLimit: 10, requestedAt: "2025-01-01T00:00:00.000Z" }, { replayJobId: "replay-1", status: "PROCESSED" })).toBeUndefined();
  });
});
