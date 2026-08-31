import { describe, expect, it } from "vitest";
import type {
  AuthModulePublicApi,
  AuthenticatedSessionIdentity,
  AuthenticatedUserId,
} from "@cryptox/auth";
import type {
  BacktestingApplication,
  CandidateExecutionRequest,
  CandidateRunResult,
} from "@cryptox/backtesting/bootstrap";
import {
  createBacktestingApplication,
  createBoundedLocalBacktestExecutor,
  createInMemoryBacktestingRepositories,
} from "@cryptox/backtesting/bootstrap";
import { createSearchGeneratorRegistry, createSearchModule } from "@cryptox/search/bootstrap";
import type { SearchRunStatus } from "@cryptox/search";
import type {
  LeaderboardEntry,
  LeaderboardModulePublicApi,
  LeaderboardScope,
  RankingConfiguration,
  SearchRunRankingEntry,
} from "@cryptox/leaderboard";
import type {
  Candle,
  HistoricalCandlePage,
} from "@cryptox/market-data";
import type { DatasetSnapshotPage, MarketDataModuleRuntime } from "@cryptox/market-data/bootstrap";
import type {
  CompositeStrategyDefinition,
  StrategyDefinition,
  StrategyModulePublicApi,
} from "@cryptox/strategy";
import * as strategyPublic from "@cryptox/strategy";
import { REST_SCHEMA_VERSION } from "@cryptox/contracts/rest";
import { CapabilitiesController } from "./capabilities.controller";
import type { BackendRequest } from "./auth-context";
import { createBackendRuntime, type BackendRuntime } from "./runtime";

const USER_A = "00000000-0000-4000-8000-000000000001" as AuthenticatedUserId;
const USER_B = "00000000-0000-4000-8000-000000000002" as AuthenticatedUserId;
const EXPIRES_AT = "2026-09-01T00:00:00.000Z";
const RANGE = { from: "2026-01-01T00:00:00.000Z", to: "2026-01-01T04:00:00.000Z" };

function failure(code: string, message = "internal detail must not cross the backend boundary"): Error {
  return Object.assign(new Error(message), { code });
}

function identity(authenticatedUserId: AuthenticatedUserId): AuthenticatedSessionIdentity {
  return { sessionId: `session-${authenticatedUserId}`, expiresAt: EXPIRES_AT, authenticatedUserId };
}

function auth(): AuthModulePublicApi {
  const sessions = new Map<string, AuthenticatedUserId>([
    ["token-a", USER_A],
    ["token-b", USER_B],
  ]);
  return {
    register: async () => { throw failure("AUTH_PERSISTENCE_UNAVAILABLE"); },
    login: async () => { throw failure("AUTH_PERSISTENCE_UNAVAILABLE"); },
    resolveSession: async (token) => {
      const userId = sessions.get(token);
      return userId === undefined ? undefined : identity(userId);
    },
    currentUser: async (context) => ({
      id: context.authenticatedUserId,
      email: `${context.authenticatedUserId}@example.test`,
      createdAt: EXPIRES_AT,
      updatedAt: EXPIRES_AT,
    }),
    logout: async () => undefined,
  };
}

function request(token = "token-a"): BackendRequest {
  return { headers: { cookie: `cryptox_session=${token}` } } as BackendRequest;
}

function notFound(): never {
  throw failure("NOT_FOUND");
}

function strategyDefinition(ownerUserId: AuthenticatedUserId, id: string): StrategyDefinition {
  return {
    id,
    ownerUserId,
    logicalFamilyKey: id,
    strategyName: "MA",
    implementationVersion: "1",
    behaviorProfileId: "TECHNICAL_PROFILES_V1",
    version: 1,
    parameters: { fastPeriod: 2, slowPeriod: 3 },
    createdAt: EXPIRES_AT,
  };
}

