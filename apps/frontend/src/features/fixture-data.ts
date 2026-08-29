import { REST_SCHEMA_VERSION, type BacktestConfigurationDto, type ExperimentDto, type LeaderboardTopKResponseDto, type MarketInputSelectionDto, type NewsPageResponseDto, type RankingConfigurationDto, type StrategyDefinitionDto, type StrategyPluginDescriptorDto, type TradeDto } from "@cryptox/contracts/rest";
import type { CompositeStrategyDefinitionDto, SearchRunStatusDto } from "@cryptox/contracts/rest";

export const FIXTURE_NOW = "2026-08-28T12:00:00.000Z";

export const FIXTURE_MARKET_INPUT: MarketInputSelectionDto = {
  pair: "BTCUSDT",
  timeframe: "5m",
  range: { from: "2026-08-01T00:00:00.000Z", to: "2026-08-02T00:00:00.000Z" },
  datasetId: "fixture-btc-5m",
  datasetVersion: "2026-08-01",
};

export const FIXTURE_BACKTEST_CONFIGURATION: BacktestConfigurationDto = {
  executionProfileId: "BACKTEST_EXECUTION_V1",
  initialCapital: 10_000,
  feeRatePercent: 0.1,
  slippageBps: 0,
};

export const FIXTURE_STRATEGY_DESCRIPTORS: readonly StrategyPluginDescriptorDto[] = [
  {
    name: "MA",
    displayName: "Moving average crossover",
    description: "Compare two close-price moving averages.",
    category: "TREND",
    implementationVersion: "1.0.0",
    behaviorProfileId: "TECHNICAL_PROFILES_V1",
    parameters: [
      { key: "fastPeriod", label: "Fast period", type: "INTEGER", required: true, defaultValue: 20, minimum: 2, maximum: 200, step: 1 },
      { key: "slowPeriod", label: "Slow period", type: "INTEGER", required: true, defaultValue: 50, minimum: 3, maximum: 400, step: 1 },
    ],
    visualization: [
      {
        id: "ma-lines",
        label: "Moving averages",
        kind: "LINE",
        pane: "PRICE",
        series: [{ key: "fast", label: "Fast SMA" }, { key: "slow", label: "Slow SMA" }],
      },
    ],
  },
  {
    name: "RSI",
    displayName: "Relative strength index",
    description: "Read momentum from a bounded oscillator.",
    category: "MOMENTUM",
    implementationVersion: "1.0.0",
    behaviorProfileId: "TECHNICAL_PROFILES_V1",
    parameters: [
      { key: "period", label: "Period", type: "INTEGER", required: true, defaultValue: 14, minimum: 2, maximum: 100, step: 1 },
      { key: "buyThreshold", label: "Buy threshold", type: "NUMBER", required: true, defaultValue: 30, minimum: 0, maximum: 100, step: 1 },
      { key: "sellThreshold", label: "Sell threshold", type: "NUMBER", required: true, defaultValue: 70, minimum: 0, maximum: 100, step: 1 },
    ],
    visualization: [
      { id: "rsi", label: "RSI", kind: "LINE", pane: "INDICATOR", series: [{ key: "value", label: "RSI" }] },
    ],
  },
  {
    name: "BOLLINGER_BANDS",
    displayName: "Bollinger bands",
    description: "Frame price with a moving average and deviation bands.",
    category: "VOLATILITY",
    implementationVersion: "1.0.0",
    behaviorProfileId: "TECHNICAL_PROFILES_V1",
    parameters: [
      { key: "period", label: "Period", type: "INTEGER", required: true, defaultValue: 20, minimum: 2, maximum: 200, step: 1 },
      { key: "deviationMultiplier", label: "Deviation multiplier", type: "NUMBER", required: true, defaultValue: 2, minimum: 0.1, maximum: 6, step: 0.1 },
    ],
    visualization: [
      {
        id: "bollinger-band",
        label: "Bollinger bands",
        kind: "BAND",
        pane: "PRICE",
        series: [{ key: "lower", label: "Lower" }, { key: "middle", label: "Middle" }, { key: "upper", label: "Upper" }],
      },
    ],
  },
  {
    name: "SUPPORT_RESISTANCE",
    displayName: "Support and resistance",
    description: "Locate recent support and resistance levels.",
    category: "STRUCTURE",
    implementationVersion: "1.0.0",
    behaviorProfileId: "TECHNICAL_PROFILES_V1",
    parameters: [
      { key: "window", label: "Lookback window", type: "INTEGER", required: true, defaultValue: 20, minimum: 2, maximum: 200, step: 1 },
      { key: "proximityPercent", label: "Proximity percent", type: "NUMBER", required: true, defaultValue: 0.5, minimum: 0.01, maximum: 10, step: 0.01 },
    ],
    visualization: [
      {
        id: "support-resistance",
        label: "Support and resistance",
        kind: "ZONE",
        pane: "PRICE",
        series: [{ key: "support", label: "Support" }, { key: "resistance", label: "Resistance" }],
      },
    ],
  },
];

