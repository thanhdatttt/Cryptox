import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { AuthenticatedUserId } from "modules/auth/api";
import type {
  BacktestExecutionCapacity,
  BacktestExecutionPort,
  BacktestExecutionStatus,
  BacktestTerminalOutcome,
  CandidateRunResult,
  CandidateExecutionRequest,
  BacktestingApplication,
  BacktestingModuleDependencies,
} from "@cryptox/backtesting/bootstrap";
import {
  createBacktestingApplication,
  createInMemoryBacktestingRepositories,
} from "@cryptox/backtesting/bootstrap";
import type {
  BacktestSubmission,
  CandidateProgress,
} from "@cryptox/backtesting";
import type {
  CreateLeaderboardScopeCommand,
  LeaderboardEntry,
  LeaderboardModulePublicApi,
  LeaderboardScope,
  RankableExperiment,
  RankingConfiguration,
} from "@cryptox/leaderboard";
import {
  DEFAULT_LINEAR_REQUIRED_RANKING_CONFIGURATION,
  createLeaderboardModule,
  type LeaderboardModuleDependencies,
} from "@cryptox/leaderboard/bootstrap";
import { createEvaluationModule } from "@cryptox/evaluation/bootstrap";
import type {
  Candle,
  DatasetSnapshotRef,
  MarketDataModulePublicApi,
} from "@cryptox/market-data";
import type {
  CompositeStrategyDefinition,
  DefineCompositeCommand,
  Strategy,
  StrategyDefinition,
  StrategyModulePublicApi,
} from "@cryptox/strategy";
import type {
  SearchModulePublicApi,
  SearchRunStatus,
  SearchCandidateTemplate,
} from "../api/contracts";
import { createSearchModule } from "../api/bootstrap";
import type { PostgresPool } from "../infrastructure/postgres";
import { PostgresSearchRunRepository } from "../infrastructure/postgres";
import { SeededRandomStrategyGenerator } from "../domain/random-generator";

const hasConfiguredDatabase = Boolean(process.env.DATABASE_URL?.trim());
const describeReal = hasConfiguredDatabase ? describe : describe.skip;

const ownerA = randomUUID() as AuthenticatedUserId;
const ownerB = randomUUID() as AuthenticatedUserId;
const searchRunId = randomUUID();
const leaderboardScopeId = randomUUID();
const rankingConfigurationId = `q01-${randomUUID()}`;

const candidateTemplate: SearchCandidateTemplate = {
  marketInput: {
    pair: "BTCUSDT",
    timeframe: "1h",
    range: { from: "2026-01-01T00:00:00.000Z", to: "2026-01-01T03:00:00.000Z" },
  },
  configuration: {
    executionProfileId: "BACKTEST_EXECUTION_V1",
    initialCapital: 10_000,
    feeRatePercent: 0,
    slippageBps: 0,
  },
};

