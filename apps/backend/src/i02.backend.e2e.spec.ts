import { EventEmitter } from "node:events";
import type { IncomingMessage, Server } from "node:http";
import { Duplex } from "node:stream";
import { Module, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  AuthModulePublicApi,
  AuthenticatedRequestContext,
  AuthenticatedSessionIdentity,
  AuthenticatedUserId,
  AuthSessionGrant,
  AuthUser,
} from "@cryptox/auth";
import type {
  BacktestConfiguration,
  BacktestingModulePublicApi,
  CandidateProgress,
  Experiment,
  MarketInputSelection,
  Trade,
} from "@cryptox/backtesting";
import type {
  LeaderboardEntry,
  LeaderboardModulePublicApi,
  LeaderboardScope,
  RankingConfiguration,
  SearchRunRankingEntry,
} from "@cryptox/leaderboard";
import { LINEAR_REQUIRED_V1 } from "@cryptox/leaderboard";
import type {
  HistoricalCandlePage,
  MarketDataUpdate,
  MarketObservabilityState,
} from "@cryptox/market-data";
import type { MarketDataModuleRuntime } from "@cryptox/market-data/bootstrap";
import type { SearchModulePublicApi, SearchRunStatus } from "@cryptox/search";
import * as strategyPublic from "@cryptox/strategy";
import type {
  CompositeStrategyDefinition,
  StrategyDefinition,
  StrategyModulePublicApi,
} from "@cryptox/strategy";
import { REST_SCHEMA_VERSION } from "@cryptox/contracts/rest";
import { AUTH_RUNTIME_TOKEN } from "./auth.runtime";
import { AuthController } from "./auth.controller";
import { HealthController } from "./app.module";
import { CapabilitiesController } from "./capabilities.controller";
import {
  BACKEND_RUNTIME_TOKEN,
  createBackendRuntime,
  type BackendRuntime,
} from "./runtime";
import { MARKET_WEBSOCKET_PATH } from "./market.gateway";

const USER_A = "00000000-0000-4000-8000-000000000001" as AuthenticatedUserId;
const USER_B = "00000000-0000-4000-8000-000000000002" as AuthenticatedUserId;
const REGISTERED_USER = "00000000-0000-4000-8000-000000000003" as AuthenticatedUserId;
const FIXED_NOW = "2026-09-01T00:00:00.000Z";
const RANGE = {
  from: "2026-01-01T00:00:00.000Z",
  to: "2026-01-01T02:00:00.000Z",
};
const RANKING_CONFIGURATION_ID = "ranking-fixture";
const PROVIDER_DETAIL_MARKER = "fixture-provider-detail-must-not-cross-boundary";
const SYNTHETIC_PAPER_EXECUTION = {
  executionProfileId: "SYNTHETIC_SHORT_PAPER_V1" as const,
  positionMode: "SYNTHETIC_SHORT" as const,
  exitPolicyId: "STOP_LOSS_WINS_V1" as const,
  feeRatePercent: 0.08 as const,
  adverseSlippageBps: 5 as const,
  decimalScale: 8 as const,
  roundingMode: "HALF_UP" as const,
};

function copy<T>(value: T): T {
  return structuredClone(value);
}

function codedError(code: string, message = PROVIDER_DETAIL_MARKER): Error {
  return Object.assign(new Error(message), { code });
}

function notFound(): never {
  throw codedError("NOT_FOUND", "private resource not found");
}

function authUser(id: AuthenticatedUserId, email: string): AuthUser {
  return {
    id,
    email,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  };
}

interface AuthFixture {
  readonly api: AuthModulePublicApi;
  readonly currentUserContexts: AuthenticatedRequestContext[];
}

function createAuthFixture(): AuthFixture {
  const users = new Map<string, { user: AuthUser; password: string }>([
    ["owner-a@example.test", { user: authUser(USER_A, "owner-a@example.test"), password: "owner-a-password" }],
    ["owner-b@example.test", { user: authUser(USER_B, "owner-b@example.test"), password: "owner-b-password" }],
  ]);
  const tokens = new Map<string, AuthenticatedUserId>([
    ["token-a", USER_A],
    ["token-b", USER_B],
  ]);
  const currentUserContexts: AuthenticatedRequestContext[] = [];

  function grant(user: AuthUser, token: string): AuthSessionGrant {
    tokens.set(token, user.id);
    return { user: copy(user), opaqueToken: token, expiresAt: "2026-09-02T00:00:00.000Z" };
  }

  return {
    currentUserContexts,
    api: {
      register: async (command) => {
        const email = command.email.trim().toLowerCase();
        if (users.has(email)) throw codedError("EMAIL_ALREADY_REGISTERED", "duplicate email");
        const user = authUser(REGISTERED_USER, email);
        users.set(email, { user, password: command.password });
        return grant(user, "registered-token");
      },
      login: async (command) => {
        const record = users.get(command.email.trim().toLowerCase());
        if (!record || record.password !== command.password) {
          throw codedError("INVALID_CREDENTIALS", "generic invalid credentials");
        }
        return grant(record.user, "login-token");
      },
      resolveSession: async (opaqueToken): Promise<AuthenticatedSessionIdentity | undefined> => {
        const authenticatedUserId = tokens.get(opaqueToken);
        return authenticatedUserId === undefined
          ? undefined
          : {
              sessionId: `${authenticatedUserId}-session`,
              expiresAt: "2026-09-02T00:00:00.000Z",
              authenticatedUserId,
            };
      },
      currentUser: async (context) => {
        currentUserContexts.push(copy(context));
        const record = [...users.values()].find(({ user }) => user.id === context.authenticatedUserId);
        if (!record) throw codedError("NOT_FOUND", "user not found");
        return copy(record.user);
      },
      logout: async (opaqueToken) => {
        tokens.delete(opaqueToken);
      },
    },
  };
}

function strategyDefinition(ownerUserId: AuthenticatedUserId, id: string): StrategyDefinition {
  return {
    id,
    ownerUserId,
    logicalFamilyKey: `${id}-family`,
    strategyName: "MA",
    implementationVersion: "1.0.0",
    behaviorProfileId: "TECHNICAL_PROFILES_V1",
    version: 1,
    parameters: { fastPeriod: 1, slowPeriod: 2 },
    createdAt: FIXED_NOW,
  };
}

function compositeDefinition(ownerUserId: AuthenticatedUserId, id: string): CompositeStrategyDefinition {
  return {
    id,
    ownerUserId,
    logicalFamilyKey: `${id}-family`,
    version: 1,
    method: "MAJORITY_VOTE",
    combinationProfileId: "MAJORITY_VOTE_V1",
    components: [
      { strategyDefinitionId: ownerUserId === USER_A ? "strategy-a" : "strategy-b", strategyDefinitionVersion: 1 },
      { strategyDefinitionId: ownerUserId === USER_A ? "strategy-a-2" : "strategy-b-2", strategyDefinitionVersion: 1 },
    ],
    createdAt: FIXED_NOW,
  };
}

interface StrategyFixture {
  readonly api: StrategyModulePublicApi;
  readonly contexts: AuthenticatedRequestContext[];
}