export function createFixtureStrategyDefinitions(ownerUserId: string): readonly StrategyDefinitionDto[] {
  const createdAt = FIXTURE_NOW;
  return [
    {
      id: `${ownerUserId}-strategy-ma`,
      ownerUserId,
      logicalFamilyKey: "fixture-ma",
      strategyName: "MA",
      implementationVersion: "1.0.0",
      behaviorProfileId: "TECHNICAL_PROFILES_V1",
      version: 1,
      parameters: { fastPeriod: 20, slowPeriod: 50 },
      createdAt,
    },
    {
      id: `${ownerUserId}-strategy-rsi`,
      ownerUserId,
      logicalFamilyKey: "fixture-rsi",
      strategyName: "RSI",
      implementationVersion: "1.0.0",
      behaviorProfileId: "TECHNICAL_PROFILES_V1",
      version: 1,
      parameters: { buyThreshold: 30, period: 14, sellThreshold: 70 },
      createdAt,
    },
  ];
}

export function createFixtureCompositeDefinition(
  ownerUserId: string,
  definitions: readonly StrategyDefinitionDto[],
): CompositeStrategyDefinitionDto {
  return {
    id: `${ownerUserId}-composite-1`,
    ownerUserId,
    logicalFamilyKey: "fixture-composite",
    version: 1,
    method: "MAJORITY_VOTE",
    combinationProfileId: "MAJORITY_VOTE_V1",
    components: definitions.slice(0, 2).map((definition) => ({
      strategyDefinitionId: definition.id,
      strategyDefinitionVersion: definition.version,
    })),
    createdAt: FIXTURE_NOW,
  };
}

export const FIXTURE_RANKING_CONFIGURATION: RankingConfigurationDto = {
  id: "LINEAR_REQUIRED_V1",
  profileId: "LINEAR_REQUIRED_V1",
  version: 1,
  name: "Required metrics",
  description: "A deterministic weighted score over the required evaluation metrics.",
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
  createdAt: FIXTURE_NOW,
};

function fixtureTrade(experimentId: string, sequence: number, entryTime: string, exitTime: string, entryPrice: number, exitPrice: number, result: TradeDto["result"]): TradeDto {
  const profit = (exitPrice - entryPrice) * 0.4;
  return {
    id: `${experimentId}-trade-${sequence}`,
    experimentId,
    sequence,
    pair: "BTCUSDT",
    entrySignalAt: entryTime,
    entryTime,
    entryPrice,
    exitSignalAt: exitTime,
    exitTime,
    exitPrice,
    exitReason: "STRATEGY_EXIT",
    quantity: 0.4,
    notionalEntryValue: entryPrice * 0.4,
    grossProfit: profit,
    feeAmount: 0.08,
    slippageBps: 0,
    profit,
    resultPercent: (profit / (entryPrice * 0.4)) * 100,
    result,
  };
}

