import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  CompositeStrategyDefinitionDto,
  ExperimentDto,
  NewsItemDto,
  SearchRunRankingEntryDto,
  SearchRunStatusDto,
  StrategyDefinitionDto,
  StrategyPluginDescriptorDto,
  TradeDto,
} from "@cryptox/contracts/rest";
import { InMemoryPrivateCache } from "../auth/cache";
import {
  createFixtureCompositeDefinition,
  createFixtureExperiment,
  createFixtureLeaderboard,
  createFixtureNews,
  createFixtureSearchRun,
  createFixtureStrategyDefinitions,
  FIXTURE_BACKTEST_CONFIGURATION,
  FIXTURE_STRATEGY_DESCRIPTORS,
} from "./fixture-data";
import { FixtureFeatureClient } from "./fixture-client";
import { FeatureWorkspace } from "./screens";
import { FeatureWorkspaceStore } from "./state";
import { FEATURE_PRIVATE_CACHE_KEY, UNAVAILABLE_AUTHORING_STATE, type FeatureWorkspaceCache } from "./types";

const OWNER = "user-screen";

function defaultCache(ownerUserId = OWNER): FeatureWorkspaceCache {
  const definitions = createFixtureStrategyDefinitions(ownerUserId);
  const experiment = createFixtureExperiment(ownerUserId, definitions[0]!);
  const run = createFixtureSearchRun(ownerUserId, definitions);
  return {
    authoring: UNAVAILABLE_AUTHORING_STATE,
    descriptors: FIXTURE_STRATEGY_DESCRIPTORS,
    strategyDefinitions: definitions,
    compositeDefinitions: [createFixtureCompositeDefinition(ownerUserId, definitions)],
    searchRuns: [run],
    searchRankings: {},
    experiments: [experiment],
    selectedExperiment: experiment,
    trades: [],
    leaderboard: createFixtureLeaderboard(ownerUserId, experiment),
    newsStatus: "ready",
    news: createFixtureNews(),
  };
}

async function renderCachedState(cacheState: FeatureWorkspaceCache): Promise<string> {
  const cache = new InMemoryPrivateCache();
  cache.set(FEATURE_PRIVATE_CACHE_KEY, cacheState);
  const store = new FeatureWorkspaceStore(new FixtureFeatureClient({ ownerUserId: OWNER }), cache);
  await store.load();
  return renderToStaticMarkup(
    createElement(FeatureWorkspace, {
      section: "experiments",
      email: "researcher@example.test",
      store,
    }),
  );
}

function extensionDescriptor(): StrategyPluginDescriptorDto {
  return {
    ...FIXTURE_STRATEGY_DESCRIPTORS[0]!,
    name: "SUPPLIED_STRUCTURE_DESCRIPTOR",
    displayName: "Supplied structure descriptor",
    implementationVersion: "2.4.1",
    behaviorProfileId: "SUPPLIED_BEHAVIOR_PROFILE",
    parameters: [
      {
        key: "pivotWindow",
        label: "Pivot window",
        type: "INTEGER",
        required: true,
        defaultValue: 3,
        minimum: 2,
        maximum: 20,
      },
    ],
    visualization: [
      {
        id: "structure-zones",
        label: "Structure zones",
        kind: "ZONE",
        pane: "PRICE",
        series: [{ key: "support", label: "Support" }, { key: "resistance", label: "Resistance" }],
      },
    ],
  };
}

function extensionDefinitions(ownerUserId: string): readonly StrategyDefinitionDto[] {
  const definitions = createFixtureStrategyDefinitions(ownerUserId);
  return [
    {
      ...definitions[0]!,
      id: `${ownerUserId}-manual-definition`,
      strategyName: "SUPPLIED_STRUCTURE_DESCRIPTOR",
      behaviorProfileId: "SUPPLIED_DEFINITION_PROFILE",
      authoringOrigin: { kind: "MANUAL" },
    },
    {
      ...definitions[1]!,
      id: `${ownerUserId}-draft-definition`,
      strategyName: "SUPPLIED_STRUCTURE_DESCRIPTOR",
      behaviorProfileId: "DRAFT_DEFINITION_PROFILE",
      authoringOrigin: { kind: "LLM_DRAFT", draftId: "draft-42", providerId: "provider-demo", modelId: "model-demo" },
    },
    {
      ...definitions[0]!,
      id: `${ownerUserId}-news-definition`,
      strategyName: "SUPPLIED_STRUCTURE_DESCRIPTOR",
      behaviorProfileId: "NEWS_DEFINITION_PROFILE",
      authoringOrigin: { kind: "APPROVED_NEWS_ITEM", newsItemId: "news-42", extractionTemplateVersion: 7 },
    },
  ];
}

