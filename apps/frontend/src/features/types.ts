import type {
  BacktestSubmissionResponseDto,
  CandidateProgressResponseDto,
  CompositeStrategyDefinitionDto,
  DefineCompositeRequestDto,
  DefineCompositeResponseDto,
  DefineStrategyRequestDto,
  DefineStrategyResponseDto,
  ExperimentDto,
  ExperimentResponseDto,
  LeaderboardTopKResponseDto,
  NewsPageResponseDto,
  NewsQueryDto,
  SearchRunRankingEntryDto,
  SearchRunStatusDto,
  SearchRunStatusResponseDto,
  StartManualBacktestRequestDto,
  StartSearchRequestDto,
  StartSearchResponseDto,
  StrategyCatalogResponseDto,
  StrategyDefinitionDto,
  StrategyPluginDescriptorDto,
  TradePageResponseDto,
} from "@cryptox/contracts/rest";

/** These list envelopes are intentionally local until transport routes are composed in I-01. */
export interface StrategyDefinitionsResponseDto {
  schemaVersion: 1;
  items: readonly StrategyDefinitionDto[];
}

export interface CompositeDefinitionsResponseDto {
  schemaVersion: 1;
  items: readonly CompositeStrategyDefinitionDto[];
}

export interface SearchRunsResponseDto {
  schemaVersion: 1;
  items: readonly SearchRunStatusDto[];
}

export interface ExperimentsResponseDto {
  schemaVersion: 1;
  items: readonly ExperimentDto[];
}

export interface FeatureClient {
  strategyCatalog(): Promise<StrategyCatalogResponseDto>;
  strategyDefinitions(): Promise<StrategyDefinitionsResponseDto>;
  compositeDefinitions(): Promise<CompositeDefinitionsResponseDto>;
  defineStrategy(request: DefineStrategyRequestDto): Promise<DefineStrategyResponseDto>;
  defineComposite(request: DefineCompositeRequestDto): Promise<DefineCompositeResponseDto>;
  searchRuns(): Promise<SearchRunsResponseDto>;
  startSearch(request: StartSearchRequestDto): Promise<StartSearchResponseDto>;
  searchStatus(searchRunId: string): Promise<SearchRunStatusResponseDto>;
  cancelSearch(searchRunId: string): Promise<void>;
  startManualBacktest(request: StartManualBacktestRequestDto): Promise<BacktestSubmissionResponseDto>;
  candidateStatus(candidateId: string): Promise<CandidateProgressResponseDto>;
  experiments(): Promise<ExperimentsResponseDto>;
  experiment(experimentId: string): Promise<ExperimentResponseDto>;
  trades(experimentId: string): Promise<TradePageResponseDto>;
  leaderboard(): Promise<LeaderboardTopKResponseDto>;
  news(query: NewsQueryDto): Promise<NewsPageResponseDto>;
}

export type FeatureWorkspaceStatus = "idle" | "loading" | "ready" | "error";
export type NewsPanelStatus = "loading" | "ready" | "unavailable";

export interface FeatureWorkspaceState {
  readonly status: FeatureWorkspaceStatus;
  readonly descriptors: readonly StrategyPluginDescriptorDto[];
  readonly strategyDefinitions: readonly StrategyDefinitionDto[];
  readonly compositeDefinitions: readonly CompositeStrategyDefinitionDto[];
  readonly searchRuns: readonly SearchRunStatusDto[];
  readonly searchRankings: Readonly<Record<string, readonly SearchRunRankingEntryDto[]>>;
  readonly experiments: readonly ExperimentDto[];
  readonly leaderboard?: LeaderboardTopKResponseDto;
  readonly selectedExperiment?: ExperimentDto;
  readonly trades: TradePageResponseDto["items"];
  readonly newsStatus: NewsPanelStatus;
  readonly news?: NewsPageResponseDto;
  readonly message?: string;
  readonly newsMessage?: string;
  readonly pendingAction?: string;
}

export interface FeaturePrivateCache {
  get<T>(key: string): T | undefined;
  set(key: string, value: unknown): void;
}

export const FEATURE_PRIVATE_CACHE_KEY = "feature-workspace";

export interface FeatureWorkspaceCache {
  readonly descriptors: readonly StrategyPluginDescriptorDto[];
  readonly strategyDefinitions: readonly StrategyDefinitionDto[];
  readonly compositeDefinitions: readonly CompositeStrategyDefinitionDto[];
  readonly searchRuns: readonly SearchRunStatusDto[];
  readonly searchRankings: Readonly<Record<string, readonly SearchRunRankingEntryDto[]>>;
  readonly experiments: readonly ExperimentDto[];
  readonly leaderboard?: LeaderboardTopKResponseDto;
  readonly selectedExperiment?: ExperimentDto;
  readonly trades: TradePageResponseDto["items"];
  readonly newsStatus: NewsPanelStatus;
  readonly news?: NewsPageResponseDto;
  readonly newsMessage?: string;
}