function createStrategyFixture(): StrategyFixture {
  const definitions = new Map<string, StrategyDefinition>([
    ["strategy-a", strategyDefinition(USER_A, "strategy-a")],
    ["strategy-a-2", strategyDefinition(USER_A, "strategy-a-2")],
    ["strategy-b", strategyDefinition(USER_B, "strategy-b")],
    ["strategy-b-2", strategyDefinition(USER_B, "strategy-b-2")],
  ]);
  const composites = new Map<string, CompositeStrategyDefinition>([
    ["composite-a", compositeDefinition(USER_A, "composite-a")],
    ["composite-b", compositeDefinition(USER_B, "composite-b")],
  ]);
  const contexts: AuthenticatedRequestContext[] = [];

  function owned<T extends { ownerUserId: AuthenticatedUserId }>(
    context: AuthenticatedRequestContext,
    value: T | undefined,
  ): T {
    if (!value || value.ownerUserId !== context.authenticatedUserId) return notFound();
    return copy(value);
  }

  return {
    contexts,
    api: {
      listStrategies: () => strategyPublic.STRATEGY_FACTORIES.map((factory) => factory.descriptor),
      defineStrategy: async (context, command) => {
        contexts.push(copy(context));
        const value: StrategyDefinition = {
          ...strategyDefinition(context.authenticatedUserId, `created-${contexts.length}`),
          logicalFamilyKey: command.logicalFamilyKey,
          strategyName: command.strategyName,
          parameters: command.parameters,
        };
        definitions.set(value.id, value);
        return copy(value);
      },
      defineComposite: async (context, command) => {
        contexts.push(copy(context));
        const components = command.strategyDefinitionIds.map((id) => {
          const definition = definitions.get(id);
          if (!definition || definition.ownerUserId !== context.authenticatedUserId) return notFound();
          return { strategyDefinitionId: id, strategyDefinitionVersion: definition.version };
        });
        const value: CompositeStrategyDefinition = {
          ...compositeDefinition(context.authenticatedUserId, `created-composite-${contexts.length}`),
          logicalFamilyKey: command.logicalFamilyKey,
          components,
        };
        composites.set(value.id, value);
        return copy(value);
      },
      readStrategyDefinition: async (context, id) => owned(context, definitions.get(id)),
      readCompositeDefinition: async (context, id) => owned(context, composites.get(id)),
      listStrategyDefinitions: async (context, page) => ({
        items: [...definitions.values()]
          .filter((value) => value.ownerUserId === context.authenticatedUserId)
          .slice(0, page.limit)
          .map(copy),
      }),
      listCompositeDefinitions: async (context, page) => ({
        items: [...composites.values()]
          .filter((value) => value.ownerUserId === context.authenticatedUserId)
          .slice(0, page.limit)
          .map(copy),
      }),
      resolveStrategy: async (definition) => ({
        name: definition.strategyName,
        category: "TREND",
        analyze: () => ({ signal: "HOLD", signalAt: FIXED_NOW, visualization: [] }),
      }),
      combineSignals: () => "HOLD",
    },
  };
}

const MARKET_INPUT: MarketInputSelection = {
  pair: "BTCUSDT",
  timeframe: "1h",
  range: RANGE,
};

const BACKTEST_CONFIGURATION: BacktestConfiguration = {
  executionProfileId: "BACKTEST_EXECUTION_V1",
  initialCapital: 1_000,
  feeRatePercent: 0.1,
  slippageBps: 0,
};

const PAPER_BACKTEST_CONFIGURATION: BacktestConfiguration = {
  executionProfileId: "BACKTEST_EXECUTION_V1",
  initialCapital: 1_000,
  feeRatePercent: 0,
  slippageBps: 0,
  paperExecution: SYNTHETIC_PAPER_EXECUTION,
};

function searchRun(ownerUserId: AuthenticatedUserId, searchRunId: string, scopeId: string): SearchRunStatus {
  return {
    searchRunId,
    ownerUserId,
    generatorType: "RANDOM",
    randomSeed: `${searchRunId}-seed`,
    searchSpace: {
      availableStrategyDefinitionIds: ["strategy-a", "strategy-b"],
      componentCount: { minimum: 2, maximum: 2 },
      requireDistinctComponents: true,
    },
    stopCondition: { maxCandidates: 1 },
    leaderboardScopeId: scopeId,
    candidateTemplate: { marketInput: copy(MARKET_INPUT), configuration: copy(BACKTEST_CONFIGURATION) },
    maxInFlight: 1,
    state: "COMPLETED",
    activeCandidateIds: [],
    submittedCandidateCount: 1,
    completedCandidateCount: 1,
    failedCandidateCount: 0,
    averageBacktestDurationMs: 12,
    currentTopLeaderboardEntryId: `entry-${ownerUserId === USER_A ? "a" : "b"}`,
    createdAt: FIXED_NOW,
    startedAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    endedAt: FIXED_NOW,
    stopReason: "MAX_CANDIDATES",
    seededDiscovery: {
      profileId: "RANDOM_V1",
      algorithmConfiguration: { fixture: true },
      datasetIdentity: { datasetId: "fixture-dataset", datasetVersion: "v1", provider: "binance" },
      code: { applicationVersion: "i02-fixture", gitCommit: "fixture-commit" },
      seed: `${searchRunId}-seed`,
      defaultBudget: { maxCandidates: 500, maxDurationSeconds: 300 },
    },
  };
}

function candidate(ownerUserId: AuthenticatedUserId, candidateId: string, searchRunId: string, scopeId: string): CandidateProgress {
  return {
    candidateId,
    ownerUserId,
    origin: { kind: "SEARCH", searchRunId, leaderboardScopeId: scopeId, iterationNumber: 1 },
    strategySelection: {
      kind: "STRATEGY",
      strategyDefinitionId: ownerUserId === USER_A ? "strategy-a" : "strategy-b",
    },
    marketInput: copy(MARKET_INPUT),
    status: "SUCCEEDED",
    experimentId: ownerUserId === USER_A ? "experiment-a" : "experiment-b",
    createdAt: FIXED_NOW,
    startedAt: FIXED_NOW,
    completedAt: FIXED_NOW,
    durationMs: 12,
    updatedAt: FIXED_NOW,
  };
}

function trade(experimentId: string): Trade {
  return {
    id: `${experimentId}-trade-1`,
    experimentId,
    sequence: 1,
    pair: "BTCUSDT",
    entrySignalAt: "2026-01-01T00:00:00.000Z",
    entryTime: "2026-01-01T01:00:00.000Z",
    entryPrice: 100,
    exitSignalAt: "2026-01-01T01:30:00.000Z",
    exitTime: "2026-01-01T02:00:00.000Z",
    exitPrice: 99,
    positionMode: "SYNTHETIC_SHORT",
    exitReason: "STOP_LOSS",
    quantity: 1,
    notionalEntryValue: 100,
    grossProfit: 1,
    feeAmount: 0.16,
    slippageBps: 5,
    profit: 0.84,
    resultPercent: 0.84,
    result: "WIN",
  };
}

function experiment(
  ownerUserId: AuthenticatedUserId,
  experimentId: string,
  candidateId: string,
  searchRunId: string,
): Experiment {
  const definition = strategyDefinition(
    ownerUserId,
    ownerUserId === USER_A ? "strategy-a" : "strategy-b",
  );
  const unavailableInputs: ["HISTORICAL_DATA", "EXECUTABLE_CODE"] = ["HISTORICAL_DATA", "EXECUTABLE_CODE"];
  return {
    id: experimentId,
    candidateId,
    searchRunId,
    strategy: { kind: "STRATEGY", definition },
    marketData: {
      provider: "binance",
      pair: "BTCUSDT",
      timeframe: "1h",
      range: copy(RANGE),
      replayGuarantee: "TRACEABLE",
      datasetId: "fixture-dataset",
      datasetVersion: "v1",
      replayLimitation: "fixture-only evidence; final mode is not proven",
    },
    configuration: copy(PAPER_BACKTEST_CONFIGURATION),
    metrics: {
      candidateId,
      totalReturnPercent: 0.84,
      winRatePercent: 100,
      numberOfTrades: 1,
      maxDrawdownMagnitudePercent: 0,
      evaluationProfileId: "REQUIRED_METRICS_V1",
    },
    rankingConfigurationId: RANKING_CONFIGURATION_ID,
    code: { applicationVersion: "i02-fixture", gitCommit: "fixture-commit" },
    replay: {
      guarantee: "TRACEABLE",
      unavailableInputs,
      limitation: "fixture-only evidence; exact replay is not claimed",
    },
    visualization: {
      signals: [
        {
          source: { kind: "STRATEGY", strategyDefinitionId: definition.id },
          timestamp: "2026-01-01T00:00:00.000Z",
          signal: "SELL",
          executionNotBefore: "2026-01-01T01:00:00.000Z",
        },
        {
          source: { kind: "STRATEGY", strategyDefinitionId: definition.id },
          timestamp: "2026-01-01T01:30:00.000Z",
          signal: "BUY",
          executionNotBefore: "2026-01-01T02:00:00.000Z",
        },
      ],
      overlays: [{
        strategyDefinitionId: definition.id,
        point: {
          descriptorId: "ma-overlay",
          timestamp: "2026-01-01T01:00:00.000Z",
          values: { fast: 100, slow: 101 },
        },
      }],
      tradeMarkers: [
        {
          tradeId: `${experimentId}-trade-1`,
          kind: "ENTRY",
          timestamp: "2026-01-01T01:00:00.000Z",
          price: 100,
        },
        {
          tradeId: `${experimentId}-trade-1`,
          kind: "EXIT",
          timestamp: "2026-01-01T02:00:00.000Z",
          price: 99,
        },
      ],
    },
    createdAt: FIXED_NOW,
    paperExecutionProvenance: SYNTHETIC_PAPER_EXECUTION,
  };
}

