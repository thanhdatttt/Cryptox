"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const adapter_1 = require("./adapter");
(0, vitest_1.describe)("BullMQ terminal signal bridge", () => {
    (0, vitest_1.it)("forwards both completed and verified terminal failures to the Backtesting public completion runtime", async () => {
        const received = [];
        const runtime = { processQueueTerminalSignal: async (signal) => { received.push(signal); } };
        await (0, adapter_1.forwardTerminalSignal)(runtime, { schemaVersion: 1, jobId: "candidate-1", status: "COMPLETED", returnValue: { candidateId: "candidate-1", status: "COMPLETED", attemptId: "attempt-1", completedAt: "2025-01-01T00:00:00.000Z" } });
        await (0, adapter_1.forwardTerminalSignal)(runtime, { schemaVersion: 1, jobId: "candidate-2", status: "VERIFIED_TERMINAL_FAILED", failedReason: "worker crashed" });
        (0, vitest_1.expect)(received).toHaveLength(2);
        (0, vitest_1.expect)(received).toEqual(vitest_1.expect.arrayContaining([vitest_1.expect.objectContaining({ jobId: "candidate-1", status: "COMPLETED" }), vitest_1.expect.objectContaining({ jobId: "candidate-2", status: "VERIFIED_TERMINAL_FAILED" })]));
    });
});
