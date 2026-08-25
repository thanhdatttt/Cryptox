"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BacktestingService = exports.InMemoryBacktestingRepository = exports.InMemoryBacktestQueue = exports.BACKTEST_RUNTIME_SHA256 = exports.BACKTEST_RUNTIME_VERSION = void 0;
exports.createInMemoryBacktestingDependencies = createInMemoryBacktestingDependencies;
exports.createBacktestingService = createBacktestingService;
const node_crypto_1 = require("node:crypto");
const bootstrap_1 = require("../../evaluation/api/bootstrap");
const bootstrap_2 = require("../../market-data/api/bootstrap");
const bootstrap_3 = require("../../strategy/api/bootstrap");
const simulator_1 = require("../domain/simulator");
exports.BACKTEST_RUNTIME_VERSION = "1.0.0";
exports.BACKTEST_RUNTIME_SHA256 = "c7d208d3db06e01df73733b91ed928fbd78d06f0d6d978f5821547c8ee6af75b";
const now = () => new Date().toISOString();
const clone = (value) => JSON.parse(JSON.stringify(value));
const invalid = (code) => { throw new Error(code); };
const terminal = (status) => ["COMPLETED", "FAILED", "CANCELLED"].includes(status);
const plusSeconds = (value, seconds) => new Date(Date.parse(value) + seconds * 1000).toISOString();
const attemptProgress = (attempt) => ({ attemptId: attempt.attemptId, attemptNumber: attempt.attemptNumber, status: attempt.status, startedAt: attempt.startedAt, completedAt: attempt.completedAt, deliveryAttemptCount: attempt.deliveryAttemptCount, failureCategory: attempt.failureCategory, failureCode: attempt.failureCode, errorMessage: attempt.errorMessage });
class InMemoryBacktestQueue {
    jobs = new Map();
    async enqueue(job) { if (!this.jobs.has(job.jobId))
        this.jobs.set(job.jobId, clone(job)); }
    async remove(jobId) { this.jobs.delete(jobId); }
}
exports.InMemoryBacktestQueue = InMemoryBacktestQueue;
class InMemoryBacktestingRepository {
    snapshots = new Map();
    scopes = new Map();
    scopeIdempotency = new Map();
    candidates = new Map();
    candidateIdempotency = new Map();
    attempts = new Map();
    trades = new Map();
    experiments = new Map();
    dispatches = new Map();
    async createInputSnapshot(snapshot, candles) { if (!this.snapshots.has(snapshot.id))
        this.snapshots.set(snapshot.id, { snapshot: clone(snapshot), candles: clone(candles) }); }
    async readInputSnapshot(snapshotId) { const value = this.snapshots.get(snapshotId); return value ? clone(value) : undefined; }
    async createScope(scope, idempotencyKey) { this.scopes.set(scope.id, clone(scope)); this.scopeIdempotency.set(`${scope.ownerUserId}|${idempotencyKey}`, scope.id); return clone(scope); }
    async findScopeByIdempotency(ownerUserId, idempotencyKey) { const id = this.scopeIdempotency.get(`${ownerUserId}|${idempotencyKey}`); const value = id ? this.scopes.get(id) : undefined; return value ? clone(value) : undefined; }
    async readScope(scopeId) { const value = this.scopes.get(scopeId); return value ? clone(value) : undefined; }
    async createCandidate(candidate, key) { this.candidates.set(candidate.candidateId, clone(candidate)); if (key)
        this.candidateIdempotency.set(`${candidate.ownerUserId}|${key}`, candidate.candidateId); return clone(candidate); }
    async createQueuedSubmission(input) {
        if (input.submissionIdempotencyKey) {
            const existing = await this.findCandidateBySubmission(input.candidate.ownerUserId, input.submissionIdempotencyKey);
            if (existing)
                return existing;
        }
        await this.createCandidate(input.candidate, input.submissionIdempotencyKey);
        this.dispatches.set(input.dispatch.job.jobId, clone(input.dispatch));
        return clone(input.candidate);
    }
    async findCandidateBySubmission(ownerUserId, key) { const id = this.candidateIdempotency.get(`${ownerUserId}|${key}`); const value = id ? this.candidates.get(id) : undefined; return value ? clone(value) : undefined; }
    async readCandidate(candidateId) { const value = this.candidates.get(candidateId); return value ? clone(value) : undefined; }
    async updateCandidate(candidate) { this.candidates.set(candidate.candidateId, clone(candidate)); }
    async readDispatch(jobId) { const value = this.dispatches.get(jobId); return value ? clone(value) : undefined; }
    async listPendingDispatches(limit) { return [...this.dispatches.values()].filter((item) => item.state === "PENDING").sort((left, right) => left.createdAt.localeCompare(right.createdAt)).slice(0, limit).map(clone); }
    async markDispatchDispatched(jobId, dispatchedAt) { const item = this.dispatches.get(jobId); if (item && item.state !== "CANCELLED")
        this.dispatches.set(jobId, { ...item, state: "DISPATCHED", dispatchAttempts: item.dispatchAttempts + 1, dispatchedAt, lastError: undefined, updatedAt: dispatchedAt }); }
    async markDispatchFailed(jobId, error, at) { const item = this.dispatches.get(jobId); if (item && item.state !== "CANCELLED")
        this.dispatches.set(jobId, { ...item, state: "PENDING", dispatchAttempts: item.dispatchAttempts + 1, lastError: error, updatedAt: at }); }
    async markDispatchCancelled(jobId, at) { const item = this.dispatches.get(jobId); if (item)
        this.dispatches.set(jobId, { ...item, state: "CANCELLED", updatedAt: at }); }
    async listCandidatesBySearchRun(searchRunId) { return [...this.candidates.values()].filter((candidate) => candidate.searchRunId === searchRunId).map(clone); }
    async createAttempt(attempt) { this.attempts.set(attempt.attemptId, clone(attempt)); }
    async updateAttempt(attempt) { this.attempts.set(attempt.attemptId, clone(attempt)); }
    async readAttempt(attemptId) { const value = this.attempts.get(attemptId); return value ? clone(value) : undefined; }
    async listAttempts(candidateId) { return [...this.attempts.values()].filter((attempt) => attempt.candidateId === candidateId).sort((left, right) => left.attemptNumber - right.attemptNumber).map(attemptProgress); }
    async claimWorkerAttempt(input) {
        const candidate = this.candidates.get(input.candidateId);
        if (!candidate || candidate.queueJobId !== input.queueJobId || terminal(candidate.status) || candidate.status === "PROCESSING_RESULT" || candidate.status === "TERMINAL_FAILURE_PENDING")
            return undefined;
        const leaseActive = candidate.status === "BACKTESTING" && candidate.activeLeaseExpiresAt && Date.parse(candidate.activeLeaseExpiresAt) > Date.parse(input.now);
        if (leaseActive || !["QUEUED", "RETRY_WAIT", "BACKTESTING"].includes(candidate.status))
            return undefined;
        const attempt = this.attempts.get(input.attemptId) ?? { attemptId: input.attemptId, candidateId: candidate.candidateId, queueJobId: input.queueJobId, attemptNumber: input.deliveryAttempt, workerRuntimeVersion: input.workerRuntimeVersion, workerRuntimeSha256: input.workerRuntimeSha256, status: "QUEUED", startedAt: input.now, tradeCount: 0, auditOnly: false };
        const claimed = { ...attempt, status: "RUNNING", startedAt: attempt.startedAt || input.now, completedAt: undefined, deliveryAttemptCount: input.deliveryAttempt, fenceToken: input.fenceToken, leaseExpiresAt: input.leaseExpiresAt, failureCategory: undefined, failureCode: undefined, errorMessage: undefined };
        const updated = { ...candidate, status: "BACKTESTING", activeAttemptNumber: input.deliveryAttempt, executionGeneration: (candidate.executionGeneration ?? 0) + 1, activeFenceToken: input.fenceToken, activeLeaseExpiresAt: input.leaseExpiresAt, updatedAt: input.now };
        this.attempts.set(claimed.attemptId, clone(claimed));
        this.candidates.set(updated.candidateId, clone(updated));
        return { candidate: clone(updated), attempt: clone(claimed), fenceToken: input.fenceToken };
    }
    async failWorkerAttempt(input) {
        const candidate = this.candidates.get(input.candidate.candidateId);
        const attempt = this.attempts.get(input.attempt.attemptId);
        if (!candidate || !attempt || candidate.activeFenceToken !== input.fenceToken || attempt.fenceToken !== input.fenceToken)
            throw new Error("BACKTEST_FENCE_LOST");
        const failed = { ...attempt, status: "FAILED", completedAt: input.now, failureCategory: input.retrying ? "RETRYABLE" : "INFRASTRUCTURE", failureCode: input.error, errorMessage: input.error, leaseExpiresAt: undefined };
        const updated = { ...candidate, status: input.retrying ? "RETRY_WAIT" : "TERMINAL_FAILURE_PENDING", activeAttemptNumber: undefined, activeFenceToken: undefined, activeLeaseExpiresAt: undefined, failureKind: input.retrying ? undefined : "RETRY_EXHAUSTED", failureCode: input.error, lastError: input.error, updatedAt: input.now };
        this.attempts.set(failed.attemptId, clone(failed));
        this.candidates.set(updated.candidateId, clone(updated));
    }
    async completeAttempt(input) {
        const storedCandidate = this.candidates.get(input.candidate.candidateId);
        const storedAttempt = this.attempts.get(input.attempt.attemptId);
        if (input.fenceToken && (!storedCandidate || !storedAttempt || storedCandidate.activeFenceToken !== input.fenceToken || storedAttempt.fenceToken !== input.fenceToken))
            throw new Error("BACKTEST_FENCE_LOST");
        this.candidates.set(input.candidate.candidateId, clone(input.candidate));
        this.attempts.set(input.attempt.attemptId, clone(input.attempt));
        this.trades.set(input.attempt.attemptId, clone(input.result.trades));
        this.experiments.set(input.experiment.id, clone(input.experiment));
    }
    async listTrades(attemptId) { return clone(this.trades.get(attemptId) ?? []); }
    async readExperiment(experimentId) { const value = this.experiments.get(experimentId); return value ? clone(value) : undefined; }
    async findExperimentByCandidate(candidateId) { const value = [...this.experiments.values()].find((experiment) => experiment.candidateId === candidateId); return value ? clone(value) : undefined; }
    async listExperimentsBySearchRun(searchRunId) { return [...this.experiments.values()].filter((experiment) => experiment.searchRunId === searchRunId).map(clone); }
    async updateExperimentScore(experimentId, input) { const value = this.experiments.get(experimentId); if (!value)
        return undefined; const updated = { ...value, ...input }; this.experiments.set(experimentId, clone(updated)); return clone(updated); }
}
exports.InMemoryBacktestingRepository = InMemoryBacktestingRepository;
function createInMemoryBacktestingDependencies() { return { marketData: (0, bootstrap_2.createMarketDataModule)(), strategy: (0, bootstrap_3.createStrategyModule)(), evaluation: (0, bootstrap_1.createEvaluationModule)(), repository: new InMemoryBacktestingRepository(), queue: new InMemoryBacktestQueue(), clock: { now }, idGenerator: node_crypto_1.randomUUID }; }
class BacktestingService {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    id() { return (this.deps.idGenerator ?? node_crypto_1.randomUUID)(); }
    now() { return this.deps.clock.now(); }
    assertOwner(ownerUserId, actualOwnerUserId) { if (ownerUserId && ownerUserId !== actualOwnerUserId)
        invalid("BACKTEST_ACCESS_DENIED"); }
    async scope(scopeId) { const scope = await this.deps.repository.readScope(scopeId); if (!scope)
        throw new Error("BACKTEST_SCOPE_NOT_FOUND"); return scope; }
    async candidate(candidateId, options) { const candidate = await this.deps.repository.readCandidate(candidateId); if (!candidate)
        throw new Error("BACKTEST_CANDIDATE_NOT_FOUND"); this.assertOwner(options?.ownerUserId, candidate.ownerUserId); return candidate; }
    async snapshot(snapshotId) { const snapshot = await this.deps.repository.readInputSnapshot(snapshotId); if (!snapshot)
        throw new Error("BACKTEST_DATASET_NOT_FOUND"); return snapshot; }
    async captureSnapshot(snapshotId) { const first = await this.deps.marketData.readDatasetSnapshot({ snapshotId, limit: 1000 }); const candles = [...first.candles]; let cursor = first.nextCursor; while (cursor) {
        const page = await this.deps.marketData.readDatasetSnapshot({ snapshotId, cursor, limit: 1000 });
        candles.push(...page.candles);
        cursor = page.nextCursor;
    } await this.deps.repository.createInputSnapshot(first.snapshot, candles); return { snapshot: first.snapshot, candles }; }
    validateScope(command) { if (!command.name.trim() || !command.scoreFormulaId.trim() || !Number.isFinite(command.initialCapital) || command.initialCapital <= 0 || !Number.isFinite(command.feeRatePercent) || command.feeRatePercent < 0 || !Number.isInteger(command.slippageBps) || command.slippageBps < 0)
        invalid("INVALID_BENCHMARK_SCOPE"); if (!/^[a-f0-9]{64}$/i.test(command.workerRuntimeSha256) || !/^[a-f0-9]{64}$/i.test(command.evaluationRuntimeSha256))
        invalid("INVALID_BENCHMARK_SCOPE"); }
    async createBenchmarkScope(command, options) { if (!options.ownerUserId.trim() || !options.scopeIdempotencyKey.trim())
        invalid("INVALID_BENCHMARK_SCOPE"); const existing = await this.deps.repository.findScopeByIdempotency(options.ownerUserId, options.scopeIdempotencyKey); if (existing)
        return existing; this.validateScope(command); const captured = await this.captureSnapshot(command.datasetSnapshot.id); const createdAt = this.now(); const scope = { id: this.id(), ownerUserId: options.ownerUserId, name: command.name, version: 1, datasetSnapshot: captured.snapshot, sentimentDatasetSnapshot: command.sentimentDatasetSnapshot, workerRuntimeVersion: command.workerRuntimeVersion, workerRuntimeSha256: command.workerRuntimeSha256, evaluationRuntimeVersion: command.evaluationRuntimeVersion, evaluationRuntimeSha256: command.evaluationRuntimeSha256, pair: captured.snapshot.pair, timeframe: captured.snapshot.timeframe, datasetRange: captured.snapshot.range, datasetSnapshotId: captured.snapshot.id, datasetSnapshotSha256: captured.snapshot.sha256, initialCapital: command.initialCapital, feeRatePercent: command.feeRatePercent, slippageBps: command.slippageBps, riskPolicy: command.riskPolicy, decimalPolicyId: "MVP_DECIMAL_HALF_UP_V1", evaluationPolicyId: "MVP_EVALUATION_V1", scoreFormulaId: command.scoreFormulaId, createdAt }; return this.deps.repository.createScope(scope, options.scopeIdempotencyKey); }
    async readBenchmarkScope(scopeId, options) { const scope = await this.scope(scopeId); this.assertOwner(options?.ownerUserId, scope.ownerUserId); return scope; }
    async compositeStrategy(definitions, composite) { const byId = new Map(definitions.map((definition) => [definition.id, definition])); if (composite.components.length === 0 || composite.components.some((component) => !byId.has(component.strategyDefinitionId)))
        invalid("INVALID_COMPOSITE_STRATEGY"); const resolved = await Promise.all(definitions.map(async (definition) => [definition.id, await this.deps.strategy.resolveStrategy(definition)])); const strategies = new Map(resolved); return { name: `composite:${composite.id}`, category: "TREND", analyze: (context) => this.deps.strategy.combineSignals(composite, composite.components.map((component) => ({ strategyDefinitionId: component.strategyDefinitionId, signal: strategies.get(component.strategyDefinitionId).analyze(context) }))) }; }
    candidateRecord(input) { const createdAt = this.now(); const search = input.origin === "SEARCH" ? input.command : undefined; if (!Number.isInteger(input.command.maxAttempts) || input.command.maxAttempts < 1)
        invalid("INVALID_BACKTEST_SUBMISSION"); return { candidateId: input.candidateId, ownerUserId: input.ownerUserId, origin: input.origin, selectionMode: "COMPOSITE", searchRunId: search?.searchRunId, iterationNumber: search?.iterationNumber, leaderboardScopeId: input.scope.id, status: "QUEUED", attempts: [], maxAttempts: input.command.maxAttempts, completionAttemptCount: 0, completionMaxAttempts: 1, executionGeneration: 0, strategyDefinitions: clone(input.command.strategyDefinitions), compositeDefinition: clone(input.command.compositeDefinition), queueJobId: input.candidateId, createdAt, updatedAt: createdAt }; }
    dispatchRecord(candidate, scope) { const createdAt = this.now(); return { job: { schemaVersion: 1, jobId: candidate.candidateId, candidateId: candidate.candidateId, leaderboardScopeId: scope.id, maxAttempts: candidate.maxAttempts, workerRuntimeVersion: scope.workerRuntimeVersion, workerRuntimeSha256: scope.workerRuntimeSha256, enqueuedAt: createdAt }, state: "PENDING", dispatchAttempts: 0, createdAt, updatedAt: createdAt }; }
    async dispatchOne(dispatch) { if (dispatch.state === "CANCELLED")
        return false; try {
        await this.deps.queue.enqueue(dispatch.job);
        await this.deps.repository.markDispatchDispatched(dispatch.job.jobId, this.now());
        return true;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "BACKTEST_QUEUE_DISPATCH_FAILED";
        await this.deps.repository.markDispatchFailed(dispatch.job.jobId, message, this.now());
        return false;
    } }
    async reconcileQueue(limit = 100) { if (!Number.isInteger(limit) || limit < 1)
        invalid("INVALID_QUEUE_RECOVERY_LIMIT"); const pending = await this.deps.repository.listPendingDispatches(limit); let dispatched = 0; for (const item of pending)
        if (await this.dispatchOne(item))
            dispatched += 1; return { dispatched, pending: pending.length - dispatched }; }
    async submit(command, input) { if (input.submissionIdempotencyKey) {
        const existing = await this.deps.repository.findCandidateBySubmission(input.ownerUserId, input.submissionIdempotencyKey);
        if (existing)
            return { candidateId: existing.candidateId, jobId: existing.queueJobId, status: existing.status };
    } const scope = await this.scope(command.leaderboardScopeId); this.assertOwner(input.ownerUserId, scope.ownerUserId); const candidate = this.candidateRecord({ ownerUserId: input.ownerUserId, scope, command, origin: input.origin, candidateId: this.id() }); const dispatch = this.dispatchRecord(candidate, scope); const saved = await this.deps.repository.createQueuedSubmission({ candidate, dispatch, submissionIdempotencyKey: input.submissionIdempotencyKey }); await this.dispatchOne(dispatch); return { candidateId: saved.candidateId, jobId: saved.queueJobId, status: saved.status }; }
    async startManual(command, options) { if (!options.ownerUserId.trim())
        invalid("INVALID_BACKTEST_SUBMISSION"); return this.submit(command, { ownerUserId: options.ownerUserId, origin: "MANUAL", submissionIdempotencyKey: options.submissionIdempotencyKey }); }
    async submitSearchCandidate(command) { const scope = await this.scope(command.leaderboardScopeId); return this.submit(command, { ownerUserId: scope.ownerUserId, origin: "SEARCH" }); }
    async processQueueJob(job, delivery) { if (job.schemaVersion !== 1 || job.jobId !== job.candidateId || !Number.isInteger(delivery.attemptNumber) || delivery.attemptNumber < 1 || delivery.attemptNumber > job.maxAttempts)
        throw new Error("INVALID_BACKTEST_QUEUE_JOB"); const startedAt = this.now(); const fenceToken = delivery.fenceToken ?? this.id(); const claim = await this.deps.repository.claimWorkerAttempt({ candidateId: job.candidateId, queueJobId: job.jobId, deliveryAttempt: delivery.attemptNumber, attemptId: `${job.candidateId}:attempt:${delivery.attemptNumber}`, fenceToken, now: startedAt, leaseExpiresAt: plusSeconds(startedAt, 60), workerRuntimeVersion: job.workerRuntimeVersion, workerRuntimeSha256: job.workerRuntimeSha256 }); if (!claim) {
        const candidate = await this.deps.repository.readCandidate(job.candidateId);
        return { candidateId: job.candidateId, status: "IGNORED", reason: candidate?.status === "CANCELLED" ? "CANCELLED" : terminal(candidate?.status ?? "FAILED") ? "ALREADY_TERMINAL" : "SUPERSEDED" };
    } return this.runClaimedAttempt(claim, job); }
    async runClaimedAttempt(claim, job) { const { candidate, attempt, fenceToken } = claim; try {
        const scope = await this.scope(candidate.leaderboardScopeId);
        const input = await this.snapshot(scope.datasetSnapshotId);
        const strategy = await this.compositeStrategy(candidate.strategyDefinitions, candidate.compositeDefinition);
        const completedAt = this.now();
        const result = (0, simulator_1.simulateBacktest)({ candidateId: candidate.candidateId, attemptId: attempt.attemptId, pair: scope.pair, settlementAsset: scope.datasetSnapshot.pairMetadata.settlementAsset || scope.datasetSnapshot.pairMetadata.quoteAsset || "USDT", timeframe: scope.timeframe, candles: input.candles, strategy, initialCapital: scope.initialCapital, feeRatePercent: scope.feeRatePercent, slippageBps: scope.slippageBps, stopLossPercent: scope.riskPolicy?.stopLossPercent, takeProfitPercent: scope.riskPolicy?.takeProfitPercent, workerRuntimeVersion: job.workerRuntimeVersion, workerRuntimeSha256: job.workerRuntimeSha256, startedAt: attempt.startedAt, completedAt });
        const metrics = this.deps.evaluation.evaluator.evaluate(result);
        const completedAttempt = { ...attempt, status: "COMPLETED", completedAt, tradeCount: result.trades.length, leaseExpiresAt: undefined };
        const experimentId = this.id();
        const completedCandidate = { ...candidate, status: "COMPLETED", activeAttemptNumber: undefined, activeFenceToken: undefined, activeLeaseExpiresAt: undefined, completionAttemptCount: 1, experimentResultId: experimentId, updatedAt: completedAt };
        const experiment = { id: experimentId, ownerUserId: candidate.ownerUserId, candidateId: candidate.candidateId, searchRunId: candidate.searchRunId, leaderboardScopeId: scope.id, scoreFormulaId: scope.scoreFormulaId, overallScore: 0, rankEligible: metrics.numberOfTrades > 0, backtestAttemptId: attempt.attemptId, compositeDefinitionId: candidate.compositeDefinition.id, compositeDefinition: candidate.compositeDefinition, datasetSnapshot: scope.datasetSnapshot, sentimentDatasetSnapshot: scope.sentimentDatasetSnapshot, strategyDefinitions: candidate.strategyDefinitions, metrics, trades: result.trades, createdAt: completedAt };
        await this.deps.repository.completeAttempt({ candidate: completedCandidate, attempt: completedAttempt, result, metrics, experiment, fenceToken });
        return { candidateId: candidate.candidateId, status: "COMPLETED", attemptId: attempt.attemptId, completedAt };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "BACKTEST_EXECUTION_FAILED";
        const retrying = attempt.attemptNumber < job.maxAttempts;
        await this.deps.repository.failWorkerAttempt({ candidate, attempt, fenceToken, retrying, now: this.now(), error: message });
        throw error;
    } }
    async status(candidateId, options) { const candidate = await this.candidate(candidateId, options); return { ...candidate, attempts: await this.deps.repository.listAttempts(candidateId) }; }
    async summarizeSearchCandidates(searchRunId) { const candidates = await this.deps.repository.listCandidatesBySearchRun(searchRunId); const active = candidates.filter((candidate) => !terminal(candidate.status)); const attempts = (await Promise.all(candidates.map((candidate) => this.deps.repository.listAttempts(candidate.candidateId)))).flat(); const failed = candidates.filter((candidate) => candidate.status === "FAILED" || candidate.status === "TERMINAL_FAILURE_PENDING"); return { searchRunId, active, queuedCount: candidates.filter((candidate) => candidate.status === "QUEUED").length, runningCount: candidates.filter((candidate) => ["BACKTESTING", "RETRY_WAIT", "PROCESSING_RESULT"].includes(candidate.status)).length, candidatesTested: candidates.length, failedCandidateCount: failed.length, retryExhaustedCandidateCount: failed.filter((candidate) => candidate.failureKind === "RETRY_EXHAUSTED").length, infrastructureFailureCandidateCount: failed.filter((candidate) => candidate.failureKind === "INFRASTRUCTURE").length, completionProcessingFailureCandidateCount: failed.filter((candidate) => candidate.failureKind === "COMPLETION_PROCESSING").length, failedAttemptCount: attempts.filter((attempt) => attempt.status === "FAILED").length, averageBacktestDurationMs: null }; }
    async listSearchCandidates(searchRunId, page) { if (!Number.isInteger(page.limit) || page.limit < 1)
        invalid("INVALID_PAGE"); const items = (await this.deps.repository.listCandidatesBySearchRun(searchRunId)).sort((left, right) => left.createdAt.localeCompare(right.createdAt)); const offset = page.cursor ? Number(page.cursor) : 0; if (!Number.isInteger(offset) || offset < 0)
        invalid("INVALID_PAGE"); const selected = items.slice(offset, offset + page.limit); return { items: selected, nextCursor: offset + page.limit < items.length ? String(offset + page.limit) : undefined }; }
    async cancelSearchCandidates(searchRunId) { const candidates = await this.deps.repository.listCandidatesBySearchRun(searchRunId); const cancelled = []; for (const candidate of candidates)
        if (!terminal(candidate.status)) {
            candidate.status = "CANCELLED";
            candidate.activeFenceToken = undefined;
            candidate.activeLeaseExpiresAt = undefined;
            candidate.updatedAt = this.now();
            await this.deps.repository.updateCandidate(candidate);
            await this.deps.repository.markDispatchCancelled(candidate.queueJobId, candidate.updatedAt);
            cancelled.push(candidate.candidateId);
        } return { candidateIds: cancelled }; }
    async cancelManualCandidate(candidateId) { const candidate = await this.candidate(candidateId); if (!terminal(candidate.status)) {
        candidate.status = "CANCELLED";
        candidate.activeFenceToken = undefined;
        candidate.activeLeaseExpiresAt = undefined;
        candidate.updatedAt = this.now();
        await this.deps.repository.updateCandidate(candidate);
        await this.deps.repository.markDispatchCancelled(candidate.queueJobId, candidate.updatedAt);
    } }
    async removePendingJobs(candidateIds) { for (const candidateId of candidateIds) {
        const candidate = await this.deps.repository.readCandidate(candidateId);
        if (!candidate)
            continue;
        try {
            await this.deps.queue.remove(candidate.queueJobId);
        }
        finally {
            await this.deps.repository.markDispatchCancelled(candidate.queueJobId, this.now());
        }
    } }
    async readAttempt(attemptId, options) { const attempt = await this.deps.repository.readAttempt(attemptId); if (!attempt)
        throw new Error("BACKTEST_ATTEMPT_NOT_FOUND"); await this.candidate(attempt.candidateId, options); return attempt; }
    async listAttemptTrades(attemptId, page, options) { await this.readAttempt(attemptId, options); return this.pageTrades(await this.deps.repository.listTrades(attemptId), page); }
    async readExperimentSummary(experimentId, options) { const experiment = await this.deps.repository.readExperiment(experimentId); if (!experiment)
        throw new Error("EXPERIMENT_NOT_FOUND"); this.assertOwner(options?.ownerUserId, experiment.ownerUserId); return experiment; }
    async listSearchExperimentSummaries(searchRunId, options) { const experiments = await this.deps.repository.listExperimentsBySearchRun(searchRunId); if (options?.ownerUserId)
        experiments.forEach((experiment) => this.assertOwner(options.ownerUserId, experiment.ownerUserId)); return experiments; }
    async scoreExperiment(experimentId, input, options) { if (!Number.isFinite(input.overallScore))
        invalid("INVALID_SCORE"); await this.readExperimentSummary(experimentId, options); const updated = await this.deps.repository.updateExperimentScore(experimentId, input); if (!updated)
        throw new Error("EXPERIMENT_NOT_FOUND"); return updated; }
    async listExperimentTrades(experimentId, page, options) { const experiment = await this.readExperimentSummary(experimentId, options); return this.pageTrades(experiment.trades, page); }
    pageTrades(trades, page) { if (!Number.isInteger(page.limit) || page.limit < 1)
        invalid("INVALID_PAGE"); const offset = page.cursor ? Number(page.cursor) : 0; if (!Number.isInteger(offset) || offset < 0)
        invalid("INVALID_PAGE"); const items = trades.slice(offset, offset + page.limit); return { items, nextCursor: offset + page.limit < trades.length ? String(offset + page.limit) : undefined }; }
    async verifyReplay(experimentId, options) { const experiment = await this.readExperimentSummary(experimentId, options); const candidate = await this.candidate(experiment.candidateId, options); const scope = await this.scope(experiment.leaderboardScopeId); const attempt = await this.readAttempt(experiment.backtestAttemptId, options); const snapshot = await this.snapshot(scope.datasetSnapshotId); const strategy = await this.compositeStrategy(candidate.strategyDefinitions, candidate.compositeDefinition); const replay = (0, simulator_1.simulateBacktest)({ candidateId: candidate.candidateId, attemptId: attempt.attemptId, pair: scope.pair, settlementAsset: scope.datasetSnapshot.pairMetadata.settlementAsset || scope.datasetSnapshot.pairMetadata.quoteAsset || "USDT", timeframe: scope.timeframe, candles: snapshot.candles, strategy, initialCapital: scope.initialCapital, feeRatePercent: scope.feeRatePercent, slippageBps: scope.slippageBps, stopLossPercent: scope.riskPolicy?.stopLossPercent, takeProfitPercent: scope.riskPolicy?.takeProfitPercent, workerRuntimeVersion: attempt.workerRuntimeVersion, workerRuntimeSha256: attempt.workerRuntimeSha256, startedAt: attempt.startedAt, completedAt: attempt.completedAt ?? attempt.startedAt }); const matches = JSON.stringify(replay.trades) === JSON.stringify(experiment.trades); return { experimentId, sourceAttemptId: attempt.attemptId, status: matches ? "MATCH" : "MISMATCH", comparedTradeCount: Math.max(replay.trades.length, experiment.trades.length), mismatches: matches ? [] : [{ fieldPath: "trades", expected: JSON.stringify(experiment.trades), actual: JSON.stringify(replay.trades) }] }; }
}
exports.BacktestingService = BacktestingService;
function createBacktestingService(dependencies = createInMemoryBacktestingDependencies()) { return new BacktestingService(dependencies); }