interface SearchFixture {
  readonly api: SearchModulePublicApi;
  readonly contexts: AuthenticatedRequestContext[];
}

function createSearchFixture(): SearchFixture {
  const runs = new Map<string, SearchRunStatus>([
    ["search-a", searchRun(USER_A, "search-a", "scope-a")],
    ["search-b", searchRun(USER_B, "search-b", "scope-b")],
  ]);
  const contexts: AuthenticatedRequestContext[] = [];
  const ownedRun = (context: AuthenticatedRequestContext, id: string): SearchRunStatus => {
    const value = runs.get(id);
    if (!value || value.ownerUserId !== context.authenticatedUserId) return notFound();
    return copy(value);
  };

  return {
    contexts,
    api: {
      start: async (context) => {
        contexts.push(copy(context));
        return { searchRunId: `created-search-${contexts.length}` };
      },
      pause: async (context, id) => { ownedRun(context, id); },
      resume: async (context, id) => { ownedRun(context, id); },
      cancel: async (context, id) => { ownedRun(context, id); },
      status: async (context, id) => ownedRun(context, id),
      list: async (context, page) => ({
        items: [...runs.values()]
          .filter((value) => value.ownerUserId === context.authenticatedUserId)
          .slice(0, page.limit)
          .map(copy),
      }),
      leaderboard: async (context, searchRunId): Promise<readonly SearchRunRankingEntry[]> => {
        const run = ownedRun(context, searchRunId);
        return [{
          rank: 1,
          searchRunId: run.searchRunId,
          leaderboardScopeId: run.leaderboardScopeId,
          candidateId: run.ownerUserId === USER_A ? "candidate-a" : "candidate-b",
          experimentId: run.ownerUserId === USER_A ? "experiment-a" : "experiment-b",
          rankingConfigurationId: RANKING_CONFIGURATION_ID,
          score: 0.84,
        }];
      },
    },
  };
}

interface BacktestingFixture {
  readonly api: BacktestingModulePublicApi;
  readonly contexts: AuthenticatedRequestContext[];
}

function createBacktestingFixture(): BacktestingFixture {
  const candidates = new Map<string, CandidateProgress>([
    ["candidate-a", candidate(USER_A, "candidate-a", "search-a", "scope-a")],
    ["candidate-b", candidate(USER_B, "candidate-b", "search-b", "scope-b")],
  ]);
  const experiments = new Map<string, Experiment>([
    ["experiment-a", experiment(USER_A, "experiment-a", "candidate-a", "search-a")],
    ["experiment-b", experiment(USER_B, "experiment-b", "candidate-b", "search-b")],
  ]);
  const trades = new Map<string, Trade>([
    ["experiment-a", trade("experiment-a")],
    ["experiment-b", trade("experiment-b")],
  ]);
  const contexts: AuthenticatedRequestContext[] = [];

  function ownedCandidate(context: AuthenticatedRequestContext, id: string): CandidateProgress {
    const value = candidates.get(id);
    if (!value || value.ownerUserId !== context.authenticatedUserId) return notFound();
    return copy(value);
  }

  function ownedExperiment(context: AuthenticatedRequestContext, id: string): Experiment {
    const value = experiments.get(id);
    if (!value || value.strategy.kind !== "STRATEGY" || value.strategy.definition.ownerUserId !== context.authenticatedUserId) {
      return notFound();
    }
    return copy(value);
  }

  function ownedSearchRun(context: AuthenticatedRequestContext, id: string): void {
    const owner = id === "search-a" ? USER_A : id === "search-b" ? USER_B : undefined;
    if (owner !== context.authenticatedUserId) return notFound();
  }

  return {
    contexts,
    api: {
      startManual: async (context) => {
        contexts.push(copy(context));
        return { candidateId: `manual-${context.authenticatedUserId === USER_A ? "a" : "b"}`, status: "ACCEPTED" };
      },
      submitSearchCandidate: async (context) => {
        contexts.push(copy(context));
        return { candidateId: `submitted-${contexts.length}`, status: "ACCEPTED" };
      },
      status: async (context, id) => ownedCandidate(context, id),
      summarizeSearchCandidates: async (context, searchRunId) => {
        ownedSearchRun(context, searchRunId);
        const owner = context.authenticatedUserId;
        return {
          searchRunId,
          activeCandidateIds: [],
          submittedCandidateCount: 1,
          completedCandidateCount: owner === USER_A || owner === USER_B ? 1 : 0,
          failedCandidateCount: 0,
          averageBacktestDurationMs: 12,
        };
      },
      listSearchCandidates: async (context, searchRunId, page) => {
        ownedSearchRun(context, searchRunId);
        return {
          items: [...candidates.values()]
            .filter((value) => value.ownerUserId === context.authenticatedUserId && value.origin.kind === "SEARCH" && value.origin.searchRunId === searchRunId)
            .slice(0, page.limit)
            .map(copy),
        };
      },
      cancelSearchCandidates: async (context, searchRunId) => {
        ownedSearchRun(context, searchRunId);
        return { candidateIds: [] };
      },
      cancelCandidate: async (context, candidateId) => { ownedCandidate(context, candidateId); },
      readExperiment: async (context, experimentId) => ownedExperiment(context, experimentId),
      listSearchExperiments: async (context, searchRunId) => {
        ownedSearchRun(context, searchRunId);
        return [...experiments.values()]
          .filter((value) => value.searchRunId === searchRunId && value.strategy.kind === "STRATEGY" && value.strategy.definition.ownerUserId === context.authenticatedUserId)
          .map(copy);
      },
      listExperimentTrades: async (context, experimentId, page) => {
        ownedExperiment(context, experimentId);
        const value = trades.get(experimentId);
        return { items: value === undefined ? [] : [copy(value)].slice(0, page.limit) };
      },
    },
  };
}

function rankingConfiguration(): RankingConfiguration {
  return {
    id: RANKING_CONFIGURATION_ID,
    profileId: LINEAR_REQUIRED_V1.id,
    version: LINEAR_REQUIRED_V1.version,
    name: "Fixture ranking",
    formula: { ...LINEAR_REQUIRED_V1.formula },
    minimumNumberOfTrades: LINEAR_REQUIRED_V1.eligibility.minimumNumberOfTrades,
    tieBreakers: LINEAR_REQUIRED_V1.tieBreakers,
    createdAt: FIXED_NOW,
  };
}

interface LeaderboardFixture {
  readonly api: LeaderboardModulePublicApi;
  readonly contexts: AuthenticatedRequestContext[];
}

