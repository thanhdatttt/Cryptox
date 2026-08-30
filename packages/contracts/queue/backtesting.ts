export interface BacktestQueueJob { schemaVersion: 1; jobId: string; candidateId: string; leaderboardScopeId: string; maxAttempts: number; workerRuntimeVersion: string; workerRuntimeSha256: string; enqueuedAt: string; }
export interface ReplayVerificationJob { schemaVersion: 1; replayJobId: string; experimentId: string; mismatchSampleLimit: number; requestedAt: string; }
export type BacktestQueuePayload = BacktestQueueJob | ReplayVerificationJob;
export type BacktestQueueReturn = { candidateId: string; status: "COMPLETED"; attemptId: string; completedAt: string } | { candidateId: string; status: "IGNORED"; reason: "CANCELLED" | "ALREADY_TERMINAL" | "SUPERSEDED" | "PENDING_COMPLETION" };
export type BacktestQueueTerminalSignal = { schemaVersion: 1; jobId: string; status: "COMPLETED"; returnValue: BacktestQueueReturn } | { schemaVersion: 1; jobId: string; status: "RETRIES_EXHAUSTED"; attemptsMade: number } | { schemaVersion: 1; jobId: string; status: "VERIFIED_TERMINAL_FAILED"; failedReason: string };
export type ReplayQueueReturn = { replayJobId: string; status: "PROCESSED" };
