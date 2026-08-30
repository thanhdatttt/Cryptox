import {
  REST_SCHEMA_VERSION,
  RestContractValidationError,
  parseCreateLeaderboardScopeRequest,
  parseDefineCompositeRequest,
  parseDefineStrategyRequest,
  parseMarketHistoryRequest,
  parseNewsQuery,
  parseStartManualBacktestRequest,
  parseStartSearchRequest,
  type BacktestConfigurationDto,
  type CandidateProgressDto,
  type CandleDto,
  type CompositeStrategyDefinitionDto,
  type DefineCompositeRequestDto,
  type DefineStrategyRequestDto,
  type ExperimentDto,
  type LeaderboardEntryDto,
  type LeaderboardScopeDto,
  type MarketHistoryRequestDto,
  type MarketHistoryResponseDto,
  type NewsItemDto,
  type NewsPageResponseDto,
  type RankingConfigurationDto,
  type SearchRunRankingEntryDto,
  type SearchRunStatusDto,
  type StartManualBacktestRequestDto,
  type StartSearchRequestDto,
  type StrategyDefinitionDto,
  type StrategyPluginDescriptorDto,
  type TradeDto,
} from "@cryptox/contracts/rest";
import type {
  BacktestConfiguration,
  CandidateProgress,
  Experiment,
  ReplayUnavailableInput,
  Trade,
} from "@cryptox/backtesting";
import type { HistoricalCandlePage } from "@cryptox/market-data";
import type {
  CompositeStrategyDefinition,
  StrategyDefinition,
  StrategyPluginDescriptor,
} from "@cryptox/strategy";
import type { LeaderboardEntry, LeaderboardScope, RankingConfiguration, SearchRunRankingEntry } from "@cryptox/leaderboard";
import type { NewsPage, NewsReadItem } from "@cryptox/news";
import type { SearchRunStatus } from "@cryptox/search";

export function toStrategyPluginDescriptor(value: StrategyPluginDescriptor): StrategyPluginDescriptorDto {
  return {
    name: value.name,
    displayName: value.displayName,
    description: value.description,
    category: value.category,
    implementationVersion: value.implementationVersion,
    behaviorProfileId: value.behaviorProfileId,
    parameters: value.parameters.map((parameter) => ({ ...parameter })),
    visualization: value.visualization.map((descriptor) => ({
      ...descriptor,
      series: descriptor.series.map((series) => ({ ...series })),
    })),
  };
}

export function toStrategyDefinitionDto(value: StrategyDefinition): StrategyDefinitionDto {
  return {
    id: value.id,
    ownerUserId: value.ownerUserId,
    logicalFamilyKey: value.logicalFamilyKey,
    strategyName: value.strategyName,
    implementationVersion: value.implementationVersion,
    behaviorProfileId: value.behaviorProfileId,
    version: value.version,
    parameters: { ...value.parameters },
    ...(value.authoringOrigin === undefined ? {} : { authoringOrigin: { ...value.authoringOrigin } }),
    createdAt: value.createdAt,
  };
}

export function toCompositeDefinitionDto(value: CompositeStrategyDefinition): CompositeStrategyDefinitionDto {
  return {
    id: value.id,
    ownerUserId: value.ownerUserId,
    logicalFamilyKey: value.logicalFamilyKey,
    version: value.version,
    method: value.method,
    combinationProfileId: value.combinationProfileId,
    components: value.components.map((component) => ({ ...component })),
    ...(value.weightedVote === undefined ? {} : { weightedVote: { ...value.weightedVote } }),
    createdAt: value.createdAt,
  };
}

function toCandleDto(value: HistoricalCandlePage["candles"][number]): CandleDto {
  return {
    pair: value.pair,
    timeframe: value.timeframe,
    timestamp: value.timestamp,
    open: value.open,
    high: value.high,
    low: value.low,
    close: value.close,
    volume: value.volume,
    isClosed: value.isClosed,
  };
}

