import { createHash, randomUUID } from "node:crypto";
import { createEvaluationModule } from "../../evaluation/api/bootstrap";
import { createMarketDataModule } from "../../market-data/api/bootstrap";
import { createStrategyModule } from "../../strategy/api/bootstrap";
import type { BacktestQueueJob, BacktestQueuePayload, BacktestQueueReturn, BacktestQueueTerminalSignal } from "@cryptox/contracts/queue";
import type { CompositeStrategyDefinition, Strategy, StrategyContext, StrategyDefinition } from "modules/strategy/api";
import type { BacktestLogApi, ExperimentVisualizationPageRequest, LegacyReplayVerificationResult, SearchCandidatePage, SearchCandidatePageRequest, SearchCandidateSummary, TradePage, TradePageRequest } from "../api";
import type { BacktestAttemptAudit, BacktestSubmissionAccepted, BenchmarkScopeSummary, CandidateProgress, CandidateStatus, CompletedBacktestResult, CompletionUnitOfWork, CreateLeaderboardScopeCommand, ExecutionPolicyInput, ExecutionPolicySnapshot, ExperimentResultSummary, ExperimentVisualization, ReplayVerificationResult, StartManualBacktestCommand, SubmitSearchCandidateCommand, Trade } from "../domain/contracts";
import type { SentimentDatasetSnapshotRef } from "modules/sentiment/api";
import { simulateBacktest } from "../domain/simulator";
import type { AuthContext } from "modules/auth/api";
import type { BacktestDispatch, BacktestQueuePort, BacktestingModuleDependencies, BacktestingRepository, StoredBenchmarkScope, StoredCandidate, StoredExperiment, StoredReplayVerification, WorkerAttemptClaim } from "./ports";

export const BACKTEST_RUNTIME_VERSION = "1.0.0";
export const SIMULATOR_VERSION = "1.0.0";
const artifactSha256 = (...parts: string[]): string => createHash("sha256").update(parts.join("\n"), "utf8").digest("hex");
export const SIMULATOR_SHA256 = artifactSha256(SIMULATOR_VERSION, simulateBacktest.toString());
const BENCHMARK_TIMEZONE = "UTC";
const FILL_POLICY_ID = "NEXT_OPEN_OHLC_STOP_FIRST_V2";
const OPPOSITE_SIGNAL_POLICY_ID = "CLOSE_AND_REVERSE_NEXT_OPEN_V1";
const SAME_CANDLE_ORDERING_POLICY_ID = "ENTRY_THEN_PROTECTIVE_EXIT_THEN_CLOSE_V1";
const DETERMINISTIC_GUARANTEE = "SEALED_INPUTS_AND_RETAINED_ARTIFACTS";
const now = (): string => new Date().toISOString();
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const isReplayVerificationJob = (value: BacktestQueuePayload): value is import("@cryptox/contracts/queue").ReplayVerificationJob => "replayJobId" in value;
const invalid = (code: string): never => { throw new Error(code); };
const terminal = (status: CandidateStatus): boolean => ["COMPLETED", "FAILED", "CANCELLED"].includes(status);
const plusSeconds = (value: string, seconds: number): string => new Date(Date.parse(value) + seconds * 1000).toISOString();
const RECOVERY_RUNTIME_VERSION = "RECOVERY_SYNTHETIC_V1";
const RECOVERY_RUNTIME_SHA256 = createHash("sha256").update(RECOVERY_RUNTIME_VERSION, "utf8").digest("hex");
const attemptProgress = (attempt: BacktestAttemptAudit) => ({ attemptId: attempt.attemptId, attemptNumber: attempt.attemptNumber, status: attempt.status, startedAt: attempt.startedAt, completedAt: attempt.completedAt, deliveryAttemptCount: attempt.deliveryAttemptCount, failureCategory: attempt.failureCategory, failureCode: attempt.failureCode, errorMessage: attempt.errorMessage });
const TRADE_PAGE_DEFAULT = 10;
const TRADE_PAGE_MAX = 100;
const VISUALIZATION_CANDLE_DEFAULT = 500;
const VISUALIZATION_CANDLE_MAX = 2000;
const VISUALIZATION_OVERLAY_MAX = 32;
const DEFAULT_WARMUP_CAPACITY_CANDLES = 500;
const MAX_WARMUP_CANDLES = 10_000;
const TIMEFRAME_MS: Record<import("modules/market-data/api").Timeframe, number> = { "1m": 60_000, "5m": 300_000, "15m": 900_000, "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000 };
const REPLAY_MISMATCH_SAMPLE_LIMIT = 50;
const REPLAY_MISMATCH_SAMPLE_MAX = 500;
const policyPayload = (policy: Omit<ExecutionPolicySnapshot, "sha256">): string => JSON.stringify(policy);
const policyHash = (policy: Omit<ExecutionPolicySnapshot, "sha256">): string => createHash("sha256").update(policyPayload(policy), "utf8").digest("hex");
const validRiskPercent = (value: number | undefined): boolean => value === undefined || (Number.isFinite(value) && value > 0 && value < 100);
const normalizeExecutionPolicy = (input: ExecutionPolicyInput | ExecutionPolicySnapshot | undefined, warmupCandles: number | undefined, fallback?: { stopLossPercent?: number; takeProfitPercent?: number }): ExecutionPolicySnapshot => {
  const supplied = input as Partial<ExecutionPolicySnapshot> | undefined;
  const stopLossPercent = input === undefined ? fallback?.stopLossPercent : supplied?.stopLossPercent;
  const takeProfitPercent = input === undefined ? fallback?.takeProfitPercent : supplied?.takeProfitPercent;
  if (!validRiskPercent(stopLossPercent) || !validRiskPercent(takeProfitPercent) || (supplied?.policyId !== undefined && supplied.policyId !== "TWO_SIDED_ONE_X_V1")) invalid("INVALID_EXECUTION_POLICY");
  const normalized: Omit<ExecutionPolicySnapshot, "sha256"> = { policyId: "TWO_SIDED_ONE_X_V1", positionPolicyId: "TWO_SIDED_ONE_X_V1", sizingPolicyId: "FULL_CURRENT_EQUITY_FEE_AWARE_V1", fillPolicyId: FILL_POLICY_ID, oppositeSignalPolicyId: OPPOSITE_SIGNAL_POLICY_ID, ...(stopLossPercent === undefined ? {} : { stopLossPercent }), ...(takeProfitPercent === undefined ? {} : { takeProfitPercent }), warmupCandles: warmupCandles ?? 0 };
  const sha256 = policyHash(normalized);
  if (supplied?.sha256 !== undefined && (supplied.warmupCandles !== normalized.warmupCandles || supplied.positionPolicyId !== normalized.positionPolicyId || supplied.sizingPolicyId !== normalized.sizingPolicyId || supplied.fillPolicyId !== normalized.fillPolicyId || supplied.oppositeSignalPolicyId !== normalized.oppositeSignalPolicyId || supplied.sha256 !== sha256)) invalid("INVALID_EXECUTION_POLICY");
  return { ...normalized, sha256 };
};
const roundMoney = (value: number): number => { if (!Number.isFinite(value)) invalid("BACKTEST_NON_FINITE_AMOUNT"); return Number(value.toFixed(2)); };
const amountProjection = (initialCapital: number, trades: Trade[]): Pick<ExperimentResultSummary, "initialCapital" | "totalProfitAmount" | "endingEquity" | "wins" | "losses" | "breakevens" | "maxDrawdownAmount"> => {
  if (!Number.isFinite(initialCapital)) invalid("BACKTEST_NON_FINITE_AMOUNT");
  let totalProfitAmount = 0;
  let peak = initialCapital;
  let maxDrawdownAmount = 0;
  let wins = 0;
  let losses = 0;
  let breakevens = 0;
  for (const trade of trades) {
    if (![trade.profit, trade.equityAfterTrade].every(Number.isFinite)) invalid("BACKTEST_NON_FINITE_AMOUNT");
    totalProfitAmount += trade.profit;
    peak = Math.max(peak, trade.equityAfterTrade);
    maxDrawdownAmount = Math.max(maxDrawdownAmount, peak - trade.equityAfterTrade);
    if (trade.result === "WIN") wins += 1; else if (trade.result === "LOSS") losses += 1; else breakevens += 1;
  }
  return { initialCapital: roundMoney(initialCapital), totalProfitAmount: roundMoney(totalProfitAmount), endingEquity: roundMoney(initialCapital + totalProfitAmount), wins, losses, breakevens, maxDrawdownAmount: roundMoney(maxDrawdownAmount) };
};
const toStrategyCandle = (candle: import("modules/market-data/api").Candle) => ({ timestamp: candle.timestamp, open: candle.open, high: candle.high, low: candle.low, close: candle.close, volume: candle.volume });
const tradeKey = (trade: Trade) => ({ entryTime: trade.entryTime, sequence: trade.sequence, id: trade.id });
const compareTradeKey = (left: Trade, right: Trade): number => left.entryTime.localeCompare(right.entryTime) || left.sequence - right.sequence || left.id.localeCompare(right.id);
const encodeTradeCursor = (ownerUserId: string, resource: string, limit: number, trade: Trade): string => Buffer.from(JSON.stringify({ version: 1, ownerUserId, resource, limit, last: tradeKey(trade) }), "utf8").toString("base64url");
const decodeTradeCursor = (cursor: string): { version: 1; ownerUserId: string; resource: string; limit: number; last: ReturnType<typeof tradeKey> } => {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<ReturnType<typeof decodeTradeCursor>>;
    if (parsed.version !== 1 || typeof parsed.ownerUserId !== "string" || typeof parsed.resource !== "string" || !Number.isInteger(parsed.limit) || !parsed.last || typeof parsed.last.entryTime !== "string" || !Number.isInteger(parsed.last.sequence) || typeof parsed.last.id !== "string") throw new Error("INVALID_CURSOR");
    return parsed as { version: 1; ownerUserId: string; resource: string; limit: number; last: ReturnType<typeof tradeKey> };
  } catch {
    throw new Error("INVALID_CURSOR");
  }
};

export class InMemoryBacktestQueue implements BacktestQueuePort {
  readonly jobs = new Map<string, BacktestQueueJob>();
  async enqueue(job: BacktestQueuePayload): Promise<void> { const id = isReplayVerificationJob(job) ? job.replayJobId : job.jobId; if (!this.jobs.has(id)) this.jobs.set(id, clone(job) as BacktestQueueJob); }
  async remove(jobId: string): Promise<void> { this.jobs.delete(jobId); }
}

export class InMemoryBacktestingRepository implements BacktestingRepository {
  private readonly snapshots = new Map<string, { snapshot: import("modules/market-data/api").DatasetSnapshotRef; candles: import("modules/market-data/api").Candle[] }>();
  private readonly scopes = new Map<string, StoredBenchmarkScope>();
  private readonly scopeIdempotency = new Map<string, string>();
  private readonly candidates = new Map<string, StoredCandidate>();
  private readonly candidateIdempotency = new Map<string, string>();
  private readonly attempts = new Map<string, BacktestAttemptAudit>();
  private readonly trades = new Map<string, Trade[]>();
  private readonly experiments = new Map<string, StoredExperiment>();
  private readonly replays = new Map<string, StoredReplayVerification>();
  private readonly dispatches = new Map<string, BacktestDispatch>();

