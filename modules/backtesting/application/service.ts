import { randomUUID } from "node:crypto";
import { createEvaluationModule } from "../../evaluation/api/bootstrap";
import { createMarketDataModule } from "../../market-data/api/bootstrap";
import { createStrategyModule } from "../../strategy/api/bootstrap";
import type { CompositeStrategyDefinition, Strategy, StrategyDefinition } from "modules/strategy/api";
import type { BacktestLogApi, BacktestReadOptions, SearchCandidatePage, SearchCandidatePageRequest, SearchCandidateSummary, TradePage, TradePageRequest } from "../api";
import type { BacktestAttemptAudit, BacktestAttemptProgress, BacktestSubmissionAccepted, BenchmarkScopeSummary, CandidateProgress, CandidateStatus, CompletedBacktestResult, CreateLeaderboardScopeCommand, ExperimentResultSummary, ReplayVerificationResult, StartManualBacktestCommand, SubmitSearchCandidateCommand, Trade } from "../domain/contracts";
import { simulateBacktest } from "../domain/simulator";
import type { BacktestingModuleDependencies, BacktestingRepository, StoredBenchmarkScope, StoredCandidate, StoredExperiment } from "./ports";

export const BACKTEST_RUNTIME_VERSION = "1.0.0";
export const BACKTEST_RUNTIME_SHA256 = "c7d208d3db06e01df73733b91ed928fbd78d06f0d6d978f5821547c8ee6af75b";

const now = (): string => new Date().toISOString();
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const invalid = (code: string): never => { throw new Error(code); };
const terminal = (status: CandidateStatus): boolean => ["COMPLETED", "FAILED", "CANCELLED"].includes(status);

class InMemoryBacktestingRepository implements BacktestingRepository {
  private readonly snapshots = new Map<string, { snapshot: import("modules/market-data/api").DatasetSnapshotRef; candles: import("modules/market-data/api").Candle[] }>();
  private readonly scopes = new Map<string, StoredBenchmarkScope>();
  private readonly scopeIdempotency = new Map<string, string>();
  private readonly candidates = new Map<string, StoredCandidate>();
  private readonly candidateIdempotency = new Map<string, string>();
  private readonly attempts = new Map<string, BacktestAttemptAudit>();
  private readonly trades = new Map<string, Trade[]>();
  private readonly experiments = new Map<string, StoredExperiment>();