function createStrategyApi(): StrategyModulePublicApi {
  const definitions = new Map<string, StrategyDefinition>(
    ["strategy-a", "strategy-b"].map((id) => [id, {
      id,
      ownerUserId: ownerA,
      logicalFamilyKey: id,
      strategyName: "FIXTURE_BUY",
      implementationVersion: "1",
      behaviorProfileId: "Q01_FIXTURE",
      version: 1,
      parameters: {},
      createdAt: "2026-01-01T00:00:00.000Z",
    }]),
  );
  const composites = new Map<string, CompositeStrategyDefinition>();
  const owned = (context: { authenticatedUserId: AuthenticatedUserId }, id: string): void => {
    const definition = definitions.get(id);
    if (!definition || definition.ownerUserId !== context.authenticatedUserId) throw new Error("NOT_FOUND");
  };
  const fixtureStrategy: Strategy = {
    name: "FIXTURE_BUY",
    category: "TREND",
    analyze: (context) => ({
      signal: "BUY",
      signalAt: context.candles.at(-1)?.timestamp ?? "2026-01-01T00:00:00.000Z",
      visualization: [],
    }),
  };

  return {
    listStrategies: () => [],
    defineStrategy: async () => {
      throw new Error("NOT_USED");
    },
    defineComposite: async (
      context,
      command: DefineCompositeCommand,
    ): Promise<CompositeStrategyDefinition> => {
      for (const id of command.strategyDefinitionIds) owned(context, id);
      const definition: CompositeStrategyDefinition = {
        id: randomUUID(),
        ownerUserId: context.authenticatedUserId,
        logicalFamilyKey: command.logicalFamilyKey,
        version: 1,
        method: "MAJORITY_VOTE",
        combinationProfileId: "MAJORITY_VOTE_V1",
        components: command.strategyDefinitionIds.map((strategyDefinitionId) => ({
          strategyDefinitionId,
          strategyDefinitionVersion: 1,
        })),
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      composites.set(definition.id, definition);
      return structuredClone(definition);
    },
    readStrategyDefinition: async (context, id) => {
      owned(context, id);
      return structuredClone(definitions.get(id)!);
    },
    readCompositeDefinition: async (context, id) => {
      const definition = composites.get(id);
      if (!definition || definition.ownerUserId !== context.authenticatedUserId) throw new Error("NOT_FOUND");
      return structuredClone(definition);
    },
    listStrategyDefinitions: async () => ({ items: [] }),
    listCompositeDefinitions: async () => ({ items: [] }),
    resolveStrategy: async () => fixtureStrategy,
    combineSignals: () => "BUY",
  };
}

function createMarketDataApi(): Pick<MarketDataModulePublicApi, "createDatasetSnapshot" | "readDatasetSnapshot"> {
  const snapshots = new Map<string, { snapshot: DatasetSnapshotRef; candles: readonly Candle[] }>();
  const candles: readonly Candle[] = [
    { pair: "BTCUSDT", timeframe: "1h", timestamp: "2026-01-01T00:00:00.000Z", open: 100, high: 101, low: 99, close: 100, volume: 10, isClosed: true },
    { pair: "BTCUSDT", timeframe: "1h", timestamp: "2026-01-01T01:00:00.000Z", open: 110, high: 111, low: 109, close: 110, volume: 10, isClosed: true },
    { pair: "BTCUSDT", timeframe: "1h", timestamp: "2026-01-01T02:00:00.000Z", open: 120, high: 121, low: 119, close: 120, volume: 10, isClosed: true },
  ];
  return {
    createDatasetSnapshot: async (command) => {
      const id = randomUUID();
      const snapshot: DatasetSnapshotRef = {
        id,
        provider: "Q01_FIXTURE",
        pair: command.pair,
        timeframe: command.timeframe,
        range: command.range,
        candleCount: candles.length,
        replayGuarantee: "TRACEABLE",
        replayLimitation: "controlled Q-01 integration input",
        createdAt: "2026-01-01T03:00:00.000Z",
      };
      snapshots.set(id, { snapshot, candles });
      return snapshot;
    },
    readDatasetSnapshot: async (query) => {
      const value = snapshots.get(query.snapshotId);
      if (!value) throw new Error("NOT_FOUND");
      return { snapshot: value.snapshot, candles: value.candles };
    },
  };
}

function createLeaderboardExperimentRepository(
  repositories: ReturnType<typeof createInMemoryBacktestingRepositories>,
): NonNullable<LeaderboardModuleDependencies["experimentRepository"]> {
  const toRankable = (experiment: Awaited<ReturnType<typeof repositories.experimentRepository.getByCandidateOwnerAndId>>): RankableExperiment | undefined => {
    if (!experiment) return undefined;
    return {
      executionState: "SUCCEEDED",
      experimentId: experiment.id,
      candidateId: experiment.candidateId,
      ...(experiment.searchRunId === undefined ? {} : { searchRunId: experiment.searchRunId }),
      metrics: experiment.metrics,
    };
  };
  return {
    getByOwnerAndId: async (ownerUserId, experimentId) =>
      toRankable(await repositories.experimentRepository.getByCandidateOwnerAndId(ownerUserId, experimentId)),
    listByOwnerAndSearchRun: async (ownerUserId, searchRunId) =>
      (await repositories.experimentRepository.listByCandidateOwnerAndSearchRun(ownerUserId, searchRunId))
        .map((experiment) => toRankable(experiment)!)
  };
}

function createLeaderboardApi(
  experimentRepository?: NonNullable<LeaderboardModuleDependencies["experimentRepository"]>,
): LeaderboardModulePublicApi {
  const scope: LeaderboardScope = {
    id: leaderboardScopeId,
    ownerUserId: ownerA,
    name: "Q-01 integration scope",
    k: 10,
    rankingConfigurationId,
    comparisonKey: "Q01_FIXTURE",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  type StoredEntry = LeaderboardEntry & { active: boolean };
  const entries = new Map<string, StoredEntry>();
  const scopes = new Map([[scope.id, scope]]);
  const configurations = new Map<string, RankingConfiguration>([[
    rankingConfigurationId,
    { ...DEFAULT_LINEAR_REQUIRED_RANKING_CONFIGURATION, id: rankingConfigurationId },
  ]]);
  const dependencies: LeaderboardModuleDependencies = {
    scopeRepository: {
      insert: async (ownerUserId: AuthenticatedUserId, command: CreateLeaderboardScopeCommand) => {
        const created = { ...scope, id: randomUUID(), ownerUserId, name: command.name, k: command.k ?? 10, rankingConfigurationId: command.rankingConfigurationId, comparisonKey: command.comparisonKey };
        scopes.set(created.id, created);
        return created;
      },
      getByOwnerAndId: async (ownerUserId, id) => {
        const value = scopes.get(id);
        return value?.ownerUserId === ownerUserId ? { ...value } : undefined;
      },
    },
    entryRepository: {
      getActiveTopK: async (ownerUserId, scopeId, k) => {
        if (scopes.get(scopeId)?.ownerUserId !== ownerUserId) return [];
        return [...entries.values()].filter((entry) => entry.active && entry.leaderboardScopeId === scopeId).slice(0, k).map(({ active: _active, ...entry }) => entry);
      },
      listByOwnerAndSearchRun: async (ownerUserId, searchRunId) =>
        [...entries.values()]
          .filter((entry) => entry.active && entry.searchRunId === searchRunId && scopes.get(entry.leaderboardScopeId)?.ownerUserId === ownerUserId)
          .map(({ active: _active, ...entry }) => entry),
      insertForScopeOwner: async (ownerUserId, value) => {
        if (scopes.get(value.leaderboardScopeId)?.ownerUserId !== ownerUserId) throw new Error("NOT_FOUND");
        const existing = [...entries.values()].find((entry) => entry.leaderboardScopeId === value.leaderboardScopeId && entry.experimentId === value.experimentId);
        if (existing) {
          const { active: _active, ...publicEntry } = existing;
          return publicEntry;
        }
        const stored: StoredEntry = { ...value, id: randomUUID(), rank: 0, active: true };
        entries.set(stored.id, stored);
        const { active: _active, ...publicEntry } = stored;
        return publicEntry;
      },
      deactivateForScopeOwner: async (ownerUserId, entryId) => {
        const entry = entries.get(entryId);
        if (!entry || scopes.get(entry.leaderboardScopeId)?.ownerUserId !== ownerUserId) throw new Error("NOT_FOUND");
        entry.active = false;
      },
      findByScopeOwnerAndExperiment: async (ownerUserId, scopeId, experimentId) => {
        const value = [...entries.values()].find((entry) => entry.active && entry.leaderboardScopeId === scopeId && entry.experimentId === experimentId && scopes.get(scopeId)?.ownerUserId === ownerUserId);
        if (!value) return undefined;
        const { active: _active, ...publicEntry } = value;
        return publicEntry;
      },
    },
    configurationRepository: {
      getById: async (id) => configurations.get(id),
      listAll: async () => [...configurations.values()],
    },
    ...(experimentRepository ? { experimentRepository } : {}),
    clock: { now: () => "2026-01-01T03:00:00.000Z" },
  };
  return createLeaderboardModule(dependencies);
}

function createBoundedPublicBacktesting(
  strategy: StrategyModulePublicApi,
  leaderboard: LeaderboardModulePublicApi,
  searchRunOwnerGuard: (context: { authenticatedUserId: AuthenticatedUserId }, searchRunId: string) => Promise<void>,
  repositories: ReturnType<typeof createInMemoryBacktestingRepositories> = createInMemoryBacktestingRepositories(),
): BacktestingApplication {
  let application!: BacktestingApplication;
  const active = new Map<string, { controller: AbortController; startedAt: string }>();
  const execution: BacktestExecutionPort<CandidateExecutionRequest, CandidateRunResult> = {
    submit: async (request): Promise<BacktestSubmission<CandidateRunResult>> => {
      if (active.size >= 1) {
        const capacity: BacktestExecutionCapacity = { maximum: 1, active: active.size, available: 0 };
        return { accepted: false, candidateId: request.candidateId, status: "SATURATED", capacity };
      }
      const controller = new AbortController();
      const startedAt = "2026-01-01T03:00:00.000Z";
      active.set(request.candidateId, { controller, startedAt });
      const outcome: Promise<BacktestTerminalOutcome<CandidateRunResult>> = Promise.resolve()
        .then(() => application.runCandidate(request, controller.signal))
        .then(
          (result) => ({ candidateId: request.candidateId, state: "SUCCEEDED" as const, result, completedAt: startedAt }),
          (error: unknown) => ({ candidateId: request.candidateId, state: "FAILED" as const, failure: { code: "RUNNER_FAILED" as const, message: error instanceof Error ? error.message : String(error) }, completedAt: startedAt }),
        );
      void outcome.finally(() => active.delete(request.candidateId));
      return { accepted: true, candidateId: request.candidateId, status: "ACCEPTED", outcome };
    },
    capacity: async () => ({ maximum: 1, active: active.size, available: active.size ? 0 : 1 }),
    status: async (candidateId): Promise<BacktestExecutionStatus | undefined> => {
      const value = active.get(candidateId);
      return value ? { candidateId, state: "RUNNING", startedAt: value.startedAt } : undefined;
    },
    cancel: async (candidateId) => {
      const value = active.get(candidateId);
      if (!value) return false;
      value.controller.abort();
      return true;
    },
  };
  const dependencies: BacktestingModuleDependencies = {
    execution,
    marketData: createMarketDataApi(),
    strategy: {
      readStrategyDefinition: strategy.readStrategyDefinition,
      readCompositeDefinition: strategy.readCompositeDefinition,
      resolveStrategy: strategy.resolveStrategy,
      combineSignals: strategy.combineSignals,
    },
    evaluation: createEvaluationModule(),
    leaderboard,
    candidateRepository: repositories.candidateRepository,
    experimentRepository: repositories.experimentRepository,
    unitOfWork: repositories.unitOfWork,
    completionUnitOfWork: repositories.completionUnitOfWork,
    clock: { now: () => "2026-01-01T03:00:00.000Z" },
  };
  application = createBacktestingApplication(dependencies, { searchRunOwnerGuard });
  return application;
}

describeReal("Q-01 real SearchRun, Backtesting, and Leaderboard integration", () => {
  it("persists an owned run, executes through public APIs, admits its result, and hides it from another owner", async () => {
    const { Pool } = require("pg") as {
      Pool: new (config: { connectionString: string; max: number; application_name: string }) => PostgresPool;
    };
    const databaseUrl = process.env.DATABASE_URL!.trim();
    const database = new Pool({ connectionString: databaseUrl, max: 3, application_name: "cryptox-search-q01-test" });
    const repository = new PostgresSearchRunRepository(database);
    const now = "2026-01-01T00:00:00.000Z";
    try {
      await database.query(
        "INSERT INTO users (id, normalized_email, password_hash, created_at, updated_at) VALUES ($1::uuid, $2, $3, $4::timestamptz, $4::timestamptz)",
        [ownerA, `q01-${ownerA}@example.invalid`, "q01-test-password-hash", now],
      );
      await database.query(
        "INSERT INTO ranking_configurations (id, profile_id, version, name, description, formula, minimum_number_of_trades, tie_breakers, created_at) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9::timestamptz)",
        [rankingConfigurationId, "LINEAR_REQUIRED_V1", 1, "Q-01 ranking", "Q-01", JSON.stringify(DEFAULT_LINEAR_REQUIRED_RANKING_CONFIGURATION.formula), 1, JSON.stringify(DEFAULT_LINEAR_REQUIRED_RANKING_CONFIGURATION.tieBreakers), now],
      );
      await database.query(
        "INSERT INTO leaderboard_scopes (id, owner_user_id, name, k, ranking_configuration_id, comparison_key, created_at) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::timestamptz)",
        [leaderboardScopeId, ownerA, "Q-01 integration scope", 10, rankingConfigurationId, "Q01_FIXTURE", now],
      );

      const backtestingRepositories = createInMemoryBacktestingRepositories();
      const leaderboard = createLeaderboardApi(createLeaderboardExperimentRepository(backtestingRepositories));
      const strategy = createStrategyApi();
      let search!: SearchModulePublicApi;
      const backtesting = createBoundedPublicBacktesting(strategy, leaderboard, async (context, id) => {
        await search.status(context, id);
      }, backtestingRepositories);
      search = createSearchModule({
        searchRunRepository: repository,
        generators: { RANDOM: new SeededRandomStrategyGenerator() },
        strategy: { defineComposite: strategy.defineComposite },
        backtesting,
        leaderboard: {
          getLeaderboardScope: leaderboard.getLeaderboardScope,
          rankSearchRun: leaderboard.rankSearchRun,
        },
      }, { idGenerator: () => searchRunId, pollIntervalMs: 2 });

      const clientCommand: Parameters<SearchModulePublicApi["start"]>[1] = {
        searchSpace: {
          availableStrategyDefinitionIds: ["strategy-b", "strategy-a"],
          componentCount: { minimum: 2, maximum: 2 },
          requireDistinctComponents: true,
        },
        stopCondition: { maxCandidates: 1 },
        generatorType: "RANDOM",
        randomSeed: "q01-real-seed",
        leaderboardScopeId,
        candidateTemplate,
        maxInFlight: 1,
      };
      Object.assign(clientCommand, { ownerUserId: ownerB });
      const started = await search.start({ authenticatedUserId: ownerA }, clientCommand);
      expect(started.searchRunId).toBe(searchRunId);

      let status: SearchRunStatus | undefined;
      const deadline = Date.now() + 2_000;
      while (Date.now() < deadline) {
        status = await search.status({ authenticatedUserId: ownerA }, searchRunId);
        if (status.state === "COMPLETED" && status.completedCandidateCount === 1) break;
        await new Promise<void>((resolve) => setTimeout(resolve, 5));
      }
      expect(status?.state).toBe("COMPLETED");
      expect(status?.stopReason).toBe("MAX_CANDIDATES");
      expect(status?.completedCandidateCount).toBe(1);
      expect(status?.failedCandidateCount).toBe(0);

      const persisted = await repository.getByOwnerAndId(ownerA, searchRunId);
      expect(persisted?.state).toBe("COMPLETED");
      expect(persisted?.candidateTemplate).toEqual(candidateTemplate);
      expect(persisted?.ownerUserId).toBe(ownerA);
      expect(await repository.getByOwnerAndId(ownerB, searchRunId)).toBeUndefined();
      await expect(search.status({ authenticatedUserId: ownerB }, searchRunId)).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(search.pause({ authenticatedUserId: ownerB }, searchRunId)).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(search.resume({ authenticatedUserId: ownerB }, searchRunId)).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(search.cancel({ authenticatedUserId: ownerB }, searchRunId)).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(search.status({} as never, searchRunId)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      await expect(search.list({ authenticatedUserId: ownerA }, { limit: 10 })).resolves.toMatchObject({
        items: [expect.objectContaining({ searchRunId, ownerUserId: ownerA })],
      });
      await expect(search.list({ authenticatedUserId: ownerB }, { limit: 10 })).resolves.toMatchObject({ items: [] });

      const candidates: readonly CandidateProgress[] = await backtesting.listSearchCandidates(
        { authenticatedUserId: ownerA },
        searchRunId,
        { limit: 10 },
      ).then((page) => page.items);
      expect(candidates).toHaveLength(1);
      expect(candidates[0]?.ownerUserId).toBe(ownerA);
      expect(candidates[0]?.status).toBe("SUCCEEDED");

      await expect(backtesting.status({ authenticatedUserId: ownerB }, candidates[0]!.candidateId))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(backtesting.status({} as never, candidates[0]!.candidateId))
        .rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      await expect(backtesting.listSearchCandidates({ authenticatedUserId: ownerB }, searchRunId, { limit: 10 }))
        .resolves.toMatchObject({ items: [] });
      await expect(backtesting.cancelCandidate({ authenticatedUserId: ownerB }, candidates[0]!.candidateId))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(backtesting.cancelSearchCandidates({ authenticatedUserId: ownerB }, searchRunId))
        .resolves.toEqual({ candidateIds: [] });
      await expect(backtesting.submitSearchCandidate({ authenticatedUserId: ownerB }, {
        leaderboardScopeId,
        strategySelection: { kind: "STRATEGY", strategyDefinitionId: "strategy-a" },
        marketInput: candidateTemplate.marketInput,
        configuration: candidateTemplate.configuration,
        searchRunId,
        iterationNumber: 2,
      })).rejects.toMatchObject({ code: "NOT_FOUND" });

      const candidateStatus = await backtesting.status({ authenticatedUserId: ownerA }, candidates[0]!.candidateId);
      expect(candidateStatus.experimentId).toBeTypeOf("string");
      const experimentId = candidateStatus.experimentId!;
      const experiment = await backtesting.readExperiment({ authenticatedUserId: ownerA }, experimentId);
      expect(experiment.candidateId).toBe(candidates[0]!.candidateId);
      await expect(backtesting.readExperiment({ authenticatedUserId: ownerB }, experimentId))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(backtesting.listSearchExperiments({ authenticatedUserId: ownerA }, searchRunId))
        .resolves.toHaveLength(1);
      await expect(backtesting.listSearchExperiments({ authenticatedUserId: ownerB }, searchRunId))
        .resolves.toEqual([]);
      await expect(backtesting.listExperimentTrades({ authenticatedUserId: ownerA }, experimentId, { limit: 10 }))
        .resolves.toMatchObject({ items: expect.any(Array) });
      await expect(backtesting.listExperimentTrades({ authenticatedUserId: ownerB }, experimentId, { limit: 10 }))
        .rejects.toThrow("NOT_FOUND");

      const composite = await strategy.defineComposite({ authenticatedUserId: ownerA }, {
        logicalFamilyKey: "matrix-composite",
        combinationProfileId: "MAJORITY_VOTE_V1",
        strategyDefinitionIds: ["strategy-a", "strategy-b"],
      });
      await expect(strategy.readStrategyDefinition({ authenticatedUserId: ownerA }, "strategy-a"))
        .resolves.toMatchObject({ ownerUserId: ownerA });
      await expect(strategy.readStrategyDefinition({ authenticatedUserId: ownerB }, "strategy-a"))
        .rejects.toThrow("NOT_FOUND");
      await expect(strategy.readCompositeDefinition({ authenticatedUserId: ownerA }, composite.id))
        .resolves.toMatchObject({ ownerUserId: ownerA });
      await expect(strategy.readCompositeDefinition({ authenticatedUserId: ownerB }, composite.id))
        .rejects.toThrow("NOT_FOUND");
      await expect(strategy.defineComposite({ authenticatedUserId: ownerB }, {
        logicalFamilyKey: "cross-owner-composite",
        combinationProfileId: "MAJORITY_VOTE_V1",
        strategyDefinitionIds: ["strategy-a", "strategy-b"],
      })).rejects.toThrow("NOT_FOUND");

      await expect(leaderboard.getLeaderboardScope({ authenticatedUserId: ownerA }, leaderboardScopeId))
        .resolves.toMatchObject({ ownerUserId: ownerA });
      await expect(leaderboard.getLeaderboardScope({ authenticatedUserId: ownerB }, leaderboardScopeId))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(leaderboard.getLeaderboardScope({} as never, leaderboardScopeId))
        .rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      await expect(leaderboard.topK({ authenticatedUserId: ownerA }, leaderboardScopeId)).resolves.toHaveLength(1);
      await expect(leaderboard.topK({ authenticatedUserId: ownerB }, leaderboardScopeId))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(leaderboard.rankSearchRun({ authenticatedUserId: ownerB }, searchRunId)).resolves.toEqual([]);

      const rankableExperiment: RankableExperiment & { readonly ownerUserId: AuthenticatedUserId } = {
        executionState: "SUCCEEDED",
        experimentId: experiment.id,
        candidateId: experiment.candidateId,
        ...(experiment.searchRunId === undefined ? {} : { searchRunId: experiment.searchRunId }),
        metrics: experiment.metrics,
        ownerUserId: ownerA,
      };
      await expect(leaderboard.submit({ authenticatedUserId: ownerA }, {
        leaderboardScopeId,
        experiment: rankableExperiment,
      })).resolves.toMatchObject({ admitted: true });
      await expect(leaderboard.submit({ authenticatedUserId: ownerB }, {
        leaderboardScopeId,
        experiment: rankableExperiment,
      })).rejects.toMatchObject({ code: "NOT_FOUND" });

      const ranking = await search.leaderboard({ authenticatedUserId: ownerA }, searchRunId);
      expect(ranking).toHaveLength(1);
      expect(ranking[0]?.searchRunId).toBe(searchRunId);
      expect(ranking[0]?.score).toBeTypeOf("number");
      await expect(search.leaderboard({ authenticatedUserId: ownerB }, searchRunId))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(search.leaderboard({} as never, searchRunId))
        .rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    } finally {
      await database.query("DELETE FROM search_runs WHERE id = $1::uuid", [searchRunId]);
      await database.query("DELETE FROM leaderboard_scopes WHERE id = $1::uuid", [leaderboardScopeId]);
      await database.query("DELETE FROM ranking_configurations WHERE id = $1", [rankingConfigurationId]);
      await database.query("DELETE FROM users WHERE id = $1::uuid", [ownerA]);
      await database.end();
    }
  });
});
