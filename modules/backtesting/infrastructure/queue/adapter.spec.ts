import { describe, expect, it } from "vitest";
import { forwardTerminalSignal } from "./adapter";

describe("BullMQ terminal signal bridge", () => {
  it("forwards both completed and verified terminal failures to the Backtesting public completion runtime", async () => {
    const received: unknown[] = [];
    const runtime = { processQueueTerminalSignal: async (signal: unknown) => { received.push(signal); } };
    await forwardTerminalSignal(runtime, { schemaVersion: 1, jobId: "candidate-1", status: "COMPLETED", returnValue: { candidateId: "candidate-1", status: "COMPLETED", attemptId: "attempt-1", completedAt: "2025-01-01T00:00:00.000Z" } });
    await forwardTerminalSignal(runtime, { schemaVersion: 1, jobId: "candidate-2", status: "VERIFIED_TERMINAL_FAILED", failedReason: "worker crashed" });
    expect(received).toHaveLength(2);
    expect(received).toEqual(expect.arrayContaining([expect.objectContaining({ jobId: "candidate-1", status: "COMPLETED" }), expect.objectContaining({ jobId: "candidate-2", status: "VERIFIED_TERMINAL_FAILED" })]));
  });
});
