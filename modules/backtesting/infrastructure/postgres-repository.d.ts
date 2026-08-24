import type { EvaluationMetrics } from "modules/evaluation/api";
import type { Candle, DatasetSnapshotRef } from "modules/market-data/api";
import type { BacktestAttemptAudit, BacktestAttemptProgress, CompletedBacktestResult, Trade } from "../domain/contracts";
import type { BacktestingRepository, StoredBenchmarkScope, StoredCandidate, StoredExperiment } from "../application/ports";
export interface BacktestingSqlClient {
    query<Row>(text: string, values: unknown[]): Promise<{
        rows: Row[];
    }>;
}
interface TransactionClient extends BacktestingSqlClient {
    release(): void;
}
interface TransactionPool extends BacktestingSqlClient {
    connect?(): Promise<TransactionClient>;
}
export declare class PostgresBacktestingRepository implements BacktestingRepository {
    private readonly pool;
    constructor(pool: TransactionPool);
    private transaction;
    createInputSnapshot(input: DatasetSnapshotRef, candles: Candle[]): Promise<void>;
    readInputSnapshot(snapshotId: string): Promise<{
        snapshot: DatasetSnapshotRef;
        candles: Candle[];
    } | undefined>;
    createScope(input: StoredBenchmarkScope, idempotencyKey: string): Promise<StoredBenchmarkScope>;
    private scopeRows;
    findScopeByIdempotency(ownerUserId: string, idempotencyKey: string): Promise<StoredBenchmarkScope | undefined>;
    readScope(scopeId: string): Promise<StoredBenchmarkScope | undefined>;
    private candidateFrom;
    private candidateSql;
    createCandidate(input: StoredCandidate, key?: string): Promise<StoredCandidate>;
    findCandidateBySubmission(ownerUserId: string, key: string): Promise<StoredCandidate | undefined>;
    readCandidate(candidateId: string): Promise<StoredCandidate | undefined>;
    updateCandidate(input: StoredCandidate): Promise<void>;
    listCandidatesBySearchRun(searchRunId: string): Promise<StoredCandidate[]>;
    createAttempt(input: BacktestAttemptAudit): Promise<void>;
    updateAttempt(input: BacktestAttemptAudit): Promise<void>;
    readAttempt(attemptId: string): Promise<BacktestAttemptAudit | undefined>;
    listAttempts(candidateId: string): Promise<BacktestAttemptProgress[]>;
    private saveTrade;
    completeAttempt(input: {
        candidate: StoredCandidate;
        attempt: BacktestAttemptAudit;
        result: CompletedBacktestResult;
        metrics: EvaluationMetrics;
        experiment: StoredExperiment;
    }): Promise<void>;
    listTrades(attemptId: string): Promise<Trade[]>;
    readExperiment(experimentId: string): Promise<StoredExperiment | undefined>;
    findExperimentByCandidate(candidateId: string): Promise<StoredExperiment | undefined>;
    listExperimentsBySearchRun(searchRunId: string): Promise<StoredExperiment[]>;
    updateExperimentScore(experimentId: string, input: {
        overallScore: number;
        rankEligible: boolean;
    }): Promise<StoredExperiment | undefined>;
    private experiment;
}
export declare const createPostgresBacktestingDependencies: (pool: TransactionPool, dependencies: Omit<import("../application/ports").BacktestingModuleDependencies, "repository">) => import("../application/ports").BacktestingModuleDependencies;
export {};