function createStrategy(): StrategyModulePublicApi {
  const definitions = new Map<string, StrategyDefinition>([
    ["strategy-a", strategyDefinition(USER_A, "strategy-a")],
    ["strategy-b", strategyDefinition(USER_A, "strategy-b")],
    ["strategy-b-owner", strategyDefinition(USER_B, "strategy-b-owner")],
  ]);
  const composites = new Map<string, CompositeStrategyDefinition>();
  let definitionSequence = 0;
  let compositeSequence = 0;
  const strategy = {
    name: "TEST",
    category: "TREND" as const,
    analyze: (context: { candles: readonly Candle[] }) => {
      const signals = ["BUY", "HOLD", "SELL", "HOLD"] as const;
      const index = Math.min(Math.max(context.candles.length - 1, 0), signals.length - 1);
      const current = context.candles.at(-1)!;
      return { signal: signals[index], signalAt: current.timestamp, visualization: [] };
    },
  };
  const owned = <T extends { ownerUserId: AuthenticatedUserId }>(
    context: { authenticatedUserId: AuthenticatedUserId },
    value: T | undefined,
  ): T => {
    if (!value || value.ownerUserId !== context.authenticatedUserId) return notFound();
    return structuredClone(value);
  };
  return {
    listStrategies: () => strategyPublic.STRATEGY_FACTORIES.map((factory) => factory.descriptor),
    defineStrategy: async (context, command) => {
      const id = `${context.authenticatedUserId}-definition-${definitionSequence++}`;
      const value = {
        ...strategyDefinition(context.authenticatedUserId, id),
        logicalFamilyKey: command.logicalFamilyKey,
        strategyName: command.strategyName,
        parameters: command.parameters,
      };
      definitions.set(id, value);
      return structuredClone(value);
    },
    defineComposite: async (context, command) => {
      const components = command.strategyDefinitionIds.map((strategyDefinitionId) => {
        const definition = definitions.get(strategyDefinitionId);
        if (!definition || definition.ownerUserId !== context.authenticatedUserId) return notFound();
        return { strategyDefinitionId, strategyDefinitionVersion: definition.version };
      });
      const id = `${context.authenticatedUserId}-composite-${compositeSequence++}`;
      const value: CompositeStrategyDefinition = {
        id,
        ownerUserId: context.authenticatedUserId,
        logicalFamilyKey: command.logicalFamilyKey,
        version: 1,
        method: "MAJORITY_VOTE",
        combinationProfileId: "MAJORITY_VOTE_V1",
        components,
        createdAt: EXPIRES_AT,
      };
      composites.set(id, value);
      return structuredClone(value);
    },
    readStrategyDefinition: async (context, id) => owned(context, definitions.get(id)),
    readCompositeDefinition: async (context, id) => owned(context, composites.get(id)),
    listStrategyDefinitions: async (context, page) => {
      const items = [...definitions.values()]
        .filter((definition) => definition.ownerUserId === context.authenticatedUserId)
        .sort((left, right) => left.id.localeCompare(right.id));
      const selected = items.slice(0, page.limit).map((value) => structuredClone(value));
      return { items: selected };
    },
    listCompositeDefinitions: async (context, page) => {
      const items = [...composites.values()]
        .filter((definition) => definition.ownerUserId === context.authenticatedUserId)
        .slice(0, page.limit)
        .map((value) => structuredClone(value));
      return { items };
    },
    resolveStrategy: async () => strategy,
    combineSignals: (_definition, signals) => {
      const buys = signals.filter(({ signal }) => signal === "BUY").length;
      const sells = signals.filter(({ signal }) => signal === "SELL").length;
      return buys > sells ? "BUY" : sells > buys ? "SELL" : "HOLD";
    },
  };
}

function candle(index: number, open: number, close: number): Candle {
  const timestamp = new Date(Date.parse(RANGE.from) + index * 60 * 60 * 1_000).toISOString();
  return {
    pair: "BTCUSDT",
    timeframe: "1h",
    timestamp,
    open,
    high: Math.max(open, close) + 1,
    low: Math.min(open, close) - 1,
    close,
    volume: 10,
    isClosed: true,
  };
}