export function createFixtureExperiment(
  ownerUserId: string,
  definition: StrategyDefinitionDto,
  suffix = "1",
): ExperimentDto {
  const experimentId = `${ownerUserId}-experiment-${suffix}`;
  const firstTime = "2026-08-01T04:00:00.000Z";
  const secondTime = "2026-08-01T12:00:00.000Z";
  const selectedStrategy = { kind: "STRATEGY" as const, strategyDefinitionId: definition.id };
  const tradeMarkers = [
    { tradeId: `${experimentId}-trade-1`, kind: "ENTRY" as const, timestamp: firstTime, price: 100_000 },
    { tradeId: `${experimentId}-trade-1`, kind: "EXIT" as const, timestamp: secondTime, price: 101_250 },
  ];
  return {
    id: experimentId,
    candidateId: `${ownerUserId}-candidate-${suffix}`,
    searchRunId: `${ownerUserId}-search-1`,
    strategy: { kind: "STRATEGY", definition },
    marketData: {
      provider: "fixture-market",
      pair: "BTCUSDT",
      timeframe: "5m",
      range: FIXTURE_MARKET_INPUT.range,
      replayGuarantee: "TRACEABLE",
      datasetId: FIXTURE_MARKET_INPUT.datasetId,
      datasetVersion: FIXTURE_MARKET_INPUT.datasetVersion,
      replayLimitation: "Fixture data is deterministic development evidence only.",
    },
    configuration: FIXTURE_BACKTEST_CONFIGURATION,
    metrics: {
      candidateId: `${ownerUserId}-candidate-${suffix}`,
      totalReturnPercent: 4.25,
      winRatePercent: 66.67,
      numberOfTrades: 3,
      maxDrawdownMagnitudePercent: 1.8,
      evaluationProfileId: "REQUIRED_METRICS_V1",
    },
    rankingConfigurationId: FIXTURE_RANKING_CONFIGURATION.id,
    code: { applicationVersion: "fixture-1", gitCommit: "fixture-demo" },
    replay: {
      guarantee: "TRACEABLE",
      unavailableInputs: ["EXECUTABLE_CODE"],
      limitation: "The fixture demonstrates traceability, not exact replay of a deployed executable.",
    },
    visualization: {
      signals: [
        { source: selectedStrategy, timestamp: firstTime, signal: "BUY", executionNotBefore: "2026-08-01T04:05:00.000Z" },
        { source: selectedStrategy, timestamp: secondTime, signal: "SELL", executionNotBefore: "2026-08-01T12:05:00.000Z" },
      ],
      overlays: [
        {
          strategyDefinitionId: definition.id,
          point: { descriptorId: "ma-lines", timestamp: firstTime, values: { fast: 99_500, slow: 99_200 } },
        },
        {
          strategyDefinitionId: definition.id,
          point: { descriptorId: "ma-lines", timestamp: secondTime, values: { fast: 100_900, slow: 100_400 } },
        },
      ],
      tradeMarkers,
    },
    createdAt: FIXTURE_NOW,
  };
}

export function createFixtureLeaderboard(ownerUserId: string, experiment: ExperimentDto): LeaderboardTopKResponseDto {
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    scope: {
      id: `${ownerUserId}-leaderboard`,
      ownerUserId,
      name: "My strategy leaderboard",
      k: 10,
      rankingConfigurationId: FIXTURE_RANKING_CONFIGURATION.id,
      comparisonKey: "BTCUSDT:5m:fixture",
      createdAt: FIXTURE_NOW,
    },
    rankingConfiguration: FIXTURE_RANKING_CONFIGURATION,
    entries: [
      {
        id: `${ownerUserId}-entry-1`,
        rank: 1,
        candidateId: experiment.candidateId,
        searchRunId: experiment.searchRunId,
        experimentId: experiment.id,
        leaderboardScopeId: `${ownerUserId}-leaderboard`,
        rankingConfigurationId: FIXTURE_RANKING_CONFIGURATION.id,
        score: 41.42,
        addedAt: FIXTURE_NOW,
      },
    ],
  };
}