function weightedComposite(ownerUserId: string, definitions: readonly StrategyDefinitionDto[]): CompositeStrategyDefinitionDto {
  return {
    ...createFixtureCompositeDefinition(ownerUserId, definitions),
    id: `${ownerUserId}-weighted-composite`,
    method: "WEIGHTED_VOTE",
    combinationProfileId: "SUPPLIED_WEIGHT_PROFILE",
    components: [
      { strategyDefinitionId: definitions[0]!.id, strategyDefinitionVersion: 1, enabled: true, weight: 0.4 },
      { strategyDefinitionId: definitions[1]!.id, strategyDefinitionVersion: 1, enabled: false, weight: 0.6 },
    ],
    weightedVote: {
      profileId: "SUPPLIED_WEIGHT_PROFILE",
      buyThreshold: 0.3,
      sellThreshold: -0.3,
      normalization: "ENABLED_FINITE_NON_NEGATIVE_WEIGHTS_SUM_TO_ONE",
    },
  };
}

function seededDiscoveryRun(
  ownerUserId: string,
  definitions: readonly StrategyDefinitionDto[],
  generatorType: SearchRunStatusDto["generatorType"],
  suffix: string,
): SearchRunStatusDto {
  const base = createFixtureSearchRun(ownerUserId, definitions, generatorType === "GENETIC" ? "FAILED" : "COMPLETED");
  return {
    ...base,
    searchRunId: `${ownerUserId}-search-${suffix}`,
    generatorType,
    randomSeed: `${suffix}-seed`,
    state: generatorType === "GENETIC" ? "FAILED" : "COMPLETED",
    stopCondition: generatorType === "GENETIC" ? { maxDurationSeconds: 300 } : { maxCandidates: 500 },
    submittedCandidateCount: generatorType === "GENETIC" ? 12 : 500,
    completedCandidateCount: generatorType === "GENETIC" ? 8 : 498,
    failedCandidateCount: generatorType === "GENETIC" ? 4 : 2,
    averageBacktestDurationMs: generatorType === "GENETIC" ? null : 312,
    lastError: generatorType === "GENETIC" ? "Seeded executor stopped after a supplied failure." : undefined,
    seededDiscovery: {
    profileId: `${generatorType}_V1` as NonNullable<SearchRunStatusDto["seededDiscovery"]>["profileId"],
      algorithmConfiguration: generatorType === "DOMAIN_GUIDED"
        ? { categories: ["TREND", "STRUCTURE"], maxComponents: 2 }
        : { populationSize: 50, maxGenerations: 10, eliteFraction: 0.1, mutationRate: 0.2 },
      datasetIdentity: { datasetId: `dataset-${suffix}`, datasetVersion: "2026-08-01", provider: "Binance" },
      code: { applicationVersion: "app-2.0.0", gitCommit: `commit-${suffix}` },
      seed: `${suffix}-seed`,
      defaultBudget: { maxCandidates: 500, maxDurationSeconds: 300 },
    },
  };
}

function suppliedTrade(
  id: string,
  positionMode: string,
  sequence: number,
  entryPrice: number,
  profit: number,
  resultPercent: number,
  exitReason: TradeDto["exitReason"],
): TradeDto {
  return {
    id,
    experimentId: `${OWNER}-extension-experiment`,
    sequence,
    pair: "BTCUSDT",
    entrySignalAt: "2026-08-01T04:00:00.000Z",
    entryTime: "2026-08-01T04:01:00.000Z",
    entryPrice,
    exitSignalAt: "2026-08-01T12:00:00.000Z",
    exitTime: "2026-08-01T12:01:00.000Z",
    exitPrice: 101_000,
    positionMode,
    exitReason,
    quantity: 0.4,
    notionalEntryValue: sequence === 1 ? 40_000 : 40_800,
    grossProfit: 400,
    feeAmount: 80,
    slippageBps: 5,
    profit,
    resultPercent,
    result: "WIN",
  };
}

function extensionNews(): { schemaVersion: 1; items: readonly NewsItemDto[] } {
  const news = createFixtureNews();
  return {
    ...news,
    items: news.items.map((item, index) => ({
      ...item,
      sentiment: index === 0 ? item.sentiment : null,
      sentimentAvailability: index === 0
        ? { state: "AVAILABLE" as const }
        : index === 1
          ? { state: "MISSING" as const }
          : { state: "DEGRADED" as const, reason: "TIMEOUT" as const },
      extraction: {
        sourceKind: index === 0 ? "RSS" as const : "CONFIGURED_WEBSITE" as const,
        canonicalUrl: `https://news.example.test/canonical-${index + 1}`,
        normalizedContentHash: `sha256-hash-${index + 1}`,
        template: {
          id: `template-${index + 1}`,
          sourceId: "source-configured",
          version: index + 1,
          status: index === 0 ? "APPROVED" as const : index === 1 ? "DRAFT" as const : "RETIRED" as const,
        },
        extractedAt: "2026-08-28T10:03:00.000Z",
        normalizedRetainUntil: "2026-11-26T10:03:00.000Z",
      },
    })),
  };
}

