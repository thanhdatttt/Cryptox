import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Module, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type {
  AuthModulePublicApi,
  AuthenticatedRequestContext,
  AuthenticatedSessionIdentity,
  AuthenticatedUserId,
} from "@cryptox/auth";
import * as strategyPublic from "@cryptox/strategy";
import type {
  CompositeStrategyDefinition,
  StrategyDefinition,
  StrategyModulePublicApi,
} from "@cryptox/strategy";
import type { HistoricalCandlePage, MarketDataModuleRuntime } from "@cryptox/market-data/bootstrap";
import type { NewsModulePublicApi, NewsReadItem } from "@cryptox/news";
import type { LeaderboardModulePublicApi, LeaderboardScope, RankingConfiguration } from "@cryptox/leaderboard";
import { AUTH_RUNTIME_TOKEN } from "./auth.runtime";
import { AuthController } from "./auth.controller";
import { CapabilitiesController } from "./capabilities.controller";
import {
  BACKEND_RUNTIME_TOKEN,
  createBackendRuntime,
  type BackendRuntime,
} from "./runtime";
import { HealthController } from "./app.module";

const USER_A = "00000000-0000-4000-8000-000000000001" as AuthenticatedUserId;
const USER_B = "00000000-0000-4000-8000-000000000002" as AuthenticatedUserId;
const EXPIRES_AT = "2026-09-01T00:00:00.000Z";
const RANGE = { from: "2026-01-01T00:00:00.000Z", to: "2026-01-01T00:05:00.000Z" };

function failure(code: string, message = "internal provider detail with secret=must-not-cross-boundary"): Error {
  return Object.assign(new Error(message), { code });
}

function identity(authenticatedUserId: AuthenticatedUserId): AuthenticatedSessionIdentity {
  return { sessionId: `session-${authenticatedUserId}`, expiresAt: EXPIRES_AT, authenticatedUserId };
}

