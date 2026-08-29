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
    async createInputSnapshot(snapshot, candles) { const existing = [...this.snapshots.values()].find((entry) => entry.snapshot.id === snapshot.id || entry.snapshot.sha256 === snapshot.sha256); if (existing)
        return clone(existing.snapshot); this.snapshots.set(snapshot.id, { snapshot: clone(snapshot), candles: clone(candles) }); return clone(snapshot); }
    async readInputSnapshot(snapshotId) { const value = this.snapshots.get(snapshotId); return value ? clone(value) : undefined; }
    async createScope(scope, idempotencyKey) { this.scopes.set(scope.id, clone(scope)); this.scopeIdempotency.set(`${scope.ownerUserId}|${idempotencyKey}`, scope.id); return clone(scope); }
    async findScopeByIdempotency(ownerUserId, idempotencyKey) { const id = this.scopeIdempotency.get(`${ownerUserId}|${idempotencyKey}`); const value = id ? this.scopes.get(id) : undefined; return value ? clone(value) : undefined; }
    async readScope(scopeId, ownerUserId) { const value = this.scopes.get(scopeId); return value && (!ownerUserId || value.ownerUserId === ownerUserId) ? clone(value) : undefined; }
    async listScopesByOwner(ownerUserId) { return [...this.scopes.values()].filter((scope) => scope.ownerUserId === ownerUserId).sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)).map(clone); }
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
    async readCandidate(candidateId, ownerUserId) { const value = this.candidates.get(candidateId); return value && (!ownerUserId || value.ownerUserId === ownerUserId) ? clone(value) : undefined; }
    async updateCandidate(candidate, unitOfWork) {
        const previous = this.candidates.get(candidate.candidateId);
        this.candidates.set(candidate.candidateId, clone(candidate));
        unitOfWork?.onRollback(async () => { if (previous)
            this.candidates.set(candidate.candidateId, previous);
        else
            this.candidates.delete(candidate.candidateId); });
    }
    async readDispatch(jobId) { const value = this.dispatches.get(jobId); return value ? clone(value) : undefined; }
    async listPendingDispatches(limit) { return [...this.dispatches.values()].filter((item) => item.state === "PENDING").sort((left, right) => left.createdAt.localeCompare(right.createdAt)).slice(0, limit).map(clone); }
    async listQueueRecoveryCandidates(limit) { return [...this.candidates.values()].filter((candidate) => ["QUEUED", "BACKTESTING", "RETRY_WAIT"].includes(candidate.status)).sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)).slice(0, limit).map((candidate) => candidate.candidateId); }
    async markDispatchDispatched(jobId, dispatchedAt) { const item = this.dispatches.get(jobId); if (item && item.state !== "CANCELLED")
        this.dispatches.set(jobId, { ...item, state: "DISPATCHED", dispatchAttempts: item.dispatchAttempts + 1, dispatchedAt, lastError: undefined, updatedAt: dispatchedAt }); }
    async markDispatchFailed(jobId, error, at) { const item = this.dispatches.get(jobId); if (item && item.state !== "CANCELLED")
        this.dispatches.set(jobId, { ...item, state: "PENDING", dispatchAttempts: item.dispatchAttempts + 1, lastError: error, updatedAt: at }); }
    async markDispatchCancelled(jobId, at, unitOfWork) {
        const previous = this.dispatches.get(jobId);
        if (previous)
            this.dispatches.set(jobId, { ...previous, state: "CANCELLED", updatedAt: at });
        unitOfWork?.onRollback(async () => { if (previous)
            this.dispatches.set(jobId, previous);
        else
            this.dispatches.delete(jobId); });
    }
    async listCandidatesBySearchRun(searchRunId, ownerUserId) { return [...this.candidates.values()].filter((candidate) => candidate.searchRunId === searchRunId && (!ownerUserId || candidate.ownerUserId === ownerUserId)).map(clone); }
    async createAttempt(attempt) { this.attempts.set(attempt.attemptId, clone(attempt)); }
    async updateAttempt(attempt) { this.attempts.set(attempt.attemptId, clone(attempt)); }
    async readAttempt(attemptId, ownerUserId) { const value = this.attempts.get(attemptId); if (!value)
        return undefined; const candidate = this.candidates.get(value.candidateId); return candidate && (!ownerUserId || candidate.ownerUserId === ownerUserId) ? clone(value) : undefined; }
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
    async repairTerminalQueueFailure(input) {
        const candidate = this.candidates.get(input.candidateId);
        if (!candidate || terminal(candidate.status) || candidate.status === "TERMINAL_FAILURE_PENDING")
            return;
        for (const [attemptId, attempt] of this.attempts)
            if (attempt.candidateId === input.candidateId && attempt.status === "RUNNING")
                this.attempts.set(attemptId, { ...attempt, status: "FAILED", completedAt: input.now, leaseExpiresAt: undefined, failureCategory: "INFRASTRUCTURE", failureCode: input.error, errorMessage: input.error });
        this.candidates.set(candidate.candidateId, clone({ ...candidate, status: "TERMINAL_FAILURE_PENDING", activeAttemptNumber: undefined, activeFenceToken: undefined, activeLeaseExpiresAt: undefined, failureKind: "INFRASTRUCTURE", failureCode: input.error, lastError: input.error, updatedAt: input.now }));
    }
    async persistWorkerSuccess(input) {
        const candidate = this.candidates.get(input.candidate.candidateId);
        const attempt = this.attempts.get(input.attempt.attemptId);
        if (!candidate || !attempt || candidate.activeFenceToken !== input.fenceToken || attempt.fenceToken !== input.fenceToken)
            throw new Error("BACKTEST_FENCE_LOST");
        const completedAttempt = { ...attempt, status: "COMPLETED", completedAt: input.result.completedAt, tradeCount: input.result.trades.length, leaseExpiresAt: undefined };
        const pending = { ...candidate, status: "PROCESSING_RESULT", activeAttemptNumber: undefined, activeFenceToken: undefined, activeLeaseExpiresAt: undefined, completionNextRetryAt: input.result.completedAt, updatedAt: input.result.completedAt };
        this.attempts.set(completedAttempt.attemptId, clone(completedAttempt));
        this.trades.set(completedAttempt.attemptId, clone(input.result.trades));
        this.candidates.set(pending.candidateId, clone(pending));
    }
    async claimCompletion(input) {
        const candidate = this.candidates.get(input.candidateId);
        if (!candidate || !["PROCESSING_RESULT", "TERMINAL_FAILURE_PENDING"].includes(candidate.status))
            return undefined;
        if (candidate.completionNextRetryAt && Date.parse(candidate.completionNextRetryAt) > Date.parse(input.now))
            return undefined;
        if (candidate.activeCompletionLeaseExpiresAt && Date.parse(candidate.activeCompletionLeaseExpiresAt) > Date.parse(input.now))
            return undefined;
        if (candidate.completionAttemptCount >= candidate.completionMaxAttempts)
            return undefined;
        const claimed = { ...candidate, completionAttemptCount: candidate.completionAttemptCount + 1, completionGeneration: (candidate.completionGeneration ?? 0) + 1, activeCompletionClaimToken: input.claimToken, activeCompletionLeaseExpiresAt: input.leaseExpiresAt, completionNextRetryAt: undefined, updatedAt: input.now };
        this.candidates.set(claimed.candidateId, clone(claimed));
        return { candidate: clone(claimed), claimToken: input.claimToken };
    }
    async listDueCompletions(nowValue, limit) {
        return [...this.candidates.values()].filter((candidate) => ["PROCESSING_RESULT", "TERMINAL_FAILURE_PENDING"].includes(candidate.status) && (!candidate.completionNextRetryAt || Date.parse(candidate.completionNextRetryAt) <= Date.parse(nowValue)) && (!candidate.activeCompletionLeaseExpiresAt || Date.parse(candidate.activeCompletionLeaseExpiresAt) <= Date.parse(nowValue))).sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)).slice(0, limit).map((candidate) => candidate.candidateId);
    }
    async readLatestCompletedAttempt(candidateId) {
        const attempts = [...this.attempts.values()].filter((attempt) => attempt.candidateId === candidateId && attempt.status === "COMPLETED").sort((left, right) => right.attemptNumber - left.attemptNumber);
        return attempts[0] ? clone(attempts[0]) : undefined;
    }
    async stageCompletionExperiment(experiment) {
        const existing = [...this.experiments.values()].find((value) => value.candidateId === experiment.candidateId);
        if (existing)
            return clone(existing);
        this.experiments.set(experiment.id, clone(experiment));
        return clone(experiment);
    }
    async finalizeCompletion(input) {
        const candidate = this.candidates.get(input.candidate.candidateId);
        if (!candidate || candidate.status !== "PROCESSING_RESULT" || candidate.activeCompletionClaimToken !== input.claimToken)
            throw new Error("BACKTEST_COMPLETION_FENCE_LOST");
        const completed = { ...candidate, status: "COMPLETED", experimentResultId: input.experimentId, activeCompletionClaimToken: undefined, activeCompletionLeaseExpiresAt: undefined, completionNextRetryAt: undefined, updatedAt: input.now };
        this.candidates.set(completed.candidateId, clone(completed));
    }
    async finalizeTerminalFailure(input) {
        const candidate = this.candidates.get(input.candidate.candidateId);
        if (!candidate || candidate.status !== "TERMINAL_FAILURE_PENDING" || candidate.activeCompletionClaimToken !== input.claimToken)
            throw new Error("BACKTEST_COMPLETION_FENCE_LOST");
        this.candidates.set(candidate.candidateId, clone({ ...candidate, status: "FAILED", activeCompletionClaimToken: undefined, activeCompletionLeaseExpiresAt: undefined, completionNextRetryAt: undefined, updatedAt: input.now }));
    }
    async failCompletion(input) {
        const candidate = this.candidates.get(input.candidate.candidateId);
        if (!candidate || candidate.activeCompletionClaimToken !== input.claimToken)
            throw new Error("BACKTEST_COMPLETION_FENCE_LOST");
        const exhausted = candidate.completionAttemptCount >= candidate.completionMaxAttempts;
        this.candidates.set(candidate.candidateId, clone({ ...candidate, status: exhausted ? "FAILED" : "PROCESSING_RESULT", activeCompletionClaimToken: undefined, activeCompletionLeaseExpiresAt: undefined, completionNextRetryAt: exhausted ? undefined : input.retryAt, failureKind: exhausted ? "COMPLETION_PROCESSING" : candidate.failureKind, failureCode: exhausted ? "COMPLETION_PROCESSING_FAILED" : candidate.failureCode, lastError: input.error, updatedAt: input.now }));
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
    async readExperiment(experimentId, ownerUserId) { const value = this.experiments.get(experimentId); return value && (!ownerUserId || value.ownerUserId === ownerUserId) ? clone(value) : undefined; }
    async findExperimentByCandidate(candidateId) { const value = [...this.experiments.values()].find((experiment) => experiment.candidateId === candidateId); return value ? clone(value) : undefined; }
    async listExperimentsBySearchRun(searchRunId, ownerUserId) { return [...this.experiments.values()].filter((experiment) => experiment.searchRunId === searchRunId && (!ownerUserId || experiment.ownerUserId === ownerUserId)).map(clone); }
    async updateExperimentScore(experimentId, input, ownerUserId) { const value = this.experiments.get(experimentId); if (!value || (ownerUserId && value.ownerUserId !== ownerUserId))
        return undefined; const updated = { ...value, ...input }; this.experiments.set(experimentId, clone(updated)); return clone(updated); }
}
exports.InMemoryBacktestingRepository = InMemoryBacktestingRepository;
function createInMemoryBacktestingDependencies() { return { marketData: (0, bootstrap_2.createMarketDataModule)(), strategy: (0, bootstrap_3.createStrategyModule)(), evaluation: (0, bootstrap_1.createEvaluationModule)(), repository: new InMemoryBacktestingRepository(), queue: new InMemoryBacktestQueue(), completion: { score: async (_scopeId, metrics) => ({ scoreFormulaId: "MVP_MANUAL_V1", overallScore: metrics.totalReturnPercent, rankEligible: metrics.numberOfTrades > 0 }), submit: async () => undefined }, clock: { now }, idGenerator: node_crypto_1.randomUUID }; }
class BacktestingService {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    id() { return (this.deps.idGenerator ?? node_crypto_1.randomUUID)(); }
    now() { return this.deps.clock.now(); }
    assertAuth(auth) { if (!auth?.userId?.trim())
        invalid("INVALID_AUTH_CONTEXT"); }
    progress(candidate, attempts) {
        const { ownerUserId: _ownerUserId, strategyDefinitions: _strategyDefinitions, compositeDefinition: _compositeDefinition, queueJobId: _queueJobId, executionGeneration: _executionGeneration, activeFenceToken: _activeFenceToken, activeLeaseExpiresAt: _activeLeaseExpiresAt, activeCompletionClaimToken: _activeCompletionClaimToken, activeCompletionLeaseExpiresAt: _activeCompletionLeaseExpiresAt, completionGeneration: _completionGeneration, ...projection } = candidate;
        return { ...clone(projection), attempts: clone(attempts) };
    }
    async scope(scopeId) { const scope = await this.deps.repository.readScope(scopeId); if (!scope)
        throw new Error("BACKTEST_SCOPE_NOT_FOUND"); return scope; }
    async ownedScope(auth, scopeId) { this.assertAuth(auth); const scope = await this.deps.repository.readScope(scopeId, auth.userId); if (!scope)
        throw new Error("BACKTEST_SCOPE_NOT_FOUND"); return scope; }
    async candidate(candidateId) { const candidate = await this.deps.repository.readCandidate(candidateId); if (!candidate)
        throw new Error("BACKTEST_CANDIDATE_NOT_FOUND"); return candidate; }
    async ownedCandidate(auth, candidateId) { this.assertAuth(auth); const candidate = await this.deps.repository.readCandidate(candidateId, auth.userId); if (!candidate)
        throw new Error("BACKTEST_CANDIDATE_NOT_FOUND"); return candidate; }
    async ownedSearchCandidates(auth, searchRunId) {
        this.assertAuth(auth);
        const candidates = await this.deps.repository.listCandidatesBySearchRun(searchRunId, auth.userId);
        if (candidates.length > 0)
            return candidates;
        const anyOwnerCandidates = await this.deps.repository.listCandidatesBySearchRun(searchRunId);
        if (anyOwnerCandidates.length > 0)
            throw new Error("BACKTEST_SEARCH_RUN_NOT_FOUND");
        return [];
    }
    async validateStrategyReferences(ownerUserId, command) {
        const requestedIds = command.strategyDefinitions.map((definition) => definition.id);
        if (requestedIds.length === 0 || new Set(requestedIds).size !== requestedIds.length)
            invalid("STRATEGY_DEFINITION_NOT_FOUND");
        const definitions = await this.deps.strategy.readDefinitions(ownerUserId, requestedIds);
        if (definitions.length !== requestedIds.length)
            invalid("STRATEGY_DEFINITION_NOT_FOUND");
        const composite = await this.deps.strategy.readComposite(ownerUserId, command.compositeDefinition.id).catch(() => invalid("COMPOSITE_STRATEGY_NOT_FOUND"));
        const componentIds = composite.components.map((component) => component.strategyDefinitionId);
        if (componentIds.length !== requestedIds.length || new Set(componentIds).size !== componentIds.length || componentIds.some((id) => !requestedIds.includes(id)))
            invalid("STRATEGY_DEFINITION_MISMATCH");
        const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
        return { strategyDefinitions: componentIds.map((id) => definitionsById.get(id)), compositeDefinition: clone(composite) };
    }
    async snapshot(snapshotId) { const snapshot = await this.deps.repository.readInputSnapshot(snapshotId); if (!snapshot)
        throw new Error("BACKTEST_DATASET_NOT_FOUND"); return snapshot; }
    async captureSnapshot(snapshotId) { const first = await this.deps.marketData.readDatasetSnapshot({ snapshotId, limit: 1000 }); const candles = [...first.candles]; let cursor = first.nextCursor; while (cursor) {
        const page = await this.deps.marketData.readDatasetSnapshot({ snapshotId, cursor, limit: 1000 });
        candles.push(...page.candles);
        cursor = page.nextCursor;
    } const snapshot = await this.deps.repository.createInputSnapshot(first.snapshot, candles); return { snapshot, candles }; }
    validateScope(command) { if (!command.name.trim() || !command.scoreFormulaId.trim() || !Number.isFinite(command.initialCapital) || command.initialCapital <= 0 || !Number.isFinite(command.feeRatePercent) || command.feeRatePercent < 0 || !Number.isInteger(command.slippageBps) || command.slippageBps < 0)
        invalid("INVALID_BENCHMARK_SCOPE"); if (!/^[a-f0-9]{64}$/i.test(command.workerRuntimeSha256) || !/^[a-f0-9]{64}$/i.test(command.evaluationRuntimeSha256))
        invalid("INVALID_BENCHMARK_SCOPE"); }
    async createBenchmarkScope(auth, command, options) { this.assertAuth(auth); if (!options.scopeIdempotencyKey.trim())
        invalid("INVALID_BENCHMARK_SCOPE"); const existing = await this.deps.repository.findScopeByIdempotency(auth.userId, options.scopeIdempotencyKey); if (existing)
        return existing; this.validateScope(command); const captured = await this.captureSnapshot(command.datasetSnapshot.id); const createdAt = this.now(); const scope = { id: this.id(), ownerUserId: auth.userId, name: command.name, version: 1, datasetSnapshot: captured.snapshot, sentimentDatasetSnapshot: command.sentimentDatasetSnapshot, workerRuntimeVersion: command.workerRuntimeVersion, workerRuntimeSha256: command.workerRuntimeSha256, evaluationRuntimeVersion: command.evaluationRuntimeVersion, evaluationRuntimeSha256: command.evaluationRuntimeSha256, pair: captured.snapshot.pair, timeframe: captured.snapshot.timeframe, datasetRange: captured.snapshot.range, datasetSnapshotId: captured.snapshot.id, datasetSnapshotSha256: captured.snapshot.sha256, initialCapital: command.initialCapital, feeRatePercent: command.feeRatePercent, slippageBps: command.slippageBps, riskPolicy: command.riskPolicy, decimalPolicyId: "MVP_DECIMAL_HALF_UP_V1", evaluationPolicyId: "MVP_EVALUATION_V1", scoreFormulaId: command.scoreFormulaId, createdAt }; return this.deps.repository.createScope(scope, options.scopeIdempotencyKey); }
    async readBenchmarkScope(auth, scopeId) { return this.ownedScope(auth, scopeId); }
    async listBenchmarkScopes(auth) { this.assertAuth(auth); return this.deps.repository.listScopesByOwner(auth.userId); }
    async compositeStrategy(definitions, composite) { const byId = new Map(definitions.map((definition) => [definition.id, definition])); if (composite.components.length === 0 || composite.components.some((component) => !byId.has(component.strategyDefinitionId)))
        invalid("INVALID_COMPOSITE_STRATEGY"); const resolved = await Promise.all(definitions.map(async (definition) => [definition.id, await this.deps.strategy.resolveStrategy(definition)])); const strategies = new Map(resolved); return { name: `composite:${composite.id}`, category: "TREND", analyze: (context) => this.deps.strategy.combineSignals(composite, composite.components.map((component) => ({ strategyDefinitionId: component.strategyDefinitionId, signal: strategies.get(component.strategyDefinitionId).analyze(context) }))) }; }
    candidateRecord(input) { const createdAt = this.now(); const search = input.origin === "SEARCH" ? input.command : undefined; if (!Number.isInteger(input.command.maxAttempts) || input.command.maxAttempts < 1)
        invalid("INVALID_BACKTEST_SUBMISSION"); const single = input.command.strategyDefinitions.length === 1 && input.command.compositeDefinition.components.length === 1 && input.command.compositeDefinition.components[0]?.strategyDefinitionId === input.command.strategyDefinitions[0]?.id && input.command.compositeDefinition.components[0]?.weight === 1; return { candidateId: input.candidateId, ownerUserId: input.ownerUserId, origin: input.origin, selectionMode: single ? "SINGLE" : "COMPOSITE", searchRunId: search?.searchRunId, iterationNumber: search?.iterationNumber, leaderboardScopeId: input.scope.id, status: "QUEUED", attempts: [], maxAttempts: input.command.maxAttempts, completionAttemptCount: 0, completionMaxAttempts: 5, executionGeneration: 0, completionGeneration: 0, strategyDefinitions: clone(input.command.strategyDefinitions), compositeDefinition: clone(input.command.compositeDefinition), queueJobId: input.candidateId, createdAt, updatedAt: createdAt }; }
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
    async listQueueRecoveryCandidates(limit = 100) { if (!Number.isInteger(limit) || limit < 1)
        invalid("INVALID_QUEUE_RECOVERY_LIMIT"); return this.deps.repository.listQueueRecoveryCandidates(limit); }
    async submit(command, input) { if (input.submissionIdempotencyKey) {
        const existing = await this.deps.repository.findCandidateBySubmission(input.ownerUserId, input.submissionIdempotencyKey);
        if (existing)
            return { candidateId: existing.candidateId, jobId: existing.queueJobId, status: existing.status };
    } const scope = await this.deps.repository.readScope(command.leaderboardScopeId, input.ownerUserId); if (!scope)
        throw new Error("BACKTEST_SCOPE_NOT_FOUND"); const references = await this.validateStrategyReferences(input.ownerUserId, command); const canonicalCommand = { ...command, strategyDefinitions: references.strategyDefinitions, compositeDefinition: references.compositeDefinition }; const candidate = this.candidateRecord({ ownerUserId: input.ownerUserId, scope, command: canonicalCommand, origin: input.origin, candidateId: this.id() }); const dispatch = this.dispatchRecord(candidate, scope); const saved = await this.deps.repository.createQueuedSubmission({ candidate, dispatch, submissionIdempotencyKey: input.submissionIdempotencyKey }); await this.dispatchOne(dispatch); return { candidateId: saved.candidateId, jobId: saved.queueJobId, status: saved.status }; }
    async startManual(auth, command, options) { this.assertAuth(auth); return this.submit(command, { ownerUserId: auth.userId, origin: "MANUAL", submissionIdempotencyKey: options?.submissionIdempotencyKey }); }
    async submitSearchCandidate(auth, command) { this.assertAuth(auth); return this.submit(command, { ownerUserId: auth.userId, origin: "SEARCH" }); }
    async processQueueJob(job, delivery) { if (job.schemaVersion !== 1 || job.jobId !== job.candidateId || !Number.isInteger(delivery.attemptNumber) || delivery.attemptNumber < 1 || delivery.attemptNumber > job.maxAttempts)
        throw new Error("INVALID_BACKTEST_QUEUE_JOB"); const startedAt = this.now(); const fenceToken = delivery.fenceToken ?? this.id(); const claim = await this.deps.repository.claimWorkerAttempt({ candidateId: job.candidateId, queueJobId: job.jobId, deliveryAttempt: delivery.attemptNumber, attemptId: `${job.candidateId}:attempt:${delivery.attemptNumber}`, fenceToken, now: startedAt, leaseExpiresAt: plusSeconds(startedAt, 60), workerRuntimeVersion: job.workerRuntimeVersion, workerRuntimeSha256: job.workerRuntimeSha256 }); if (!claim) {
        const candidate = await this.deps.repository.readCandidate(job.candidateId);
        return { candidateId: job.candidateId, status: "IGNORED", reason: candidate?.status === "CANCELLED" ? "CANCELLED" : terminal(candidate?.status ?? "FAILED") ? "ALREADY_TERMINAL" : "SUPERSEDED" };
    } return this.runClaimedAttempt(claim, job); }
    async runClaimedAttempt(claim, job) {
        const { candidate, attempt, fenceToken } = claim;
        try {
            const scope = await this.scope(candidate.leaderboardScopeId);
            const input = await this.snapshot(scope.datasetSnapshotId);
            const strategy = await this.compositeStrategy(candidate.strategyDefinitions, candidate.compositeDefinition);
            const completedAt = this.now();
            const result = (0, simulator_1.simulateBacktest)({ candidateId: candidate.candidateId, attemptId: attempt.attemptId, pair: scope.pair, settlementAsset: scope.datasetSnapshot.pairMetadata.settlementAsset || scope.datasetSnapshot.pairMetadata.quoteAsset || "USDT", timeframe: scope.timeframe, candles: input.candles, strategy, initialCapital: scope.initialCapital, feeRatePercent: scope.feeRatePercent, slippageBps: scope.slippageBps, stopLossPercent: scope.riskPolicy?.stopLossPercent, takeProfitPercent: scope.riskPolicy?.takeProfitPercent, workerRuntimeVersion: job.workerRuntimeVersion, workerRuntimeSha256: job.workerRuntimeSha256, startedAt: attempt.startedAt, completedAt });
            await this.deps.repository.persistWorkerSuccess({ candidate, attempt, result, fenceToken });
            return { candidateId: candidate.candidateId, status: "COMPLETED", attemptId: attempt.attemptId, completedAt };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "BACKTEST_EXECUTION_FAILED";
            const retrying = attempt.attemptNumber < job.maxAttempts;
            await this.deps.repository.failWorkerAttempt({ candidate, attempt, fenceToken, retrying, now: this.now(), error: message });
            throw error;
        }
    }
    async processCompletion(candidateId) {
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
                    try {
                        await this.deps.completion.notifySearchCandidateFinished?.(candidate.searchRunId);
                    }
                    catch { /* Search startup reconciliation recovers a lost callback. */ }
                }
                return { candidateId, status: "FAILED" };
            }
            const attempt = await this.deps.repository.readLatestCompletedAttempt(candidateId);
            if (!attempt)
                throw new Error("BACKTEST_COMPLETION_ATTEMPT_NOT_FOUND");
            const scope = await this.scope(candidate.leaderboardScopeId);
            const result = { status: "COMPLETED", candidateId, attemptId: attempt.attemptId, workerRuntimeVersion: attempt.workerRuntimeVersion, workerRuntimeSha256: attempt.workerRuntimeSha256, startedAt: attempt.startedAt, completedAt: attempt.completedAt ?? this.now(), trades: await this.deps.repository.listTrades(attempt.attemptId) };
            const metrics = this.deps.evaluation.evaluator.evaluate(result);
            const scored = await this.deps.completion.score(scope.id, metrics);
            const existing = await this.deps.repository.findExperimentByCandidate(candidateId);
            const experiment = existing ?? await this.deps.repository.stageCompletionExperiment({ id: this.id(), ownerUserId: candidate.ownerUserId, candidateId, searchRunId: candidate.searchRunId, leaderboardScopeId: scope.id, scoreFormulaId: scored.scoreFormulaId, overallScore: scored.overallScore, rankEligible: scored.rankEligible, backtestAttemptId: attempt.attemptId, compositeDefinitionId: candidate.compositeDefinition.id, compositeDefinition: candidate.compositeDefinition, datasetSnapshot: scope.datasetSnapshot, sentimentDatasetSnapshot: scope.sentimentDatasetSnapshot, strategyDefinitions: candidate.strategyDefinitions, metrics, trades: result.trades, createdAt: this.now() });
            await this.deps.completion.submit(experiment, { kind: "COMPLETION", id: `completion-${candidateId}-${candidate.completionAttemptCount}`, candidateId, completionAttemptCount: candidate.completionAttemptCount, completionClaimToken: claimToken, enlist: () => undefined });
            await this.deps.repository.finalizeCompletion({ candidate, experimentId: experiment.id, claimToken, now: this.now() });
            if (candidate.searchRunId) {
                try {
                    await this.deps.completion.notifySearchCandidateFinished?.(candidate.searchRunId);
                }
                catch { /* Search startup reconciliation recovers a lost callback. */ }
            }
            return { candidateId, status: "COMPLETED" };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "BACKTEST_COMPLETION_FAILED";
            await this.deps.repository.failCompletion({ candidate, claimToken, retryAt: plusSeconds(this.now(), 1), now: this.now(), error: message });
            throw error;
        }
    }
    async processQueueTerminalSignal(signal) {
        if (signal.schemaVersion !== 1 || !signal.jobId)
            invalid("INVALID_BACKTEST_QUEUE_SIGNAL");
        if (signal.status !== "COMPLETED")
            await this.deps.repository.repairTerminalQueueFailure({ candidateId: signal.jobId, error: signal.status === "RETRIES_EXHAUSTED" ? "BACKTEST_RETRIES_EXHAUSTED" : signal.failedReason, now: this.now() });
        return this.processCompletion(signal.jobId);
    }
    async reconcileCompletions(limit = 100) {
        if (!Number.isInteger(limit) || limit < 1)
            invalid("INVALID_COMPLETION_RECOVERY_LIMIT");
        const ids = await this.deps.repository.listDueCompletions(this.now(), limit);
        let processed = 0;
        for (const id of ids) {
            try {
                await this.processCompletion(id);
                processed += 1;
            }
            catch { /* durable retry state is written by processCompletion */ }
        }
        return { processed, pending: ids.length - processed };
    }
    async status(auth, candidateId) { const candidate = await this.ownedCandidate(auth, candidateId); return this.progress(candidate, await this.deps.repository.listAttempts(candidateId)); }
    async summarizeSearchCandidates(auth, searchRunId) { const candidates = await this.ownedSearchCandidates(auth, searchRunId); const attemptsByCandidate = await Promise.all(candidates.map(async (candidate) => [candidate, await this.deps.repository.listAttempts(candidate.candidateId)])); const active = attemptsByCandidate.filter(([candidate]) => !terminal(candidate.status)).map(([candidate, attempts]) => this.progress(candidate, attempts)); const attempts = attemptsByCandidate.flatMap(([, candidateAttempts]) => candidateAttempts); const failed = candidates.filter((candidate) => candidate.status === "FAILED" || candidate.status === "TERMINAL_FAILURE_PENDING"); return { searchRunId, active, queuedCount: candidates.filter((candidate) => candidate.status === "QUEUED").length, runningCount: candidates.filter((candidate) => ["BACKTESTING", "RETRY_WAIT", "PROCESSING_RESULT"].includes(candidate.status)).length, candidatesTested: candidates.length, failedCandidateCount: failed.length, retryExhaustedCandidateCount: failed.filter((candidate) => candidate.failureKind === "RETRY_EXHAUSTED").length, infrastructureFailureCandidateCount: failed.filter((candidate) => candidate.failureKind === "INFRASTRUCTURE").length, completionProcessingFailureCandidateCount: failed.filter((candidate) => candidate.failureKind === "COMPLETION_PROCESSING").length, failedAttemptCount: attempts.filter((attempt) => attempt.status === "FAILED").length, averageBacktestDurationMs: null }; }
    async listSearchCandidates(auth, searchRunId, page) { if (!Number.isInteger(page.limit) || page.limit < 1)
        invalid("INVALID_PAGE"); const items = (await this.ownedSearchCandidates(auth, searchRunId)).sort((left, right) => left.createdAt.localeCompare(right.createdAt)); const offset = page.cursor ? Number(page.cursor) : 0; if (!Number.isInteger(offset) || offset < 0)
        invalid("INVALID_PAGE"); const selected = items.slice(offset, offset + page.limit); return { items: await Promise.all(selected.map(async (candidate) => this.progress(candidate, await this.deps.repository.listAttempts(candidate.candidateId)))), nextCursor: offset + page.limit < items.length ? String(offset + page.limit) : undefined }; }
    async cancelSearchCandidates(auth, searchRunId, unitOfWork) { const candidates = await this.ownedSearchCandidates(auth, searchRunId); const cancelled = []; for (const candidate of candidates)
        if (!terminal(candidate.status)) {
            candidate.status = "CANCELLED";
            candidate.activeFenceToken = undefined;
            candidate.activeLeaseExpiresAt = undefined;
            candidate.updatedAt = this.now();
            await this.deps.repository.updateCandidate(candidate, unitOfWork);
            await this.deps.repository.markDispatchCancelled(candidate.queueJobId, candidate.updatedAt, unitOfWork);
            cancelled.push(candidate.candidateId);
        } return { candidateIds: cancelled }; }
    async cancelManualCandidate(auth, candidateId) { const candidate = await this.ownedCandidate(auth, candidateId); if (candidate.origin !== "MANUAL")
        invalid("BACKTEST_CANDIDATE_NOT_MANUAL"); if (!terminal(candidate.status)) {
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
    async readAttempt(auth, attemptId) { this.assertAuth(auth); const attempt = await this.deps.repository.readAttempt(attemptId, auth.userId); if (!attempt)
        throw new Error("BACKTEST_ATTEMPT_NOT_FOUND"); await this.ownedCandidate(auth, attempt.candidateId); return attempt; }
    async listAttemptTrades(auth, attemptId, page) { await this.readAttempt(auth, attemptId); return this.pageTrades(await this.deps.repository.listTrades(attemptId), page); }
    async readExperimentSummary(auth, experimentId) { this.assertAuth(auth); const experiment = await this.deps.repository.readExperiment(experimentId, auth.userId); if (!experiment)
        throw new Error("EXPERIMENT_NOT_FOUND"); return experiment; }
    async listSearchExperimentSummaries(auth, searchRunId) { this.assertAuth(auth); const experiments = await this.deps.repository.listExperimentsBySearchRun(searchRunId, auth.userId); if (experiments.length > 0)
        return experiments; const anyOwnerExperiments = await this.deps.repository.listExperimentsBySearchRun(searchRunId); if (anyOwnerExperiments.length > 0)
        throw new Error("BACKTEST_SEARCH_RUN_NOT_FOUND"); return []; }
    async scoreExperiment(auth, experimentId, input) { if (!Number.isFinite(input.overallScore))
        invalid("INVALID_SCORE"); await this.readExperimentSummary(auth, experimentId); const updated = await this.deps.repository.updateExperimentScore(experimentId, input, auth.userId); if (!updated)
        throw new Error("EXPERIMENT_NOT_FOUND"); return updated; }
    async listExperimentTrades(auth, experimentId, page) { const experiment = await this.readExperimentSummary(auth, experimentId); return this.pageTrades(experiment.trades, page); }
    async readExperimentVisualization(auth, experimentId, page) {
        if (!Number.isInteger(page.limit) || page.limit < 1)
            invalid("INVALID_VISUALIZATION_PAGE");
        const experiment = await this.readExperimentSummary(auth, experimentId);
        const input = await this.snapshot(experiment.datasetSnapshot.id);
        const from = page.from ?? input.snapshot.range.from;
        const to = page.to ?? input.snapshot.range.to;
        if (!Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to)) || Date.parse(from) < Date.parse(input.snapshot.range.from) || Date.parse(to) > Date.parse(input.snapshot.range.to) || Date.parse(from) >= Date.parse(to))
            invalid("INVALID_VISUALIZATION_PAGE");
        if (page.highlightTradeId && !experiment.trades.some((trade) => trade.id === page.highlightTradeId))
            invalid("TRADE_NOT_FOUND");
        const offset = page.cursor ? Number(page.cursor) : 0;
        if (!Number.isInteger(offset) || offset < 0)
            invalid("INVALID_VISUALIZATION_PAGE");
        const allCandles = input.candles.filter((candle) => candle.isClosed && candle.timestamp >= from && candle.timestamp < to);
        const candles = allCandles.slice(offset, offset + page.limit);
        const marker = (trade, kind, time, price) => ({ id: `${trade.id}:${kind}`, tradeId: trade.id, sequence: trade.sequence, kind, time, price, highlighted: trade.id === page.highlightTradeId });
        const order = { ENTRY: 0, STOP_LOSS: 1, TAKE_PROFIT: 2, EXIT: 3 };
        const markers = experiment.trades.flatMap((trade) => [marker(trade, "ENTRY", trade.entryTime, trade.entryPrice), ...(trade.stopLoss === null ? [] : [marker(trade, "STOP_LOSS", trade.entryTime, trade.stopLoss)]), ...(trade.takeProfit === null ? [] : [marker(trade, "TAKE_PROFIT", trade.entryTime, trade.takeProfit)]), marker(trade, "EXIT", trade.exitTime, trade.exitPrice)]).filter((item) => item.time >= from && item.time < to).sort((left, right) => left.time.localeCompare(right.time) || left.sequence - right.sequence || order[left.kind] - order[right.kind] || left.id.localeCompare(right.id));
        return { experimentId, datasetSnapshot: input.snapshot, candles, overlays: [], markers, nextCursor: offset + page.limit < allCandles.length ? String(offset + page.limit) : undefined };
    }
    pageTrades(trades, page) { if (!Number.isInteger(page.limit) || page.limit < 1)
        invalid("INVALID_PAGE"); const offset = page.cursor ? Number(page.cursor) : 0; if (!Number.isInteger(offset) || offset < 0)
        invalid("INVALID_PAGE"); const items = trades.slice(offset, offset + page.limit); return { items, nextCursor: offset + page.limit < trades.length ? String(offset + page.limit) : undefined }; }
    async verifyReplay(auth, experimentId) { const experiment = await this.readExperimentSummary(auth, experimentId); const candidate = await this.ownedCandidate(auth, experiment.candidateId); const scope = await this.ownedScope(auth, experiment.leaderboardScopeId); const attempt = await this.readAttempt(auth, experiment.backtestAttemptId); const snapshot = await this.snapshot(scope.datasetSnapshotId); const strategy = await this.compositeStrategy(candidate.strategyDefinitions, candidate.compositeDefinition); const replay = (0, simulator_1.simulateBacktest)({ candidateId: candidate.candidateId, attemptId: attempt.attemptId, pair: scope.pair, settlementAsset: scope.datasetSnapshot.pairMetadata.settlementAsset || scope.datasetSnapshot.pairMetadata.quoteAsset || "USDT", timeframe: scope.timeframe, candles: snapshot.candles, strategy, initialCapital: scope.initialCapital, feeRatePercent: scope.feeRatePercent, slippageBps: scope.slippageBps, stopLossPercent: scope.riskPolicy?.stopLossPercent, takeProfitPercent: scope.riskPolicy?.takeProfitPercent, workerRuntimeVersion: attempt.workerRuntimeVersion, workerRuntimeSha256: attempt.workerRuntimeSha256, startedAt: attempt.startedAt, completedAt: attempt.completedAt ?? attempt.startedAt }); const matches = JSON.stringify(replay.trades) === JSON.stringify(experiment.trades); return { experimentId, sourceAttemptId: attempt.attemptId, status: matches ? "MATCH" : "MISMATCH", comparedTradeCount: Math.max(replay.trades.length, experiment.trades.length), mismatches: matches ? [] : [{ fieldPath: "trades", expected: JSON.stringify(experiment.trades), actual: JSON.stringify(replay.trades) }] }; }
}
exports.BacktestingService = BacktestingService;
function createBacktestingService(dependencies = createInMemoryBacktestingDependencies()) { return new BacktestingService(dependencies); }