function createLeaderboardFixture(): LeaderboardFixture {
  const configuration = rankingConfiguration();
  const scopes = new Map<string, LeaderboardScope>([
    ["scope-a", { id: "scope-a", ownerUserId: USER_A, name: "A scope", k: 10, rankingConfigurationId: configuration.id, comparisonKey: "BTCUSDT|1h", createdAt: FIXED_NOW }],
    ["scope-b", { id: "scope-b", ownerUserId: USER_B, name: "B scope", k: 10, rankingConfigurationId: configuration.id, comparisonKey: "BTCUSDT|1h", createdAt: FIXED_NOW }],
  ]);
  const entries = new Map<string, LeaderboardEntry>([
    ["entry-a", { id: "entry-a", rank: 1, candidateId: "candidate-a", searchRunId: "search-a", experimentId: "experiment-a", leaderboardScopeId: "scope-a", rankingConfigurationId: configuration.id, score: 0.84, addedAt: FIXED_NOW }],
    ["entry-b", { id: "entry-b", rank: 1, candidateId: "candidate-b", searchRunId: "search-b", experimentId: "experiment-b", leaderboardScopeId: "scope-b", rankingConfigurationId: configuration.id, score: 0.84, addedAt: FIXED_NOW }],
  ]);
  const contexts: AuthenticatedRequestContext[] = [];

  function ownedScope(context: AuthenticatedRequestContext, id: string): LeaderboardScope {
    const value = scopes.get(id);
    if (!value || value.ownerUserId !== context.authenticatedUserId) return notFound();
    return copy(value);
  }

  return {
    contexts,
    api: {
      createLeaderboardScope: async (context, command) => {
        contexts.push(copy(context));
        const value: LeaderboardScope = {
          id: `created-scope-${contexts.length}`,
          ownerUserId: context.authenticatedUserId,
          name: command.name,
          k: command.k ?? 10,
          rankingConfigurationId: command.rankingConfigurationId,
          comparisonKey: command.comparisonKey,
          createdAt: FIXED_NOW,
        };
        scopes.set(value.id, value);
        return copy(value);
      },
      getLeaderboardScope: async (context, id) => ownedScope(context, id),
      getRankingConfiguration: async (id) => {
        if (id !== configuration.id) return notFound();
        return copy(configuration);
      },
      listRankingConfigurations: async () => [copy(configuration)],
      score: (leaderboardScopeId, metrics) => ({
        ...(metrics.numberOfTrades > 0
          ? {
              leaderboardScopeId,
              rankingConfigurationId: configuration.id,
              overallScore: metrics.totalReturnPercent,
              rankEligible: true as const,
            }
          : {
              leaderboardScopeId,
              rankingConfigurationId: configuration.id,
              overallScore: 0,
              rankEligible: false as const,
              rankExclusionReason: "NO_TRADES" as const,
            }),
      }),
      topK: async (context, scopeId) => {
        const scope = ownedScope(context, scopeId);
        return [...entries.values()]
          .filter((entry) => entry.leaderboardScopeId === scope.id)
          .map(copy);
      },
      rankSearchRun: async (context, searchRunId) => {
        const scopeId = searchRunId === "search-a" ? "scope-a" : searchRunId === "search-b" ? "scope-b" : "missing";
        ownedScope(context, scopeId);
        return [...entries.values()]
          .filter((entry) => entry.searchRunId === searchRunId)
          .map((entry): SearchRunRankingEntry => ({
            rank: entry.rank,
            searchRunId,
            leaderboardScopeId: entry.leaderboardScopeId,
            candidateId: entry.candidateId,
            experimentId: entry.experimentId,
            rankingConfigurationId: entry.rankingConfigurationId,
            score: entry.score,
          }));
      },
      submit: async (context, submission) => {
        ownedScope(context, submission.leaderboardScopeId);
        return { admitted: false };
      },
    },
  };
}

interface MarketFixture {
  runtime: MarketDataModuleRuntime;
  readonly observability: MarketObservabilityState;
  readonly setHistoryFailure: (value: boolean) => void;
  sink?: (update: MarketDataUpdate) => void;
  subscriptions?: readonly { pair: string; timeframe: string }[];
}

function createMarketFixture(): MarketFixture {
  let historyFailure = false;
  const fixture: MarketFixture = {
    runtime: undefined as unknown as MarketDataModuleRuntime,
    observability: {
      profileId: "MARKET_OBSERVABILITY_V1",
      pair: "BTCUSDT",
      connection: { provider: "binance", status: "CONNECTED", lastEventAt: FIXED_NOW },
      lastLatencyMs: 23,
      latestTicks: [{
        pair: "BTCUSDT",
        price: 101,
        timestamp: FIXED_NOW,
        providerEventAt: "2026-09-01T00:00:00.001Z",
        receivedAt: "2026-09-01T00:00:00.024Z",
        latencyMs: 23,
      }],
      persistence: "EPHEMERAL_IN_MEMORY_ONLY",
    },
    setHistoryFailure: (value) => { historyFailure = value; },
  };
  const candle = {
    pair: "BTCUSDT",
    timeframe: "1h" as const,
    timestamp: "2026-01-01T00:00:00.000Z",
    open: 100,
    high: 102,
    low: 99,
    close: 101,
    volume: 10,
    isClosed: true,
  };
  const history: HistoricalCandlePage = {
    pair: "BTCUSDT",
    timeframe: "1h",
    range: copy(RANGE),
    candles: [candle],
    complete: true,
    missingRanges: [],
    formingIncluded: false,
    asOf: FIXED_NOW,
    provenance: {
      provider: "binance",
      pair: "BTCUSDT",
      timeframe: "1h",
      range: copy(RANGE),
      replayGuarantee: "TRACEABLE",
      replayLimitation: "fixture-only evidence",
    },
  };
  fixture.runtime = {
    readCandles: async () => {
      if (historyFailure) throw codedError("PROVIDER_UNAVAILABLE");
      return copy(history);
    },
    createDatasetSnapshot: async () => { throw codedError("PERSISTENCE_UNAVAILABLE"); },
    readDatasetSnapshot: async () => { throw codedError("PERSISTENCE_UNAVAILABLE"); },
    subscribeMarketData: async (
      subscriptions: Parameters<MarketDataModuleRuntime["subscribeMarketData"]>[0],
      sink: Parameters<MarketDataModuleRuntime["subscribeMarketData"]>[1],
    ) => {
      fixture.subscriptions = copy(subscriptions);
      fixture.sink = sink;
      sink({ kind: "CONNECTION_STATUS", payload: { provider: "binance", status: "CONNECTED", lastEventAt: FIXED_NOW } });
      return async () => undefined;
    },
    readObservability: async () => copy(fixture.observability),
    shutdown: async () => undefined,
  };
  return fixture;
}

function createRuntimeFixture(): {
  runtime: BackendRuntime;
  auth: AuthFixture;
  strategy: StrategyFixture;
  search: SearchFixture;
  backtesting: BacktestingFixture;
  leaderboard: LeaderboardFixture;
  market: MarketFixture;
} {
  const auth = createAuthFixture();
  const strategy = createStrategyFixture();
  const search = createSearchFixture();
  const backtesting = createBacktestingFixture();
  const leaderboard = createLeaderboardFixture();
  const market = createMarketFixture();
  const runtime = createBackendRuntime({
    auth: auth.api,
    strategy: strategy.api,
    search: search.api,
    backtesting: backtesting.api,
    leaderboard: leaderboard.api,
    marketData: market.runtime,
    databaseReady: true,
  });
  return { runtime, auth, strategy, search, backtesting, leaderboard, market };
}

async function startHttpApp(runtime: BackendRuntime): Promise<{ app: INestApplication; baseUrl: string }> {
  @Module({
    controllers: [HealthController, AuthController, CapabilitiesController],
    providers: [
      { provide: BACKEND_RUNTIME_TOKEN, useValue: runtime },
      { provide: AUTH_RUNTIME_TOKEN, useExisting: BACKEND_RUNTIME_TOKEN },
    ],
  })
  class I02BackendTestModule {}

  const app = await NestFactory.create(I02BackendTestModule, { logger: false });
  await app.listen(0, "127.0.0.1");
  const address = app.getHttpServer().address() as { port: number } | string | null;
  if (!address || typeof address === "string") throw new Error("I-02 fixture app did not bind");
  return { app, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function jsonRequest(baseUrl: string, path: string, init?: RequestInit): Promise<{ response: Response; body: unknown }> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  return { response, body: text.length === 0 ? undefined : JSON.parse(text) as unknown };
}

function cookiePair(value: string | null): string {
  if (!value) throw new Error("expected a session cookie");
  return value.split(";", 1)[0]!;
}

function authHeaders(cookie: string): HeadersInit {
  return { cookie };
}

function backtestRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    leaderboardScopeId: "scope-a",
    strategySelection: { kind: "STRATEGY", strategyDefinitionId: "strategy-a" },
    marketInput: { pair: "BTCUSDT", timeframe: "1h", range: RANGE },
    configuration: BACKTEST_CONFIGURATION,
    ...overrides,
  };
}