  async createInputSnapshot(snapshot: import("modules/market-data/api").DatasetSnapshotRef, candles: import("modules/market-data/api").Candle[]): Promise<import("modules/market-data/api").DatasetSnapshotRef> { const existing = [...this.snapshots.values()].find((entry) => entry.snapshot.id === snapshot.id || entry.snapshot.sha256 === snapshot.sha256); if (existing) return clone(existing.snapshot); this.snapshots.set(snapshot.id, { snapshot: clone(snapshot), candles: clone(candles) }); return clone(snapshot); }
  async readInputSnapshot(snapshotId: string) { const value = this.snapshots.get(snapshotId); return value ? clone(value) : undefined; }
  async createScope(scope: StoredBenchmarkScope, idempotencyKey: string): Promise<StoredBenchmarkScope> { this.scopes.set(scope.id, clone(scope)); this.scopeIdempotency.set(`${scope.ownerUserId}|${idempotencyKey}`, scope.id); return clone(scope); }
  async findScopeByIdempotency(ownerUserId: string, idempotencyKey: string) { const id = this.scopeIdempotency.get(`${ownerUserId}|${idempotencyKey}`); const value = id ? this.scopes.get(id) : undefined; return value ? clone(value) : undefined; }
  async readScope(scopeId: string, ownerUserId?: string) { const value = this.scopes.get(scopeId); return value && (!ownerUserId || value.ownerUserId === ownerUserId) ? clone(value) : undefined; }
  async listScopesByOwner(ownerUserId: string) { return [...this.scopes.values()].filter((scope) => scope.ownerUserId === ownerUserId).sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)).map(clone); }
  async deleteScope(scopeId: string, ownerUserId: string): Promise<boolean> {
    const scope = this.scopes.get(scopeId);
    if (!scope || scope.ownerUserId !== ownerUserId) return false;
    for (const candidate of this.candidates.values()) {
      if (candidate.leaderboardScopeId === scopeId) throw new Error("BACKTEST_SCOPE_IN_USE");
    }
    this.scopes.delete(scopeId);
    for (const [key, id] of this.scopeIdempotency.entries()) {
      if (id === scopeId) this.scopeIdempotency.delete(key);
    }
    return true;
  }
  async createCandidate(candidate: StoredCandidate, key?: string): Promise<StoredCandidate> { this.candidates.set(candidate.candidateId, clone(candidate)); if (key) this.candidateIdempotency.set(`${candidate.ownerUserId}|${key}`, candidate.candidateId); return clone(candidate); }
  async createQueuedSubmission(input: { candidate: StoredCandidate; dispatch: BacktestDispatch; submissionIdempotencyKey?: string }): Promise<StoredCandidate> {
    if (input.candidate.searchRunId !== undefined && input.candidate.iterationNumber !== undefined) {
      const existing = [...this.candidates.values()].find((candidate) => candidate.searchRunId === input.candidate.searchRunId && candidate.iterationNumber === input.candidate.iterationNumber);
      if (existing) return clone(existing);
    }
    if (input.submissionIdempotencyKey) {
      const existing = await this.findCandidateBySubmission(input.candidate.ownerUserId, input.submissionIdempotencyKey);
      if (existing) return existing;
    }
    await this.createCandidate(input.candidate, input.submissionIdempotencyKey);
    this.dispatches.set(input.dispatch.job.jobId, clone(input.dispatch));
    return clone(input.candidate);
  }
  async findCandidateBySubmission(ownerUserId: string, key: string) { const id = this.candidateIdempotency.get(`${ownerUserId}|${key}`); const value = id ? this.candidates.get(id) : undefined; return value ? clone(value) : undefined; }
  async readCandidate(candidateId: string, ownerUserId?: string) { const value = this.candidates.get(candidateId); return value && (!ownerUserId || value.ownerUserId === ownerUserId) ? clone(value) : undefined; }
  async updateCandidate(candidate: StoredCandidate, unitOfWork?: import("../domain/contracts").CancellationUnitOfWork): Promise<void> {
    const previous = this.candidates.get(candidate.candidateId);
    this.candidates.set(candidate.candidateId, clone(candidate));
    unitOfWork?.onRollback(async () => { if (previous) this.candidates.set(candidate.candidateId, previous); else this.candidates.delete(candidate.candidateId); });
  }
  async readDispatch(jobId: string) { const value = this.dispatches.get(jobId); return value ? clone(value) : undefined; }
  async listPendingDispatches(limit: number) { return [...this.dispatches.values()].filter((item) => item.state === "PENDING").sort((left, right) => left.createdAt.localeCompare(right.createdAt)).slice(0, limit).map(clone); }
  async listQueueRecoveryCandidates(limit: number): Promise<string[]> { return [...this.candidates.values()].filter((candidate) => ["QUEUED", "BACKTESTING", "RETRY_WAIT"].includes(candidate.status)).sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)).slice(0, limit).map((candidate) => candidate.candidateId); }
  async recoverAbandonedAttempt(input: { candidateId: string; now: string; error: string }): Promise<boolean> {
    const candidate = this.candidates.get(input.candidateId);
    if (!candidate || candidate.status !== "BACKTESTING" || !candidate.activeLeaseExpiresAt || Date.parse(candidate.activeLeaseExpiresAt) > Date.parse(input.now)) return false;
    const attempts = [...this.attempts.values()].filter((attempt) => attempt.candidateId === candidate.candidateId);
    const running = attempts.find((attempt) => attempt.status === "RUNNING" && attempt.attemptNumber === candidate.activeAttemptNumber) ?? attempts.find((attempt) => attempt.status === "RUNNING");
    if (running) {
      this.attempts.set(running.attemptId, clone({ ...running, status: "FAILED", completedAt: input.now, leaseExpiresAt: undefined, failureCategory: "INFRASTRUCTURE", failureCode: input.error, errorMessage: input.error }));
    } else if (attempts.length === 0) {
      const attempt: BacktestAttemptAudit = { attemptId: `${candidate.candidateId}:recovery:attempt:1`, candidateId: candidate.candidateId, queueJobId: candidate.queueJobId, attemptNumber: 1, workerRuntimeVersion: RECOVERY_RUNTIME_VERSION, workerRuntimeSha256: RECOVERY_RUNTIME_SHA256, status: "FAILED", tradeCount: 0, auditOnly: false, deliveryAttemptCount: 0, failureCategory: "INFRASTRUCTURE", failureCode: input.error, errorMessage: input.error, startedAt: input.now, completedAt: input.now };
      this.attempts.set(attempt.attemptId, attempt);
    }
    const attemptNumber = candidate.activeAttemptNumber ?? attempts.find((attempt) => attempt.status === "RUNNING")?.attemptNumber ?? candidate.maxAttempts;
    const retrying = attemptNumber < candidate.maxAttempts;
    this.candidates.set(candidate.candidateId, clone({ ...candidate, status: retrying ? "RETRY_WAIT" : "TERMINAL_FAILURE_PENDING", activeAttemptNumber: undefined, activeFenceToken: undefined, activeLeaseExpiresAt: undefined, failureKind: retrying ? undefined : "INFRASTRUCTURE", failureCode: retrying ? undefined : input.error, lastError: retrying ? undefined : input.error, updatedAt: input.now }));
    const dispatch = this.dispatches.get(candidate.queueJobId);
    if (retrying && dispatch && dispatch.state !== "CANCELLED") this.dispatches.set(dispatch.job.jobId, { ...dispatch, state: "PENDING", lastError: input.error, updatedAt: input.now });
    return true;
  }
  async markDispatchDispatched(jobId: string, dispatchedAt: string): Promise<void> { const item = this.dispatches.get(jobId); if (item && item.state !== "CANCELLED") this.dispatches.set(jobId, { ...item, state: "DISPATCHED", dispatchAttempts: item.dispatchAttempts + 1, dispatchedAt, lastError: undefined, updatedAt: dispatchedAt }); }
  async markDispatchFailed(jobId: string, error: string, at: string): Promise<void> { const item = this.dispatches.get(jobId); if (item && item.state !== "CANCELLED") this.dispatches.set(jobId, { ...item, state: "PENDING", dispatchAttempts: item.dispatchAttempts + 1, lastError: error, updatedAt: at }); }
  async markDispatchCancelled(jobId: string, at: string, unitOfWork?: import("../domain/contracts").CancellationUnitOfWork): Promise<void> {
    const previous = this.dispatches.get(jobId);
    if (previous) this.dispatches.set(jobId, { ...previous, state: "CANCELLED", updatedAt: at });
    unitOfWork?.onRollback(async () => { if (previous) this.dispatches.set(jobId, previous); else this.dispatches.delete(jobId); });
  }
  async listCandidatesBySearchRun(searchRunId: string, ownerUserId?: string) { return [...this.candidates.values()].filter((candidate) => candidate.searchRunId === searchRunId && (!ownerUserId || candidate.ownerUserId === ownerUserId)).map(clone); }
  async createAttempt(attempt: BacktestAttemptAudit): Promise<void> { this.attempts.set(attempt.attemptId, clone(attempt)); }
  async updateAttempt(attempt: BacktestAttemptAudit): Promise<void> { this.attempts.set(attempt.attemptId, clone(attempt)); }
  async readAttempt(attemptId: string, ownerUserId?: string) { const value = this.attempts.get(attemptId); if (!value) return undefined; const candidate = this.candidates.get(value.candidateId); return candidate && (!ownerUserId || candidate.ownerUserId === ownerUserId) ? clone(value) : undefined; }
  async listAttempts(candidateId: string) { return [...this.attempts.values()].filter((attempt) => attempt.candidateId === candidateId).sort((left, right) => left.attemptNumber - right.attemptNumber).map(attemptProgress); }
  async claimWorkerAttempt(input: { candidateId: string; queueJobId: string; deliveryAttempt: number; attemptId: string; fenceToken: string; now: string; leaseExpiresAt: string; workerRuntimeVersion: string; workerRuntimeSha256: string }): Promise<WorkerAttemptClaim | undefined> {
    const candidate = this.candidates.get(input.candidateId);
    if (!candidate || candidate.queueJobId !== input.queueJobId || terminal(candidate.status) || candidate.status === "PROCESSING_RESULT" || candidate.status === "TERMINAL_FAILURE_PENDING") return undefined;
    const leaseActive = candidate.status === "BACKTESTING" && candidate.activeLeaseExpiresAt && Date.parse(candidate.activeLeaseExpiresAt) > Date.parse(input.now);
    if (leaseActive || !["QUEUED", "RETRY_WAIT", "BACKTESTING"].includes(candidate.status)) return undefined;
    const attempt = this.attempts.get(input.attemptId) ?? { attemptId: input.attemptId, candidateId: candidate.candidateId, queueJobId: input.queueJobId, attemptNumber: input.deliveryAttempt, workerRuntimeVersion: input.workerRuntimeVersion, workerRuntimeSha256: input.workerRuntimeSha256, status: "QUEUED" as const, startedAt: input.now, tradeCount: 0, auditOnly: false };
    const claimed: BacktestAttemptAudit = { ...attempt, status: "RUNNING", startedAt: attempt.startedAt || input.now, completedAt: undefined, deliveryAttemptCount: input.deliveryAttempt, fenceToken: input.fenceToken, leaseExpiresAt: input.leaseExpiresAt, failureCategory: undefined, failureCode: undefined, errorMessage: undefined };
    const updated: StoredCandidate = { ...candidate, status: "BACKTESTING", activeAttemptNumber: input.deliveryAttempt, executionGeneration: (candidate.executionGeneration ?? 0) + 1, activeFenceToken: input.fenceToken, activeLeaseExpiresAt: input.leaseExpiresAt, updatedAt: input.now };
    this.attempts.set(claimed.attemptId, clone(claimed)); this.candidates.set(updated.candidateId, clone(updated));
    return { candidate: clone(updated), attempt: clone(claimed), fenceToken: input.fenceToken };
  }
  async failWorkerAttempt(input: { candidate: StoredCandidate; attempt: BacktestAttemptAudit; fenceToken: string; retrying: boolean; now: string; error: string }): Promise<void> {
    const candidate = this.candidates.get(input.candidate.candidateId); const attempt = this.attempts.get(input.attempt.attemptId);
    if (!candidate || !attempt || candidate.activeFenceToken !== input.fenceToken || attempt.fenceToken !== input.fenceToken) throw new Error("BACKTEST_FENCE_LOST");
    const cancelled = candidate.status === "CANCELLED";
    const failed: BacktestAttemptAudit = { ...attempt, status: "FAILED", completedAt: input.now, failureCategory: cancelled ? "CANCELLED_AUDIT" : input.retrying ? "RETRYABLE" : "INFRASTRUCTURE", failureCode: input.error, errorMessage: input.error, leaseExpiresAt: undefined };
    const updated: StoredCandidate = cancelled
      ? { ...candidate, activeAttemptNumber: undefined, activeFenceToken: undefined, activeLeaseExpiresAt: undefined, updatedAt: input.now }
      : { ...candidate, status: input.retrying ? "RETRY_WAIT" : "TERMINAL_FAILURE_PENDING", activeAttemptNumber: undefined, activeFenceToken: undefined, activeLeaseExpiresAt: undefined, failureKind: input.retrying ? undefined : "RETRY_EXHAUSTED", failureCode: input.error, lastError: input.error, updatedAt: input.now };
    this.attempts.set(failed.attemptId, clone(failed)); this.candidates.set(updated.candidateId, clone(updated));
  }
  async repairTerminalQueueFailure(input: { candidateId: string; error: string; now: string }): Promise<void> {
    const candidate = this.candidates.get(input.candidateId);
    if (!candidate || terminal(candidate.status) || candidate.status === "TERMINAL_FAILURE_PENDING") return;
    const attempts = [...this.attempts.values()].filter((attempt) => attempt.candidateId === input.candidateId);
    const running = attempts.find((attempt) => attempt.status === "RUNNING");
    if (running) this.attempts.set(running.attemptId, { ...running, status: "FAILED", completedAt: input.now, leaseExpiresAt: undefined, failureCategory: "INFRASTRUCTURE", failureCode: input.error, errorMessage: input.error });
    else if (attempts.length === 0) this.attempts.set(`${candidate.candidateId}:recovery:attempt:1`, { attemptId: `${candidate.candidateId}:recovery:attempt:1`, candidateId: candidate.candidateId, queueJobId: candidate.queueJobId, attemptNumber: 1, workerRuntimeVersion: RECOVERY_RUNTIME_VERSION, workerRuntimeSha256: RECOVERY_RUNTIME_SHA256, status: "FAILED", tradeCount: 0, auditOnly: false, deliveryAttemptCount: 0, failureCategory: "INFRASTRUCTURE", failureCode: input.error, errorMessage: input.error, startedAt: input.now, completedAt: input.now });
    this.candidates.set(candidate.candidateId, clone({ ...candidate, status: "TERMINAL_FAILURE_PENDING", activeAttemptNumber: undefined, activeFenceToken: undefined, activeLeaseExpiresAt: undefined, failureKind: "INFRASTRUCTURE", failureCode: input.error, lastError: input.error, updatedAt: input.now }));
  }
  async persistWorkerSuccess(input: { candidate: StoredCandidate; attempt: BacktestAttemptAudit; result: CompletedBacktestResult; fenceToken: string }): Promise<void> {
    const candidate = this.candidates.get(input.candidate.candidateId); const attempt = this.attempts.get(input.attempt.attemptId);
    if (!candidate || !attempt || candidate.activeFenceToken !== input.fenceToken || attempt.fenceToken !== input.fenceToken) throw new Error("BACKTEST_FENCE_LOST");
    const auditOnly = candidate.status === "CANCELLED";
    const completedAttempt: BacktestAttemptAudit = { ...attempt, status: "COMPLETED", completedAt: input.result.completedAt, tradeCount: input.result.trades.length, auditOnly, leaseExpiresAt: undefined };
    const pending: StoredCandidate = candidate.status === "CANCELLED"
      ? { ...candidate, status: "CANCELLED", activeAttemptNumber: undefined, activeFenceToken: undefined, activeLeaseExpiresAt: undefined, updatedAt: input.result.completedAt }
      : { ...candidate, status: "PROCESSING_RESULT", activeAttemptNumber: undefined, activeFenceToken: undefined, activeLeaseExpiresAt: undefined, completionNextRetryAt: input.result.completedAt, updatedAt: input.result.completedAt };
    this.attempts.set(completedAttempt.attemptId, clone(completedAttempt)); this.trades.set(completedAttempt.attemptId, clone(input.result.trades)); this.candidates.set(pending.candidateId, clone(pending));
  }
  async claimCompletion(input: { candidateId: string; claimToken: string; now: string; leaseExpiresAt: string }) {
    const candidate = this.candidates.get(input.candidateId);
    if (!candidate || !["PROCESSING_RESULT", "TERMINAL_FAILURE_PENDING"].includes(candidate.status)) return undefined;
    if (candidate.completionNextRetryAt && Date.parse(candidate.completionNextRetryAt) > Date.parse(input.now)) return undefined;
    if (candidate.activeCompletionLeaseExpiresAt && Date.parse(candidate.activeCompletionLeaseExpiresAt) > Date.parse(input.now)) return undefined;
    if (candidate.completionAttemptCount >= candidate.completionMaxAttempts) return undefined;
    const claimed: StoredCandidate = { ...candidate, completionAttemptCount: candidate.completionAttemptCount + 1, completionGeneration: (candidate.completionGeneration ?? 0) + 1, activeCompletionClaimToken: input.claimToken, activeCompletionLeaseExpiresAt: input.leaseExpiresAt, completionNextRetryAt: undefined, updatedAt: input.now };
    this.candidates.set(claimed.candidateId, clone(claimed));
    return { candidate: clone(claimed), claimToken: input.claimToken };
  }
  async listDueCompletions(nowValue: string, limit: number): Promise<string[]> {
    return [...this.candidates.values()].filter((candidate) => ["PROCESSING_RESULT", "TERMINAL_FAILURE_PENDING"].includes(candidate.status) && (!candidate.completionNextRetryAt || Date.parse(candidate.completionNextRetryAt) <= Date.parse(nowValue)) && (!candidate.activeCompletionLeaseExpiresAt || Date.parse(candidate.activeCompletionLeaseExpiresAt) <= Date.parse(nowValue))).sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)).slice(0, limit).map((candidate) => candidate.candidateId);
  }
  async readLatestCompletedAttempt(candidateId: string): Promise<BacktestAttemptAudit | undefined> {
    const attempts = [...this.attempts.values()].filter((attempt) => attempt.candidateId === candidateId && attempt.status === "COMPLETED").sort((left, right) => right.attemptNumber - left.attemptNumber);
    return attempts[0] ? clone(attempts[0]) : undefined;
  }
  async stageCompletionExperiment(experiment: StoredExperiment): Promise<StoredExperiment> {
    const existing = [...this.experiments.values()].find((value) => value.candidateId === experiment.candidateId);
    if (existing) return clone(existing);
    this.experiments.set(experiment.id, clone(experiment));
    return clone(experiment);
  }
  async finalizeCompletion(input: { candidate: StoredCandidate; experimentId: string; claimToken: string; now: string }): Promise<void> {
    const candidate = this.candidates.get(input.candidate.candidateId);
    if (!candidate || candidate.status !== "PROCESSING_RESULT" || candidate.activeCompletionClaimToken !== input.claimToken || candidate.completionGeneration !== input.candidate.completionGeneration || !candidate.activeCompletionLeaseExpiresAt || Date.parse(candidate.activeCompletionLeaseExpiresAt) <= Date.parse(input.now)) throw new Error("BACKTEST_COMPLETION_FENCE_LOST");
    const completed: StoredCandidate = { ...candidate, status: "COMPLETED", experimentResultId: input.experimentId, activeCompletionClaimToken: undefined, activeCompletionLeaseExpiresAt: undefined, completionNextRetryAt: undefined, updatedAt: input.now };
    this.candidates.set(completed.candidateId, clone(completed));
  }
  async finalizeTerminalFailure(input: { candidate: StoredCandidate; claimToken: string; now: string }): Promise<void> {
    const candidate = this.candidates.get(input.candidate.candidateId);
    if (!candidate || candidate.status !== "TERMINAL_FAILURE_PENDING" || candidate.activeCompletionClaimToken !== input.claimToken || candidate.completionGeneration !== input.candidate.completionGeneration || !candidate.activeCompletionLeaseExpiresAt || Date.parse(candidate.activeCompletionLeaseExpiresAt) <= Date.parse(input.now)) throw new Error("BACKTEST_COMPLETION_FENCE_LOST");
    this.candidates.set(candidate.candidateId, clone({ ...candidate, status: "FAILED", activeCompletionClaimToken: undefined, activeCompletionLeaseExpiresAt: undefined, completionNextRetryAt: undefined, updatedAt: input.now }));
  }
  async failCompletion(input: { candidate: StoredCandidate; claimToken: string; retryAt?: string; now: string; error: string }): Promise<void> {
    const candidate = this.candidates.get(input.candidate.candidateId);
    if (!candidate || candidate.activeCompletionClaimToken !== input.claimToken || candidate.completionGeneration !== input.candidate.completionGeneration || !candidate.activeCompletionLeaseExpiresAt || Date.parse(candidate.activeCompletionLeaseExpiresAt) <= Date.parse(input.now)) throw new Error("BACKTEST_COMPLETION_FENCE_LOST");
    const exhausted = candidate.completionAttemptCount >= candidate.completionMaxAttempts;
    this.candidates.set(candidate.candidateId, clone({ ...candidate, status: exhausted ? "FAILED" : "PROCESSING_RESULT", activeCompletionClaimToken: undefined, activeCompletionLeaseExpiresAt: undefined, completionNextRetryAt: exhausted ? undefined : input.retryAt, failureKind: exhausted ? "COMPLETION_PROCESSING" : candidate.failureKind, failureCode: exhausted ? "COMPLETION_PROCESSING_FAILED" : candidate.failureCode, lastError: input.error, updatedAt: input.now }));
  }
  async completeAttempt(input: { candidate: StoredCandidate; attempt: BacktestAttemptAudit; result: CompletedBacktestResult; metrics: import("modules/evaluation/api").EvaluationMetrics; experiment: StoredExperiment; fenceToken?: string }): Promise<void> {
    const storedCandidate = this.candidates.get(input.candidate.candidateId); const storedAttempt = this.attempts.get(input.attempt.attemptId);
    if (input.fenceToken && (!storedCandidate || !storedAttempt || storedCandidate.activeFenceToken !== input.fenceToken || storedAttempt.fenceToken !== input.fenceToken)) throw new Error("BACKTEST_FENCE_LOST");
    this.candidates.set(input.candidate.candidateId, clone(input.candidate)); this.attempts.set(input.attempt.attemptId, clone(input.attempt)); this.trades.set(input.attempt.attemptId, clone(input.result.trades)); this.experiments.set(input.experiment.id, clone(input.experiment));
  }
  async listTrades(attemptId: string) { return clone(this.trades.get(attemptId) ?? []); }
  async readExperiment(experimentId: string, ownerUserId?: string) { const value = this.experiments.get(experimentId); return value && (!ownerUserId || value.ownerUserId === ownerUserId) ? clone(value) : undefined; }
  async findExperimentByCandidate(candidateId: string) { const value = [...this.experiments.values()].find((experiment) => experiment.candidateId === candidateId); return value ? clone(value) : undefined; }
  async listExperimentsBySearchRun(searchRunId: string, ownerUserId?: string) { return [...this.experiments.values()].filter((experiment) => experiment.searchRunId === searchRunId && (!ownerUserId || experiment.ownerUserId === ownerUserId)).map(clone); }
  async updateExperimentScore(experimentId: string, input: { overallScore: number; rankEligible: boolean }, ownerUserId?: string) { const value = this.experiments.get(experimentId); if (!value || (ownerUserId && value.ownerUserId !== ownerUserId)) return undefined; const updated = { ...value, ...input }; this.experiments.set(experimentId, clone(updated)); return clone(updated); }
  async createReplayVerification(replay: StoredReplayVerification) { const existing = this.replays.get(replay.replayJobId); if (existing) return clone(existing); this.replays.set(replay.replayJobId, clone(replay)); return clone(replay); }
  async readReplayVerification(replayJobId: string, ownerUserId?: string) { const value = this.replays.get(replayJobId); return value && (!ownerUserId || value.ownerUserId === ownerUserId) ? clone(value) : undefined; }
  async claimReplayVerification(input: { replayJobId: string; claimToken: string; now: string; leaseExpiresAt: string }) {
    const value = this.replays.get(input.replayJobId);
    if (!value || ["MATCH", "MISMATCH", "NON_REPLAYABLE"].includes(value.status)) return undefined;
    if (value.status === "RUNNING" && value.leaseExpiresAt && Date.parse(value.leaseExpiresAt) > Date.parse(input.now)) return undefined;
    if (value.status !== "QUEUED" && value.status !== "RUNNING") return undefined;
    const claimed = clone({ ...value, status: "RUNNING" as const, activeClaimToken: input.claimToken, leaseExpiresAt: input.leaseExpiresAt, startedAt: value.startedAt ?? input.now });
    this.replays.set(input.replayJobId, claimed);
    return claimed;
  }
  async completeReplayVerification(input: { replayJobId: string; claimToken: string; now: string; result: Extract<import("../domain/contracts").ReplayVerificationResult, { status: "MATCH" | "MISMATCH" | "NON_REPLAYABLE" }> }): Promise<void> {
    const value = this.replays.get(input.replayJobId);
    if (!value || value.status !== "RUNNING" || value.activeClaimToken !== input.claimToken || !value.leaseExpiresAt || Date.parse(value.leaseExpiresAt) <= Date.parse(input.now)) throw new Error("BACKTEST_REPLAY_FENCE_LOST");
    this.replays.set(input.replayJobId, clone({ ...value, ...input.result, status: input.result.status, activeClaimToken: undefined, leaseExpiresAt: undefined, completedAt: input.now } as StoredReplayVerification));
  }
  async listReplayVerificationRecovery(nowValue: string, limit: number) { return [...this.replays.values()].filter((value) => value.status === "QUEUED" || (value.status === "RUNNING" && (!value.leaseExpiresAt || Date.parse(value.leaseExpiresAt) <= Date.parse(nowValue)))).sort((left, right) => left.requestedAt.localeCompare(right.requestedAt)).slice(0, limit).map((value) => value.replayJobId); }
}