function createMarketData(): MarketDataModuleRuntime {
  const candles = [candle(0, 100, 101), candle(1, 110, 111), candle(2, 120, 121), candle(3, 130, 129)];
  const snapshot = {
    id: "snapshot-1",
    provider: "binance" as const,
    pair: "BTCUSDT" as const,
    timeframe: "1h" as const,
    range: RANGE,
    candleCount: candles.length,
    replayGuarantee: "TRACEABLE" as const,
    replayLimitation: "test dataset",
    createdAt: EXPIRES_AT,
  };
  const history: HistoricalCandlePage = {
    pair: "BTCUSDT",
    timeframe: "1h",
    range: RANGE,
    candles,
    complete: true,
    missingRanges: [],
    formingIncluded: false,
    asOf: EXPIRES_AT,
    provenance: {
      provider: "binance",
      pair: "BTCUSDT",
      timeframe: "1h",
      range: RANGE,
      replayGuarantee: "TRACEABLE",
      replayLimitation: "test dataset",
    },
  };
  return {
    readCandles: async () => structuredClone(history),
    createDatasetSnapshot: async () => structuredClone(snapshot),
    readDatasetSnapshot: async (): Promise<DatasetSnapshotPage> => ({
      snapshot: structuredClone(snapshot),
      candles: structuredClone(candles),
    }),
    subscribeMarketData: async (_subscriptions, sink) => {
      sink({ kind: "CONNECTION_STATUS", payload: { provider: "binance", status: "CONNECTED", lastEventAt: EXPIRES_AT } });
      sink({ kind: "TICK", payload: { pair: "BTCUSDT", price: 131, timestamp: EXPIRES_AT } });
      return async () => undefined;
    },
    readObservability: async () => ({
      profileId: "MARKET_OBSERVABILITY_V1",
      pair: "BTCUSDT",
      connection: { provider: "binance", status: "CONNECTED", lastEventAt: EXPIRES_AT },
      lastLatencyMs: 0,
      latestTicks: [],
      persistence: "EPHEMERAL_IN_MEMORY_ONLY",
    }),
    shutdown: async () => undefined,
  };
}

function createLeaderboard(): { api: LeaderboardModulePublicApi; entries: LeaderboardEntry[] } {
  const configuration: RankingConfiguration = {
    id: "ranking-v1",
    profileId: "LINEAR_REQUIRED_V1",
    version: 1,
    name: "Required ranking",
    formula: {
      totalReturnPercentWeight: 0.5,
      winRatePercentWeight: 0.3,
      maxDrawdownMagnitudePercentWeight: -0.2,
    },
    minimumNumberOfTrades: 1,
    tieBreakers: [
      { field: "SCORE", direction: "DESCENDING" },
      { field: "TOTAL_RETURN_PERCENT", direction: "DESCENDING" },
      { field: "MAX_DRAWDOWN_MAGNITUDE_PERCENT", direction: "ASCENDING" },
      { field: "WIN_RATE_PERCENT", direction: "DESCENDING" },
      { field: "EXPERIMENT_ID", direction: "ASCENDING" },
    ],
    createdAt: EXPIRES_AT,
  };
  const scope: LeaderboardScope = {
    id: "scope-a",
    ownerUserId: USER_A,
    name: "A scope",
    k: 10,
    rankingConfigurationId: configuration.id,
    comparisonKey: "BTCUSDT|1h",
    createdAt: EXPIRES_AT,
  };
  const entries: LeaderboardEntry[] = [];
  const api: LeaderboardModulePublicApi = {
    createLeaderboardScope: async (context, command) => ({
      ...scope,
      id: `${context.authenticatedUserId}-scope`,
      ownerUserId: context.authenticatedUserId,
      name: command.name,
      k: command.k ?? 10,
      rankingConfigurationId: command.rankingConfigurationId,
      comparisonKey: command.comparisonKey,
    }),
    getLeaderboardScope: async (context, id) => {
      if (id !== scope.id || context.authenticatedUserId !== scope.ownerUserId) return notFound();
      return structuredClone(scope);
    },
    getRankingConfiguration: async () => structuredClone(configuration),
    listRankingConfigurations: async () => [structuredClone(configuration)],
    score: (leaderboardScopeId, metrics) => ({
      leaderboardScopeId,
      rankingConfigurationId: configuration.id,
      overallScore: metrics.totalReturnPercent,
      rankEligible: metrics.numberOfTrades > 0,
      ...(metrics.numberOfTrades > 0 ? {} : { rankExclusionReason: "NO_TRADES" as const }),
    }),
    topK: async (context, leaderboardScopeId) => {
      if (context.authenticatedUserId !== USER_A || leaderboardScopeId !== scope.id) return notFound();
      return entries.map((entry) => structuredClone(entry));
    },
    rankSearchRun: async (context, searchRunId) => {
      if (context.authenticatedUserId !== USER_A) return notFound();
      return entries
        .filter((entry) => entry.searchRunId === searchRunId)
        .map((entry, index): SearchRunRankingEntry => ({
          rank: index + 1,
          searchRunId,
          leaderboardScopeId: entry.leaderboardScopeId,
          candidateId: entry.candidateId,
          experimentId: entry.experimentId,
          rankingConfigurationId: entry.rankingConfigurationId,
          score: entry.score,
        }));
    },
    submit: async (context, submission) => {
      if (context.authenticatedUserId !== USER_A || submission.leaderboardScopeId !== scope.id) return notFound();
      const entry: LeaderboardEntry = {
        id: `entry-${entries.length + 1}`,
        rank: entries.length + 1,
        candidateId: submission.experiment.candidateId,
        ...(submission.experiment.searchRunId === undefined ? {} : { searchRunId: submission.experiment.searchRunId }),
        experimentId: submission.experiment.experimentId,
        leaderboardScopeId: submission.leaderboardScopeId,
        rankingConfigurationId: configuration.id,
        score: submission.experiment.metrics.totalReturnPercent,
        addedAt: EXPIRES_AT,
      };
      entries.push(entry);
      return { admitted: true, entry: structuredClone(entry) };
    },
  };
  return { api, entries };
}