function searchRequest(): Record<string, unknown> {
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    searchSpace: {
      availableStrategyDefinitionIds: ["strategy-a", "strategy-b"],
      componentCount: { minimum: 2, maximum: 2 },
      requireDistinctComponents: true,
    },
    stopCondition: { maxCandidates: 1 },
    generatorType: "RANDOM",
    randomSeed: "http-fixture-seed",
    leaderboardScopeId: "scope-a",
    candidateTemplate: {
      marketInput: { pair: "BTCUSDT", timeframe: "1h", range: RANGE },
      configuration: BACKTEST_CONFIGURATION,
    },
    maxInFlight: 1,
    seededDiscovery: {
      profileId: "RANDOM_V1",
      algorithmConfiguration: {},
      datasetIdentity: { datasetId: "fixture-dataset", datasetVersion: "v1", provider: "binance" },
      code: { applicationVersion: "i02-fixture", gitCommit: "fixture-commit" },
      seed: "http-fixture-seed",
      defaultBudget: { maxCandidates: 500, maxDurationSeconds: 300 },
    },
  };
}

describe("INS-142 / I-02 backend boundary evidence (fixture-only)", () => {
  let fixture: ReturnType<typeof createRuntimeFixture>;
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    fixture = createRuntimeFixture();
    ({ app, baseUrl } = await startHttpApp(fixture.runtime));
  });

  afterAll(async () => {
    await app.close();
    await fixture.runtime.close();
  });

  it("covers Auth HTTP session behavior and trusted identity without exposing the opaque token", async () => {
    const registered = await jsonRequest(baseUrl, "/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost" },
      body: JSON.stringify({
        schemaVersion: REST_SCHEMA_VERSION,
        email: "  Registered.User@Example.Test  ",
        password: "registered-password",
      }),
    });
    expect(registered.response.status).toBe(200);
    expect(registered.body).toMatchObject({ schemaVersion: REST_SCHEMA_VERSION, user: { email: "registered.user@example.test" } });
    expect(registered.body).not.toHaveProperty("opaqueToken");
    const registeredCookie = cookiePair(registered.response.headers.get("set-cookie"));
    const registeredSetCookie = registered.response.headers.get("set-cookie") ?? "";
    expect(registeredSetCookie).toContain("HttpOnly");
    expect(registeredSetCookie).toContain("SameSite=Lax");
    expect(registeredSetCookie).toContain("Path=/");
    expect(registeredSetCookie).toContain("Max-Age=86400");
    expect(registeredSetCookie).not.toContain("Domain=");
    expect(registeredSetCookie).not.toContain("Secure");

    const registeredCurrent = await jsonRequest(baseUrl, "/auth/current-user", {
      headers: authHeaders(registeredCookie),
    });
    expect(registeredCurrent.response.status).toBe(200);
    expect(registeredCurrent.body).toMatchObject({ user: { id: REGISTERED_USER, email: "registered.user@example.test" } });

    const login = await jsonRequest(baseUrl, "/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemaVersion: REST_SCHEMA_VERSION, email: " OWNER-A@EXAMPLE.TEST ", password: "owner-a-password" }),
    });
    expect(login.response.status).toBe(200);
    expect(login.body).toMatchObject({ user: { id: USER_A, email: "owner-a@example.test" } });
    expect(login.body).not.toHaveProperty("opaqueToken");
    const loginCookie = cookiePair(login.response.headers.get("set-cookie"));

    const current = await jsonRequest(baseUrl, "/auth/current-user", { headers: authHeaders(loginCookie) });
    expect(current.response.status).toBe(200);
    expect(current.body).toMatchObject({ user: { id: USER_A, email: "owner-a@example.test" } });
    expect(fixture.auth.currentUserContexts.at(-1)).toEqual({ authenticatedUserId: USER_A });

    const invalidExisting = await jsonRequest(baseUrl, "/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemaVersion: REST_SCHEMA_VERSION, email: "owner-a@example.test", password: "wrong-password" }),
    });
    const invalidMissing = await jsonRequest(baseUrl, "/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemaVersion: REST_SCHEMA_VERSION, email: "missing@example.test", password: "wrong-password" }),
    });
    expect(invalidExisting.response.status).toBe(401);
    expect(invalidMissing.response.status).toBe(401);
    expect(invalidExisting.body).toEqual(invalidMissing.body);

    const loggedOut = await jsonRequest(baseUrl, "/auth/logout", {
      method: "POST",
      headers: authHeaders(loginCookie),
    });
    expect(loggedOut.response.status).toBe(200);
    expect(loggedOut.body).toEqual({ schemaVersion: REST_SCHEMA_VERSION, authenticated: false });
    expect(loggedOut.response.headers.get("set-cookie")).toContain("Max-Age=0");
    const revoked = await jsonRequest(baseUrl, "/auth/current-user", { headers: authHeaders(loginCookie) });
    expect(revoked.response.status).toBe(401);
    expect((await jsonRequest(baseUrl, "/auth/logout", { method: "POST", headers: authHeaders(loginCookie) })).response.status).toBe(200);
  });

  it("rejects unauthenticated and cross-owner private reads while filtering collections by trusted owner", async () => {
    const unauthenticatedPaths = [
      "/strategy/definitions",
      "/strategy/composites",
      "/search/runs",
      "/search/runs/search-a",
      "/backtesting/candidates/candidate-a",
      "/backtesting/search-runs/search-a/candidates",
      "/backtesting/experiments?searchRunId=search-a",
      "/backtesting/experiments/experiment-a",
      "/backtesting/experiments/experiment-a/trades",
      "/leaderboard?scopeId=scope-a",
    ];
    for (const path of unauthenticatedPaths) {
      const response = await jsonRequest(baseUrl, path);
      expect(response.response.status, path).toBe(401);
      expect(response.body, path).toMatchObject({ error: { code: "UNAUTHENTICATED" } });
    }

    const unauthenticatedCommands: Array<{ path: string; body: Record<string, unknown> }> = [
      {
        path: "/strategy/definitions",
        body: {
          schemaVersion: REST_SCHEMA_VERSION,
          logicalFamilyKey: "unauthenticated",
          strategyName: "MA",
          parameters: { fastPeriod: 1, slowPeriod: 2 },
        },
      },
      {
        path: "/strategy/composites",
        body: {
          schemaVersion: REST_SCHEMA_VERSION,
          logicalFamilyKey: "unauthenticated-composite",
          combinationProfileId: "MAJORITY_VOTE_V1",
          strategyDefinitionIds: ["strategy-a", "strategy-a-2"],
        },
      },
      { path: "/backtesting", body: backtestRequest() },
      { path: "/search/runs", body: searchRequest() },
      {
        path: "/leaderboard/scopes",
        body: {
          schemaVersion: REST_SCHEMA_VERSION,
          name: "Unauthenticated scope",
          rankingConfigurationId: RANKING_CONFIGURATION_ID,
          comparisonKey: "BTCUSDT|1h",
        },
      },
    ];
    for (const { path, body } of unauthenticatedCommands) {
      const response = await jsonRequest(baseUrl, path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(response.response.status, path).toBe(401);
      expect(response.body, path).toMatchObject({ error: { code: "UNAUTHENTICATED" } });
    }

    const ownerA = authHeaders("cryptox_session=token-a");
    const ownerB = authHeaders("cryptox_session=token-b");
    const aDefinitions = await jsonRequest(baseUrl, "/strategy/definitions", { headers: ownerA });
    const bDefinitions = await jsonRequest(baseUrl, "/strategy/definitions", { headers: ownerB });
    expect((aDefinitions.body as { items: Array<{ id: string }> }).items.map(({ id }) => id)).toEqual(["strategy-a", "strategy-a-2"]);
    expect((bDefinitions.body as { items: Array<{ id: string }> }).items.map(({ id }) => id)).toEqual(["strategy-b", "strategy-b-2"]);
    expect(JSON.stringify(bDefinitions.body)).not.toContain("strategy-a");

    const aComposites = await jsonRequest(baseUrl, "/strategy/composites", { headers: ownerA });
    const bComposites = await jsonRequest(baseUrl, "/strategy/composites", { headers: ownerB });
    expect((aComposites.body as { items: Array<{ id: string }> }).items.map(({ id }) => id)).toEqual(["composite-a"]);
    expect((bComposites.body as { items: Array<{ id: string }> }).items.map(({ id }) => id)).toEqual(["composite-b"]);

    const bRuns = await jsonRequest(baseUrl, "/search/runs", { headers: ownerB });
    expect((bRuns.body as { items: Array<{ searchRunId: string }> }).items.map(({ searchRunId }) => searchRunId)).toEqual(["search-b"]);
    const bCandidates = await jsonRequest(baseUrl, "/backtesting/search-runs/search-b/candidates", { headers: ownerB });
    expect((bCandidates.body as { items: Array<{ candidateId: string }> }).items.map(({ candidateId }) => candidateId)).toEqual(["candidate-b"]);
    const bExperiments = await jsonRequest(baseUrl, "/backtesting/experiments?searchRunId=search-b", { headers: ownerB });
    expect((bExperiments.body as { items: Array<{ id: string }> }).items.map(({ id }) => id)).toEqual(["experiment-b"]);
    const bTrades = await jsonRequest(baseUrl, "/backtesting/experiments/experiment-b/trades", { headers: ownerB });
    expect((bTrades.body as { items: Array<{ experimentId: string }> }).items[0]).toMatchObject({ experimentId: "experiment-b" });

    const crossOwnerPaths = [
      "/strategy/definitions",
      "/search/runs/search-a",
      "/backtesting/candidates/candidate-a",
      "/backtesting/search-runs/search-a/candidates",
      "/backtesting/experiments?searchRunId=search-a",
      "/backtesting/experiments/experiment-a",
      "/backtesting/experiments/experiment-a/trades",
      "/leaderboard?scopeId=scope-a",
    ];
    for (const path of crossOwnerPaths.slice(1)) {
      const response = await jsonRequest(baseUrl, path, { headers: ownerB });
      expect(response.response.status, path).toBe(404);
      expect(response.body, path).toMatchObject({ error: { code: "NOT_FOUND" } });
    }
    const ownerALeaderboard = await jsonRequest(baseUrl, "/leaderboard?scopeId=scope-a", { headers: ownerA });
    expect(ownerALeaderboard.response.status).toBe(200);
    expect(ownerALeaderboard.body).toMatchObject({ entries: [{ experimentId: "experiment-a" }] });
  });

  it("uses server identity for private commands and sanitizes provider failure projections", async () => {
    const createdStrategy = await jsonRequest(baseUrl, "/strategy/definitions", {
      method: "POST",
      headers: { ...authHeaders("cryptox_session=token-a"), "content-type": "application/json" },
      body: JSON.stringify({
        schemaVersion: REST_SCHEMA_VERSION,
        logicalFamilyKey: "http-created",
        strategyName: "MA",
        parameters: { fastPeriod: 1, slowPeriod: 2 },
      }),
    });
    expect(createdStrategy.response.status).toBe(200);
    expect(createdStrategy.body).toMatchObject({ definition: { ownerUserId: USER_A } });
    expect(fixture.strategy.contexts.at(-1)).toEqual({ authenticatedUserId: USER_A });

    const spoofed = await jsonRequest(baseUrl, "/backtesting", {
      method: "POST",
      headers: { ...authHeaders("cryptox_session=token-a"), "content-type": "application/json" },
      body: JSON.stringify(backtestRequest({ ownerUserId: USER_B })),
    });
    expect(spoofed.response.status).toBe(400);
    expect(spoofed.body).toMatchObject({ error: { code: "INVALID_REQUEST" } });

    const accepted = await jsonRequest(baseUrl, "/backtesting", {
      method: "POST",
      headers: { ...authHeaders("cryptox_session=token-a"), "content-type": "application/json" },
      body: JSON.stringify(backtestRequest()),
    });
    expect(accepted.response.status).toBe(200);
    expect(accepted.body).toMatchObject({ status: "ACCEPTED", candidateId: "manual-a" });
    expect(fixture.backtesting.contexts.at(-1)).toEqual({ authenticatedUserId: USER_A });

    const started = await jsonRequest(baseUrl, "/search/runs", {
      method: "POST",
      headers: { ...authHeaders("cryptox_session=token-a"), "content-type": "application/json" },
      body: JSON.stringify(searchRequest()),
    });
    expect(started.response.status).toBe(200);
    expect(fixture.search.contexts.at(-1)).toEqual({ authenticatedUserId: USER_A });

    const createdScope = await jsonRequest(baseUrl, "/leaderboard/scopes", {
      method: "POST",
      headers: { ...authHeaders("cryptox_session=token-a"), "content-type": "application/json" },
      body: JSON.stringify({ schemaVersion: REST_SCHEMA_VERSION, name: "HTTP scope", rankingConfigurationId: RANKING_CONFIGURATION_ID, comparisonKey: "BTCUSDT|1h" }),
    });
    expect(createdScope.response.status).toBe(200);
    expect(createdScope.body).toMatchObject({ scope: { ownerUserId: USER_A } });
    expect(fixture.leaderboard.contexts.at(-1)).toEqual({ authenticatedUserId: USER_A });

    fixture.market.setHistoryFailure(true);
    const failedHistory = await jsonRequest(baseUrl, "/market-data/history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schemaVersion: REST_SCHEMA_VERSION,
        pair: "BTCUSDT",
        timeframe: "1h",
        range: RANGE,
        completeness: "ALLOW_PARTIAL",
      }),
    });
    expect(failedHistory.response.status).toBe(503);
    expect(failedHistory.body).toMatchObject({ error: { code: "PROVIDER_UNAVAILABLE" } });
    expect(JSON.stringify(failedHistory.body)).not.toContain(PROVIDER_DETAIL_MARKER);
    expect(fixture.runtime.readiness().unavailableRequired.map(({ name }) => name)).toContain("market-data-provider");

    const requiredAfterProviderFailure = fixture.runtime.composition().requiredDependencies;
    fixture.runtime.markFailure("news-provider", PROVIDER_DETAIL_MARKER);
    fixture.runtime.markFailure("sentiment-provider", PROVIDER_DETAIL_MARKER);
    const composition = fixture.runtime.composition();
    expect(composition.requiredDependencies).toEqual(requiredAfterProviderFailure);
    expect(composition.optionalDependencies.find(({ name }) => name === "news-provider")).toMatchObject({ available: false });
    expect(composition.optionalDependencies.find(({ name }) => name === "sentiment-provider")).toMatchObject({ available: false });
    expect(JSON.stringify(composition)).not.toContain(PROVIDER_DETAIL_MARKER);
  });

  it("projects definitions, bounded Random Search progress, owner-scoped Top-K, and a selected paper Experiment", async () => {
    const ownerA = authHeaders("cryptox_session=token-a");
    const ownerB = authHeaders("cryptox_session=token-b");

    fixture.market.setHistoryFailure(false);
    const history = await jsonRequest(baseUrl, "/market-data/history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schemaVersion: REST_SCHEMA_VERSION,
        pair: "btcusdt",
        timeframe: "1h",
        range: RANGE,
        completeness: "REQUIRE_COMPLETE",
      }),
    });
    expect(history.response.status).toBe(200);
    expect(history.body).toMatchObject({
      schemaVersion: REST_SCHEMA_VERSION,
      pair: "BTCUSDT",
      timeframe: "1h",
      range: RANGE,
      candles: [{ pair: "BTCUSDT", timeframe: "1h", close: 101, isClosed: true }],
      complete: true,
      missingRanges: [],
      formingIncluded: false,
      provenance: {
        provider: "binance",
        pair: "BTCUSDT",
        timeframe: "1h",
        range: RANGE,
        replayGuarantee: "TRACEABLE",
        replayLimitation: "fixture-only evidence",
      },
    });

    const catalog = await jsonRequest(baseUrl, "/strategy/catalog");
    expect(catalog.response.status).toBe(200);
    expect(catalog.body).toMatchObject({
      schemaVersion: REST_SCHEMA_VERSION,
      items: expect.arrayContaining([
        expect.objectContaining({ name: "MA" }),
        expect.objectContaining({ name: "RSI" }),
        expect.objectContaining({ name: "BOLLINGER_BANDS" }),
        expect.objectContaining({ name: "SUPPORT_RESISTANCE" }),
      ]),
    });

    const createdComposite = await jsonRequest(baseUrl, "/strategy/composites", {
      method: "POST",
      headers: { ...ownerA, "content-type": "application/json" },
      body: JSON.stringify({
        schemaVersion: REST_SCHEMA_VERSION,
        logicalFamilyKey: "http-composite",
        combinationProfileId: "MAJORITY_VOTE_V1",
        strategyDefinitionIds: ["strategy-a-2", "strategy-a"],
      }),
    });
    expect(createdComposite.response.status).toBe(200);
    expect(createdComposite.body).toMatchObject({
      definition: {
        ownerUserId: USER_A,
        combinationProfileId: "MAJORITY_VOTE_V1",
        components: [
          { strategyDefinitionId: "strategy-a", strategyDefinitionVersion: 1 },
          { strategyDefinitionId: "strategy-a-2", strategyDefinitionVersion: 1 },
        ],
      },
    });
    const createdCompositeId = (createdComposite.body as { definition: { id: string } }).definition.id;
    expect(fixture.strategy.contexts.at(-1)).toEqual({ authenticatedUserId: USER_A });

    const crossOwnerComposite = await jsonRequest(baseUrl, "/strategy/composites", {
      method: "POST",
      headers: { ...ownerB, "content-type": "application/json" },
      body: JSON.stringify({
        schemaVersion: REST_SCHEMA_VERSION,
        logicalFamilyKey: "cross-owner-composite",
        combinationProfileId: "MAJORITY_VOTE_V1",
        strategyDefinitionIds: ["strategy-a", "strategy-a-2"],
      }),
    });
    expect(crossOwnerComposite.response.status).toBe(404);
    expect(crossOwnerComposite.body).toMatchObject({ error: { code: "NOT_FOUND" } });

    const aComposites = await jsonRequest(baseUrl, "/strategy/composites", { headers: ownerA });
    const bComposites = await jsonRequest(baseUrl, "/strategy/composites", { headers: ownerB });
    expect((aComposites.body as { items: Array<{ id: string }> }).items.map(({ id }) => id)).toContain(createdCompositeId);
    expect((bComposites.body as { items: Array<{ id: string }> }).items.map(({ id }) => id)).not.toContain(createdCompositeId);

    const searchStatus = await jsonRequest(baseUrl, "/search/runs/search-a", { headers: ownerA });
    expect(searchStatus.response.status).toBe(200);
    expect(searchStatus.body).toMatchObject({
      searchRun: {
        ownerUserId: USER_A,
        generatorType: "RANDOM",
        randomSeed: "search-a-seed",
        searchSpace: {
          availableStrategyDefinitionIds: ["strategy-a", "strategy-b"],
          componentCount: { minimum: 2, maximum: 2 },
          requireDistinctComponents: true,
        },
        stopCondition: { maxCandidates: 1 },
        maxInFlight: 1,
        state: "COMPLETED",
        activeCandidateIds: [],
        submittedCandidateCount: 1,
        completedCandidateCount: 1,
        failedCandidateCount: 0,
        stopReason: "MAX_CANDIDATES",
        seededDiscovery: {
          profileId: "RANDOM_V1",
          datasetIdentity: { datasetId: "fixture-dataset", datasetVersion: "v1", provider: "binance" },
          code: { applicationVersion: "i02-fixture", gitCommit: "fixture-commit" },
          defaultBudget: { maxCandidates: 500, maxDurationSeconds: 300 },
        },
      },
      ranking: [{
        rank: 1,
        searchRunId: "search-a",
        leaderboardScopeId: "scope-a",
        candidateId: "candidate-a",
        experimentId: "experiment-a",
        rankingConfigurationId: RANKING_CONFIGURATION_ID,
        score: 0.84,
      }],
    });

    const candidates = await jsonRequest(baseUrl, "/backtesting/search-runs/search-a/candidates", { headers: ownerA });
    expect(candidates.response.status).toBe(200);
    expect(candidates.body).toMatchObject({
      items: [{
        candidateId: "candidate-a",
        ownerUserId: USER_A,
        origin: { kind: "SEARCH", searchRunId: "search-a", leaderboardScopeId: "scope-a", iterationNumber: 1 },
        status: "SUCCEEDED",
        experimentId: "experiment-a",
      }],
    });
    expect(JSON.stringify(candidates.body)).not.toContain("candidate-b");

    const selected = await jsonRequest(baseUrl, "/backtesting/experiments/experiment-a", { headers: ownerA });
    expect(selected.response.status).toBe(200);
    expect(selected.body).toMatchObject({
      experiment: {
        id: "experiment-a",
        candidateId: "candidate-a",
        searchRunId: "search-a",
        strategy: { kind: "STRATEGY", definition: { id: "strategy-a", ownerUserId: USER_A } },
        marketData: {
          provider: "binance",
          pair: "BTCUSDT",
          timeframe: "1h",
          replayGuarantee: "TRACEABLE",
          datasetId: "fixture-dataset",
          datasetVersion: "v1",
        },
        configuration: {
          executionProfileId: "BACKTEST_EXECUTION_V1",
          paperExecutionProvenance: SYNTHETIC_PAPER_EXECUTION,
        },
        paperExecutionProvenance: SYNTHETIC_PAPER_EXECUTION,
        metrics: {
          totalReturnPercent: 0.84,
          winRatePercent: 100,
          numberOfTrades: 1,
          maxDrawdownMagnitudePercent: 0,
          evaluationProfileId: "REQUIRED_METRICS_V1",
        },
        rankingConfigurationId: RANKING_CONFIGURATION_ID,
        code: { applicationVersion: "i02-fixture", gitCommit: "fixture-commit" },
        replay: {
          guarantee: "TRACEABLE",
          unavailableInputs: ["HISTORICAL_DATA", "EXECUTABLE_CODE"],
        },
        visualization: {
          signals: [
            { source: { kind: "STRATEGY", strategyDefinitionId: "strategy-a" }, signal: "SELL" },
            { source: { kind: "STRATEGY", strategyDefinitionId: "strategy-a" }, signal: "BUY" },
          ],
          overlays: [{
            strategyDefinitionId: "strategy-a",
            point: { descriptorId: "ma-overlay", values: { fast: 100, slow: 101 } },
          }],
          tradeMarkers: [
            { tradeId: "experiment-a-trade-1", kind: "ENTRY", price: 100 },
            { tradeId: "experiment-a-trade-1", kind: "EXIT", price: 99 },
          ],
        },
      },
    });
    const experimentBody = (selected.body as { experiment: Record<string, unknown> }).experiment;
    const metrics = experimentBody.metrics as Record<string, number>;
    for (const field of ["totalReturnPercent", "winRatePercent", "numberOfTrades", "maxDrawdownMagnitudePercent"]) {
      expect(Number.isFinite(metrics[field]), field).toBe(true);
    }
    expect((experimentBody.marketData as Record<string, unknown>).replayLimitation).toEqual(
      "fixture-only evidence; final mode is not proven",
    );

    const searchExperiments = await jsonRequest(baseUrl, "/backtesting/experiments?searchRunId=search-a", { headers: ownerA });
    expect(searchExperiments.response.status).toBe(200);
    expect((searchExperiments.body as { items: Array<{ id: string }> }).items.map(({ id }) => id)).toEqual(["experiment-a"]);

    const trades = await jsonRequest(baseUrl, "/backtesting/experiments/experiment-a/trades", { headers: ownerA });
    expect(trades.response.status).toBe(200);
    expect(trades.body).toMatchObject({
      items: [{
        experimentId: "experiment-a",
        positionMode: "SYNTHETIC_SHORT",
        entryPrice: 100,
        exitPrice: 99,
        exitReason: "STOP_LOSS",
        feeAmount: 0.16,
        slippageBps: 5,
        profit: 0.84,
      }],
    });

    const ownerALeaderboard = await jsonRequest(baseUrl, "/leaderboard?scopeId=scope-a", { headers: ownerA });
    expect(ownerALeaderboard.response.status).toBe(200);
    expect(ownerALeaderboard.body).toMatchObject({
      scope: { id: "scope-a", ownerUserId: USER_A, k: 10 },
      rankingConfiguration: { id: RANKING_CONFIGURATION_ID, profileId: LINEAR_REQUIRED_V1.id },
      entries: [{ candidateId: "candidate-a", experimentId: "experiment-a", score: 0.84 }],
    });
    expect(JSON.stringify(ownerALeaderboard.body)).not.toContain("experiment-b");

    for (const path of [
      "/search/runs/search-a",
      "/backtesting/search-runs/search-a/candidates",
      "/backtesting/experiments/experiment-a",
      "/backtesting/experiments/experiment-a/trades",
      "/leaderboard?scopeId=scope-a",
    ]) {
      const response = await jsonRequest(baseUrl, path, { headers: ownerB });
      expect(response.response.status, path).toBe(404);
      expect(response.body, path).toMatchObject({ error: { code: "NOT_FOUND" } });
    }
  });
});