function extensionCache(): FeatureWorkspaceCache {
  const definitions = extensionDefinitions(OWNER);
  const randomRun = createFixtureSearchRun(OWNER, definitions);
  const domainRun = seededDiscoveryRun(OWNER, definitions, "DOMAIN_GUIDED", "domain");
  const geneticRun = seededDiscoveryRun(OWNER, definitions, "GENETIC", "genetic");
  const baseExperiment = createFixtureExperiment(OWNER, definitions[1]!);
  const paperProvenance = {
    executionProfileId: "SUPPLIED_PAPER_EXECUTION_PROFILE",
    positionMode: "SUPPLIED_SHORT_POSITION",
    exitPolicyId: "SUPPLIED_STOP_POLICY",
    feeRatePercent: 0.08,
    adverseSlippageBps: 5,
    stopPolicy: "98.00000000",
    targetBoundary: "104.00000000",
    decimalScale: 8,
    roundingMode: "HALF_UP",
  };
  const experiment: ExperimentDto = {
    ...baseExperiment,
    id: `${OWNER}-extension-experiment`,
    candidateId: `${OWNER}-extension-candidate`,
    searchRunId: domainRun.searchRunId,
    marketData: {
      ...baseExperiment.marketData,
      provider: "Binance",
      datasetId: "dataset-domain",
      datasetVersion: "2026-08-01",
    },
    configuration: {
      ...FIXTURE_BACKTEST_CONFIGURATION,
      initialCapital: 25_000,
      feeRatePercent: 0.08,
      slippageBps: 5,
      paperExecutionProvenance: paperProvenance,
    },
    paperExecutionProvenance: paperProvenance,
    code: { applicationVersion: "app-2.0.0", gitCommit: "commit-experiment" },
    visualization: {
      signals: baseExperiment.visualization.signals,
      overlays: [
        {
          strategyDefinitionId: definitions[1]!.id,
          point: { descriptorId: "structure-zones", timestamp: "2026-08-01T04:00:00.000Z", values: { support: 99_000, resistance: 105_000 } },
        },
      ],
      tradeMarkers: baseExperiment.visualization.tradeMarkers,
    },
  };
  const ranking: SearchRunRankingEntryDto = {
    rank: 1,
    searchRunId: domainRun.searchRunId,
    leaderboardScopeId: `${OWNER}-leaderboard`,
    candidateId: experiment.candidateId,
    experimentId: experiment.id,
    rankingConfigurationId: "LINEAR_REQUIRED_V1",
    score: 87.5,
  };
  return {
    authoring: UNAVAILABLE_AUTHORING_STATE,
    descriptors: [extensionDescriptor()],
    strategyDefinitions: definitions,
    compositeDefinitions: [weightedComposite(OWNER, definitions)],
    searchRuns: [randomRun, domainRun, geneticRun],
    searchRankings: { [domainRun.searchRunId]: [ranking] },
    experiments: [experiment],
    selectedExperiment: experiment,
    trades: [suppliedTrade(`${OWNER}-trade-long`, "SUPPLIED_LONG_POSITION", 1, 100_000, 320, 0.8, "TAKE_PROFIT"), suppliedTrade(`${OWNER}-trade-short`, "SUPPLIED_SHORT_POSITION", 2, 102_000, 240, 0.59, "STOP_LOSS")],
    leaderboard: createFixtureLeaderboard(OWNER, experiment),
    newsStatus: "ready",
    news: extensionNews(),
  };
}

