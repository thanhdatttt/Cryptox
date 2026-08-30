import type { BacktestQueueJob, BacktestQueuePayload, BacktestQueueReturn, BacktestQueueTerminalSignal } from "@cryptox/contracts/queue";
import type { BacktestQueuePort } from "../../application/ports";
export declare const BACKTEST_QUEUE_NAME = "backtest-execution-v1";
export declare class BullMqBacktestQueue implements BacktestQueuePort {
    private readonly queue;
    constructor(redisUrl: string);
    enqueue(value: BacktestQueuePayload): Promise<void>;
    remove(jobId: string): Promise<void>;
    close(): Promise<void>;
}
export interface BacktestQueueWorkerRuntime {
    processQueueJob(job: BacktestQueueJob, delivery: {
        attemptNumber: number;
        fenceToken?: string;
    }): Promise<BacktestQueueReturn>;
    processReplayVerification?(replayJobId: string): Promise<void>;
}
export interface BacktestQueueCompletionRuntime {
    processQueueTerminalSignal(signal: BacktestQueueTerminalSignal): Promise<unknown>;
}
export interface BacktestQueueRecoveryRuntime extends BacktestQueueCompletionRuntime {
    listQueueRecoveryCandidates(limit?: number): Promise<string[]>;
}
export declare const forwardTerminalSignal: (runtime: BacktestQueueCompletionRuntime, signal: BacktestQueueTerminalSignal) => Promise<void>;
export declare class BullMqBacktestWorker {
    private readonly worker;
    constructor(redisUrl: string, runtime: BacktestQueueWorkerRuntime, concurrency?: number);
    waitUntilReady(): Promise<void>;
    close(): Promise<void>;
}
export declare class BullMqBacktestCompletionListener {
    private readonly runtime;
    private readonly queue;
    private readonly events;
    constructor(redisUrl: string, runtime: BacktestQueueRecoveryRuntime);
    private forwardVerifiedFailure;
    reconcileTerminalJobs(limit?: number): Promise<number>;
    waitUntilReady(): Promise<void>;
    close(): Promise<void>;
}