interface Fixture {
  runtime: BackendRuntime;
  controller: CapabilitiesController;
  leaderboardEntries: LeaderboardEntry[];
}

function createFixture(): Fixture {
  const repositories = createInMemoryBacktestingRepositories();
  const strategy = createStrategy();
  const marketData = createMarketData();
  const { api: leaderboard, entries: leaderboardEntries } = createLeaderboard();
  let backtestingApplication: BacktestingApplication | undefined;
  const execution = createBoundedLocalBacktestExecutor<CandidateExecutionRequest, CandidateRunResult>({
    capacity: 2,
    runner: {
      run: (request, signal) => {
        if (!backtestingApplication) return Promise.reject(new Error("backtesting fixture is not initialized"));
        return backtestingApplication.runCandidate(request, signal);
      },
    },
    clock: repositories.clock,
  });
  const backtesting = createBacktestingApplication(
    repositories.createDependencies({
      execution,
      marketData,
      strategy,
      evaluation: {
        evaluator: {
          evaluate: (input) => ({
            candidateId: input.candidateId,
            totalReturnPercent: input.endingCapital >= input.initialCapital ? 1 : -1,
            winRatePercent: input.trades.length > 0 ? 100 : 0,
            numberOfTrades: input.trades.length,
            maxDrawdownMagnitudePercent: 0,
            evaluationProfileId: "REQUIRED_METRICS_V1",
          }),
        },
        runtimeVersion: "test-runtime",
      },
      leaderboard,
    }),
    {
      searchRunOwnerGuard: async () => undefined,
    },
  );
  backtestingApplication = backtesting;

  const searchRuns = new Map<string, SearchRunStatus>();
  let searchId = 0;
  const searchRunRepository = {
    getByOwnerAndId: async (ownerUserId: AuthenticatedUserId, id: string) => {
      const value = searchRuns.get(id);
      return value?.ownerUserId === ownerUserId ? structuredClone(value) : undefined;
    },
    save: async (ownerUserId: AuthenticatedUserId, value: SearchRunStatus) => {
      if (value.ownerUserId !== ownerUserId) return notFound();
      searchRuns.set(value.searchRunId, structuredClone(value));
      return structuredClone(value);
    },
    listByOwner: async (ownerUserId: AuthenticatedUserId, page: { limit: number }) => ({
      items: [...searchRuns.values()].filter((value) => value.ownerUserId === ownerUserId).slice(0, page.limit).map((value) => structuredClone(value)),
    }),
  };
  const search = createSearchModule({
    searchRunRepository,
    generators: { RANDOM: createSearchGeneratorRegistry({ domainGuided: { categories: ["TEST_ONLY"] } }).RANDOM },
    strategy: { defineComposite: strategy.defineComposite },
    backtesting: {
      submitSearchCandidate: backtesting.submitSearchCandidate,
      status: backtesting.status,
      summarizeSearchCandidates: backtesting.summarizeSearchCandidates,
      cancelSearchCandidates: backtesting.cancelSearchCandidates,
    },
    leaderboard: {
      getLeaderboardScope: leaderboard.getLeaderboardScope,
      rankSearchRun: leaderboard.rankSearchRun,
    },
  }, { idGenerator: () => `search-${searchId++}`, pollIntervalMs: 0 });

  const runtime = createBackendRuntime({
    auth: auth(),
    strategy,
    marketData,
    search,
    backtesting,
    leaderboard,
    databaseReady: true,
  });
  return { runtime, controller: new CapabilitiesController(runtime), leaderboardEntries };
}