function createAuth(): AuthModulePublicApi {
  const tokens = new Map<string, AuthenticatedUserId>([
    ["token-a", USER_A],
    ["token-b", USER_B],
  ]);
  return {
    register: async () => { throw failure("AUTH_PERSISTENCE_UNAVAILABLE"); },
    login: async () => { throw failure("AUTH_PERSISTENCE_UNAVAILABLE"); },
    resolveSession: async (token) => {
      const userId = tokens.get(token);
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

function strategyDefinition(ownerUserId: AuthenticatedUserId, id: string): StrategyDefinition {
  return {
    id,
    ownerUserId,
    logicalFamilyKey: "moving-average",
    strategyName: "MA",
    implementationVersion: "1",
    behaviorProfileId: "TECHNICAL_PROFILES_V1",
    version: 1,
    parameters: { fastPeriod: 20, slowPeriod: 50 },
    createdAt: EXPIRES_AT,
  };
}

function compositeDefinition(ownerUserId: AuthenticatedUserId, id: string): CompositeStrategyDefinition {
  return {
    id,
    ownerUserId,
    logicalFamilyKey: "ma-composite",
    version: 1,
    method: "MAJORITY_VOTE",
    combinationProfileId: "MAJORITY_VOTE_V1",
    components: [
      { strategyDefinitionId: "strategy-a", strategyDefinitionVersion: 1 },
      { strategyDefinitionId: "strategy-b", strategyDefinitionVersion: 1 },
    ],
    createdAt: EXPIRES_AT,
  };
}

function createStrategy(): StrategyModulePublicApi {
  const definitions = [strategyDefinition(USER_A, "strategy-a"), strategyDefinition(USER_B, "strategy-b")];
  const composites = [compositeDefinition(USER_A, "composite-a")];
  const privateResource = <T extends { ownerUserId: AuthenticatedUserId }>(
    context: AuthenticatedRequestContext,
    value: T | undefined,
  ): T => {
    if (!value || value.ownerUserId !== context.authenticatedUserId) throw failure("NOT_FOUND");
    return structuredClone(value);
  };
  return {
    listStrategies: () => strategyPublic.STRATEGY_FACTORIES.map((factory) => factory.descriptor),
    defineStrategy: async (context, command) => ({
      ...strategyDefinition(context.authenticatedUserId, `${context.authenticatedUserId}-new`),
      logicalFamilyKey: command.logicalFamilyKey,
      strategyName: command.strategyName,
      parameters: command.parameters,
    }),
    defineComposite: async (context, command) => ({
      ...compositeDefinition(context.authenticatedUserId, `${context.authenticatedUserId}-composite`),
      logicalFamilyKey: command.logicalFamilyKey,
      components: command.strategyDefinitionIds.map((id) => ({ strategyDefinitionId: id, strategyDefinitionVersion: 1 })),
    }),
    readStrategyDefinition: async (context, id) => privateResource(context, definitions.find((item) => item.id === id)),
    readCompositeDefinition: async (context, id) => privateResource(context, composites.find((item) => item.id === id)),
    listStrategyDefinitions: async (context, page) => ({
      items: definitions.filter((item) => item.ownerUserId === context.authenticatedUserId).slice(0, page.limit),
    }),
    listCompositeDefinitions: async (context, page) => ({
      items: composites.filter((item) => item.ownerUserId === context.authenticatedUserId).slice(0, page.limit),
    }),
    resolveStrategy: async () => ({
      name: "TEST",
      category: "TREND",
      analyze: () => ({
        signal: "HOLD",
        signalAt: EXPIRES_AT,
        visualization: [],
      }),
    }),
    combineSignals: () => "HOLD",
  };
}

function createMarketData(onHistory: () => void): MarketDataModuleRuntime {
  const candle = {
    pair: "BTCUSDT",
    timeframe: "5m" as const,
    timestamp: "2026-01-01T00:00:00.000Z",
    open: 100,
    high: 101,
    low: 99,
    close: 100.5,
    volume: 12,
    isClosed: true,
  };
  const page: HistoricalCandlePage = {
    pair: "BTCUSDT",
    timeframe: "5m",
    range: RANGE,
    candles: [candle],
    complete: true,
    missingRanges: [],
    formingIncluded: false,
    asOf: EXPIRES_AT,
    provenance: {
      provider: "binance",
      pair: "BTCUSDT",
      timeframe: "5m",
      range: RANGE,
      replayGuarantee: "TRACEABLE",
      replayLimitation: "No immutable dataset snapshot.",
    },
  };
  return {
    readCandles: async () => {
      onHistory();
      return structuredClone(page);
    },
    createDatasetSnapshot: async () => { throw failure("PERSISTENCE_UNAVAILABLE"); },
    readDatasetSnapshot: async () => { throw failure("PERSISTENCE_UNAVAILABLE"); },
    subscribeMarketData: async () => async () => undefined,
    readObservability: async () => undefined,
    shutdown: async () => undefined,
  };
}

function createNews(): NewsModulePublicApi {
  const item: NewsReadItem = {
    id: "news-1",
    providerId: "coindesk",
    providerItemId: "item-1",
    title: "Bitcoin market update",
    content: "A configured source article.",
    source: "CoinDesk",
    publishedAt: "2026-01-01T00:00:00.000Z",
    crawledAt: EXPIRES_AT,
    relatedCoins: ["BTC"],
    url: "https://example.test/news-1",
    sentiment: null,
  };
  return {
    collect: async () => ({ fetchedCount: 0, storedCount: 0, duplicateCount: 0, rejectedCount: 0 }),
    readNews: async () => ({ items: [structuredClone(item)] }),
  };
}

function createLeaderboard(): LeaderboardModulePublicApi {
  const configuration: RankingConfiguration = {
    id: "LINEAR_REQUIRED_V1",
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
  const scopes: LeaderboardScope[] = [
    {
      id: "scope-a",
      ownerUserId: USER_A,
      name: "A scope",
      k: 10,
      rankingConfigurationId: configuration.id,
      comparisonKey: "BTCUSDT|5m",
      createdAt: EXPIRES_AT,
    },
  ];
  return {
    createLeaderboardScope: async (context, command) => ({
      id: `${context.authenticatedUserId}-scope`,
      ownerUserId: context.authenticatedUserId,
      name: command.name,
      k: command.k ?? 10,
      rankingConfigurationId: command.rankingConfigurationId,
      comparisonKey: command.comparisonKey,
      createdAt: EXPIRES_AT,
    }),
    getLeaderboardScope: async (context, id) => {
      const scope = scopes.find((item) => item.id === id && item.ownerUserId === context.authenticatedUserId);
      if (!scope) throw failure("NOT_FOUND");
      return structuredClone(scope);
    },
    getRankingConfiguration: async () => structuredClone(configuration),
    listRankingConfigurations: async () => [structuredClone(configuration)],
    score: () => ({ leaderboardScopeId: "scope-a", rankingConfigurationId: configuration.id, overallScore: 0, rankEligible: false, rankExclusionReason: "NO_TRADES" }),
    topK: async () => [],
    rankSearchRun: async () => [],
    submit: async () => ({ admitted: false }),
  };
}

async function startHttpApp(runtime: BackendRuntime): Promise<{ app: INestApplication; baseUrl: string }> {
  @Module({
    controllers: [HealthController, AuthController, CapabilitiesController],
    providers: [
      { provide: BACKEND_RUNTIME_TOKEN, useValue: runtime },
      { provide: AUTH_RUNTIME_TOKEN, useExisting: BACKEND_RUNTIME_TOKEN },
    ],
  })
  class BackendIntegrationModule {}

  const app = await NestFactory.create(BackendIntegrationModule, { logger: false });
  await app.listen(0, "127.0.0.1");
  const address = app.getHttpServer().address() as { port: number } | string | null;
  if (!address || typeof address === "string") throw new Error("backend integration app did not bind");
  return { app, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function jsonRequest(baseUrl: string, path: string, init?: RequestInit): Promise<{ response: Response; body: unknown }> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) as unknown : undefined };
}

describe("backend HTTP composition", () => {
  let app: INestApplication;
  let baseUrl: string;
  let runtime: BackendRuntime;
  let historyCalls = 0;

  beforeAll(async () => {
    runtime = createBackendRuntime({
      auth: createAuth(),
      strategy: createStrategy(),
      marketData: createMarketData(() => { historyCalls += 1; }),
      leaderboard: createLeaderboard(),
      news: createNews(),
      databaseReady: true,
    });
    ({ app, baseUrl } = await startHttpApp(runtime));
  });

  afterAll(async () => {
    await app.close();
    await runtime.close();
  });

  it("maps public market, catalog, News, and shared ranking routes to frozen DTOs", async () => {
    const catalog = await jsonRequest(baseUrl, "/strategy/catalog");
    expect(catalog.response.status).toBe(200);
    expect(catalog.body).toMatchObject({ schemaVersion: 1 });
    expect((catalog.body as { items: unknown[] }).items.length).toBeGreaterThan(0);

    const history = await jsonRequest(baseUrl, "/market-data/history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schemaVersion: 1,
        pair: "BTCUSDT",
        timeframe: "5m",
        range: RANGE,
        completeness: "REQUIRE_COMPLETE",
      }),
    });
    expect(history.response.status).toBe(200);
    expect(history.body).toMatchObject({ schemaVersion: 1, pair: "BTCUSDT", timeframe: "5m" });
    expect((history.body as { candles: Array<{ open: number }> }).candles[0]?.open).toBe(100);
    expect(historyCalls).toBe(1);

    const news = await jsonRequest(baseUrl, "/news?schemaVersion=1&limit=10&order=PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC");
    expect(news.response.status).toBe(200);
    expect(news.body).toMatchObject({ schemaVersion: 1, items: [{ sentiment: null, sentimentAvailability: { state: "MISSING" } }] });

    const ranking = await jsonRequest(baseUrl, "/leaderboard/ranking-configurations");
    expect(ranking.response.status).toBe(200);
    expect(ranking.body).toMatchObject({ schemaVersion: 1, items: [{ profileId: "LINEAR_REQUIRED_V1" }] });
  });

  it("enforces trusted session identity, 401 rejection, and owner no-leak behavior", async () => {
    const unauthenticated = await jsonRequest(baseUrl, "/strategy/definitions");
    expect(unauthenticated.response.status).toBe(401);
    expect(unauthenticated.body).toMatchObject({ error: { code: "UNAUTHENTICATED" } });

    const spoofed = await jsonRequest(baseUrl, "/strategy/definitions", {
      headers: { cookie: "userId=user-b" },
    });
    expect(spoofed.response.status).toBe(401);
    expect(spoofed.body).toMatchObject({ error: { code: "UNAUTHENTICATED" } });

    const ownerA = await jsonRequest(baseUrl, "/strategy/definitions", {
      headers: { cookie: "cryptox_session=token-a" },
    });
    expect(ownerA.response.status).toBe(200);
    expect(ownerA.body).toMatchObject({ schemaVersion: 1, items: [{ id: "strategy-a", ownerUserId: USER_A }] });

    const ownerB = await jsonRequest(baseUrl, "/strategy/definitions", {
      headers: { cookie: "cryptox_session=token-b" },
    });
    expect(ownerB.response.status).toBe(200);
    expect(ownerB.body).toMatchObject({ schemaVersion: 1, items: [{ id: "strategy-b", ownerUserId: USER_B }] });
    expect(ownerB.body).not.toMatchObject({ items: [{ id: "strategy-a" }] });

    const crossOwnerScope = await jsonRequest(baseUrl, "/leaderboard?scopeId=scope-a", {
      headers: { cookie: "cryptox_session=token-b" },
    });
    expect(crossOwnerScope.response.status).toBe(404);
    expect(crossOwnerScope.body).toMatchObject({ error: { code: "NOT_FOUND" } });

    const clientIdentityBody = await jsonRequest(baseUrl, "/strategy/definitions", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "cryptox_session=token-a" },
      body: JSON.stringify({
        schemaVersion: 1,
        ownerUserId: USER_B,
        logicalFamilyKey: "ma",
        strategyName: "MA",
        parameters: {},
      }),
    });
    expect(clientIdentityBody.response.status).toBe(400);
    expect(clientIdentityBody.body).toMatchObject({ error: { code: "INVALID_REQUEST" } });
  });

  it("rejects malformed requests safely and keeps liveness independent of readiness", async () => {
    const malformedHistory = await jsonRequest(baseUrl, "/market-data/history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemaVersion: 1, pair: "BTCUSDT", timeframe: "bad" }),
    });
    expect(malformedHistory.response.status).toBe(400);
    expect(JSON.stringify(malformedHistory.body)).not.toContain("internal provider detail");

    const missingPrivateCapability = await jsonRequest(baseUrl, "/search/runs");
    expect(missingPrivateCapability.response.status).toBe(401);

    const live = await jsonRequest(baseUrl, "/live");
    expect(live.response.status).toBe(200);
    expect(live.body).toEqual({ status: "live" });

    const ready = await jsonRequest(baseUrl, "/ready");
    expect(ready.response.status).toBe(503);
    expect(ready.body).toMatchObject({ status: "not-ready" });
    const unavailable = (ready.body as { unavailableRequired: Array<{ name: string }> }).unavailableRequired.map((item) => item.name);
    expect(unavailable).toContain("backtest-runner");
    expect(unavailable).toContain("search-composition");
  });
});