export function createInMemoryBacktestingDependencies(): BacktestingModuleDependencies { return { marketData: createMarketDataModule(), strategy: createStrategyModule(), evaluation: createEvaluationModule(), repository: new InMemoryBacktestingRepository(), queue: new InMemoryBacktestQueue(), completion: { score: async (_scopeId, metrics) => ({ scoreFormulaId: "MVP_MANUAL_V1", overallScore: metrics.totalReturnPercent, rankEligible: metrics.numberOfTrades > 0 }), submit: async () => undefined }, clock: { now }, idGenerator: randomUUID }; }

export class BacktestingService implements BacktestLogApi {
  constructor(private readonly deps: BacktestingModuleDependencies) {}
  private id(): string { return (this.deps.idGenerator ?? randomUUID)(); }
  private now(): string { return this.deps.clock.now(); }
  private assertAuth(auth: AuthContext): void { if (!auth?.userId?.trim()) invalid("INVALID_AUTH_CONTEXT"); }
  private progress(candidate: StoredCandidate, attempts: BacktestAttemptAudit[] | import("../domain/contracts").BacktestAttemptProgress[]): CandidateProgress {
    const { ownerUserId: _ownerUserId, strategyDefinitions: _strategyDefinitions, compositeDefinition: _compositeDefinition, queueJobId: _queueJobId, executionGeneration: _executionGeneration, activeFenceToken: _activeFenceToken, activeLeaseExpiresAt: _activeLeaseExpiresAt, activeCompletionClaimToken: _activeCompletionClaimToken, activeCompletionLeaseExpiresAt: _activeCompletionLeaseExpiresAt, completionGeneration: _completionGeneration, ...projection } = candidate;
    return { ...clone(projection), attempts: clone(attempts) };
  }
  private async scope(scopeId: string): Promise<StoredBenchmarkScope> { const scope = await this.deps.repository.readScope(scopeId); if (!scope) throw new Error("BACKTEST_SCOPE_NOT_FOUND"); return scope; }
  private async ownedScope(auth: AuthContext, scopeId: string): Promise<StoredBenchmarkScope> { this.assertAuth(auth); const scope = await this.deps.repository.readScope(scopeId, auth.userId); if (!scope) throw new Error("BACKTEST_SCOPE_NOT_FOUND"); return scope; }
  private async candidate(candidateId: string): Promise<StoredCandidate> { const candidate = await this.deps.repository.readCandidate(candidateId); if (!candidate) throw new Error("BACKTEST_CANDIDATE_NOT_FOUND"); return candidate; }
  private async ownedCandidate(auth: AuthContext, candidateId: string): Promise<StoredCandidate> { this.assertAuth(auth); const candidate = await this.deps.repository.readCandidate(candidateId, auth.userId); if (!candidate) throw new Error("BACKTEST_CANDIDATE_NOT_FOUND"); return candidate; }
  private async ownedSearchCandidates(auth: AuthContext, searchRunId: string): Promise<StoredCandidate[]> {
    this.assertAuth(auth);
    const candidates = await this.deps.repository.listCandidatesBySearchRun(searchRunId, auth.userId);
    if (candidates.length > 0) return candidates;
    const anyOwnerCandidates = await this.deps.repository.listCandidatesBySearchRun(searchRunId);
    if (anyOwnerCandidates.length > 0) throw new Error("BACKTEST_SEARCH_RUN_NOT_FOUND");
    return [];
  }
  private strategyRequirements(definitions: StrategyDefinition[]): { warmupCandles: number; requiresSentiment: boolean } {
    const descriptors = this.deps.strategy.listStrategies?.() ?? [];
    if (descriptors.length === 0) return { warmupCandles: 0, requiresSentiment: false };
    let required = 0;
    let requiresSentiment = false;
    for (const definition of definitions) {
      const descriptor = descriptors.find((item) => item.name === definition.strategyName && item.implementationSha256 === definition.implementationSha256 && (!item.implementationVersion || item.implementationVersion === definition.implementationVersion));
      if (!descriptor) throw new Error("IMPLEMENTATION_ARTIFACT_UNAVAILABLE");
      const minimum = descriptor.minimumHistoryCandles ?? 0;
      if (!Number.isInteger(minimum) || minimum < 0 || minimum > MAX_WARMUP_CANDLES) invalid("INVALID_STRATEGY_DESCRIPTOR");
      required = Math.max(required, minimum);
      requiresSentiment = requiresSentiment || descriptor.requiresSentiment === true || descriptor.category === "INFORMATION";
    }
    return { warmupCandles: required, requiresSentiment };
  }
  private async validateStrategyReferences(ownerUserId: string, command: StartManualBacktestCommand | SubmitSearchCandidateCommand): Promise<{ strategyDefinitions: StrategyDefinition[]; compositeDefinition: CompositeStrategyDefinition; warmupCandles: number; requiresSentiment: boolean }> {
    const requestedIds = command.strategyDefinitionIds ?? command.strategyDefinitions?.map((definition) => definition.id) ?? [];
    if (requestedIds.length === 0 || new Set(requestedIds).size !== requestedIds.length) invalid("STRATEGY_DEFINITION_NOT_FOUND");
    const definitions = await this.deps.strategy.readDefinitions(ownerUserId, requestedIds);
    if (definitions.length !== requestedIds.length) invalid("STRATEGY_DEFINITION_NOT_FOUND");
    const compositeId = command.compositeDefinitionId ?? command.compositeDefinition?.id;
    if (!compositeId) invalid("COMPOSITE_STRATEGY_NOT_FOUND");
    const composite = await this.deps.strategy.readComposite(ownerUserId, compositeId!).catch(() => invalid("COMPOSITE_STRATEGY_NOT_FOUND"));
    const componentIds = composite.components.map((component) => component.strategyDefinitionId);
    if (componentIds.length !== requestedIds.length || new Set(componentIds).size !== componentIds.length || componentIds.some((id) => !requestedIds.includes(id))) invalid("STRATEGY_DEFINITION_MISMATCH");
    const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
    const strategyDefinitions = componentIds.map((id) => definitionsById.get(id)!);
    const requirements = this.strategyRequirements(strategyDefinitions);
    return { strategyDefinitions, compositeDefinition: clone(composite), ...requirements };
  }
  private async snapshot(snapshotId: string): Promise<{ snapshot: import("modules/market-data/api").DatasetSnapshotRef; candles: import("modules/market-data/api").Candle[] }> { const snapshot = await this.deps.repository.readInputSnapshot(snapshotId); if (!snapshot) throw new Error("BACKTEST_DATASET_NOT_FOUND"); return snapshot; }
  private async loadSentiment(scope: StoredBenchmarkScope, candles: import("modules/market-data/api").Candle[], required: boolean): Promise<((candleCloseTime: string) => NonNullable<StrategyContext["sentiment"]> | undefined) | undefined> {
    if (!required) return undefined;
    const reference = scope.sentimentDatasetSnapshot;
    const sentiment = this.deps.sentiment;
    if (!reference) invalid("SNAPSHOT_INCOMPLETE");
    if (!sentiment) invalid("SNAPSHOT_INCOMPLETE");
    const actual = await sentiment!.getSnapshotRef(reference!.id).catch(() => invalid("SNAPSHOT_INCOMPLETE"));
    const sameReference = actual.id === reference!.id && actual.relatedCoin === reference!.relatedCoin && actual.range.from === reference!.range.from && actual.range.to === reference!.range.to && actual.aggregationWindowSeconds === reference!.aggregationWindowSeconds && actual.modelName === reference!.modelName && actual.modelVersion === reference!.modelVersion && actual.modelSha256 === reference!.modelSha256 && actual.pointCount === reference!.pointCount && actual.sha256 === reference!.sha256 && actual.createdAt === reference!.createdAt;
    if (!sameReference || actual.relatedCoin !== scope.datasetSnapshot.pairMetadata.baseAsset || !/^[a-f0-9]{64}$/i.test(actual.modelSha256) || !/^[a-f0-9]{64}$/i.test(actual.sha256) || !Number.isInteger(actual.pointCount) || actual.pointCount < 1 || !Number.isInteger(actual.aggregationWindowSeconds) || actual.aggregationWindowSeconds < 1) invalid("SNAPSHOT_INCOMPLETE");
    const sentimentFrom = Date.parse(actual.range.from);
    const sentimentTo = Date.parse(actual.range.to);
    const orderedCandles = candles.filter((candle) => candle.isClosed).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
    const firstClose = orderedCandles.length > 0 ? Date.parse(orderedCandles[0]!.timestamp) + TIMEFRAME_MS[scope.timeframe] : NaN;
    const lastClose = orderedCandles.length > 0 ? Date.parse(orderedCandles[orderedCandles.length - 1]!.timestamp) + TIMEFRAME_MS[scope.timeframe] : NaN;
    if (!Number.isFinite(sentimentFrom) || !Number.isFinite(sentimentTo) || sentimentFrom > firstClose || sentimentTo <= lastClose) invalid("SNAPSHOT_INCOMPLETE");
    const reader = await sentiment!.readSnapshot(actual.id).catch(() => invalid("SNAPSHOT_INCOMPLETE"));
    const readAt = (candleCloseTime: string): NonNullable<StrategyContext["sentiment"]> | undefined => {
      const point = reader.readAt(actual.id, candleCloseTime);
      if (!point) return undefined;
      if (!["POSITIVE", "NEUTRAL", "NEGATIVE"].includes(point.label) || !Number.isFinite(point.averageScore) || point.averageScore < -1 || point.averageScore > 1) invalid("SNAPSHOT_INCOMPLETE");
      return { label: point.label, averageScore: point.averageScore };
    };
    for (const candle of orderedCandles) {
      const close = new Date(Date.parse(candle.timestamp) + TIMEFRAME_MS[scope.timeframe]).toISOString();
      if (!readAt(close)) invalid("SNAPSHOT_INCOMPLETE");
    }
    return readAt;
  }
  private async captureSnapshot(snapshotId: string) { const first = await this.deps.marketData.readDatasetSnapshot({ snapshotId, limit: 1000 }); const candles = [...first.candles]; let cursor = first.nextCursor; while (cursor) { const page = await this.deps.marketData.readDatasetSnapshot({ snapshotId, cursor, limit: 1000 }); candles.push(...page.candles); cursor = page.nextCursor; } const snapshot = await this.deps.repository.createInputSnapshot(first.snapshot, candles); return { snapshot, candles }; }
  private validateScope(command: CreateLeaderboardScopeCommand): void { const warmupCapacityCandles = command.warmupCapacityCandles ?? DEFAULT_WARMUP_CAPACITY_CANDLES; if (!command.name.trim() || !command.scoreFormulaId.trim() || !Number.isFinite(command.initialCapital) || command.initialCapital <= 0 || !Number.isFinite(command.feeRatePercent) || command.feeRatePercent < 0 || !Number.isInteger(command.slippageBps) || command.slippageBps < 0 || !Number.isInteger(warmupCapacityCandles) || warmupCapacityCandles < 0 || warmupCapacityCandles > MAX_WARMUP_CANDLES) invalid("INVALID_BENCHMARK_SCOPE"); if (!/^[a-f0-9]{64}$/i.test(command.workerRuntimeSha256) || !/^[a-f0-9]{64}$/i.test(command.evaluationRuntimeSha256)) invalid("INVALID_BENCHMARK_SCOPE"); if (command.sentimentDatasetSnapshot && command.sentimentCreate) invalid("INVALID_SENTIMENT_SELECTION"); }
  private async verifySentimentReference(reference: SentimentDatasetSnapshotRef, snapshot: import("modules/market-data/api").DatasetSnapshotRef, candles: import("modules/market-data/api").Candle[]): Promise<SentimentDatasetSnapshotRef> {
    const sentiment = this.deps.sentiment;
    if (!sentiment) throw new Error("SENTIMENT_NOT_CONFIGURED");
    const actual = await sentiment.getSnapshotRef(reference.id).catch(() => invalid("SNAPSHOT_INCOMPLETE"));
    const sameReference = actual.id === reference.id && actual.relatedCoin === reference.relatedCoin && actual.range.from === reference.range.from && actual.range.to === reference.range.to && actual.aggregationWindowSeconds === reference.aggregationWindowSeconds && actual.modelName === reference.modelName && actual.modelVersion === reference.modelVersion && actual.modelSha256 === reference.modelSha256 && actual.pointCount === reference.pointCount && actual.sha256 === reference.sha256 && actual.createdAt === reference.createdAt;
    const from = Date.parse(actual.range.from);
    const to = Date.parse(actual.range.to);
    const orderedCandles = candles.filter((candle) => candle.isClosed).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
    const firstClose = orderedCandles.length > 0 ? Date.parse(orderedCandles[0]!.timestamp) + TIMEFRAME_MS[snapshot.timeframe] : NaN;
    const lastClose = orderedCandles.length > 0 ? Date.parse(orderedCandles[orderedCandles.length - 1]!.timestamp) + TIMEFRAME_MS[snapshot.timeframe] : NaN;
    if (!sameReference || actual.relatedCoin !== snapshot.pairMetadata.baseAsset || !/^[a-f0-9]{64}$/i.test(actual.modelSha256) || !/^[a-f0-9]{64}$/i.test(actual.sha256) || !Number.isInteger(actual.pointCount) || actual.pointCount < 1 || !Number.isInteger(actual.aggregationWindowSeconds) || actual.aggregationWindowSeconds < 1 || !Number.isFinite(from) || !Number.isFinite(to) || from > firstClose || to <= lastClose) invalid("SNAPSHOT_INCOMPLETE");
    await sentiment.readSnapshot(actual.id).catch(() => invalid("SNAPSHOT_INCOMPLETE"));
    return actual;
  }
  private async resolveSentimentReference(command: CreateLeaderboardScopeCommand, snapshot: import("modules/market-data/api").DatasetSnapshotRef, candles: import("modules/market-data/api").Candle[]): Promise<SentimentDatasetSnapshotRef | undefined> {
    if (command.sentimentDatasetSnapshot) return this.verifySentimentReference(command.sentimentDatasetSnapshot, snapshot, candles);
    if (!command.sentimentCreate) return undefined;
    const sentiment = this.deps.sentiment;
    if (!sentiment) throw new Error("SENTIMENT_NOT_CONFIGURED");
    const created = await sentiment.createSnapshot(command.sentimentCreate).catch(() => invalid("SNAPSHOT_INCOMPLETE"));
    return this.verifySentimentReference(created, snapshot, candles);
  }
  async createBenchmarkScope(auth: AuthContext, command: CreateLeaderboardScopeCommand, options: { scopeIdempotencyKey: string }): Promise<BenchmarkScopeSummary> { this.assertAuth(auth); if (!options.scopeIdempotencyKey.trim()) invalid("INVALID_BENCHMARK_SCOPE"); const existing = await this.deps.repository.findScopeByIdempotency(auth.userId, options.scopeIdempotencyKey); if (existing) return existing; this.validateScope(command); const captured = await this.captureSnapshot(command.datasetSnapshot.id); const sentimentDatasetSnapshot = await this.resolveSentimentReference(command, captured.snapshot, captured.candles); const createdAt = this.now(); const scope: StoredBenchmarkScope = { id: this.id(), ownerUserId: auth.userId, name: command.name, version: 1, datasetSnapshot: captured.snapshot, sentimentDatasetSnapshot, workerRuntimeVersion: command.workerRuntimeVersion, workerRuntimeSha256: command.workerRuntimeSha256, evaluationRuntimeVersion: command.evaluationRuntimeVersion, evaluationRuntimeSha256: command.evaluationRuntimeSha256, simulatorVersion: SIMULATOR_VERSION, simulatorSha256: SIMULATOR_SHA256, benchmarkTimezone: BENCHMARK_TIMEZONE, fillPolicyId: FILL_POLICY_ID, oppositeSignalPolicyId: OPPOSITE_SIGNAL_POLICY_ID, sameCandleOrderingPolicyId: SAME_CANDLE_ORDERING_POLICY_ID, deterministicGuarantee: DETERMINISTIC_GUARANTEE, pair: captured.snapshot.pair, timeframe: captured.snapshot.timeframe, datasetRange: captured.snapshot.range, datasetSnapshotId: captured.snapshot.id, datasetSnapshotSha256: captured.snapshot.sha256, warmupCapacityCandles: command.warmupCapacityCandles ?? DEFAULT_WARMUP_CAPACITY_CANDLES, initialCapital: command.initialCapital, feeRatePercent: command.feeRatePercent, slippageBps: command.slippageBps, riskPolicy: command.riskPolicy, decimalPolicyId: "MVP_DECIMAL_HALF_UP_V1", evaluationPolicyId: "MVP_EVALUATION_V1", scoreFormulaId: command.scoreFormulaId, createdAt }; return this.deps.repository.createScope(scope, options.scopeIdempotencyKey); }
  async readBenchmarkScope(auth: AuthContext, scopeId: string): Promise<BenchmarkScopeSummary> { return this.ownedScope(auth, scopeId); }
  async listBenchmarkScopes(auth: AuthContext): Promise<BenchmarkScopeSummary[]> { this.assertAuth(auth); return this.deps.repository.listScopesByOwner(auth.userId); }
  async deleteBenchmarkScope(auth: AuthContext, scopeId: string): Promise<boolean> {
    this.assertAuth(auth);
    const existing = await this.ownedScope(auth, scopeId);
    const deleted = await this.deps.repository.deleteScope(existing.id, auth.userId);
    if (!deleted) throw new Error("BACKTEST_SCOPE_NOT_FOUND");
    return true;
  }
  private async compositeStrategy(definitions: StrategyDefinition[], composite: CompositeStrategyDefinition): Promise<Strategy> { const byId = new Map(definitions.map((definition) => [definition.id, definition])); if (composite.components.length === 0 || composite.components.some((component) => !byId.has(component.strategyDefinitionId))) invalid("INVALID_COMPOSITE_STRATEGY"); const resolved = await Promise.all(definitions.map(async (definition) => [definition.id, await this.deps.strategy.resolveStrategy(definition)] as const)); const strategies = new Map(resolved); return { name: `composite:${composite.id}`, category: "TREND", analyze: (context) => this.deps.strategy.combineSignals(composite, composite.components.map((component) => ({ strategyDefinitionId: component.strategyDefinitionId, signal: strategies.get(component.strategyDefinitionId)!.analyze(context) }))) }; }
  private candidateRecord(input: { ownerUserId: string; scope: StoredBenchmarkScope; command: StartManualBacktestCommand | SubmitSearchCandidateCommand; strategyDefinitions: StrategyDefinition[]; compositeDefinition: CompositeStrategyDefinition; executionPolicy: ExecutionPolicySnapshot; origin: "MANUAL" | "SEARCH"; candidateId: string; warmupCandles: number }): StoredCandidate { const createdAt = this.now(); const search = input.origin === "SEARCH" ? input.command as SubmitSearchCandidateCommand : undefined; if (!Number.isInteger(input.command.maxAttempts) || input.command.maxAttempts < 1) invalid("INVALID_BACKTEST_SUBMISSION"); const single = input.strategyDefinitions.length === 1 && input.compositeDefinition.method === "WEIGHTED_SCORE" && input.compositeDefinition.components.length === 1 && input.compositeDefinition.components[0]?.strategyDefinitionId === input.strategyDefinitions[0]?.id && input.compositeDefinition.components[0]?.weight === 1; return { candidateId: input.candidateId, ownerUserId: input.ownerUserId, origin: input.origin, selectionMode: single ? "SINGLE" : "COMPOSITE", searchRunId: search?.searchRunId, iterationNumber: search?.iterationNumber, generatedBy: search?.generatedBy, fingerprint: search?.fingerprint, lineage: search?.lineage, leaderboardScopeId: input.scope.id, status: "QUEUED", attempts: [], maxAttempts: input.command.maxAttempts, completionAttemptCount: 0, completionMaxAttempts: 5, executionGeneration: 0, completionGeneration: 0, warmupCandles: input.warmupCandles, executionPolicy: clone(input.executionPolicy), strategyDefinitions: clone(input.strategyDefinitions), compositeDefinition: clone(input.compositeDefinition), queueJobId: input.candidateId, createdAt, updatedAt: createdAt }; }
  private dispatchRecord(candidate: StoredCandidate, scope: StoredBenchmarkScope): BacktestDispatch { const createdAt = this.now(); return { job: { schemaVersion: 1, jobId: candidate.candidateId, candidateId: candidate.candidateId, leaderboardScopeId: scope.id, maxAttempts: candidate.maxAttempts, workerRuntimeVersion: scope.workerRuntimeVersion, workerRuntimeSha256: scope.workerRuntimeSha256, enqueuedAt: createdAt }, state: "PENDING", dispatchAttempts: 0, createdAt, updatedAt: createdAt }; }
  private async dispatchOne(dispatch: BacktestDispatch): Promise<boolean> { if (dispatch.state !== "PENDING") return false; try { await this.deps.queue.enqueue(dispatch.job); await this.deps.repository.markDispatchDispatched(dispatch.job.jobId, this.now()); return true; } catch (error) { const message = error instanceof Error ? error.message : "BACKTEST_QUEUE_DISPATCH_FAILED"; await this.deps.repository.markDispatchFailed(dispatch.job.jobId, message, this.now()); return false; } }
  async reconcileQueue(limit = 100): Promise<{ dispatched: number; pending: number }> { if (!Number.isInteger(limit) || limit < 1) invalid("INVALID_QUEUE_RECOVERY_LIMIT"); const nowValue = this.now(); for (const candidateId of await this.deps.repository.listQueueRecoveryCandidates(limit)) { const candidate = await this.deps.repository.readCandidate(candidateId); if (candidate?.status === "BACKTESTING" && candidate.activeLeaseExpiresAt && Date.parse(candidate.activeLeaseExpiresAt) <= Date.parse(nowValue)) await this.deps.repository.recoverAbandonedAttempt({ candidateId, now: nowValue, error: "BACKTEST_WORKER_LEASE_EXPIRED" }); } const pending = await this.deps.repository.listPendingDispatches(limit); let dispatched = 0; for (const item of pending) if (await this.dispatchOne(item)) dispatched += 1; for (const replayJobId of await this.deps.repository.listReplayVerificationRecovery(nowValue, limit)) { const replay = await this.deps.repository.readReplayVerification(replayJobId); if (!replay) continue; try { await this.deps.queue.enqueue({ schemaVersion: 1, replayJobId: replay.replayJobId, experimentId: replay.experimentId, mismatchSampleLimit: replay.mismatchSampleLimit, requestedAt: replay.requestedAt }); dispatched += 1; } catch { /* the durable queued record remains retryable */ } } return { dispatched, pending: pending.length - dispatched }; }
  async listQueueRecoveryCandidates(limit = 100): Promise<string[]> { if (!Number.isInteger(limit) || limit < 1) invalid("INVALID_QUEUE_RECOVERY_LIMIT"); return this.deps.repository.listQueueRecoveryCandidates(limit); }
  private async submit(command: StartManualBacktestCommand | SubmitSearchCandidateCommand, input: { ownerUserId: string; origin: "MANUAL" | "SEARCH"; submissionIdempotencyKey?: string }): Promise<BacktestSubmissionAccepted> { if (input.submissionIdempotencyKey) { const existing = await this.deps.repository.findCandidateBySubmission(input.ownerUserId, input.submissionIdempotencyKey); if (existing) return { candidateId: existing.candidateId, jobId: existing.queueJobId, status: existing.status }; } const scope = await this.deps.repository.readScope(command.leaderboardScopeId, input.ownerUserId); if (!scope) throw new Error("BACKTEST_SCOPE_NOT_FOUND"); const references = await this.validateStrategyReferences(input.ownerUserId, command); if (references.warmupCandles > scope.warmupCapacityCandles) invalid("SNAPSHOT_INCOMPLETE"); const inputSnapshot = await this.snapshot(scope.datasetSnapshotId); if (references.warmupCandles > inputSnapshot.candles.filter((candle) => candle.isClosed).length) invalid("SNAPSHOT_INCOMPLETE"); await this.loadSentiment(scope, inputSnapshot.candles, references.requiresSentiment); const executionPolicy = normalizeExecutionPolicy(command.executionPolicy, references.warmupCandles, scope.riskPolicy); const candidate = this.candidateRecord({ ownerUserId: input.ownerUserId, scope, command, strategyDefinitions: references.strategyDefinitions, compositeDefinition: references.compositeDefinition, executionPolicy, origin: input.origin, candidateId: this.id(), warmupCandles: references.warmupCandles }); const dispatch = this.dispatchRecord(candidate, scope); const saved = await this.deps.repository.createQueuedSubmission({ candidate, dispatch, submissionIdempotencyKey: input.submissionIdempotencyKey }); const persistedDispatch = saved.candidateId === candidate.candidateId ? dispatch : await this.deps.repository.readDispatch(saved.queueJobId); if (persistedDispatch) await this.dispatchOne(persistedDispatch); return { candidateId: saved.candidateId, jobId: saved.queueJobId, status: saved.status }; }
  async startManual(auth: AuthContext, command: StartManualBacktestCommand, options?: { submissionIdempotencyKey?: string }): Promise<BacktestSubmissionAccepted> { this.assertAuth(auth); return this.submit(command, { ownerUserId: auth.userId, origin: "MANUAL", submissionIdempotencyKey: options?.submissionIdempotencyKey }); }
  async submitSearchCandidate(auth: AuthContext, command: SubmitSearchCandidateCommand): Promise<BacktestSubmissionAccepted> { this.assertAuth(auth); return this.submit(command, { ownerUserId: auth.userId, origin: "SEARCH" }); }
  async processQueueJob(job: BacktestQueueJob, delivery: { attemptNumber: number; fenceToken?: string }): Promise<BacktestQueueReturn> { if (job.schemaVersion !== 1 || job.jobId !== job.candidateId || !Number.isInteger(delivery.attemptNumber) || delivery.attemptNumber < 1 || delivery.attemptNumber > job.maxAttempts) throw new Error("INVALID_BACKTEST_QUEUE_JOB"); const startedAt = this.now(); const fenceToken = delivery.fenceToken ?? this.id(); const claim = await this.deps.repository.claimWorkerAttempt({ candidateId: job.candidateId, queueJobId: job.jobId, deliveryAttempt: delivery.attemptNumber, attemptId: `${job.candidateId}:attempt:${delivery.attemptNumber}`, fenceToken, now: startedAt, leaseExpiresAt: plusSeconds(startedAt, 60), workerRuntimeVersion: job.workerRuntimeVersion, workerRuntimeSha256: job.workerRuntimeSha256 }); if (!claim) { const candidate = await this.deps.repository.readCandidate(job.candidateId); return { candidateId: job.candidateId, status: "IGNORED", reason: candidate?.status === "CANCELLED" ? "CANCELLED" : terminal(candidate?.status ?? "FAILED") ? "ALREADY_TERMINAL" : "SUPERSEDED" }; } return this.runClaimedAttempt(claim, job); }
  private async runClaimedAttempt(claim: WorkerAttemptClaim, job: BacktestQueueJob): Promise<BacktestQueueReturn> {
    const { candidate, attempt, fenceToken } = claim;
    try {
      const scope = await this.scope(candidate.leaderboardScopeId);
      const input = await this.snapshot(scope.datasetSnapshotId);
      const strategy = await this.compositeStrategy(candidate.strategyDefinitions, candidate.compositeDefinition);
      const sentimentAt = await this.loadSentiment(scope, input.candles, this.strategyRequirements(candidate.strategyDefinitions).requiresSentiment);
      const completedAt = this.now();
      const result = simulateBacktest({ candidateId: candidate.candidateId, attemptId: attempt.attemptId, pair: scope.pair, settlementAsset: scope.datasetSnapshot.pairMetadata.settlementAsset || scope.datasetSnapshot.pairMetadata.quoteAsset || "USDT", timeframe: scope.timeframe, candles: input.candles, warmupCandles: candidate.warmupCandles, strategy, sentimentAt, initialCapital: scope.initialCapital, feeRatePercent: scope.feeRatePercent, slippageBps: scope.slippageBps, stopLossPercent: candidate.executionPolicy?.stopLossPercent ?? scope.riskPolicy?.stopLossPercent, takeProfitPercent: candidate.executionPolicy?.takeProfitPercent ?? scope.riskPolicy?.takeProfitPercent, workerRuntimeVersion: job.workerRuntimeVersion, workerRuntimeSha256: job.workerRuntimeSha256, startedAt: attempt.startedAt, completedAt });
      await this.deps.repository.persistWorkerSuccess({ candidate, attempt, result, fenceToken });
      return { candidateId: candidate.candidateId, status: "COMPLETED", attemptId: attempt.attemptId, completedAt };
    } catch (error) {
      const message = error instanceof Error ? error.message : "BACKTEST_EXECUTION_FAILED";
      const retrying = attempt.attemptNumber < job.maxAttempts;
      await this.deps.repository.failWorkerAttempt({ candidate, attempt, fenceToken, retrying, now: this.now(), error: message });
      throw error;
    }
  }
  async processCompletion(candidateId: string): Promise<{ candidateId: string; status: "COMPLETED" | "FAILED" | "IGNORED" }> {
    const claimed = await this.deps.repository.claimCompletion({ candidateId, claimToken: this.id(), now: this.now(), leaseExpiresAt: plusSeconds(this.now(), 60) });
    if (!claimed) {
      const candidate = await this.deps.repository.readCandidate(candidateId);
      return { candidateId, status: candidate?.status === "COMPLETED" ? "COMPLETED" : candidate?.status === "FAILED" ? "FAILED" : "IGNORED" };
    }
    const { candidate, claimToken } = claimed;
    try {
      if (candidate.status === "TERMINAL_FAILURE_PENDING") {
        await this.deps.repository.finalizeTerminalFailure({ candidate, claimToken, now: this.now() });
        if (candidate.searchRunId) {
          try { await this.deps.completion.notifySearchCandidateFinished?.(candidate.searchRunId); } catch { /* Search startup reconciliation recovers a lost callback. */ }
        }
        return { candidateId, status: "FAILED" };
      }
      const attempt = await this.deps.repository.readLatestCompletedAttempt(candidateId);
      if (!attempt) throw new Error("BACKTEST_COMPLETION_ATTEMPT_NOT_FOUND");
      const scope = await this.scope(candidate.leaderboardScopeId);
      const result: CompletedBacktestResult = { status: "COMPLETED", candidateId, attemptId: attempt.attemptId, workerRuntimeVersion: attempt.workerRuntimeVersion, workerRuntimeSha256: attempt.workerRuntimeSha256, startedAt: attempt.startedAt, completedAt: attempt.completedAt ?? this.now(), initialCapital: scope.initialCapital, trades: await this.deps.repository.listTrades(attempt.attemptId) };
      const metrics = this.deps.evaluation.evaluator.evaluate(result);
      const projections = amountProjection(scope.initialCapital, result.trades);
      const scored = await this.deps.completion.score(scope.id, metrics);
      const existing = await this.deps.repository.findExperimentByCandidate(candidateId);
      let unitOfWork: CompletionUnitOfWork | undefined;
      try {
        unitOfWork = await this.deps.beginCompletion?.({ candidateId, completionAttemptCount: candidate.completionAttemptCount, completionClaimToken: claimToken }) ?? { kind: "COMPLETION", id: `completion-${candidateId}-${candidate.completionAttemptCount}`, candidateId, completionAttemptCount: candidate.completionAttemptCount, completionClaimToken: claimToken, enlist: () => undefined, commit: async () => undefined, rollback: async () => undefined };
        const experiment = existing ?? await this.deps.repository.stageCompletionExperiment({ id: this.id(), ownerUserId: candidate.ownerUserId, candidateId, searchRunId: candidate.searchRunId, leaderboardScopeId: scope.id, scoreFormulaId: scored.scoreFormulaId, overallScore: scored.overallScore, rankEligible: scored.rankEligible, backtestAttemptId: attempt.attemptId, compositeDefinitionId: candidate.compositeDefinition.id, compositeDefinition: candidate.compositeDefinition, datasetSnapshot: scope.datasetSnapshot, sentimentDatasetSnapshot: scope.sentimentDatasetSnapshot, strategyDefinitions: candidate.strategyDefinitions, executionPolicy: candidate.executionPolicy, simulatorVersion: scope.simulatorVersion ?? SIMULATOR_VERSION, simulatorSha256: scope.simulatorSha256 ?? SIMULATOR_SHA256, benchmarkTimezone: scope.benchmarkTimezone ?? BENCHMARK_TIMEZONE, fillPolicyId: scope.fillPolicyId ?? FILL_POLICY_ID, oppositeSignalPolicyId: scope.oppositeSignalPolicyId ?? OPPOSITE_SIGNAL_POLICY_ID, sameCandleOrderingPolicyId: scope.sameCandleOrderingPolicyId ?? SAME_CANDLE_ORDERING_POLICY_ID, deterministicGuarantee: scope.deterministicGuarantee ?? DETERMINISTIC_GUARANTEE, workerRuntimeVersion: attempt.workerRuntimeVersion, workerRuntimeSha256: attempt.workerRuntimeSha256, evaluationRuntimeVersion: metrics.evaluationRuntimeVersion, evaluationRuntimeSha256: metrics.evaluationRuntimeSha256, decimalPolicyId: scope.decimalPolicyId, evaluationPolicyId: scope.evaluationPolicyId, feeRatePercent: scope.feeRatePercent, slippageBps: scope.slippageBps, ...projections, metrics, trades: result.trades, createdAt: this.now() }, unitOfWork);
        await this.deps.completion.submit(experiment, unitOfWork);
        await this.deps.repository.finalizeCompletion({ candidate, experimentId: experiment.id, claimToken, now: this.now() }, unitOfWork);
        await unitOfWork.commit?.();
      } catch (error) {
        try { await unitOfWork?.rollback?.(); } catch { /* Preserve the original completion failure. */ }
        throw error;
      }
      if (candidate.searchRunId) {
        try { await this.deps.completion.notifySearchCandidateFinished?.(candidate.searchRunId); } catch { /* Search startup reconciliation recovers a lost callback. */ }
      }
      return { candidateId, status: "COMPLETED" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "BACKTEST_COMPLETION_FAILED";
      await this.deps.repository.failCompletion({ candidate, claimToken, retryAt: plusSeconds(this.now(), 1), now: this.now(), error: message });
      throw error;
    }
  }
  async processQueueTerminalSignal(signal: BacktestQueueTerminalSignal): Promise<{ candidateId: string; status: "COMPLETED" | "FAILED" | "IGNORED" }> {
    if (signal.schemaVersion !== 1 || !signal.jobId) invalid("INVALID_BACKTEST_QUEUE_SIGNAL");
    if (signal.status !== "COMPLETED") await this.deps.repository.repairTerminalQueueFailure({ candidateId: signal.jobId, error: signal.status === "RETRIES_EXHAUSTED" ? "BACKTEST_RETRIES_EXHAUSTED" : signal.failedReason, now: this.now() });
    return this.processCompletion(signal.jobId);
  }
  async reconcileCompletions(limit = 100): Promise<{ processed: number; pending: number }> {
    if (!Number.isInteger(limit) || limit < 1) invalid("INVALID_COMPLETION_RECOVERY_LIMIT");
    const ids = await this.deps.repository.listDueCompletions(this.now(), limit);
    let processed = 0;
    for (const id of ids) {
      try { await this.processCompletion(id); processed += 1; } catch { /* durable retry state is written by processCompletion */ }
    }
    return { processed, pending: ids.length - processed };
  }
  async status(auth: AuthContext, candidateId: string): Promise<CandidateProgress> { const candidate = await this.ownedCandidate(auth, candidateId); return this.progress(candidate, await this.deps.repository.listAttempts(candidateId)); }
  async summarizeSearchCandidates(auth: AuthContext, searchRunId: string): Promise<SearchCandidateSummary> { const candidates = await this.ownedSearchCandidates(auth, searchRunId); const attemptsByCandidate = await Promise.all(candidates.map(async (candidate) => [candidate, await this.deps.repository.listAttempts(candidate.candidateId)] as const)); const active = attemptsByCandidate.filter(([candidate]) => !terminal(candidate.status)).map(([candidate, attempts]) => this.progress(candidate, attempts)); const attempts = attemptsByCandidate.filter(([candidate]) => candidate.status !== "CANCELLED").flatMap(([, candidateAttempts]) => candidateAttempts); const tested = candidates.filter((candidate) => candidate.status === "COMPLETED" || candidate.status === "FAILED"); const failed = candidates.filter((candidate) => candidate.status === "FAILED"); return { searchRunId, active, queuedCount: candidates.filter((candidate) => candidate.status === "QUEUED").length, runningCount: candidates.filter((candidate) => ["BACKTESTING", "RETRY_WAIT", "PROCESSING_RESULT"].includes(candidate.status)).length, candidatesTested: tested.length, failedCandidateCount: failed.length, retryExhaustedCandidateCount: failed.filter((candidate) => candidate.failureKind === "RETRY_EXHAUSTED").length, infrastructureFailureCandidateCount: failed.filter((candidate) => candidate.failureKind === "INFRASTRUCTURE").length, completionProcessingFailureCandidateCount: failed.filter((candidate) => candidate.failureKind === "COMPLETION_PROCESSING").length, failedAttemptCount: attempts.filter((attempt) => attempt.status === "FAILED").length, averageBacktestDurationMs: null }; }
  async listSearchCandidates(auth: AuthContext, searchRunId: string, page: SearchCandidatePageRequest): Promise<SearchCandidatePage> { if (!Number.isInteger(page.limit) || page.limit < 1) invalid("INVALID_PAGE"); const items = (await this.ownedSearchCandidates(auth, searchRunId)).sort((left, right) => left.createdAt.localeCompare(right.createdAt)); const offset = page.cursor ? Number(page.cursor) : 0; if (!Number.isInteger(offset) || offset < 0) invalid("INVALID_PAGE"); const selected = items.slice(offset, offset + page.limit); return { items: await Promise.all(selected.map(async (candidate) => this.progress(candidate, await this.deps.repository.listAttempts(candidate.candidateId)))), nextCursor: offset + page.limit < items.length ? String(offset + page.limit) : undefined }; }
  async cancelSearchCandidates(auth: AuthContext, searchRunId: string, unitOfWork: import("../domain/contracts").CancellationUnitOfWork): Promise<{ candidateIds: string[] }> { const candidates = await this.ownedSearchCandidates(auth, searchRunId); const cancelled: string[] = []; for (const candidate of candidates) if (!terminal(candidate.status)) { const activeFenceToken = candidate.status === "BACKTESTING" ? candidate.activeFenceToken : undefined; candidate.status = "CANCELLED"; candidate.activeFenceToken = activeFenceToken; candidate.activeLeaseExpiresAt = undefined; candidate.updatedAt = this.now(); await this.deps.repository.updateCandidate(candidate, unitOfWork); await this.deps.repository.markDispatchCancelled(candidate.queueJobId, candidate.updatedAt, unitOfWork); cancelled.push(candidate.candidateId); } return { candidateIds: cancelled }; }
  async cancelManualCandidate(auth: AuthContext, candidateId: string): Promise<void> { const candidate = await this.ownedCandidate(auth, candidateId); if (candidate.origin !== "MANUAL") invalid("BACKTEST_CANDIDATE_NOT_MANUAL"); if (!terminal(candidate.status)) { const activeFenceToken = candidate.status === "BACKTESTING" ? candidate.activeFenceToken : undefined; candidate.status = "CANCELLED"; candidate.activeFenceToken = activeFenceToken; candidate.activeLeaseExpiresAt = undefined; candidate.updatedAt = this.now(); await this.deps.repository.updateCandidate(candidate); await this.deps.repository.markDispatchCancelled(candidate.queueJobId, candidate.updatedAt); } }
  async removePendingJobs(candidateIds: string[]): Promise<void> { for (const candidateId of candidateIds) { const candidate = await this.deps.repository.readCandidate(candidateId); if (!candidate) continue; try { await this.deps.queue.remove(candidate.queueJobId); } finally { await this.deps.repository.markDispatchCancelled(candidate.queueJobId, this.now()); } } }
  async readAttempt(auth: AuthContext, attemptId: string): Promise<BacktestAttemptAudit> { this.assertAuth(auth); const attempt = await this.deps.repository.readAttempt(attemptId, auth.userId); if (!attempt) throw new Error("BACKTEST_ATTEMPT_NOT_FOUND"); await this.ownedCandidate(auth, attempt.candidateId); return attempt; }
  async listAttemptTrades(auth: AuthContext, attemptId: string, page: TradePageRequest): Promise<TradePage> { await this.readAttempt(auth, attemptId); return this.pageTrades(await this.deps.repository.listTrades(attemptId), page, auth.userId, `attempt:${attemptId}`); }
  async readExperimentSummary(auth: AuthContext, experimentId: string): Promise<ExperimentResultSummary> { this.assertAuth(auth); const experiment = await this.deps.repository.readExperiment(experimentId, auth.userId); if (!experiment) throw new Error("EXPERIMENT_NOT_FOUND"); return experiment; }
  async listSearchExperimentSummaries(auth: AuthContext, searchRunId: string): Promise<ExperimentResultSummary[]> { this.assertAuth(auth); const experiments = await this.deps.repository.listExperimentsBySearchRun(searchRunId, auth.userId); if (experiments.length > 0) return experiments; const anyOwnerExperiments = await this.deps.repository.listExperimentsBySearchRun(searchRunId); if (anyOwnerExperiments.length > 0) throw new Error("BACKTEST_SEARCH_RUN_NOT_FOUND"); return []; }
  async scoreExperiment(auth: AuthContext, experimentId: string, input: { overallScore: number; rankEligible: boolean }): Promise<ExperimentResultSummary> { if (!Number.isFinite(input.overallScore)) invalid("INVALID_SCORE"); await this.readExperimentSummary(auth, experimentId); const updated = await this.deps.repository.updateExperimentScore(experimentId, input, auth.userId); if (!updated) throw new Error("EXPERIMENT_NOT_FOUND"); return updated; }
  async listExperimentTrades(auth: AuthContext, experimentId: string, page: TradePageRequest): Promise<TradePage> { const experiment = await this.readExperimentSummary(auth, experimentId); return this.pageTrades(experiment.trades, page, auth.userId, `experiment:${experimentId}`); }

  async startReplayVerification(auth: AuthContext, experimentId: string): Promise<import("../domain/contracts").ReplayVerificationAccepted> {
    const experiment = await this.readExperimentSummary(auth, experimentId);
    const requestedAt = this.now();
    const replay: StoredReplayVerification = { replayJobId: this.id(), experimentId, sourceAttemptId: experiment.backtestAttemptId, ownerUserId: auth.userId, status: "QUEUED", mismatchSampleLimit: REPLAY_MISMATCH_SAMPLE_LIMIT, requestedAt };
    await this.deps.repository.createReplayVerification(replay);
    try {
      await this.deps.queue.enqueue({ schemaVersion: 1, replayJobId: replay.replayJobId, experimentId, mismatchSampleLimit: replay.mismatchSampleLimit, requestedAt });
    } catch { /* durable reconciliation retries a lost enqueue */ }
    return { replayJobId: replay.replayJobId, experimentId, status: "QUEUED" };
  }

  async readReplayVerification(auth: AuthContext, replayJobId: string): Promise<ReplayVerificationResult> {
    this.assertAuth(auth);
    const replay = await this.deps.repository.readReplayVerification(replayJobId, auth.userId);
    if (!replay) throw new Error("REPLAY_VERIFICATION_NOT_FOUND");
    return clone(replay as unknown as ReplayVerificationResult);
  }

  async processReplayVerification(replayJobId: string): Promise<void> {
    const nowValue = this.now();
    const claimed = await this.deps.repository.claimReplayVerification({ replayJobId, claimToken: this.id(), now: nowValue, leaseExpiresAt: plusSeconds(nowValue, 60) });
    if (!claimed) return;
    let result: Extract<ReplayVerificationResult, { status: "MATCH" | "MISMATCH" | "NON_REPLAYABLE" }>;
    try {
      const replay = await this.verifyReplay({ userId: claimed.ownerUserId }, claimed.experimentId);
      const sampleLimit = Math.min(claimed.mismatchSampleLimit, REPLAY_MISMATCH_SAMPLE_MAX);
      const mismatches = replay.mismatches.slice(0, sampleLimit);
      const totalMismatchCount = replay.totalMismatchCount ?? replay.mismatches.length;
      result = replay.status === "MISMATCH"
        ? { replayJobId, experimentId: replay.experimentId, sourceAttemptId: replay.sourceAttemptId, status: "MISMATCH", comparedTradeCount: replay.comparedTradeCount, mismatches, totalMismatchCount, truncated: totalMismatchCount > mismatches.length }
        : { replayJobId, experimentId: replay.experimentId, sourceAttemptId: replay.sourceAttemptId, status: "MATCH", comparedTradeCount: replay.comparedTradeCount, mismatches: [], totalMismatchCount: 0, truncated: false };
    } catch (error) {
      const code = error instanceof Error ? error.message : "REPLAY_ARTIFACT_EXPIRED";
      const failureCode = code === "BACKTEST_DATASET_NOT_FOUND" || code === "SNAPSHOT_INCOMPLETE" ? "MISSING_SNAPSHOT" : code === "IMPLEMENTATION_ARTIFACT_UNAVAILABLE" ? "IMPLEMENTATION_ARTIFACT_UNAVAILABLE" : "REPLAY_ARTIFACT_EXPIRED";
      result = { replayJobId, experimentId: claimed.experimentId, sourceAttemptId: claimed.sourceAttemptId, status: "NON_REPLAYABLE", failureCode };
    }
    await this.deps.repository.completeReplayVerification({ replayJobId, claimToken: claimed.activeClaimToken!, now: this.now(), result });
  }

  private visualizationContexts(candles: import("modules/market-data/api").Candle[]): StrategyContext[] {
    return candles.map((candle, index) => ({ pair: candle.pair, timeframe: candle.timeframe, candles: candles.slice(0, index + 1).map(toStrategyCandle), currentPrice: candle.close, indicators: {} }));
  }

  private async buildExperimentOverlays(definitions: StrategyDefinition[], candles: import("modules/market-data/api").Candle[], from: number, to: number): Promise<import("../domain/contracts").StrategyVisualizationOverlay[]> {
    const buildVisualization = this.deps.strategy.buildVisualization;
    if (!buildVisualization) return [];
    const contexts = this.visualizationContexts(candles);
    const overlays: import("../domain/contracts").StrategyVisualizationOverlay[] = [];
    for (const definition of definitions) {
      try {
        await this.deps.strategy.resolveStrategy(definition);
      } catch {
        throw new Error("IMPLEMENTATION_ARTIFACT_UNAVAILABLE");
      }
      const emitted = buildVisualization(definition, contexts);
      if (!Array.isArray(emitted)) invalid("INVALID_VISUALIZATION_PAGE");
      for (const overlay of emitted) {
        if (!overlay || !overlay.id.trim() || overlay.strategyDefinitionId !== definition.id || !overlay.label.trim() || !Array.isArray(overlay.points)) invalid("INVALID_VISUALIZATION_PAGE");
        const points = overlay.points.filter((point) => {
          const rawPoint = point as unknown as Record<string, unknown>;
          const pointTime = rawPoint?.time;
          if (typeof pointTime !== "string" || !Number.isFinite(Date.parse(pointTime))) invalid("INVALID_VISUALIZATION_PAGE");
          const normalizedTime = pointTime as string;
          if (overlay.kind === "LINE") {
            if (typeof rawPoint.value !== "number" || !Number.isFinite(rawPoint.value)) invalid("INVALID_VISUALIZATION_PAGE");
          } else if (overlay.kind === "ZONE") {
            if (typeof rawPoint.low !== "number" || typeof rawPoint.high !== "number" || !Number.isFinite(rawPoint.low) || !Number.isFinite(rawPoint.high) || rawPoint.low > rawPoint.high) invalid("INVALID_VISUALIZATION_PAGE");
          } else if (!(["BUY", "SELL", "HOLD"] as unknown[]).includes(rawPoint.signal) || typeof rawPoint.value !== "number" || !Number.isFinite(rawPoint.value)) invalid("INVALID_VISUALIZATION_PAGE");
          const timestamp = Date.parse(normalizedTime);
          return timestamp >= from && timestamp < to;
        });
        overlays.push({ ...clone(overlay), points } as import("../domain/contracts").StrategyVisualizationOverlay);
      }
    }
    if (overlays.length > VISUALIZATION_OVERLAY_MAX) invalid("INVALID_VISUALIZATION_PAGE");
    return overlays;
  }

  async readExperimentVisualization(auth: AuthContext, experimentId: string, page: ExperimentVisualizationPageRequest): Promise<ExperimentVisualization> {
    const limit = page.limit ?? VISUALIZATION_CANDLE_DEFAULT;
    if (!Number.isInteger(limit) || limit < 1 || limit > VISUALIZATION_CANDLE_MAX) invalid("INVALID_VISUALIZATION_PAGE");
    const experiment = await this.readExperimentSummary(auth, experimentId); const input = await this.snapshot(experiment.datasetSnapshot.id);
    const from = page.from ?? input.snapshot.range.from; const to = page.to ?? input.snapshot.range.to;
    const fromTimestamp = Date.parse(from); const toTimestamp = Date.parse(to); const snapshotFrom = Date.parse(input.snapshot.range.from); const snapshotTo = Date.parse(input.snapshot.range.to);
    if (!Number.isFinite(fromTimestamp) || !Number.isFinite(toTimestamp) || fromTimestamp < snapshotFrom || toTimestamp > snapshotTo || fromTimestamp >= toTimestamp) invalid("INVALID_VISUALIZATION_PAGE");
    if (page.highlightTradeId && !experiment.trades.some((trade) => trade.id === page.highlightTradeId)) invalid("TRADE_NOT_FOUND");
    const offset = page.cursor ? Number(page.cursor) : 0; if (!Number.isInteger(offset) || offset < 0) invalid("INVALID_VISUALIZATION_PAGE");
    const allClosedCandles = input.candles.filter((candle) => candle.isClosed).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
    const allCandles = allClosedCandles.filter((candle) => { const timestamp = Date.parse(candle.timestamp); return timestamp >= fromTimestamp && timestamp < toTimestamp; });
    if (offset > allCandles.length) invalid("INVALID_VISUALIZATION_PAGE");
    const candles = allCandles.slice(offset, offset + limit);
    const marker = (trade: Trade, kind: "ENTRY" | "STOP_LOSS" | "TAKE_PROFIT" | "EXIT", time: string, price: number): import("../domain/contracts").ExperimentVisualizationMarker => {
      const base = { id: `${trade.id}:${kind}`, tradeId: trade.id, sequence: trade.sequence, kind, side: trade.signal, time, price, highlighted: trade.id === page.highlightTradeId };
      return kind === "EXIT" ? { ...base, exitReason: trade.exitReason } : base;
    };
    const order: Record<import("../domain/contracts").ExperimentVisualizationMarker["kind"], number> = { ENTRY: 0, STOP_LOSS: 1, TAKE_PROFIT: 2, EXIT: 3 };
    const markers = experiment.trades.flatMap((trade) => [marker(trade, "ENTRY", trade.entryTime, trade.entryPrice), ...(trade.stopLoss === null ? [] : [marker(trade, "STOP_LOSS", trade.entryTime, trade.stopLoss)]), ...(trade.takeProfit === null ? [] : [marker(trade, "TAKE_PROFIT", trade.entryTime, trade.takeProfit)]), marker(trade, "EXIT", trade.exitTime, trade.exitPrice)]).filter((item) => { const timestamp = Date.parse(item.time); return timestamp >= fromTimestamp && timestamp < toTimestamp; }).sort((left, right) => Date.parse(left.time) - Date.parse(right.time) || left.sequence - right.sequence || order[left.kind] - order[right.kind] || left.id.localeCompare(right.id));
    const contextCandles = allClosedCandles.filter((candle) => Date.parse(candle.timestamp) < toTimestamp);
    const overlays = await this.buildExperimentOverlays(experiment.strategyDefinitions, contextCandles, fromTimestamp, toTimestamp);
    return { experimentId, datasetSnapshot: input.snapshot, candles, overlays, markers, nextCursor: offset + limit < allCandles.length ? String(offset + limit) : undefined };
  }
  private pageTrades(trades: Trade[], page: TradePageRequest, ownerUserId: string, resource: string): TradePage { const limit = page.limit ?? TRADE_PAGE_DEFAULT; if (!Number.isInteger(limit) || limit < 1 || limit > TRADE_PAGE_MAX) invalid("INVALID_PAGE"); const ordered = [...trades].sort(compareTradeKey); let start = 0; if (page.cursor) { const cursor = decodeTradeCursor(page.cursor); if (cursor.ownerUserId !== ownerUserId || cursor.resource !== resource || cursor.limit !== limit || cursor.limit < 1 || cursor.limit > TRADE_PAGE_MAX) invalid("INVALID_CURSOR"); const index = ordered.findIndex((trade) => trade.entryTime === cursor.last.entryTime && trade.sequence === cursor.last.sequence && trade.id === cursor.last.id); if (index < 0) invalid("INVALID_CURSOR"); start = index + 1; } const items = ordered.slice(start, start + limit); const nextCursor = start + items.length < ordered.length && items.length > 0 ? encodeTradeCursor(ownerUserId, resource, limit, items[items.length - 1]) : undefined; return { items, totalCount: ordered.length, nextCursor }; }
  async verifyReplay(auth: AuthContext, experimentId: string): Promise<LegacyReplayVerificationResult> { const experiment = await this.readExperimentSummary(auth, experimentId); const candidate = await this.ownedCandidate(auth, experiment.candidateId); const scope = await this.ownedScope(auth, experiment.leaderboardScopeId); const attempt = await this.readAttempt(auth, experiment.backtestAttemptId); const snapshot = await this.snapshot(scope.datasetSnapshotId); const strategy = await this.compositeStrategy(candidate.strategyDefinitions, candidate.compositeDefinition); const sentimentAt = await this.loadSentiment(scope, snapshot.candles, this.strategyRequirements(candidate.strategyDefinitions).requiresSentiment); const replay = simulateBacktest({ candidateId: candidate.candidateId, attemptId: attempt.attemptId, pair: scope.pair, settlementAsset: scope.datasetSnapshot.pairMetadata.settlementAsset || scope.datasetSnapshot.pairMetadata.quoteAsset || "USDT", timeframe: scope.timeframe, candles: snapshot.candles, warmupCandles: candidate.warmupCandles, strategy, sentimentAt, initialCapital: scope.initialCapital, feeRatePercent: scope.feeRatePercent, slippageBps: scope.slippageBps, stopLossPercent: candidate.executionPolicy?.stopLossPercent ?? scope.riskPolicy?.stopLossPercent, takeProfitPercent: candidate.executionPolicy?.takeProfitPercent ?? scope.riskPolicy?.takeProfitPercent, workerRuntimeVersion: attempt.workerRuntimeVersion, workerRuntimeSha256: attempt.workerRuntimeSha256, startedAt: attempt.startedAt, completedAt: attempt.completedAt ?? attempt.startedAt }); const replayMetrics = this.deps.evaluation.evaluator.evaluate(replay); const expected = experiment as unknown as Record<string, unknown>; const replayPolicy = candidate.executionPolicy ?? normalizeExecutionPolicy(undefined, candidate.warmupCandles, scope.riskPolicy); const mismatches: Array<{ fieldPath: string; expected: string; actual: string }> = []; const compare = (fieldPath: string, expectedValue: unknown, actualValue: unknown): void => { if (JSON.stringify(expectedValue) !== JSON.stringify(actualValue)) mismatches.push({ fieldPath, expected: JSON.stringify(expectedValue), actual: JSON.stringify(actualValue) }); }; const expectedTrades = experiment.trades; const actualTrades = replay.trades; if (expectedTrades.length !== actualTrades.length) compare("trades.length", expectedTrades.length, actualTrades.length); const tradeFields = ["id", "sequence", "entryTime", "entryPrice", "exitTime", "exitPrice", "quantity", "equityBeforeTrade", "equityAfterTrade", "feeAmount", "slippageAmount", "profit", "resultPercent", "result"] as const; for (let index = 0; index < Math.max(expectedTrades.length, actualTrades.length); index += 1) { const expectedTrade = expectedTrades[index] as unknown as Record<string, unknown> | undefined; const actualTrade = actualTrades[index] as unknown as Record<string, unknown> | undefined; for (const field of tradeFields) compare(`trades[${index}].${field}`, expectedTrade?.[field], actualTrade?.[field]); } const metricFields = Object.keys(experiment.metrics as unknown as Record<string, unknown>); for (const field of metricFields) compare(`metrics.${field}`, (experiment.metrics as unknown as Record<string, unknown>)[field], (replayMetrics as unknown as Record<string, unknown>)[field]); compare("executionPolicy", expected.executionPolicy ?? replayPolicy, replayPolicy); const totalMismatchCount = mismatches.length; const sampleLimit = 50; return { experimentId, sourceAttemptId: attempt.attemptId, status: totalMismatchCount === 0 ? "MATCH" : "MISMATCH", comparedTradeCount: Math.max(replay.trades.length, experiment.trades.length), mismatches: mismatches.slice(0, sampleLimit), totalMismatchCount, truncated: totalMismatchCount > sampleLimit }; }
}

export const BACKTEST_RUNTIME_SHA256 = artifactSha256(BACKTEST_RUNTIME_VERSION, BacktestingService.toString(), SIMULATOR_SHA256);

export function createBacktestingService(dependencies: BacktestingModuleDependencies = createInMemoryBacktestingDependencies()): BacktestLogApi { return new BacktestingService(dependencies); }
