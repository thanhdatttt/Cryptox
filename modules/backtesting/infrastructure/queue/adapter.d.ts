import type { BacktestQueueJob, BacktestQueueReturn } from "@cryptox/contracts/queue";
import type { BacktestQueuePort } from "../../application/ports";
export declare const BACKTEST_QUEUE_NAME = "backtest-execution-v1";
export declare class BullMqBacktestQueue implements BacktestQueuePort {
    private readonly queue;
    constructor(redisUrl: string);
    enqueue(value: BacktestQueueJob): Promise<void>;
    remove(jobId: string): Promise<void>;
    close(): Promise<void>;
}
export interface BacktestQueueWorkerRuntime {
    processQueueJob(job: BacktestQueueJob, delivery: {
        attemptNumber: number;
        fenceToken?: string;
    }): Promise<BacktestQueueReturn>;
}
export declare class BullMqBacktestWorker {
    private readonly worker;
    constructor(redisUrl: string, runtime: BacktestQueueWorkerRuntime, concurrency?: number);
    waitUntilReady(): Promise<void>;
    close(): Promise<void>;
}