export function toMarketHistoryResponse(value: HistoricalCandlePage): MarketHistoryResponseDto {
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    pair: value.pair,
    timeframe: value.timeframe,
    range: { ...value.range },
    candles: value.candles.map(toCandleDto),
    complete: value.complete,
    missingRanges: value.missingRanges.map((range) => ({ ...range })),
    formingIncluded: value.formingIncluded,
    asOf: value.asOf,
    provenance: { ...value.provenance, range: { ...value.provenance.range } },
    ...(value.nextCursor === undefined ? {} : { nextCursor: value.nextCursor }),
  };
}

function toBacktestConfigurationDto(value: BacktestConfiguration): BacktestConfigurationDto {
  return {
    executionProfileId: value.executionProfileId,
    initialCapital: value.initialCapital,
    feeRatePercent: value.feeRatePercent,
    slippageBps: value.slippageBps,
    ...(value.paperExecution === undefined
      ? {}
      : { paperExecutionProvenance: { ...value.paperExecution } }),
  };
}

export function toCandidateProgressDto(value: CandidateProgress): CandidateProgressDto {
  return {
    candidateId: value.candidateId,
    ownerUserId: value.ownerUserId,
    origin: { ...value.origin },
    strategySelection: { ...value.strategySelection },
    marketInput: {
      ...value.marketInput,
      range: { ...value.marketInput.range },
    },
    status: value.status,
    ...(value.experimentId === undefined ? {} : { experimentId: value.experimentId }),
    ...(value.failure === undefined ? {} : { failure: { ...value.failure, message: safeFailureMessage(value.failure.code) } }),
    createdAt: value.createdAt,
    ...(value.startedAt === undefined ? {} : { startedAt: value.startedAt }),
    ...(value.completedAt === undefined ? {} : { completedAt: value.completedAt }),
    ...(value.durationMs === undefined ? {} : { durationMs: value.durationMs }),
    updatedAt: value.updatedAt,
  };
}

export function toTradeDto(value: Trade): TradeDto {
  return {
    id: value.id,
    experimentId: value.experimentId,
    sequence: value.sequence,
    pair: value.pair,
    entrySignalAt: value.entrySignalAt,
    entryTime: value.entryTime,
    entryPrice: value.entryPrice,
    ...(value.exitSignalAt === undefined ? {} : { exitSignalAt: value.exitSignalAt }),
    exitTime: value.exitTime,
    exitPrice: value.exitPrice,
    ...(value.positionMode === undefined ? {} : { positionMode: value.positionMode }),
    exitReason: value.exitReason,
    quantity: value.quantity,
    notionalEntryValue: value.notionalEntryValue,
    grossProfit: value.grossProfit,
    feeAmount: value.feeAmount,
    slippageBps: value.slippageBps,
    profit: value.profit,
    resultPercent: value.resultPercent,
    result: value.result,
  };
}

function toReplayDto(value: Experiment["replay"]): ExperimentDto["replay"] {
  if (value.guarantee === "EXACT_REPLAY_AVAILABLE") {
    return { guarantee: value.guarantee, unavailableInputs: [] };
  }
  return {
    guarantee: value.guarantee,
    unavailableInputs: [...value.unavailableInputs] as [ReplayUnavailableInput, ...ReplayUnavailableInput[]],
    limitation: value.limitation,
  };
}

export function toExperimentDto(value: Experiment): ExperimentDto {
  return {
    id: value.id,
    candidateId: value.candidateId,
    ...(value.searchRunId === undefined ? {} : { searchRunId: value.searchRunId }),
    strategy: value.strategy.kind === "STRATEGY"
      ? { kind: "STRATEGY", definition: toStrategyDefinitionDto(value.strategy.definition) }
      : {
          kind: "COMPOSITE",
          definition: toCompositeDefinitionDto(value.strategy.definition),
          componentDefinitions: value.strategy.componentDefinitions.map(toStrategyDefinitionDto),
        },
    marketData: { ...value.marketData, range: { ...value.marketData.range } },
    configuration: toBacktestConfigurationDto(value.configuration),
    metrics: { ...value.metrics },
    rankingConfigurationId: value.rankingConfigurationId,
    code: { ...value.code },
    replay: toReplayDto(value.replay),
    visualization: {
      signals: value.visualization.signals.map((signal) => ({ ...signal, source: { ...signal.source } })),
      overlays: value.visualization.overlays.map((overlay) => ({ ...overlay, point: { ...overlay.point, values: { ...overlay.point.values } } })),
      tradeMarkers: value.visualization.tradeMarkers.map((marker) => ({ ...marker })),
    },
    createdAt: value.createdAt,
    ...(value.paperExecutionProvenance === undefined
      ? {}
      : { paperExecutionProvenance: { ...value.paperExecutionProvenance } }),
  };
}