async function waitFor<T>(read: () => Promise<T>, done: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + 2_000;
  let latest = await read();
  while (!done(latest) && Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
    latest = await read();
  }
  if (!done(latest)) throw new Error("fixture did not reach its terminal state");
  return latest;
}

function scopeRequest(): Record<string, unknown> {
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    name: "runtime scope",
    rankingConfigurationId: "ranking-v1",
    comparisonKey: "BTCUSDT|1h",
  };
}

function backtestRequest(strategyDefinitionId: string, leaderboardScopeId: string): Record<string, unknown> {
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    leaderboardScopeId,
    strategySelection: { kind: "STRATEGY", strategyDefinitionId },
    marketInput: { pair: "BTCUSDT", timeframe: "1h", range: RANGE },
    configuration: {
      executionProfileId: "BACKTEST_EXECUTION_V1",
      initialCapital: 1_000,
      feeRatePercent: 0,
      slippageBps: 0,
    },
  };
}

function searchRequest(leaderboardScopeId: string): Record<string, unknown> {
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    searchSpace: {
      availableStrategyDefinitionIds: ["strategy-a", "strategy-b"],
      componentCount: { minimum: 2, maximum: 2 },
      requireDistinctComponents: true,
    },
    stopCondition: { maxCandidates: 1 },
    generatorType: "RANDOM",
    randomSeed: "runtime-seed",
    leaderboardScopeId,
    candidateTemplate: {
      marketInput: { pair: "BTCUSDT", timeframe: "1h", range: RANGE },
      configuration: {
        executionProfileId: "BACKTEST_EXECUTION_V1",
        initialCapital: 1_000,
        feeRatePercent: 0,
        slippageBps: 0,
      },
    },
    maxInFlight: 1,
  };
}