class TestSocket extends Duplex {
  public readonly writes: Buffer[] = [];

  public _read(): void {}

  public _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error) => void,
  ): void {
    this.writes.push(Buffer.isBuffer(chunk) ? Buffer.from(chunk) : Buffer.from(chunk, encoding));
    callback();
  }
}

function clientTextFrame(text: string): Buffer {
  const payload = Buffer.from(text, "utf8");
  const mask = Buffer.from([0x11, 0x22, 0x33, 0x44]);
  const masked = Buffer.from(payload);
  for (let index = 0; index < masked.length; index += 1) masked[index] = masked[index]! ^ mask[index % 4]!;
  if (payload.length < 126) return Buffer.concat([Buffer.from([0x81, 0x80 | payload.length]), mask, masked]);
  if (payload.length <= 0xffff) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
    return Buffer.concat([header, mask, masked]);
  }
  throw new Error("I-02 fixture frame is too large");
}

function serverTextFrames(socket: TestSocket): Array<{ type: string; payload: Record<string, unknown> }> {
  const bytes = Buffer.concat(socket.writes);
  const handshakeEnd = bytes.indexOf(Buffer.from("\r\n\r\n", "utf8"));
  if (handshakeEnd < 0) return [];
  const frames: Array<{ type: string; payload: Record<string, unknown> }> = [];
  let offset = handshakeEnd + 4;
  while (offset + 2 <= bytes.length) {
    const first = bytes[offset]!;
    const second = bytes[offset + 1]!;
    if ((first & 0x0f) !== 0x1 || (second & 0x80) !== 0) break;
    let length = second & 0x7f;
    let headerLength = 2;
    if (length === 126) {
      if (offset + 4 > bytes.length) break;
      length = bytes.readUInt16BE(offset + 2);
      headerLength = 4;
    }
    const end = offset + headerLength + length;
    if (end > bytes.length) break;
    frames.push(JSON.parse(bytes.subarray(offset + headerLength, end).toString("utf8")) as { type: string; payload: Record<string, unknown> });
    offset = end;
  }
  return frames;
}