  async createInputSnapshot(snapshot: import("modules/market-data/api").DatasetSnapshotRef, candles: import("modules/market-data/api").Candle[]): Promise<void> { if (!this.snapshots.has(snapshot.id)) this.snapshots.set(snapshot.id, { snapshot: clone(snapshot), candles: clone(candles) }); }
  async readInputSnapshot(snapshotId: string) { const value = this.snapshots.get(snapshotId); return value ? clone(value) : undefined; }
  async createScope(scope: StoredBenchmarkScope, idempotencyKey: string): Promise<StoredBenchmarkScope> { this.scopes.set(scope.id, clone(scope)); this.scopeIdempotency.set(`${scope.ownerUserId}|${idempotencyKey}`, scope.id); return clone(scope); }
  async findScopeByIdempotency(ownerUserId: string, idempotencyKey: string) { const id = this.scopeIdempotency.get(`${ownerUserId}|${idempotencyKey}`); const value = id ? this.scopes.get(id) : undefined; return value ? clone(value) : undefined; }
  async readScope(scopeId: string) { const value = this.scopes.get(scopeId); return value ? clone(value) : undefined; }
  async createCandidate(candidate: StoredCandidate, key?: string): Promise<StoredCandidate> { this.candidates.set(candidate.candidateId, clone(candidate)); if (key) this.candidateIdempotency.set(`${candidate.ownerUserId}|${key}`, candidate.candidateId); return clone(candidate); }
  async findCandidateBySubmission(ownerUserId: string, key: string) { const id = this.candidateIdempotency.get(`${ownerUserId}|${key}`); const value = id ? this.candidates.get(id) : undefined; return value ? clone(value) : undefined; }
  async readCandidate(candidateId: string) { const value = this.candidates.get(candidateId); return value ? clone(value) : undefined; }
  async updateCandidate(candidate: StoredCandidate): Promise<void> { this.candidates.set(candidate.candidateId, clone(candidate)); }
  async listCandidatesBySearchRun(searchRunId: string) { return [...this.candidates.values()].filter((candidate) => candidate.searchRunId === searchRunId).map(clone); }
  async createAttempt(attempt: BacktestAttemptAudit): Promise<void> { this.attempts.set(attempt.attemptId, clone(attempt)); }
  async updateAttempt(attempt: BacktestAttemptAudit): Promise<void> { this.attempts.set(attempt.attemptId, clone(attempt)); }
  async readAttempt(attemptId: string) { const value = this.attempts.get(attemptId); return value ? clone(value) : undefined; }
  async listAttempts(candidateId: string): Promise<BacktestAttemptProgress[]> { return [...this.attempts.values()].filter((attempt) => attempt.candidateId === candidateId).sort((left, right) => left.attemptNumber - right.attemptNumber).map(clone); }
  async completeAttempt(input: { candidate: StoredCandidate; attempt: BacktestAttemptAudit; result: CompletedBacktestResult; metrics: import("modules/evaluation/api").EvaluationMetrics; experiment: StoredExperiment }): Promise<void> { this.candidates.set(input.candidate.candidateId, clone(input.candidate)); this.attempts.set(input.attempt.attemptId, clone(input.attempt)); this.trades.set(input.attempt.attemptId, clone(input.result.trades)); this.experiments.set(input.experiment.id, clone(input.experiment)); }
  async listTrades(attemptId: string) { return clone(this.trades.get(attemptId) ?? []); }
  async readExperiment(experimentId: string) { const value = this.experiments.get(experimentId); return value ? clone(value) : undefined; }
  async findExperimentByCandidate(candidateId: string) { const value = [...this.experiments.values()].find((experiment) => experiment.candidateId === candidateId); return value ? clone(value) : undefined; }
  async listExperimentsBySearchRun(searchRunId: string) { return [...this.experiments.values()].filter((experiment) => experiment.searchRunId === searchRunId).map(clone); }
  async updateExperimentScore(experimentId: string, input: { overallScore: number; rankEligible: boolean }) { const value = this.experiments.get(experimentId); if (!value) return undefined; const updated = { ...value, ...input }; this.experiments.set(experimentId, clone(updated)); return clone(updated); }
}

export function createInMemoryBacktestingDependencies(): BacktestingModuleDependencies {
  return { marketData: createMarketDataModule(), strategy: createStrategyModule(), evaluation: createEvaluationModule(), repository: new InMemoryBacktestingRepository(), clock: { now }, idGenerator: randomUUID };
}

export class BacktestingService implements BacktestLogApi {
  constructor(private readonly deps: BacktestingModuleDependencies) {}