describe("fixture feature workspace", () => {
  it("renders descriptor controls, bounded progress, explainable results, overlays, and News", async () => {
    const markup = await renderCachedState(defaultCache("user-render"));

    expect(markup).toContain("Descriptor controls");
    expect(markup).toContain("Moving average crossover");
    expect(markup).toContain("Relative strength index");
    expect(markup).toContain("Bollinger bands");
    expect(markup).toContain("Bounded Random Search");
    expect(markup).toContain("Search progress 4 of 4");
    expect(markup).toContain("Return");
    expect(markup).toContain("Win rate");
    expect(markup).toContain("Max drawdown");
    expect(markup).toContain("Provenance");
    expect(markup).toContain("fixture-market");
    expect(markup).toContain("Moving averages");
    expect(markup).toContain("PRICE");
    expect(markup).toContain("ENTRY");
    expect(markup).toContain("EXIT");
    expect(markup).toContain("Sentiment availability: not supplied/not yet composed");
  });

  it("projects supplied authoring, descriptor, composite, Search, paper, ranking, and News metadata generically", async () => {
    const markup = await renderCachedState(extensionCache());

    expect(markup).toContain("LLM authoring");
    expect(markup).toContain("Save draft");
    expect(markup).toContain("Approve draft");
    expect(markup).not.toMatch(/<button[^>]*disabled=""[^>]*>Save draft<\/button>/);
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Approve draft<\/button>/);
    expect(markup).toContain("MANUAL");
    expect(markup).toContain("LLM_DRAFT · draft draft-42 · provider provider-demo · model model-demo");
    expect(markup).toContain("APPROVED_NEWS_ITEM · news item news-42 · extraction template version 7");
    expect(markup).toContain("SUPPLIED_BEHAVIOR_PROFILE");
    expect(markup).toContain("2.4.1");
    expect(markup).toContain("pivotWindow");
    expect(markup).toContain("structure-zones");
    expect(markup).toContain("WEIGHTED_VOTE");
    expect(markup).toContain("SUPPLIED_WEIGHT_PROFILE");
    expect(markup).toContain("enabled");
    expect(markup).toContain("disabled");
    expect(markup).toContain("0.4");
    expect(markup).toContain("Buy threshold");
    expect(markup).toContain("-0.3");
    expect(markup).toContain("ENABLED_FINITE_NON_NEGATIVE_WEIGHTS_SUM_TO_ONE");
    expect(markup).toContain("DOMAIN_GUIDED");
    expect(markup).toContain("GENETIC");
    expect(markup).toContain("domain-seed");
    expect(markup).toContain("populationSize");
    expect(markup).toContain("dataset-domain");
    expect(markup).toContain("commit-domain");
    expect(markup).toContain("500 candidates");
    expect(markup).toContain("FAILED");
    expect(markup).toContain("Seeded executor stopped after a supplied failure.");
    expect(markup).toContain("87.5");
    expect(markup).toContain("SUPPLIED_PAPER_EXECUTION_PROFILE");
    expect(markup).toContain("Paper position (supplied): SUPPLIED_LONG_POSITION");
    expect(markup).toContain("Paper position (supplied): SUPPLIED_SHORT_POSITION");
    expect(markup).toContain("SUPPLIED_STOP_POLICY");
    expect(markup).toContain("98.00000000");
    expect(markup).toContain("104.00000000");
    expect(markup).toContain("decimalScale");
    expect(markup).toContain("25,000");
    expect(markup).toContain("0.08%");
    expect(markup).toContain("5 bps");
    expect(markup).toContain("no live orders are created or submitted");
    expect(markup).toContain("RSS");
    expect(markup).toContain("sha256-hash-1");
    expect(markup).toContain("template-1");
    expect(markup).toContain("APPROVED");
    expect(markup).toContain("DRAFT");
    expect(markup).toContain("RETIRED");
    expect(markup).toContain("Sentiment AVAILABLE");
    expect(markup).toContain("Sentiment MISSING");
    expect(markup).toContain("Sentiment DEGRADED · TIMEOUT");
  });

  it("keeps transport-ready authoring, seeded start, News, and result state honest", async () => {
    const markup = await renderCachedState({
      ...defaultCache("user-empty"),
      descriptors: [],
      strategyDefinitions: [],
      compositeDefinitions: [],
      searchRuns: [],
      searchRankings: {},
      experiments: [],
      selectedExperiment: undefined,
      trades: [],
      leaderboard: undefined,
      newsStatus: "unavailable",
      news: undefined,
      newsMessage: "News transport is not composed.",
    });

    expect(markup).toContain("Choose a prompt or an approved News item. Save creates a server draft; Validate and Approve remain explicit.");
    expect(markup).toContain("<dt>State</dt><dd>READY</dd>");
    expect(markup).toContain("<dt>Save</dt><dd>AVAILABLE</dd>");
    expect(markup).toContain("Save draft");
    expect(markup).toContain("Approve draft");
    expect(markup).toContain("Seeded start not yet composed");
    expect(markup).toContain("At least two private definitions and a leaderboard scope are required.");
    expect(markup).toContain("News unavailable");
    expect(markup).toContain("News transport is not composed.");
    expect(markup).toContain("Select a completed Experiment to inspect supplied metrics and provenance.");
    expect(markup).not.toContain("Return");
    expect(markup).not.toContain("fixture-market");
    expect(markup).not.toContain("strategy-ma");
  });
});