describe("backend runtime failure projections", () => {
  it("keeps auxiliary News/Sentiment degradation separate from required readiness", () => {
    const runtime = createBackendRuntime({ auth: createAuth(), databaseReady: true });
    const requiredBefore = runtime.composition().requiredDependencies;
    runtime.markFailure("news-provider", "provider secret must not be exposed");
    runtime.markFailure("sentiment-provider", "model failure");
    const composition = runtime.composition();
    expect(composition.requiredDependencies).toEqual(requiredBefore);
    expect(composition.optionalDependencies.find((item) => item.name === "news-provider")).toMatchObject({ available: false });
    expect(composition.optionalDependencies.find((item) => item.name === "sentiment-provider")).toMatchObject({ available: false });
    expect(JSON.stringify(composition)).not.toContain("secret");
    return runtime.close();
  });

  it("marks provider failures as unavailable without returning provider internals", async () => {
    let failed = false;
    const marketData = createMarketData(() => {
      failed = true;
      throw failure("PROVIDER_UNAVAILABLE");
    });
    const runtime = createBackendRuntime({ auth: createAuth(), marketData, databaseReady: true });
    const before = runtime.readiness();
    expect(before.unavailableRequired.some((item) => item.name === "market-data-provider")).toBe(false);
    const controller = new CapabilitiesController(runtime);
    await expect(controller.marketHistory({
      schemaVersion: 1,
      pair: "BTCUSDT",
      timeframe: "5m",
      range: RANGE,
      completeness: "ALLOW_PARTIAL",
    })).rejects.toMatchObject({ status: 503 });
    expect(failed).toBe(true);
    expect(runtime.readiness().unavailableRequired.some((item) => item.name === "market-data-provider")).toBe(true);
    await runtime.close();
  });
});