  private id(): string { return (this.deps.idGenerator ?? randomUUID)(); }
  private now(): string { return this.deps.clock.now(); }
  private assertOwner(ownerUserId: string | undefined, actualOwnerUserId: string): void { if (ownerUserId && ownerUserId !== actualOwnerUserId) invalid("BACKTEST_ACCESS_DENIED"); }
  private async scope(scopeId: string): Promise<StoredBenchmarkScope> { const scope = await this.deps.repository.readScope(scopeId); if (!scope) throw new Error("BACKTEST_SCOPE_NOT_FOUND"); return scope; }
  private async candidate(candidateId: string, options?: BacktestReadOptions): Promise<StoredCandidate> { const candidate = await this.deps.repository.readCandidate(candidateId); if (!candidate) throw new Error("BACKTEST_CANDIDATE_NOT_FOUND"); this.assertOwner(options?.ownerUserId, candidate.ownerUserId); return candidate; }
  private async snapshot(snapshotId: string): Promise<{ snapshot: import("modules/market-data/api").DatasetSnapshotRef; candles: import("modules/market-data/api").Candle[] }> {
    const snapshot = await this.deps.repository.readInputSnapshot(snapshotId);
    if (!snapshot) throw new Error("BACKTEST_DATASET_NOT_FOUND");
    return snapshot;
  }
  private async captureSnapshot(snapshotId: string) {
    const first = await this.deps.marketData.readDatasetSnapshot({ snapshotId, limit: 1000 });
    const candles = [...first.candles];
    let cursor = first.nextCursor;
    while (cursor) {
      const page = await this.deps.marketData.readDatasetSnapshot({ snapshotId, cursor, limit: 1000 });
      candles.push(...page.candles);
      cursor = page.nextCursor;
    }
    await this.deps.repository.createInputSnapshot(first.snapshot, candles);
    return { snapshot: first.snapshot, candles };
  }
  private validateScope(command: CreateLeaderboardScopeCommand): void {
    if (!command.name.trim() || !command.scoreFormulaId.trim() || !Number.isFinite(command.initialCapital) || command.initialCapital <= 0 || !Number.isFinite(command.feeRatePercent) || command.feeRatePercent < 0 || !Number.isInteger(command.slippageBps) || command.slippageBps < 0) invalid("INVALID_BENCHMARK_SCOPE");
    if (!/^[a-f0-9]{64}$/i.test(command.workerRuntimeSha256) || !/^[a-f0-9]{64}$/i.test(command.evaluationRuntimeSha256)) invalid("INVALID_BENCHMARK_SCOPE");
  }

  async createBenchmarkScope(command: CreateLeaderboardScopeCommand, options: { scopeIdempotencyKey: string; ownerUserId: string }): Promise<BenchmarkScopeSummary> {
    if (!options.ownerUserId.trim() || !options.scopeIdempotencyKey.trim()) invalid("INVALID_BENCHMARK_SCOPE");
    const existing = await this.deps.repository.findScopeByIdempotency(options.ownerUserId, options.scopeIdempotencyKey);
    if (existing) return existing;
    this.validateScope(command);
    const captured = await this.captureSnapshot(command.datasetSnapshot.id);
    const createdAt = this.now();
    const scope: StoredBenchmarkScope = {
      id: this.id(), ownerUserId: options.ownerUserId, name: command.name, version: 1, datasetSnapshot: captured.snapshot, sentimentDatasetSnapshot: command.sentimentDatasetSnapshot,
      workerRuntimeVersion: command.workerRuntimeVersion, workerRuntimeSha256: command.workerRuntimeSha256, evaluationRuntimeVersion: command.evaluationRuntimeVersion, evaluationRuntimeSha256: command.evaluationRuntimeSha256,
      pair: captured.snapshot.pair, timeframe: captured.snapshot.timeframe, datasetRange: captured.snapshot.range, datasetSnapshotId: captured.snapshot.id, datasetSnapshotSha256: captured.snapshot.sha256,
      initialCapital: command.initialCapital, feeRatePercent: command.feeRatePercent, slippageBps: command.slippageBps, riskPolicy: command.riskPolicy, decimalPolicyId: "MVP_DECIMAL_HALF_UP_V1", evaluationPolicyId: "MVP_EVALUATION_V1", scoreFormulaId: command.scoreFormulaId, createdAt,
    };
    return this.deps.repository.createScope(scope, options.scopeIdempotencyKey);
  }
  async readBenchmarkScope(scopeId: string, options?: BacktestReadOptions): Promise<BenchmarkScopeSummary> { const scope = await this.scope(scopeId); this.assertOwner(options?.ownerUserId, scope.ownerUserId); return scope; }

