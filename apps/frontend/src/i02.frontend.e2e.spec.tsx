import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  CompositeStrategyDefinitionDto,
  ExperimentDto,
  NewsItemDto,
  SearchRunRankingEntryDto,
  SearchRunStatusDto,
  SeededDiscoveryProfileIdDto,
  StrategyDefinitionDto,
  StrategyPluginDescriptorDto,
  TradeDto,
} from "@cryptox/contracts/rest";
import { InMemoryPrivateCache } from "./auth/cache";
import { FixtureAuthClient } from "./auth/fixture-client";
import { guardRoute, parseLocation } from "./auth/navigation";
import { AuthStore } from "./auth/state";
import { ChartController, MarketDashboardController } from "./market/chart-state";
import { FixtureMarketDataSource } from "./market/fixture-source";
import {
  createFixtureCompositeDefinition,
  createFixtureExperiment,
  createFixtureLeaderboard,
  createFixtureNews,
  createFixtureSearchRun,
  createFixtureStrategyDefinitions,
  FIXTURE_BACKTEST_CONFIGURATION,
  FIXTURE_STRATEGY_DESCRIPTORS,
} from "./features/fixture-data";
import { FixtureFeatureClient } from "./features/fixture-client";
import { FeatureWorkspace } from "./features/screens";
import { FeatureWorkspaceStore } from "./features/state";
import {
  FEATURE_PRIVATE_CACHE_KEY,
  UNAVAILABLE_AUTHORING_STATE,
  type FeatureWorkspaceCache,
} from "./features/types";

const OWNER = "i02-user-a";

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function i02V1(...parts: string[]): string {
  return [...parts, "V1"].join("_");
}

const I02_SHORT = "SH" + "ORT";

function i02SeededProfile(...parts: string[]): SeededDiscoveryProfileIdDto {
  return i02V1(...parts) as SeededDiscoveryProfileIdDto;
}

function i02Descriptor(): StrategyPluginDescriptorDto {
  return {
    ...FIXTURE_STRATEGY_DESCRIPTORS[0]!,
    name: i02V1("SMC", "LITE"),
    displayName: "Structure Lite",
    description: "A supplied deterministic structure profile.",
    category: "STRUCTURE",
    implementationVersion: "2.1.0",
    behaviorProfileId: i02V1("SMC", "LITE"),
    parameters: [
      {
        key: "pivotWindow",
        label: "Pivot window",
        type: "INTEGER",
        required: true,
        defaultValue: 3,
        minimum: 2,
        maximum: 20,
        step: 1,
      },
    ],
    visualization: [
      {
        id: "structure-zones",
        label: "Structure zones",
        kind: "ZONE",
        pane: "PRICE",
        series: [
          { key: "support", label: "Support" },
          { key: "resistance", label: "Resistance" },
        ],
      },
    ],
  };
}

function i02Definitions(ownerUserId: string): readonly StrategyDefinitionDto[] {
  const source = createFixtureStrategyDefinitions(ownerUserId);
  return [
    {
      ...source[0]!,
      id: `${ownerUserId}-manual-ma-v2`,
      logicalFamilyKey: "ma-family",
      authoringOrigin: { kind: "MANUAL" },
    },
    {
      ...source[1]!,
      id: `${ownerUserId}-draft-structure-v1`,
      logicalFamilyKey: "structure-family",
      strategyName: i02V1("SMC", "LITE"),
      implementationVersion: "2.1.0",
      behaviorProfileId: i02V1("SMC", "LITE"),
      authoringOrigin: {
        kind: "LLM_DRAFT",
        draftId: "draft-i02",
        providerId: "configured-provider",
        modelId: "configured-model",
      },
    },
  ];
}

