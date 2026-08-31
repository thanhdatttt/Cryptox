import type {
  BacktestSubmissionResponseDto,
  CandidateProgressResponseDto,
  CompositeStrategyDefinitionDto,
  ApproveStrategyAuthoringDraftResponseDto,
  CreateStrategyAuthoringDraftRequestDto,
  StrategyAuthoringDraftActionRequestDto,
  StrategyAuthoringDraftDto,
  StrategyAuthoringDraftResponseDto,
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
  createStrategyAuthoringDraft(
    request: CreateStrategyAuthoringDraftRequestDto,
  ): Promise<StrategyAuthoringDraftResponseDto>;
  validateStrategyAuthoringDraft(
    draftId: string,
    request: StrategyAuthoringDraftActionRequestDto,
  ): Promise<StrategyAuthoringDraftResponseDto>;
  approveStrategyAuthoringDraft(
    draftId: string,
    request: StrategyAuthoringDraftActionRequestDto,
  ): Promise<ApproveStrategyAuthoringDraftResponseDto>;
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

export type FeatureAuthoringStatus =
  | "READY"
  | "DRAFT"
  | "VALIDATED"
  | "APPROVED"
  | "REJECTED"
  | "FAILURE"
  | "UNAVAILABLE";

export interface FeatureAuthoringActionAvailability {
  readonly save: boolean;
  readonly validate: boolean;
  readonly approve: boolean;
}

export interface FeatureAuthoringState {
  readonly status: FeatureAuthoringStatus;
  /** Only server-returned safe draft fields may enter this private projection. */
  readonly draft?: StrategyAuthoringDraftDto;
  /** Present only after the server returns the approved definition. */
  readonly definition?: StrategyDefinitionDto;
  readonly actions: FeatureAuthoringActionAvailability;
  readonly message: string;
  readonly reason?: string;
  readonly failedAction?: "SAVE" | "VALIDATE" | "APPROVE";
}

export const UNAVAILABLE_AUTHORING_STATE: FeatureAuthoringState = {
  status: "UNAVAILABLE",
  reason: "TRANSPORT_UNAVAILABLE",
  actions: { save: false, validate: false, approve: false },
  message: "Controlled LLM authoring is unavailable because its typed transport is not configured.",
};

export const READY_AUTHORING_STATE: FeatureAuthoringState = {
  status: "READY",
  actions: { save: true, validate: false, approve: false },
  message:
    "Choose a prompt or an approved News item. Save creates a server draft; Validate and Approve remain explicit.",
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