  private async compositeStrategy(definitions: StrategyDefinition[], composite: CompositeStrategyDefinition): Promise<Strategy> {
    const byId = new Map(definitions.map((definition) => [definition.id, definition]));
    if (composite.components.length === 0 || composite.components.some((component) => !byId.has(component.strategyDefinitionId))) invalid("INVALID_COMPOSITE_STRATEGY");
    const resolved = await Promise.all(definitions.map(async (definition) => [definition.id, await this.deps.strategy.resolveStrategy(definition)] as const));
    const strategies = new Map(resolved);
    return { name: `composite:${composite.id}`, category: "TREND", analyze: (context) => this.deps.strategy.combineSignals(composite, composite.components.map((component) => ({ strategyDefinitionId: component.strategyDefinitionId, signal: strategies.get(component.strategyDefinitionId)!.analyze(context) }))) };
  }
  private candidateRecord(input: { ownerUserId: string; scope: StoredBenchmarkScope; command: StartManualBacktestCommand | SubmitSearchCandidateCommand; origin: "MANUAL" | "SEARCH"; candidateId: string; queueJobId: string }): StoredCandidate {
    const createdAt = this.now(); const search = input.origin === "SEARCH" ? input.command as SubmitSearchCandidateCommand : undefined;
    if (!Number.isInteger(input.command.maxAttempts) || input.command.maxAttempts < 1) invalid("INVALID_BACKTEST_SUBMISSION");
    return { candidateId: input.candidateId, ownerUserId: input.ownerUserId, origin: input.origin, selectionMode: "COMPOSITE", searchRunId: search?.searchRunId, iterationNumber: search?.iterationNumber, leaderboardScopeId: input.scope.id, status: "CREATED", attempts: [], maxAttempts: input.command.maxAttempts, completionAttemptCount: 0, completionMaxAttempts: 1, strategyDefinitions: clone(input.command.strategyDefinitions), compositeDefinition: clone(input.command.compositeDefinition), queueJobId: input.queueJobId, createdAt, updatedAt: createdAt };
  }
  private async execute(candidate: StoredCandidate, scope: StoredBenchmarkScope): Promise<BacktestSubmissionAccepted> {
    const startedAt = this.now(); const attemptId = this.id();
    const attempt: BacktestAttemptAudit = { attemptId, attemptNumber: 1, candidateId: candidate.candidateId, queueJobId: candidate.queueJobId, workerRuntimeVersion: BACKTEST_RUNTIME_VERSION, workerRuntimeSha256: BACKTEST_RUNTIME_SHA256, status: "RUNNING", startedAt, tradeCount: 0, auditOnly: false };
    candidate.status = "BACKTESTING"; candidate.activeAttemptNumber = 1; candidate.attempts = [{ attemptId, attemptNumber: 1, status: "RUNNING", startedAt }]; candidate.updatedAt = startedAt;
    await this.deps.repository.updateCandidate(candidate); await this.deps.repository.createAttempt(attempt);
    try {
      const input = await this.snapshot(scope.datasetSnapshotId);
      const strategy = await this.compositeStrategy(candidate.strategyDefinitions, candidate.compositeDefinition);
      const completedAt = this.now();
      const result = simulateBacktest({ candidateId: candidate.candidateId, attemptId, pair: scope.pair, settlementAsset: scope.datasetSnapshot.pairMetadata.settlementAsset || scope.datasetSnapshot.pairMetadata.quoteAsset || "USDT", timeframe: scope.timeframe, candles: input.candles, strategy, initialCapital: scope.initialCapital, feeRatePercent: scope.feeRatePercent, slippageBps: scope.slippageBps, stopLossPercent: scope.riskPolicy?.stopLossPercent, takeProfitPercent: scope.riskPolicy?.takeProfitPercent, workerRuntimeVersion: BACKTEST_RUNTIME_VERSION, workerRuntimeSha256: BACKTEST_RUNTIME_SHA256, startedAt, completedAt });
      const metrics = this.deps.evaluation.evaluator.evaluate(result);
      attempt.status = "COMPLETED"; attempt.completedAt = completedAt; attempt.tradeCount = result.trades.length;
      candidate.status = "COMPLETED"; candidate.activeAttemptNumber = undefined; candidate.completionAttemptCount = 1; candidate.updatedAt = completedAt;
      const experimentId = this.id(); candidate.experimentResultId = experimentId;
      candidate.attempts = [{ attemptId, attemptNumber: 1, status: "COMPLETED", startedAt, completedAt }];
      const experiment: StoredExperiment = { id: experimentId, ownerUserId: candidate.ownerUserId, candidateId: candidate.candidateId, searchRunId: candidate.searchRunId, leaderboardScopeId: scope.id, scoreFormulaId: scope.scoreFormulaId, overallScore: 0, rankEligible: metrics.numberOfTrades > 0, backtestAttemptId: attemptId, compositeDefinitionId: candidate.compositeDefinition.id, compositeDefinition: candidate.compositeDefinition, datasetSnapshot: scope.datasetSnapshot, sentimentDatasetSnapshot: scope.sentimentDatasetSnapshot, strategyDefinitions: candidate.strategyDefinitions, metrics, trades: result.trades, createdAt: completedAt };
      await this.deps.repository.completeAttempt({ candidate, attempt, result, metrics, experiment });
      return { candidateId: candidate.candidateId, jobId: candidate.queueJobId, status: candidate.status };
    } catch (error) {
      const completedAt = this.now(); const message = error instanceof Error ? error.message : "BACKTEST_EXECUTION_FAILED";
      attempt.status = "FAILED"; attempt.completedAt = completedAt; attempt.failureCategory = "INFRASTRUCTURE"; attempt.failureCode = message; attempt.errorMessage = message;
      candidate.status = "FAILED"; candidate.failureKind = "INFRASTRUCTURE"; candidate.failureCode = message; candidate.lastError = message; candidate.activeAttemptNumber = undefined; candidate.updatedAt = completedAt; candidate.attempts = [{ attemptId, attemptNumber: 1, status: "FAILED", startedAt, completedAt, failureCategory: "INFRASTRUCTURE", failureCode: message, errorMessage: message }];
      await this.deps.repository.updateAttempt(attempt); await this.deps.repository.updateCandidate(candidate);
      throw error;
    }
  }
  private async submit(command: StartManualBacktestCommand | SubmitSearchCandidateCommand, input: { ownerUserId: string; origin: "MANUAL" | "SEARCH"; submissionIdempotencyKey?: string }): Promise<BacktestSubmissionAccepted> {
    if (input.submissionIdempotencyKey) { const existing = await this.deps.repository.findCandidateBySubmission(input.ownerUserId, input.submissionIdempotencyKey); if (existing) return { candidateId: existing.candidateId, jobId: existing.queueJobId, status: existing.status }; }
    const scope = await this.scope(command.leaderboardScopeId); this.assertOwner(input.ownerUserId, scope.ownerUserId);
    const candidateId = this.id(); const candidate = this.candidateRecord({ ownerUserId: input.ownerUserId, scope, command, origin: input.origin, candidateId, queueJobId: `inline-${candidateId}` });
    await this.deps.repository.createCandidate(candidate, input.submissionIdempotencyKey);
    return this.execute(candidate, scope);
  }