export function toSearchRunStatusDto(value: SearchRunStatus): SearchRunStatusDto {
  return {
    searchRunId: value.searchRunId,
    ownerUserId: value.ownerUserId,
    generatorType: value.generatorType,
    randomSeed: value.randomSeed,
    searchSpace: {
      ...value.searchSpace,
      availableStrategyDefinitionIds: [...value.searchSpace.availableStrategyDefinitionIds],
      componentCount: { ...value.searchSpace.componentCount },
    },
    stopCondition: { ...value.stopCondition } as SearchRunStatusDto["stopCondition"],
    leaderboardScopeId: value.leaderboardScopeId,
    candidateTemplate: {
      marketInput: { ...value.candidateTemplate.marketInput, range: { ...value.candidateTemplate.marketInput.range } },
      configuration: toBacktestConfigurationDto(value.candidateTemplate.configuration),
    },
    maxInFlight: value.maxInFlight,
    state: value.state,
    activeCandidateIds: [...value.activeCandidateIds],
    submittedCandidateCount: value.submittedCandidateCount,
    completedCandidateCount: value.completedCandidateCount,
    failedCandidateCount: value.failedCandidateCount,
    averageBacktestDurationMs: value.averageBacktestDurationMs,
    ...(value.currentTopLeaderboardEntryId === undefined ? {} : { currentTopLeaderboardEntryId: value.currentTopLeaderboardEntryId }),
    createdAt: value.createdAt,
    ...(value.startedAt === undefined ? {} : { startedAt: value.startedAt }),
    updatedAt: value.updatedAt,
    ...(value.endedAt === undefined ? {} : { endedAt: value.endedAt }),
    ...(value.stopReason === undefined ? {} : { stopReason: value.stopReason }),
    ...(value.state === "FAILED" ? { lastError: "Search execution failed." } : {}),
    ...(value.seededDiscovery === undefined
      ? {}
      : {
          seededDiscovery: {
            ...value.seededDiscovery,
            algorithmConfiguration: { ...value.seededDiscovery.algorithmConfiguration },
            datasetIdentity: { ...value.seededDiscovery.datasetIdentity },
            code: { ...value.seededDiscovery.code },
            defaultBudget: { ...value.seededDiscovery.defaultBudget },
          },
        }),
  };
}

export function toRankingConfigurationDto(value: RankingConfiguration): RankingConfigurationDto {
  return {
    id: value.id,
    profileId: value.profileId,
    version: value.version,
    name: value.name,
    ...(value.description === undefined ? {} : { description: value.description }),
    formula: { ...value.formula },
    minimumNumberOfTrades: value.minimumNumberOfTrades,
    tieBreakers: [
      { ...value.tieBreakers[0] },
      { ...value.tieBreakers[1] },
      { ...value.tieBreakers[2] },
      { ...value.tieBreakers[3] },
      { ...value.tieBreakers[4] },
    ],
    createdAt: value.createdAt,
  };
}

export function toLeaderboardScopeDto(value: LeaderboardScope): LeaderboardScopeDto {
  return { ...value };
}

export function toLeaderboardEntryDto(value: LeaderboardEntry): LeaderboardEntryDto {
  return { ...value };
}

export function toSearchRankingEntryDto(value: SearchRunRankingEntry): SearchRunRankingEntryDto {
  return { ...value };
}

