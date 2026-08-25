import type { EvaluationMetrics, EvaluatorModulePublicApi } from "modules/evaluation/api";
import type { Candle, DatasetSnapshotRef, MarketDataModulePublicApi } from "modules/market-data/api";
import type { StrategyModulePublicApi } from "modules/strategy/api";
import type { BacktestAttemptAudit, BacktestAttemptProgress, BenchmarkScopeSummary, CandidateProgress, CompletedBacktestResult, ExperimentResultSummary, Trade } from "../domain/contracts";
import type { BacktestQueueJob } from "@cryptox/contracts/queue";

export interface StoredBenchmarkScope extends BenchmarkScopeSummary { ownerUserId: string; }

export interface StoredCandidate extends CandidateProgress {
  ownerUserId: string;
  strategyDefinitions: import("modules/strategy/api").StrategyDefinition[];
  compositeDefinition: import("modules/strategy/api").CompositeStrategyDefinition;
  queueJobId: string;
  executionGeneration?: number;
  activeFenceToken?: string;
  activeLeaseExpiresAt?: string;
}

export interface StoredExperiment extends ExperimentResultSummary { ownerUserId: string; }

export interface BacktestDispatch {
  job: BacktestQueueJob;
  state: "PENDING" | "DISPATCHED" | "CANCELLED";
  dispatchAttempts: number;
  lastError?: string;
  dispatchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BacktestQueuePort {
  enqueue(job: BacktestQueueJob): Promise<void>;
  remove(jobId: string): Promise<void>;
}

export interface WorkerAttemptClaim {
  candidate: StoredCandidate;
  attempt: BacktestAttemptAudit;
  fenceToken: string;
}

export interface BacktestingRepository {
  createInputSnapshot(snapshot: DatasetSnapshotRef, candles: Candle[]): Promise<void>;
  readInputSnapshot(snapshotId: string): Promise<{ snapshot: DatasetSnapshotRef; candles: Candle[] } | undefined>;
  createScope(scope: StoredBenchmarkScope, idempotencyKey: string): Promise<StoredBenchmarkScope>;
  findScopeByIdempotency(ownerUserId: string, idempotencyKey: string): Promise<StoredBenchmarkScope | undefined>;
  readScope(scopeId: string): Promise<StoredBenchmarkScope | undefined>;
  createCandidate(candidate: StoredCandidate, submissionIdempotencyKey?: string): Promise<StoredCandidate>;
  createQueuedSubmission(input: { candidate: StoredCandidate; dispatch: BacktestDispatch; submissionIdempotencyKey?: string }): Promise<StoredCandidate>;
  findCandidateBySubmission(ownerUserId: string, submissionIdempotencyKey: string): Promise<StoredCandidate | undefined>;
  readCandidate(candidateId: string): Promise<StoredCandidate | undefined>;
  updateCandidate(candidate: StoredCandidate): Promise<void>;
  readDispatch(jobId: string): Promise<BacktestDispatch | undefined>;
  listPendingDispatches(limit: number): Promise<BacktestDispatch[]>;
  markDispatchDispatched(jobId: string, dispatchedAt: string): Promise<void>;
  markDispatchFailed(jobId: string, error: string, at: string): Promise<void>;
  markDispatchCancelled(jobId: string, at: string): Promise<void>;
  claimWorkerAttempt(input: { candidateId: string; queueJobId: string; deliveryAttempt: number; attemptId: string; fenceToken: string; now: string; leaseExpiresAt: string; workerRuntimeVersion: string; workerRuntimeSha256: string }): Promise<WorkerAttemptClaim | undefined>;
  failWorkerAttempt(input: { candidate: StoredCandidate; attempt: BacktestAttemptAudit; fenceToken: string; retrying: boolean; now: string; error: string }): Promise<void>;
  listCandidatesBySearchRun(searchRunId: string): Promise<StoredCandidate[]>;
  createAttempt(attempt: BacktestAttemptAudit): Promise<void>;
  updateAttempt(attempt: BacktestAttemptAudit): Promise<void>;
  readAttempt(attemptId: string): Promise<BacktestAttemptAudit | undefined>;
  listAttempts(candidateId: string): Promise<BacktestAttemptProgress[]>;
  completeAttempt(input: { candidate: StoredCandidate; attempt: BacktestAttemptAudit; result: CompletedBacktestResult; metrics: EvaluationMetrics; experiment: StoredExperiment; fenceToken?: string }): Promise<void>;
  listTrades(attemptId: string): Promise<Trade[]>;
  readExperiment(experimentId: string): Promise<StoredExperiment | undefined>;
  findExperimentByCandidate(candidateId: string): Promise<StoredExperiment | undefined>;
  listExperimentsBySearchRun(searchRunId: string): Promise<StoredExperiment[]>;
  updateExperimentScore(experimentId: string, input: { overallScore: number; rankEligible: boolean }): Promise<StoredExperiment | undefined>;
}

export interface BacktestingModuleDependencies {
  marketData: Pick<MarketDataModulePublicApi, "readDatasetSnapshot">;
  strategy: Pick<StrategyModulePublicApi, "resolveStrategy" | "combineSignals">;
  evaluation: Pick<EvaluatorModulePublicApi, "evaluator">;
  repository: BacktestingRepository;
  queue: BacktestQueuePort;
  clock: { now(): string };
  idGenerator?: () => string;
}