  async startManual(command: StartManualBacktestCommand, options: { ownerUserId: string; submissionIdempotencyKey?: string }): Promise<BacktestSubmissionAccepted> { if (!options.ownerUserId.trim()) invalid("INVALID_BACKTEST_SUBMISSION"); return this.submit(command, { ownerUserId: options.ownerUserId, origin: "MANUAL", submissionIdempotencyKey: options.submissionIdempotencyKey }); }
  async submitSearchCandidate(command: SubmitSearchCandidateCommand): Promise<BacktestSubmissionAccepted> { const scope = await this.scope(command.leaderboardScopeId); return this.submit(command, { ownerUserId: scope.ownerUserId, origin: "SEARCH" }); }
  async status(candidateId: string, options?: BacktestReadOptions): Promise<CandidateProgress> { const candidate = await this.candidate(candidateId, options); return { ...candidate, attempts: await this.deps.repository.listAttempts(candidateId) }; }
  async summarizeSearchCandidates(searchRunId: string): Promise<SearchCandidateSummary> { const candidates = await this.deps.repository.listCandidatesBySearchRun(searchRunId); const active = candidates.filter((candidate) => !terminal(candidate.status)); const attempts = candidates.flatMap((candidate) => candidate.attempts); const failed = candidates.filter((candidate) => candidate.status === "FAILED"); return { searchRunId, active, queuedCount: candidates.filter((candidate) => candidate.status === "QUEUED").length, runningCount: candidates.filter((candidate) => candidate.status === "BACKTESTING").length, candidatesTested: candidates.length, failedCandidateCount: failed.length, retryExhaustedCandidateCount: failed.filter((candidate) => candidate.failureKind === "RETRY_EXHAUSTED").length, infrastructureFailureCandidateCount: failed.filter((candidate) => candidate.failureKind === "INFRASTRUCTURE").length, completionProcessingFailureCandidateCount: failed.filter((candidate) => candidate.failureKind === "COMPLETION_PROCESSING").length, failedAttemptCount: attempts.filter((attempt) => attempt.status === "FAILED").length, averageBacktestDurationMs: null }; }
  async listSearchCandidates(searchRunId: string, page: SearchCandidatePageRequest): Promise<SearchCandidatePage> { if (!Number.isInteger(page.limit) || page.limit < 1) invalid("INVALID_PAGE"); const items = (await this.deps.repository.listCandidatesBySearchRun(searchRunId)).sort((left, right) => left.createdAt.localeCompare(right.createdAt)); const offset = page.cursor ? Number(page.cursor) : 0; if (!Number.isInteger(offset) || offset < 0) invalid("INVALID_PAGE"); const selected = items.slice(offset, offset + page.limit); return { items: selected, nextCursor: offset + page.limit < items.length ? String(offset + page.limit) : undefined }; }
  async cancelSearchCandidates(searchRunId: string): Promise<{ candidateIds: string[] }> { const candidates = await this.deps.repository.listCandidatesBySearchRun(searchRunId); const cancelled: string[] = []; for (const candidate of candidates) if (!terminal(candidate.status)) { candidate.status = "CANCELLED"; candidate.updatedAt = this.now(); await this.deps.repository.updateCandidate(candidate); cancelled.push(candidate.candidateId); } return { candidateIds: cancelled }; }
  async cancelManualCandidate(candidateId: string): Promise<void> { const candidate = await this.candidate(candidateId); if (!terminal(candidate.status)) { candidate.status = "CANCELLED"; candidate.updatedAt = this.now(); await this.deps.repository.updateCandidate(candidate); } }
  async removePendingJobs(_candidateIds: string[]): Promise<void> { /* Inline execution has no pending queue jobs. */ }
  async readAttempt(attemptId: string, options?: BacktestReadOptions): Promise<BacktestAttemptAudit> { const attempt = await this.deps.repository.readAttempt(attemptId); if (!attempt) throw new Error("BACKTEST_ATTEMPT_NOT_FOUND"); await this.candidate(attempt.candidateId, options); return attempt; }
  async listAttemptTrades(attemptId: string, page: TradePageRequest, options?: BacktestReadOptions): Promise<TradePage> { await this.readAttempt(attemptId, options); return this.pageTrades(await this.deps.repository.listTrades(attemptId), page); }
  async readExperimentSummary(experimentId: string, options?: BacktestReadOptions): Promise<ExperimentResultSummary> { const experiment = await this.deps.repository.readExperiment(experimentId); if (!experiment) throw new Error("EXPERIMENT_NOT_FOUND"); this.assertOwner(options?.ownerUserId, experiment.ownerUserId); return experiment; }
  async listSearchExperimentSummaries(searchRunId: string, options?: BacktestReadOptions): Promise<ExperimentResultSummary[]> { const experiments = await this.deps.repository.listExperimentsBySearchRun(searchRunId); if (options?.ownerUserId) experiments.forEach((experiment) => this.assertOwner(options.ownerUserId, experiment.ownerUserId)); return experiments; }
  async scoreExperiment(experimentId: string, input: { overallScore: number; rankEligible: boolean }, options?: BacktestReadOptions): Promise<ExperimentResultSummary> { if (!Number.isFinite(input.overallScore)) invalid("INVALID_SCORE"); await this.readExperimentSummary(experimentId, options); const updated = await this.deps.repository.updateExperimentScore(experimentId, input); if (!updated) throw new Error("EXPERIMENT_NOT_FOUND"); return updated; }
  async listExperimentTrades(experimentId: string, page: TradePageRequest, options?: BacktestReadOptions): Promise<TradePage> { const experiment = await this.readExperimentSummary(experimentId, options); return this.pageTrades(experiment.trades, page); }
  private pageTrades(trades: Trade[], page: TradePageRequest): TradePage { if (!Number.isInteger(page.limit) || page.limit < 1) invalid("INVALID_PAGE"); const offset = page.cursor ? Number(page.cursor) : 0; if (!Number.isInteger(offset) || offset < 0) invalid("INVALID_PAGE"); const items = trades.slice(offset, offset + page.limit); return { items, nextCursor: offset + page.limit < trades.length ? String(offset + page.limit) : undefined }; }
  async verifyReplay(experimentId: string, options?: BacktestReadOptions): Promise<ReplayVerificationResult> { const experiment = await this.readExperimentSummary(experimentId, options); const candidate = await this.candidate(experiment.candidateId, options); const scope = await this.scope(experiment.leaderboardScopeId); const attempt = await this.readAttempt(experiment.backtestAttemptId, options); const snapshot = await this.snapshot(scope.datasetSnapshotId); const strategy = await this.compositeStrategy(candidate.strategyDefinitions, candidate.compositeDefinition); const replay = simulateBacktest({ candidateId: candidate.candidateId, attemptId: attempt.attemptId, pair: scope.pair, settlementAsset: scope.datasetSnapshot.pairMetadata.settlementAsset || scope.datasetSnapshot.pairMetadata.quoteAsset || "USDT", timeframe: scope.timeframe, candles: snapshot.candles, strategy, initialCapital: scope.initialCapital, feeRatePercent: scope.feeRatePercent, slippageBps: scope.slippageBps, stopLossPercent: scope.riskPolicy?.stopLossPercent, takeProfitPercent: scope.riskPolicy?.takeProfitPercent, workerRuntimeVersion: attempt.workerRuntimeVersion, workerRuntimeSha256: attempt.workerRuntimeSha256, startedAt: attempt.startedAt, completedAt: attempt.completedAt ?? attempt.startedAt }); const matches = JSON.stringify(replay.trades) === JSON.stringify(experiment.trades); return { experimentId, sourceAttemptId: attempt.attemptId, status: matches ? "MATCH" : "MISMATCH", comparedTradeCount: Math.max(replay.trades.length, experiment.trades.length), mismatches: matches ? [] : [{ fieldPath: "trades", expected: JSON.stringify(experiment.trades), actual: JSON.stringify(replay.trades) }] }; }
}

export function createBacktestingService(dependencies: BacktestingModuleDependencies = createInMemoryBacktestingDependencies()): BacktestLogApi { return new BacktestingService(dependencies); }