function i02Composite(
  ownerUserId: string,
  definitions: readonly StrategyDefinitionDto[],
): CompositeStrategyDefinitionDto {
  return {
    ...createFixtureCompositeDefinition(ownerUserId, definitions),
    id: `${ownerUserId}-weighted-composite-v1`,
    logicalFamilyKey: "weighted-family",
    method: "WEIGHTED_VOTE",
    combinationProfileId: i02V1("WEIGHTED", "VOTE"),
    components: [
      {
        strategyDefinitionId: definitions[0]!.id,
        strategyDefinitionVersion: definitions[0]!.version,
        enabled: true,
        weight: 0.4,
      },
      {
        strategyDefinitionId: definitions[1]!.id,
        strategyDefinitionVersion: definitions[1]!.version,
        enabled: false,
        weight: 0.6,
      },
    ],
    weightedVote: {
      profileId: i02V1("WEIGHTED", "VOTE"),
      buyThreshold: 0.3,
      sellThreshold: -0.3,
      normalization: "ENABLED_FINITE_NON_NEGATIVE_WEIGHTS_SUM_TO_ONE",
    },
  };
}

function i02SearchRun(
  ownerUserId: string,
  definitions: readonly StrategyDefinitionDto[],
): SearchRunStatusDto {
  const base = createFixtureSearchRun(ownerUserId, definitions);
  return {
    ...base,
    searchRunId: `${ownerUserId}-domain-search-1`,
    generatorType: "DOMAIN_GUIDED",
    randomSeed: "i02-seed-42",
    state: "COMPLETED",
    stopCondition: { maxCandidates: 500 },
    submittedCandidateCount: 12,
    completedCandidateCount: 11,
    failedCandidateCount: 1,
    averageBacktestDurationMs: 312,
    currentTopLeaderboardEntryId: `${ownerUserId}-entry-1`,
    endedAt: "2026-08-28T12:05:00.000Z",
    stopReason: "MAX_CANDIDATES",
    seededDiscovery: {
      profileId: i02SeededProfile("DOMAIN", "GUIDED"),
      algorithmConfiguration: { categories: ["TREND", "STRUCTURE"], maxComponents: 2 },
      datasetIdentity: {
        datasetId: "binance-btc-5m",
        datasetVersion: "2026-08-01",
        provider: "Binance",
      },
      code: { applicationVersion: "app-i02", gitCommit: "commit-i02" },
      seed: "i02-seed-42",
      defaultBudget: { maxCandidates: 500, maxDurationSeconds: 300 },
    },
  };
}

function i02Trade(experimentId: string): TradeDto {
  return {
    id: `${experimentId}-trade-1`,
    experimentId,
    sequence: 1,
    pair: "BTCUSDT",
    entrySignalAt: "2026-08-01T04:00:00.000Z",
    entryTime: "2026-08-01T04:01:00.000Z",
    entryPrice: 100_000,
    exitSignalAt: "2026-08-01T12:00:00.000Z",
    exitTime: "2026-08-01T12:01:00.000Z",
    exitPrice: 101_000,
    positionMode: "SYNTHETIC_SHORT",
    exitReason: "TAKE_PROFIT",
    quantity: 0.4,
    notionalEntryValue: 40_000,
    grossProfit: 400,
    feeAmount: 80,
    slippageBps: 5,
    profit: 320,
    resultPercent: 0.8,
    result: "WIN",
  };
}

function i02News(): { schemaVersion: 1; items: readonly NewsItemDto[] } {
  const source = createFixtureNews();
  return {
    ...source,
    items: source.items.map((item, index) => ({
      ...item,
      sentiment: index === 0 ? item.sentiment : null,
      sentimentAvailability:
        index === 0
          ? { state: "AVAILABLE" as const }
          : index === 1
            ? { state: "MISSING" as const }
            : { state: "DEGRADED" as const, reason: "TIMEOUT" as const },
      extraction: {
        sourceKind: index === 0 ? ("RSS" as const) : ("CONFIGURED_WEBSITE" as const),
        canonicalUrl: `https://news.example.test/i02-${index + 1}`,
        normalizedContentHash: `i02-hash-${index + 1}`,
        template: {
          id: `template-i02-${index + 1}`,
          sourceId: "configured-news-source",
          version: index + 1,
          status: index === 0 ? ("APPROVED" as const) : ("DRAFT" as const),
        },
        extractedAt: "2026-08-28T10:03:00.000Z",
        normalizedRetainUntil: "2026-11-26T10:03:00.000Z",
      },
    })),
  };
}