describe("backend capability composition", () => {
  it("runs manual and SearchRun backtests through trusted identity and projects generated results", async () => {
    const fixture = createFixture();
    const owner = request("token-a");
    const otherOwner = request("token-b");
    try {
      const createdScope = await fixture.controller.createLeaderboardScope(owner, scopeRequest()) as { scope: { id: string } };
      expect(createdScope.scope.id).toBe("00000000-0000-4000-8000-000000000001-scope");

      const definitionPage = await fixture.controller.strategyDefinitions(owner, { limit: "100" }) as { items: Array<{ id: string }> };
      expect(definitionPage.items.map(({ id }) => id)).toEqual(["strategy-a", "strategy-b"]);
      const composite = await fixture.controller.defineComposite(owner, {
        schemaVersion: REST_SCHEMA_VERSION,
        logicalFamilyKey: "manual-composite",
        combinationProfileId: "MAJORITY_VOTE_V1",
        strategyDefinitionIds: ["strategy-a", "strategy-b"],
      }) as { definition: { id: string } };
      expect(composite.definition.id).toContain("composite");

      const manual = await fixture.controller.startBacktest(owner, backtestRequest("strategy-a", "scope-a")) as { candidateId: string; status: string };
      expect(manual.status).toBe("ACCEPTED");
      const manualStatus = await waitFor(
        async () => fixture.controller.candidateStatus(owner, manual.candidateId) as Promise<{ candidate: { status: string; experimentId?: string } }>,
        (value) => value.candidate.status === "SUCCEEDED",
      );
      expect(manualStatus.candidate.experimentId).toBeTruthy();
      const manualExperiment = await fixture.controller.experiment(owner, manualStatus.candidate.experimentId!) as { experiment: { candidateId: string; marketData: { provider: string }; metrics: { numberOfTrades: number } } };
      expect(manualExperiment.experiment).toMatchObject({
        candidateId: manual.candidateId,
        marketData: { provider: "binance" },
        metrics: { numberOfTrades: 1 },
      });
      const manualTrades = await fixture.controller.trades(owner, manualStatus.candidate.experimentId!, { limit: "100" }) as { items: Array<{ experimentId: string; exitReason: string }> };
      expect(manualTrades.items).toHaveLength(1);
      expect(manualTrades.items[0]).toMatchObject({ experimentId: manualStatus.candidate.experimentId, exitReason: "STRATEGY_EXIT" });

      const leaderboard = await fixture.controller.leaderboard(owner, { scopeId: "scope-a" }) as { entries: Array<{ candidateId: string; experimentId: string }> };
      expect(leaderboard.entries).toContainEqual(expect.objectContaining({ candidateId: manual.candidateId, experimentId: manualStatus.candidate.experimentId }));
      expect(fixture.leaderboardEntries).toHaveLength(1);

      const searchStart = await fixture.controller.startSearch(owner, searchRequest("scope-a")) as { searchRunId: string };
      const searchStatus = await waitFor(
        async () => fixture.controller.searchStatus(owner, searchStart.searchRunId) as Promise<{ searchRun: { state: string; submittedCandidateCount: number; completedCandidateCount: number }; ranking: unknown[] }>,
        (value) => value.searchRun.state === "COMPLETED" && value.searchRun.completedCandidateCount === 1,
      );
      expect(searchStatus.searchRun).toMatchObject({ state: "COMPLETED", submittedCandidateCount: 1, completedCandidateCount: 1 });
      expect(searchStatus.ranking).toHaveLength(1);
      const searchCandidates = await fixture.controller.searchCandidates(owner, searchStart.searchRunId, { limit: "100" }) as { items: Array<{ origin: { kind: string; searchRunId?: string }; status: string; experimentId?: string }> };
      expect(searchCandidates.items).toHaveLength(1);
      expect(searchCandidates.items[0]).toMatchObject({ origin: { kind: "SEARCH", searchRunId: searchStart.searchRunId }, status: "SUCCEEDED" });
      const searchExperiments = await fixture.controller.experiments(owner, { searchRunId: searchStart.searchRunId }) as { items: Array<{ searchRunId?: string; candidateId: string }> };
      expect(searchExperiments.items).toHaveLength(1);
      expect(searchExperiments.items[0]?.searchRunId).toBe(searchStart.searchRunId);
      const searchTrades = await fixture.controller.trades(owner, searchCandidates.items[0]!.experimentId!, { limit: "100" }) as { items: unknown[] };
      expect(searchTrades.items).toHaveLength(1);

      await expect(fixture.controller.candidateStatus(otherOwner, manual.candidateId)).rejects.toMatchObject({ status: 404 });
      await expect(fixture.controller.searchStatus(otherOwner, searchStart.searchRunId)).rejects.toMatchObject({ status: 404 });
      await expect(fixture.controller.startBacktest(owner, { ...backtestRequest("strategy-a", "scope-a"), ownerUserId: USER_B })).rejects.toMatchObject({ status: 400 });
    } finally {
      await fixture.runtime.close();
    }
  });

  it("keeps the public local LEXICON_V1 sentiment path available while auxiliary News remains isolated", async () => {
    const fixture = createFixture();
    try {
      const result = await fixture.runtime.sentiment.analyze({
        newsId: "news-runtime",
        title: "Bitcoin rally",
        content: "Strong gains and positive growth.",
        source: "configured-test-source",
        publishedAt: EXPIRES_AT,
        relatedCoins: ["BTC"],
      });
      expect(result).toMatchObject({
        providerId: "LEXICON_V1",
        analysisProfileId: "LEXICON_V1",
        modelName: "LEXICON_V1",
        modelVersion: "1",
        label: "POSITIVE",
      });
      expect(fixture.runtime.composition().requiredDependencies.every(({ available }) => available)).toBe(true);
      expect(fixture.runtime.composition().optionalDependencies.find(({ name }) => name === "sentiment-provider")).toMatchObject({ available: true });
    } finally {
      await fixture.runtime.close();
    }
  });
});