export function toNewsItemDto(value: NewsReadItem): NewsItemDto {
  return {
    id: value.id,
    providerId: value.providerId,
    providerItemId: value.providerItemId,
    title: value.title,
    content: value.content,
    source: value.source,
    publishedAt: value.publishedAt,
    crawledAt: value.crawledAt,
    relatedCoins: [...value.relatedCoins],
    url: value.url,
    sentiment: value.sentiment === null ? null : { ...value.sentiment },
    sentimentAvailability: value.sentiment === null ? { state: "MISSING" } : { state: "AVAILABLE" },
    ...(value.extraction === undefined ? {} : {
      extraction: {
        ...value.extraction,
        ...(value.extraction.template === undefined ? {} : { template: { ...value.extraction.template } }),
      },
    }),
  };
}

export function toNewsPageResponse(value: NewsPage): NewsPageResponseDto {
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    items: value.items.map(toNewsItemDto),
    ...(value.nextCursor === undefined ? {} : { nextCursor: value.nextCursor }),
  };
}

export function pageRequest(query: Record<string, unknown> | undefined): { limit: number; cursor?: string } {
  const limitValue = scalarQuery(query?.limit);
  const cursorValue = scalarQuery(query?.cursor);
  const limit = limitValue === undefined || limitValue === "" ? 100 : Number(limitValue);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new RestContractValidationError("limit must be an integer between 1 and 100");
  }
  if (cursorValue !== undefined && typeof cursorValue !== "string") {
    throw new RestContractValidationError("cursor must be a string");
  }
  return { limit, ...(cursorValue === undefined ? {} : { cursor: cursorValue }) };
}

function scalarQuery(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

export function queryValue(query: Record<string, unknown> | undefined, key: string): string | undefined {
  return scalarQuery(query?.[key]);
}

export function marketHistoryRequest(body: unknown): MarketHistoryRequestDto {
  return parseMarketHistoryRequest(body);
}

export function defineStrategyRequest(body: unknown): DefineStrategyRequestDto {
  return parseDefineStrategyRequest(body);
}

export function defineCompositeRequest(body: unknown): DefineCompositeRequestDto {
  return parseDefineCompositeRequest(body);
}

export function startManualBacktestRequest(body: unknown): StartManualBacktestRequestDto {
  return parseStartManualBacktestRequest(body);
}

export function startSearchRequest(body: unknown): StartSearchRequestDto {
  return parseStartSearchRequest(body);
}

export function createLeaderboardScopeRequest(body: unknown) {
  return parseCreateLeaderboardScopeRequest(body);
}

export function newsQuery(query: Record<string, unknown>): ReturnType<typeof parseNewsQuery> {
  const relatedCoinsValue = scalarQuery(query.relatedCoins);
  const relatedCoins = relatedCoinsValue === undefined
    ? undefined
    : relatedCoinsValue.split(",").map((coin) => coin.trim()).filter(Boolean);
  const toNumber = (value: unknown): number | undefined => {
    const scalar = scalarQuery(value);
    return scalar === undefined ? undefined : Number(scalar);
  };
  return parseNewsQuery({
    schemaVersion: toNumber(query.schemaVersion),
    ...(relatedCoins === undefined ? {} : { relatedCoins }),
    ...(scalarQuery(query.publishedFrom) === undefined ? {} : { publishedFrom: scalarQuery(query.publishedFrom) }),
    ...(scalarQuery(query.publishedTo) === undefined ? {} : { publishedTo: scalarQuery(query.publishedTo) }),
    limit: toNumber(query.limit),
    ...(scalarQuery(query.cursor) === undefined ? {} : { cursor: scalarQuery(query.cursor) }),
    order: scalarQuery(query.order),
  });
}

export function safeFailureMessage(code: string): string {
  switch (code) {
    case "CANCELLED": return "Backtest was cancelled.";
    case "SATURATED": return "Backtest capacity is temporarily saturated.";
    case "STRATEGY_FAILED": return "Strategy execution failed.";
    case "SIMULATION_FAILED": return "Backtest simulation failed.";
    case "EVALUATION_FAILED": return "Backtest evaluation failed.";
    case "RANKING_FAILED": return "Leaderboard admission failed.";
    case "INVALID_REQUEST": return "Backtest request was invalid.";
    default: return "Backtest execution failed.";
  }
}

export type { BacktestConfigurationDto, StartManualBacktestRequestDto, StartSearchRequestDto };