function websocketRequest(cookie: string | undefined, path: string = MARKET_WEBSOCKET_PATH): IncomingMessage {
  return {
    url: `${path}?fixture=1`,
    headers: {
      host: "localhost",
      upgrade: "websocket",
      "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==",
      ...(cookie === undefined ? {} : { cookie }),
    },
  } as IncomingMessage;
}

async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("INS-142 / I-02 market WebSocket and final preflight evidence", () => {
  it("keeps WebSocket market-only and maps normalized ephemeral observability (fixture-only)", async () => {
    const auth = createAuthFixture();
    const market = createMarketFixture();
    const runtime = createBackendRuntime({ auth: auth.api, marketData: market.runtime, databaseReady: true });
    const server = new EventEmitter() as unknown as Server;
    runtime.marketWebSocket.attach(server);
    try {
      const unauthenticated = new TestSocket();
      server.emit("upgrade", websocketRequest(undefined), unauthenticated, Buffer.alloc(0));
      await flush();
      expect(Buffer.concat(unauthenticated.writes).toString("utf8")).toContain("HTTP/1.1 401 Unauthorized");

      const unknownPath = new TestSocket();
      server.emit("upgrade", websocketRequest("cryptox_session=token-a", "/events"), unknownPath, Buffer.alloc(0));
      await flush();
      expect(Buffer.concat(unknownPath.writes).toString("utf8")).toContain("HTTP/1.1 404 Not Found");

      const socket = new TestSocket();
      server.emit("upgrade", websocketRequest("cryptox_session=token-a"), socket, Buffer.alloc(0));
      await flush();
      expect(Buffer.concat(socket.writes).toString("utf8")).toContain("HTTP/1.1 101 Switching Protocols");
      socket.push(clientTextFrame(JSON.stringify({
        schemaVersion: REST_SCHEMA_VERSION,
        type: "SUBSCRIBE",
        requestId: "i02-subscribe",
        payload: { subscriptions: [{ pair: "btcusdt", timeframe: "5m" }] },
      })));
      await flush();
      expect(market.subscriptions).toEqual([{ pair: "BTCUSDT", timeframe: "5m" }]);

      market.sink?.({ kind: "TICK", payload: { pair: "BTCUSDT", price: 102, timestamp: FIXED_NOW } });
      await flush();
      const messages = serverTextFrames(socket);
      expect(messages.map(({ type }) => type)).toEqual(expect.arrayContaining([
        "CONNECTION_STATUS",
        "SUBSCRIPTION_ACK",
        "MARKET_OBSERVABILITY",
        "MARKET_TICK",
      ]));
      expect(messages.find(({ type }) => type === "SUBSCRIPTION_ACK")?.payload).toMatchObject({
        action: "SUBSCRIBE",
        accepted: [{ subscription: { pair: "BTCUSDT", timeframe: "5m" }, state: "ACTIVE" }],
      });
      expect(messages.find(({ type }) => type === "MARKET_TICK")?.payload).toMatchObject({ pair: "BTCUSDT", price: 102 });
      expect(messages.find(({ type }) => type === "MARKET_OBSERVABILITY")?.payload).toMatchObject({
        profileId: "MARKET_OBSERVABILITY_V1",
        pair: "BTCUSDT",
        lastLatencyMs: 23,
        latestTicks: [{ providerEventAt: "2026-09-01T00:00:00.001Z", receivedAt: "2026-09-01T00:00:00.024Z", latencyMs: 23 }],
        persistence: "EPHEMERAL_IN_MEMORY_ONLY",
      });
      expect(messages.some(({ type }) => type === "LEADERBOARD_UPDATED")).toBe(false);
      expect(JSON.stringify(messages)).not.toContain("leaderboard");
      expect(JSON.stringify(messages)).not.toContain(PROVIDER_DETAIL_MARKER);
    } finally {
      await runtime.close();
    }
  });

  it("distinguishes injected fixture readiness from final configured-mode preflight", async () => {
    const fixture = createRuntimeFixture();
    try {
      expect(fixture.runtime.readiness().status).toBe("ready");
      expect(fixture.runtime.composition().requiredDependencies.find(({ name }) => name === "market-data-provider")).toMatchObject({
        available: true,
        detail: "Market data is supplied through the public module bootstrap seam.",
      });
      expect(fixture.runtime.composition().optionalDependencies.find(({ name }) => name === "news-provider")).toMatchObject({ available: false });
      expect(JSON.stringify(fixture.runtime.composition())).not.toContain(PROVIDER_DETAIL_MARKER);
    } finally {
      await fixture.runtime.close();
    }

    const finalModeWithoutConfiguration = createBackendRuntime({ databaseUrl: "", databaseReady: false });
    try {
      expect(finalModeWithoutConfiguration.strategyConfigured).toBe(false);
      expect(finalModeWithoutConfiguration.marketData).toBeUndefined();
      expect(finalModeWithoutConfiguration.search).toBeUndefined();
      expect(finalModeWithoutConfiguration.backtesting).toBeUndefined();
      expect(finalModeWithoutConfiguration.leaderboard).toBeUndefined();
      expect(finalModeWithoutConfiguration.news).toBeUndefined();
      expect(finalModeWithoutConfiguration.readiness().status).toBe("not-ready");
      expect(finalModeWithoutConfiguration.readiness().unavailableRequired.map(({ name }) => name)).toEqual(expect.arrayContaining([
        "auth-persistence",
        "persistence-adapters",
        "market-data-provider",
        "backtest-runner",
        "leaderboard-persistence",
        "strategy-persistence",
        "search-composition",
      ]));
      expect(finalModeWithoutConfiguration.composition().optionalDependencies.find(({ name }) => name === "sentiment-provider")).toMatchObject({ available: true });
    } finally {
      await finalModeWithoutConfiguration.close();
    }
  });
});