export function createFixtureNews(): NewsPageResponseDto {
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    items: [
      {
        id: "fixture-news-1",
        providerId: "fixture-news",
        providerItemId: "fixture-guid-1",
        title: "Bitcoin holds above a key market level",
        content: "A deterministic fixture story for the private workspace.",
        source: "Fixture Wire",
        publishedAt: "2026-08-28T10:00:00.000Z",
        crawledAt: "2026-08-28T10:01:00.000Z",
        relatedCoins: ["BTC"],
        url: "https://example.test/news/fixture-1",
        sentiment: {
          newsId: "fixture-news-1",
          label: "POSITIVE",
          score: 0.72,
          providerId: "local-lexicon",
          analysisProfileId: "LEXICON_V1",
          modelName: "LEXICON_V1",
          modelVersion: "1",
          analyzedAt: "2026-08-28T10:02:00.000Z",
        },
      },
      {
        id: "fixture-news-2",
        providerId: "fixture-news",
        providerItemId: "fixture-guid-2",
        title: "Market data provider is unavailable for sentiment",
        content: "The article remains readable when auxiliary analysis is missing.",
        source: "Fixture Wire",
        publishedAt: "2026-08-28T08:00:00.000Z",
        crawledAt: "2026-08-28T08:01:00.000Z",
        relatedCoins: ["BTC", "ETH"],
        url: "https://example.test/news/fixture-2",
        sentiment: null,
      },
      {
        id: "fixture-news-3",
        providerId: "fixture-news",
        providerItemId: "fixture-guid-3",
        title: "A neutral update from the network",
        content: "No directional sentiment is available for this fixture.",
        source: "Fixture Wire",
        publishedAt: "2026-08-27T16:00:00.000Z",
        crawledAt: "2026-08-27T16:01:00.000Z",
        relatedCoins: ["ETH"],
        url: "https://example.test/news/fixture-3",
        sentiment: {
          newsId: "fixture-news-3",
          label: "NEUTRAL",
          score: 0,
          providerId: "local-lexicon",
          analysisProfileId: "LEXICON_V1",
          modelName: "LEXICON_V1",
          modelVersion: "1",
          analyzedAt: "2026-08-27T16:02:00.000Z",
        },
      },
    ],
  };
}

export function createFixtureSearchRun(ownerUserId: string, definitions: readonly StrategyDefinitionDto[], state: SearchRunStatusDto["state"] = "COMPLETED"): SearchRunStatusDto {
  return {
    searchRunId: `${ownerUserId}-search-1`,
    ownerUserId,
    generatorType: "RANDOM",
    randomSeed: "fixture-seed",
    searchSpace: {
      availableStrategyDefinitionIds: definitions.map((definition) => definition.id),
      componentCount: { minimum: 2, maximum: 2 },
      requireDistinctComponents: true,
    },
    stopCondition: { maxCandidates: 4 },
    leaderboardScopeId: `${ownerUserId}-leaderboard`,
    candidateTemplate: { marketInput: FIXTURE_MARKET_INPUT, configuration: FIXTURE_BACKTEST_CONFIGURATION },
    maxInFlight: 1,
    state,
    activeCandidateIds: state === "RUNNING" ? [`${ownerUserId}-candidate-search-1`] : [],
    submittedCandidateCount: state === "CREATED" ? 0 : 4,
    completedCandidateCount: state === "COMPLETED" ? 3 : 0,
    failedCandidateCount: state === "COMPLETED" ? 1 : 0,
    averageBacktestDurationMs: state === "COMPLETED" ? 248 : null,
    currentTopLeaderboardEntryId: state === "COMPLETED" ? `${ownerUserId}-entry-1` : undefined,
    createdAt: FIXTURE_NOW,
    startedAt: state === "CREATED" ? undefined : "2026-08-28T12:00:01.000Z",
    updatedAt: FIXTURE_NOW,
    endedAt: state === "COMPLETED" ? "2026-08-28T12:00:05.000Z" : undefined,
    stopReason: state === "COMPLETED" ? "MAX_CANDIDATES" : undefined,
  };
}
