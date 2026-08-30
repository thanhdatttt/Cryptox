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

/**
 * The frozen public contracts do not include an LLM draft workflow. Keep that
 * absence explicit instead of making a client-side draft look persisted.
 */
export interface FeatureAuthoringState {
  readonly status: "UNAVAILABLE";
  readonly reason: "NO_FROZEN_PUBLIC_TRANSPORT";
  readonly draft: "NOT_SUPPLIED";
  readonly validation: "NOT_SUPPLIED";
  readonly save: "DISABLED";
  readonly approve: "DISABLED";
  readonly message: string;
}

export const UNAVAILABLE_AUTHORING_STATE: FeatureAuthoringState = {
  status: "UNAVAILABLE",
  reason: "NO_FROZEN_PUBLIC_TRANSPORT",
  draft: "NOT_SUPPLIED",
  validation: "NOT_SUPPLIED",
  save: "DISABLED",
  approve: "DISABLED",
  message:
    "Controlled LLM authoring is not yet composed: the frozen public REST contracts expose no draft, validation, Save, or Approve transport.",
};

export interface FeatureWorkspaceState {
  readonly status: FeatureWorkspaceStatus;
  readonly authoring: FeatureAuthoringState;
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
  /** Optional monotonic revision used to reject stale async writes after logout. */
  readonly revision?: number;
}

export const FEATURE_PRIVATE_CACHE_KEY = "feature-workspace";

export interface FeatureWorkspaceCache {
  readonly authoring: FeatureAuthoringState;
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