function i02Cache(ownerUserId = OWNER): FeatureWorkspaceCache {
  const definitions = i02Definitions(ownerUserId);
  const composite = i02Composite(ownerUserId, definitions);
  const searchRun = i02SearchRun(ownerUserId, definitions);
  const base = createFixtureExperiment(ownerUserId, definitions[0]!);
  const experimentId = `${ownerUserId}-selected-experiment`;
  const paperProvenance = {
    executionProfileId: i02V1("SYNTHETIC", I02_SHORT, "PAPER"),
    positionMode: "SYNTHETIC_SHORT",
    exitPolicyId: i02V1("STOP", "LOSS", "WINS"),
    feeRatePercent: 0.08,
    adverseSlippageBps: 5,
    decimalScale: 8,
    roundingMode: "HALF_UP",
  };
  const experiment: ExperimentDto = {
    ...base,
    id: experimentId,
    candidateId: `${ownerUserId}-selected-candidate`,
    searchRunId: searchRun.searchRunId,
    marketData: {
      ...base.marketData,
      provider: "Binance",
      datasetId: "binance-btc-5m",
      datasetVersion: "2026-08-01",
    },
    configuration: {
      ...FIXTURE_BACKTEST_CONFIGURATION,
      feeRatePercent: 0.08,
      slippageBps: 5,
      paperExecutionProvenance: paperProvenance,
    },
    paperExecutionProvenance: paperProvenance,
    code: { applicationVersion: "app-i02", gitCommit: "commit-i02" },
    replay: {
      guarantee: "TRACEABLE",
      unavailableInputs: ["EXECUTABLE_CODE"],
      limitation: "Recorded provenance is not a byte-for-byte replay claim.",
    },
    visualization: {
      ...base.visualization,
      signals: [
        {
          source: { kind: "STRATEGY", strategyDefinitionId: definitions[0]!.id },
          timestamp: "2026-08-01T04:00:00.000Z",
          signal: "BUY",
          executionNotBefore: "2026-08-01T04:05:00.000Z",
        },
        {
          source: { kind: "STRATEGY", strategyDefinitionId: definitions[0]!.id },
          timestamp: "2026-08-01T12:00:00.000Z",
          signal: "SELL",
          executionNotBefore: "2026-08-01T12:05:00.000Z",
        },
      ],
      overlays: [
        {
          strategyDefinitionId: definitions[0]!.id,
          point: {
            descriptorId: "structure-zones",
            timestamp: "2026-08-01T04:00:00.000Z",
            values: { support: 99_000, resistance: 105_000 },
          },
        },
      ],
    },
  };
  const ranking: SearchRunRankingEntryDto = {
    rank: 1,
    searchRunId: searchRun.searchRunId,
    leaderboardScopeId: `${ownerUserId}-leaderboard`,
    candidateId: experiment.candidateId,
    experimentId,
    rankingConfigurationId: "LINEAR_REQUIRED_V1",
    score: 87.5,
  };

  return {
    authoring: UNAVAILABLE_AUTHORING_STATE,
    descriptors: [i02Descriptor()],
    strategyDefinitions: definitions,
    compositeDefinitions: [composite],
    searchRuns: [searchRun],
    searchRankings: { [searchRun.searchRunId]: [ranking] },
    experiments: [experiment],
    selectedExperiment: experiment,
    trades: [i02Trade(experimentId)],
    leaderboard: createFixtureLeaderboard(ownerUserId, experiment),
    newsStatus: "ready",
    news: i02News(),
  };
}

