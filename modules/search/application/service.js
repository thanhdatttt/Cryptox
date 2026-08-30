"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInMemorySearchDependencies = createInMemorySearchDependencies;
exports.createSearchModule = createSearchModule;
const inFlight = (status) => status.queuedCount + status.runningCount;
const validateStopCondition = (condition) => {
    const values = [condition.maxCandidates, condition.maxDurationSeconds, condition.noImprovementAfterIterations].filter((value) => value !== undefined);
    if (values.length === 0 || values.some((value) => !Number.isInteger(value) || value <= 0))
        throw new Error("INVALID_STOP_CONDITION");
};
const ownerOf = (definition) => definition.userId;
const validateSearchSpaceOwner = (ownerUserId, searchSpace) => {
    if (searchSpace.availableStrategies.some((definition) => ownerOf(definition) !== ownerUserId))
        throw new Error("INVALID_SEARCH_CONFIG");
};
const generators_1 = require("../domain/generators");
function createInMemorySearchDependencies() {
    const runs = new Map();
    const candidates = new Map();
    let sequence = 0;
    const beginCancellation = async () => {
        const rollbacks = [];
        let closed = false;
        return {
            kind: "CANCELLATION",
            id: `cancellation-${++sequence}`,
            run: async (operation) => operation(),
            onRollback: (operation) => { if (closed)
                throw new Error("CANCELLATION_UNIT_OF_WORK_CLOSED"); rollbacks.push(operation); },
            commit: async () => { closed = true; rollbacks.length = 0; },
            rollback: async () => { if (closed)
                return; closed = true; for (const operation of rollbacks.reverse())
                await operation(); rollbacks.length = 0; },
        };
    };
    return {
        searchRunRepository: {
            get: async (id) => runs.get(id),
            getByOwner: async (ownerUserId, id) => { const run = runs.get(id); return run?.ownerUserId === ownerUserId ? run : undefined; },
            getByOwnerForUpdate: async (ownerUserId, id) => { const run = runs.get(id); return run?.ownerUserId === ownerUserId ? run : undefined; },
            insert: async (run) => { runs.set(run.searchRunId, run); return run; },
            save: async (run, unitOfWork) => { const previous = runs.get(run.searchRunId); runs.set(run.searchRunId, run); unitOfWork?.onRollback(async () => { if (previous)
                runs.set(run.searchRunId, previous);
            else
                runs.delete(run.searchRunId); }); return run; },
            listRunning: async () => [...runs.values()].filter((run) => run.state === "RUNNING"),
            withRunLock: async (ownerUserId, id, operation) => operation(runs.get(id)?.ownerUserId === ownerUserId ? runs.get(id) : undefined),
        },
        generators: {
            ...(0, generators_1.createDefaultStrategyGenerators)(),
        },
        backtestCoordinator: {
            readBenchmarkScope: async (_auth, scopeId) => ({ id: scopeId }),
            submitSearchCandidate: async (_auth, command) => {
                const candidateId = `in-memory-search-candidate-${++sequence}`;
                candidates.set(candidateId, { candidateId, origin: "SEARCH", selectionMode: "COMPOSITE", searchRunId: command.searchRunId, iterationNumber: command.iterationNumber, leaderboardScopeId: command.leaderboardScopeId, status: "QUEUED", attempts: [], maxAttempts: command.maxAttempts, completionAttemptCount: 0, completionMaxAttempts: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                return { candidateId, jobId: candidateId, status: "QUEUED" };
            },
            summarizeSearchCandidates: async (_auth, searchRunId) => {
                const values = [...candidates.values()].filter((candidate) => candidate.searchRunId === searchRunId);
                return { searchRunId, active: values.filter((candidate) => !["COMPLETED", "FAILED", "CANCELLED"].includes(candidate.status)), queuedCount: values.filter((candidate) => candidate.status === "QUEUED").length, runningCount: values.filter((candidate) => ["BACKTESTING", "RETRY_WAIT", "PROCESSING_RESULT"].includes(candidate.status)).length, candidatesTested: values.filter((candidate) => candidate.status === "COMPLETED" || candidate.status === "FAILED").length, failedCandidateCount: values.filter((candidate) => candidate.status === "FAILED").length, retryExhaustedCandidateCount: 0, infrastructureFailureCandidateCount: 0, completionProcessingFailureCandidateCount: 0, failedAttemptCount: 0, averageBacktestDurationMs: null };
            },
            cancelSearchCandidates: async (_auth, searchRunId, _unitOfWork) => {
                const candidateIds = [...candidates.values()].filter((candidate) => candidate.searchRunId === searchRunId && !["COMPLETED", "FAILED", "CANCELLED"].includes(candidate.status)).map((candidate) => candidate.candidateId);
                for (const candidateId of candidateIds) {
                    const candidate = candidates.get(candidateId);
                    candidates.set(candidateId, { ...candidate, status: "CANCELLED", updatedAt: new Date().toISOString() });
                }
                return { candidateIds };
            },
            removePendingJobs: async () => undefined,
        },
        leaderboardService: { rankSearchRun: async () => [] },
        beginCancellation,
        clock: { now: () => new Date().toISOString() },
        idGenerator: () => `search-run-${++sequence}`,
    };
}
const createRun = (searchRunId, config, ownerUserId, now) => ({
    searchRunId, ownerUserId, state: "RUNNING", activeCandidates: [], queuedCount: 0, runningCount: 0, candidatesTested: 0, failedCandidateCount: 0, retryExhaustedCandidateCount: 0, infrastructureFailureCandidateCount: 0, completionProcessingFailureCandidateCount: 0, failedAttemptCount: 0, averageBacktestDurationMs: 0, createdAt: now, startedAt: now, updatedAt: now, stopCondition: config.stopCondition, searchSpace: config.searchSpace, generatorType: config.generatorType, leaderboardScopeId: config.leaderboardScopeId, maxInFlight: config.maxInFlight, nextIteration: 1, activeDurationMs: 0, activeSince: now,
});
function createSearchModule(dependencies = createInMemorySearchDependencies()) {
    const idGenerator = dependencies.idGenerator ?? (() => `search-run-${crypto.randomUUID()}`);
    const fills = new Map();
    const assertAuth = (auth) => { if (!auth?.userId?.trim())
        throw new Error("INVALID_AUTH_CONTEXT"); };
    const load = async (id) => {
        const run = await dependencies.searchRunRepository.get(id);
        if (!run)
            throw new Error("SEARCH_RUN_NOT_FOUND");
        return run;
    };
    const loadOwned = async (auth, id) => { assertAuth(auth); const run = await dependencies.searchRunRepository.getByOwner(auth.userId, id); if (!run)
        throw new Error("SEARCH_RUN_NOT_FOUND"); return run; };
    const authFor = (run) => ({ userId: run.ownerUserId });
    const project = async (run) => {
        const auth = authFor(run);
        const summary = await dependencies.backtestCoordinator.summarizeSearchCandidates(auth, run.searchRunId);
        const ranking = await dependencies.leaderboardService.rankSearchRun(run.ownerUserId, run.searchRunId);
        return { ...run, ...summary, activeCandidates: summary.active, averageBacktestDurationMs: summary.averageBacktestDurationMs ?? 0, currentTopEntry: ranking[0] };
    };
    const refresh = async (run) => {
        const projection = await project(run);
        Object.assign(run, projection, { updatedAt: dependencies.clock.now() });
        if (projection.currentTopEntry && (run.bestScore === undefined || projection.currentTopEntry.score > run.bestScore))
            Object.assign(run, { bestScore: projection.currentTopEntry.score, lastImprovementAtCandidates: projection.candidatesTested });
    };
    const stopReason = (run) => {
        const elapsedMilliseconds = run.activeDurationMs + (run.activeSince ? Date.parse(dependencies.clock.now()) - Date.parse(run.activeSince) : 0);
        const elapsedSeconds = elapsedMilliseconds / 1000;
        if (run.stopCondition.maxDurationSeconds !== undefined && elapsedSeconds >= run.stopCondition.maxDurationSeconds)
            return "MAX_DURATION";
        const reserved = Math.max(run.candidatesTested + inFlight(run), run.nextIteration - 1);
        if (run.stopCondition.maxCandidates !== undefined && reserved >= run.stopCondition.maxCandidates)
            return "MAX_CANDIDATES";
        if (run.stopCondition.noImprovementAfterIterations !== undefined && run.bestScore !== undefined && run.lastImprovementAtCandidates !== undefined && run.candidatesTested - run.lastImprovementAtCandidates >= run.stopCondition.noImprovementAfterIterations)
            return "NO_IMPROVEMENT";
        return undefined;
    };
    const submit = async (run, candidate) => {
        const strategyDefinitionIds = candidate.strategyDefinitions.map((definition) => definition.id);
        let compositeDefinitionId = candidate.compositeDefinition.id;
        if (dependencies.strategyService) {
            const definitions = await dependencies.strategyService.readDefinitions(run.ownerUserId, strategyDefinitionIds);
            if (definitions.length !== strategyDefinitionIds.length || definitions.some((definition, index) => definition.id !== strategyDefinitionIds[index] || definition.userId !== run.ownerUserId))
                throw new Error("INVALID_SEARCH_CONFIG");
            const persisted = await dependencies.strategyService.defineComposite(run.ownerUserId, {
                method: candidate.compositeDefinition.method,
                components: candidate.compositeDefinition.components,
                thresholds: candidate.compositeDefinition.thresholds,
            });
            const verified = await dependencies.strategyService.readComposite(run.ownerUserId, persisted.id);
            if (verified.userId !== run.ownerUserId || verified.components.length !== candidate.compositeDefinition.components.length || verified.components.some((component, index) => component.strategyDefinitionId !== candidate.compositeDefinition.components[index]?.strategyDefinitionId || component.weight !== candidate.compositeDefinition.components[index]?.weight))
                throw new Error("INVALID_SEARCH_CONFIG");
            compositeDefinitionId = verified.id;
        }
        await dependencies.backtestCoordinator.submitSearchCandidate(authFor(run), { leaderboardScopeId: run.leaderboardScopeId, strategyDefinitionIds, compositeDefinitionId, executionPolicy: { policyId: candidate.executionPolicyIntent?.mode ?? "TWO_SIDED_ONE_X_V1", stopLossPercent: candidate.executionPolicyIntent?.stopLossPercent, takeProfitPercent: candidate.executionPolicyIntent?.takeProfitPercent }, maxAttempts: 1, searchRunId: run.searchRunId, iterationNumber: run.nextIteration, generatedBy: candidate.generatedBy });
        run.nextIteration += 1;
    };
    const fill = async (searchRunId) => {
        const previous = fills.get(searchRunId) ?? Promise.resolve();
        const current = previous.then(async () => {
            const initial = await load(searchRunId);
            const fillCore = async (run, unitOfWork) => {
                if (run.state !== "RUNNING")
                    return;
                await refresh(run);
                let met = stopReason(run);
                if (met) {
                    if (inFlight(run) === 0)
                        Object.assign(run, { state: "COMPLETED", stopReason: met, endedAt: dependencies.clock.now() });
                    await dependencies.searchRunRepository.save(run, unitOfWork);
                    return;
                }
                const reserved = Math.max(run.candidatesTested + inFlight(run), run.nextIteration - 1);
                const budget = run.stopCondition.maxCandidates === undefined ? run.maxInFlight : Math.max(0, run.stopCondition.maxCandidates - reserved);
                const slots = Math.min(Math.max(0, run.maxInFlight - inFlight(run)), budget);
                const generator = dependencies.generators[run.generatorType];
                for (let index = 0; index < slots; index += 1)
                    await submit(run, generator.generate(run.searchSpace));
                await refresh(run);
                met = stopReason(run);
                if (met && inFlight(run) === 0)
                    Object.assign(run, { state: "COMPLETED", stopReason: met, endedAt: dependencies.clock.now() });
                run.updatedAt = dependencies.clock.now();
                await dependencies.searchRunRepository.save(run, unitOfWork);
            };
            if (dependencies.searchRunRepository.withRunLock)
                await dependencies.searchRunRepository.withRunLock(initial.ownerUserId, searchRunId, async (run, unitOfWork) => { if (run)
                    await fillCore(run, unitOfWork); });
            else
                await fillCore(initial);
        }).catch(async (error) => {
            const run = await dependencies.searchRunRepository.get(searchRunId);
            if (run && (run.state === "RUNNING" || run.state === "PAUSED"))
                await dependencies.searchRunRepository.save({ ...run, state: "FAILED", stopReason: "ERROR", lastError: error instanceof Error ? error.message : "SEARCH_ERROR", endedAt: dependencies.clock.now(), updatedAt: dependencies.clock.now() });
            throw error;
        });
        void current.then(() => { if (fills.get(searchRunId) === current)
            fills.delete(searchRunId); }, () => { if (fills.get(searchRunId) === current)
            fills.delete(searchRunId); });
        fills.set(searchRunId, current);
        return current;
    };
    return {
        start: async (auth, config) => { assertAuth(auth); validateStopCondition(config.stopCondition); if (!Number.isInteger(config.maxInFlight) || config.maxInFlight <= 0 || !config.leaderboardScopeId || config.searchSpace.availableStrategies.length === 0)
            throw new Error("INVALID_SEARCH_CONFIG"); validateSearchSpaceOwner(auth.userId, config.searchSpace); await dependencies.backtestCoordinator.readBenchmarkScope(auth, config.leaderboardScopeId); const run = createRun(idGenerator(), config, auth.userId, dependencies.clock.now()); await dependencies.searchRunRepository.insert(run); void fill(run.searchRunId).catch(() => undefined); return { searchRunId: run.searchRunId }; },
        pause: async (auth, id) => { const run = await loadOwned(auth, id); if (run.state === "RUNNING") {
            const now = dependencies.clock.now();
            await dependencies.searchRunRepository.save({ ...run, state: "PAUSED", activeDurationMs: run.activeDurationMs + (run.activeSince ? Date.parse(now) - Date.parse(run.activeSince) : 0), activeSince: undefined, updatedAt: now });
        } },
        resume: async (auth, id) => { const run = await loadOwned(auth, id); if (run.state === "FAILED")
            throw new Error("CANNOT_RESUME_FAILED_RUN"); if (run.state === "PAUSED") {
            const now = dependencies.clock.now();
            await dependencies.searchRunRepository.save({ ...run, state: "RUNNING", activeSince: now, updatedAt: now });
        } await fill(id); },
        cancel: async (auth, id) => {
            assertAuth(auth);
            const unitOfWork = await dependencies.beginCancellation();
            let candidateIds = [];
            try {
                const run = await dependencies.searchRunRepository.getByOwnerForUpdate(auth.userId, id, unitOfWork);
                if (!run)
                    throw new Error("SEARCH_RUN_NOT_FOUND");
                if (run.state === "CANCELLED" || run.state === "FAILED") {
                    await unitOfWork.commit();
                    return;
                }
                const result = await dependencies.backtestCoordinator.cancelSearchCandidates(auth, id, unitOfWork);
                candidateIds = result.candidateIds;
                const now = dependencies.clock.now();
                await dependencies.searchRunRepository.save({ ...run, state: "CANCELLED", stopReason: "USER_CANCELLED", endedAt: now, activeSince: undefined, updatedAt: now }, unitOfWork);
                await unitOfWork.commit();
            }
            catch (error) {
                await unitOfWork.rollback();
                throw error;
            }
            await dependencies.backtestCoordinator.removePendingJobs(candidateIds);
        },
        status: async (auth, id) => { const run = await loadOwned(auth, id); return project(run); },
        leaderboard: async (auth, id) => { const run = await loadOwned(auth, id); return dependencies.leaderboardService.rankSearchRun(run.ownerUserId, id); },
        onCandidateFinished: fill,
        fillAvailableSlots: fill,
        reconcileRunningRuns: async () => {
            const runs = await dependencies.searchRunRepository.listRunning?.() ?? [];
            for (const run of runs)
                await fill(run.searchRunId);
            return runs.length;
        },
    };
}