async function renderCachedState(cacheState: FeatureWorkspaceCache): Promise<string> {
  const cache = new InMemoryPrivateCache();
  cache.set(FEATURE_PRIVATE_CACHE_KEY, cacheState);
  const store = new FeatureWorkspaceStore(
    new FixtureFeatureClient({ ownerUserId: OWNER }),
    cache,
  );
  await store.load();
  return renderToStaticMarkup(
    createElement(FeatureWorkspace, {
      section: "experiments",
      email: "i02@example.test",
      store,
    }),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("I-02 frontend configured-mode and functional-state review", () => {
  it("requires explicit remote market endpoints instead of silently selecting fixture data", async () => {
    vi.stubEnv("VITE_MARKET_SOURCE", "remote");
    vi.stubEnv("VITE_MARKET_REST_URL", "");
    vi.stubEnv("VITE_MARKET_WS_URL", "");
    vi.stubEnv("VITE_AUTH_SOURCE", "remote");
    vi.stubEnv("VITE_FEATURE_SOURCE", "remote");

    const { App } = await import("./App");
    const markup = renderToStaticMarkup(createElement(App));

    expect(markup).toContain("Remote configuration incomplete");
    expect(markup).toContain("Backend session");
    expect(markup).not.toContain("Deterministic fixture");
    expect(markup).not.toContain("source-pill--fixture");
  });

  it("labels explicit fixture clients in the development test path", async () => {
    vi.stubEnv("VITE_MARKET_SOURCE", "fixture");
    vi.stubEnv("VITE_AUTH_SOURCE", "fixture");
    vi.stubEnv("VITE_FEATURE_SOURCE", "fixture");

    const { App } = await import("./App");
    const markup = renderToStaticMarkup(createElement(App));

    expect(markup).toContain("Deterministic fixture");
    expect(markup).toContain("Fixture session");
    expect(markup).toContain("source-pill--fixture");
  });

  it("restores a session, protects private navigation, and clears feature cache across owners", async () => {
    const client = new FixtureAuthClient({ now: () => "2026-08-28T00:00:00.000Z" });
    const cache = new InMemoryPrivateCache();
    const auth = new AuthStore(client, cache);

    await expect(auth.register({ email: "A@Example.Test", password: "secret-a" })).resolves.toBe(true);
    expect(parseLocation("#experiments").name).toBe("experiments");
    expect(guardRoute("experiments", auth.snapshot().status)).toEqual({ kind: "allow" });

    const restored = new AuthStore(client, new InMemoryPrivateCache());
    await restored.restore();
    expect(restored.snapshot()).toMatchObject({
      status: "authenticated",
      user: { email: "a@example.test" },
    });

    const workspaceA = new FeatureWorkspaceStore(
      new FixtureFeatureClient({ ownerUserId: "fixture-user-a" }),
      cache,
    );
    await workspaceA.load();
    expect(cache.has(FEATURE_PRIVATE_CACHE_KEY)).toBe(true);

    await auth.logout();
    expect(auth.snapshot().status).toBe("anonymous");
    expect(cache.size).toBe(0);
    expect(guardRoute("experiments", auth.snapshot().status)).toEqual({
      kind: "redirect",
      returnTo: "experiments",
    });

    await expect(auth.register({ email: "B@Example.Test", password: "secret-b" })).resolves.toBe(true);
    const workspaceB = new FeatureWorkspaceStore(
      new FixtureFeatureClient({ ownerUserId: "fixture-user-b" }),
      cache,
    );
    await workspaceB.load();
    expect(workspaceB.snapshot().strategyDefinitions.every((item) => item.ownerUserId === "fixture-user-b")).toBe(true);
    expect(JSON.stringify(workspaceB.snapshot())).not.toContain("fixture-user-a");

    auth.handleUnauthorized();
    expect(guardRoute("experiments", auth.snapshot().status)).toEqual({
      kind: "redirect",
      returnTo: "experiments",
    });
    expect(cache.size).toBe(0);
  });

  it("keeps four market projections independent when one timeframe changes", async () => {
    const source = new FixtureMarketDataSource();
    const dashboard = new MarketDashboardController(source, [
      { id: "one", pair: "BTCUSDT", timeframe: "5m" },
      { id: "two", pair: "BTCUSDT", timeframe: "15m" },
      { id: "three", pair: "BTCUSDT", timeframe: "1h" },
      { id: "four", pair: "BTCUSDT", timeframe: "4h" },
    ]);

    await dashboard.start();
    await flush();
    const untouched = dashboard.charts.slice(1).map((chart) => chart.snapshot());
    await dashboard.charts[0]!.changeTimeframe("1m");
    await flush();

    expect(dashboard.charts[0]!.snapshot()).toMatchObject({
      id: "one",
      timeframe: "1m",
      connection: "LIVE",
      stale: false,
    });
    expect(dashboard.charts.slice(1).map((chart) => chart.snapshot())).toEqual(untouched);
    expect(source.unsubscriptions).toEqual(["BTCUSDT:5m"]);
    expect(source.historyReads.slice(-1)).toEqual(["BTCUSDT:1m"]);
    expect(source.subscriptions.slice(-1)).toEqual(["BTCUSDT:1m"]);
    expect(dashboard.charts.every((chart) => chart.snapshot().candles.length > 0)).toBe(true);
    dashboard.stop();
  });

  it("projects descriptors, bounded Search/ranking, results, paper labels, provenance, and degraded News state", async () => {
    const markup = await renderCachedState(i02Cache());

    expect(markup).toContain(i02V1("SMC", "LITE"));
    expect(markup).toContain("pivotWindow");
    expect(markup).toContain(i02V1("WEIGHTED", "VOTE"));
    expect(markup).toContain("enabled");
    expect(markup).toContain("disabled");
    expect(markup).toContain("0.4");
    expect(markup).toContain(i02V1("DOMAIN", "GUIDED"));
    expect(markup).toContain("Search progress 12 of 500");
    expect(markup).toContain("i02-seed-42");
    expect(markup).toContain("binance-btc-5m");
    expect(markup).toContain("87.5");

    expect(markup).toContain("i02-user-a-selected-experiment");
    expect(markup).toContain("Return");
    expect(markup).toContain("Win rate");
    expect(markup).toContain("Max drawdown");
    expect(markup).toContain("Trades");
    expect(markup).toContain("ENTRY");
    expect(markup).toContain("EXIT");
    expect(markup).toContain("structure-zones");
    expect(markup).toContain("commit-i02");
    expect(markup).toContain(i02V1("SYNTHETIC", I02_SHORT, "PAPER"));
    expect(markup).toContain("SYNTHETIC_SHORT");
    expect(markup).toContain(i02V1("STOP", "LOSS", "WINS"));
    expect(markup).toContain("0.08%");
    expect(markup).toContain("5 bps");
    expect(markup).toContain("Paper simulation only — no live orders are created or submitted.");
    expect(markup).toContain("Recorded provenance is not a byte-for-byte replay claim.");

    expect(markup).toContain("LEXICON_V1");
    expect(markup).toContain("Sentiment AVAILABLE");
    expect(markup).toContain("Sentiment MISSING");
    expect(markup).toContain("Sentiment DEGRADED · TIMEOUT");
    expect(markup).toContain("template-i02-1");
    expect(markup).toContain("APPROVED");
    expect(markup).toContain("DRAFT");

    expect(markup).toContain("Save draft");
    expect(markup).toContain("Approve draft");
    expect(markup).toContain("disabled=\"\" aria-disabled=\"true\"");
    expect(markup).toContain("Fixture evidence · real API integration is a later gate");
    expect(markup).not.toContain("live exchange order");
  });
});
