import { useSyncExternalStore } from "react";
import {
  REST_SCHEMA_VERSION,
  type CreateStrategyAuthoringDraftRequestDto,
  type DefineCompositeRequestDto,
  type DefineStrategyRequestDto,
  type StrategyAuthoringSourceDto,
  type StrategyAuthoringDraftDto,
  type StrategyDefinitionDto,
  type StartManualBacktestRequestDto,
  type StartSearchRequestDto,
} from "@cryptox/contracts/rest";
import { FeatureClientError } from "./clients";
import type { FeatureClient, FeaturePrivateCache, FeatureWorkspaceCache, FeatureWorkspaceState } from "./types";
import {
  FEATURE_PRIVATE_CACHE_KEY,
  READY_AUTHORING_STATE,
  UNAVAILABLE_AUTHORING_STATE,
  type FeatureAuthoringActionAvailability,
  type FeatureAuthoringState,
} from "./types";

const EMPTY_STATE: FeatureWorkspaceState = {
  status: "idle",
  authoring: READY_AUTHORING_STATE,
  descriptors: [],
  strategyDefinitions: [],
  compositeDefinitions: [],
  searchRuns: [],
  searchRankings: {},
  experiments: [],
  trades: [],
  newsStatus: "loading",
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function authoringActions(status: StrategyAuthoringDraftDto["status"] | "READY"): FeatureAuthoringActionAvailability {
  if (status === "READY") return { save: true, validate: false, approve: false };
  if (status === "DRAFT") return { save: true, validate: true, approve: false };
  if (status === "VALIDATED") return { save: true, validate: false, approve: true };
  if (status === "REJECTED") return { save: true, validate: false, approve: false };
  return { save: true, validate: false, approve: false };
}

function draftMessage(draft: StrategyAuthoringDraftDto): string {
  if (draft.status === "DRAFT") {
    return "The server returned a structured draft. Validate it before explicit approval.";
  }
  if (draft.status === "VALIDATED") {
    return "The server validated this draft. Approve it explicitly to create an immutable definition.";
  }
  if (draft.status === "APPROVED") {
    return "This authoring draft is approved by the server.";
  }
  const reasons = draft.validation?.reasons.filter(Boolean) ?? [];
  return reasons.length
    ? `The server rejected this draft: ${reasons.join(" · ")}`
    : "The server rejected this authoring draft.";
}

function authoringStateFromDraft(draft: StrategyAuthoringDraftDto): FeatureAuthoringState {
  return {
    status: draft.status,
    draft,
    actions: authoringActions(draft.status),
    message: draftMessage(draft),
  };
}

function normalizeAuthoringRequest(
  request: Omit<CreateStrategyAuthoringDraftRequestDto, "schemaVersion">,
): Omit<CreateStrategyAuthoringDraftRequestDto, "schemaVersion"> {
  const source = request?.source as unknown;
  if (typeof source !== "object" || source === null || Array.isArray(source)) {
    throw new FeatureClientError(400, "The authoring source is invalid.", "INVALID_REQUEST");
  }

  const sourceRecord = source as Record<string, unknown>;
  if (sourceRecord.kind === "PROMPT") {
    if (typeof request.prompt !== "string" || !request.prompt.trim()) {
      throw new FeatureClientError(400, "The authoring prompt is required.", "INVALID_REQUEST");
    }
    return { source: { kind: "PROMPT" }, prompt: request.prompt };
  }

  if (sourceRecord.kind === "APPROVED_NEWS_ITEM") {
    if (typeof sourceRecord.newsItemId !== "string" || !sourceRecord.newsItemId.trim()) {
      throw new FeatureClientError(400, "The approved News item id is required.", "INVALID_REQUEST");
    }
    return {
      source: { kind: "APPROVED_NEWS_ITEM", newsItemId: sourceRecord.newsItemId.trim() },
    };
  }

  throw new FeatureClientError(400, "The authoring source is invalid.", "INVALID_REQUEST");
}

function hasApprovedLoadedNews(
  state: FeatureWorkspaceState,
  source: StrategyAuthoringSourceDto,
): boolean {
  if (source.kind === "PROMPT") return true;
  return state.newsStatus === "ready"
    && state.news?.items.some(
      (item) => item.id === source.newsItemId && item.extraction?.template?.status === "APPROVED",
    ) === true;
}

function unavailableError(error: unknown): boolean {
  return error instanceof FeatureClientError && (
    error.status === 503 || error.code === "CAPABILITY_UNAVAILABLE"
  );
}

function authoringFailure(
  operation: "SAVE" | "VALIDATE" | "APPROVE",
  error: unknown,
  draft: StrategyAuthoringDraftDto | undefined,
): FeatureAuthoringState {
  if (unavailableError(error)) {
    return {
      status: "UNAVAILABLE",
      ...(draft === undefined ? {} : { draft }),
      reason: "CAPABILITY_UNAVAILABLE",
      failedAction: operation,
      actions: { save: false, validate: false, approve: false },
      message: "Controlled LLM authoring is unavailable. The server did not accept this action.",
    };
  }

  return {
    status: "FAILURE",
    ...(draft === undefined ? {} : { draft }),
    failedAction: operation,
    actions: {
      save: true,
      validate: operation === "VALIDATE" && draft?.status === "DRAFT",
      approve: operation === "APPROVE" && draft?.status === "VALIDATED",
    },
    message: operation === "SAVE"
      ? "The authoring draft could not be saved. No server draft was accepted."
      : operation === "VALIDATE"
        ? "The server could not validate this draft. You can retry validation."
        : "The server could not approve this draft. You can retry approval.",
  };
}

function hasAuthoringTransport(client: FeatureClient): boolean {
  const candidate = client as unknown as Record<string, unknown>;
  if (candidate.authoringTransportAvailable === false) return false;
  return typeof candidate.createStrategyAuthoringDraft === "function"
    && typeof candidate.validateStrategyAuthoringDraft === "function"
    && typeof candidate.approveStrategyAuthoringDraft === "function";
}

function replaceDefinition(
  definitions: readonly StrategyDefinitionDto[],
  definition: StrategyDefinitionDto,
): readonly StrategyDefinitionDto[] {
  return definitions.some((item) => item.id === definition.id)
    ? definitions.map((item) => item.id === definition.id ? definition : item)
    : [definition, ...definitions];
}

function cacheable(state: FeatureWorkspaceState): FeatureWorkspaceCache {
  return {
    authoring: state.authoring,
    descriptors: state.descriptors,
    strategyDefinitions: state.strategyDefinitions,
    compositeDefinitions: state.compositeDefinitions,
    searchRuns: state.searchRuns,
    searchRankings: state.searchRankings,
    experiments: state.experiments,
    leaderboard: state.leaderboard,
    selectedExperiment: state.selectedExperiment,
    trades: state.trades,
    newsStatus: state.newsStatus,
    news: state.news,
    newsMessage: state.newsMessage,
  };
}

export class FeatureWorkspaceStore {
  private state: FeatureWorkspaceState = EMPTY_STATE;
  private readonly listeners = new Set<() => void>();
  private loadPromise?: Promise<void>;
  private readonly cacheRevision?: number;
  private readonly authoringTransportAvailable: boolean;

  public constructor(
    private readonly client: FeatureClient,
    private readonly privateCache: FeaturePrivateCache,
  ) {
    this.cacheRevision = privateCache.revision;
    this.authoringTransportAvailable = hasAuthoringTransport(client);
    this.state = {
      ...EMPTY_STATE,
      authoring: this.authoringTransportAvailable ? READY_AUTHORING_STATE : UNAVAILABLE_AUTHORING_STATE,
    };
  }

  public snapshot = (): FeatureWorkspaceState => this.state;

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public async load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    if (this.canUsePrivateCache()) {
      const cached = this.privateCache.get<FeatureWorkspaceCache>(FEATURE_PRIVATE_CACHE_KEY);
      if (cached) {
        const cachedAuthoring = cached.authoring;
        const cachedWasTransportUnavailable = cachedAuthoring?.reason === UNAVAILABLE_AUTHORING_STATE.reason
          || cachedAuthoring?.reason === "NO_FROZEN_PUBLIC_TRANSPORT";
        const authoring = !this.authoringTransportAvailable
          ? UNAVAILABLE_AUTHORING_STATE
          : !cachedAuthoring || cachedWasTransportUnavailable
            ? READY_AUTHORING_STATE
            : cachedAuthoring;
        this.publish({ ...EMPTY_STATE, ...cached, authoring, status: "ready" });
        return;
      }
    }

    this.publish({
      ...EMPTY_STATE,
      authoring: this.authoringTransportAvailable ? READY_AUTHORING_STATE : UNAVAILABLE_AUTHORING_STATE,
      status: "loading",
      newsStatus: "loading",
    });
    this.loadPromise = this.loadFromClient().finally(() => {
      this.loadPromise = undefined;
    });
    return this.loadPromise;
  }

  public async createStrategyAuthoringDraft(
    request: Omit<CreateStrategyAuthoringDraftRequestDto, "schemaVersion">,
  ): Promise<void> {
    if (!this.authoringTransportAvailable) {
      this.publish({ ...this.state, authoring: UNAVAILABLE_AUTHORING_STATE });
      return;
    }

    let safeRequest: Omit<CreateStrategyAuthoringDraftRequestDto, "schemaVersion">;
    try {
      safeRequest = normalizeAuthoringRequest(request);
    } catch (error) {
      this.publish({
        ...this.state,
        authoring: authoringFailure("SAVE", error, undefined),
        pendingAction: undefined,
        message: undefined,
      });
      return;
    }
    if (!hasApprovedLoadedNews(this.state, safeRequest.source)) {
      this.publish({
        ...this.state,
        authoring: authoringFailure(
          "SAVE",
          new FeatureClientError(
            409,
            "Select an already loaded News item with an approved extraction template.",
            "NEWS_ITEM_NOT_APPROVED",
          ),
          undefined,
        ),
        pendingAction: undefined,
        message: undefined,
      });
      return;
    }
    this.publish({ ...this.state, pendingAction: "Saving authoring draft…", message: undefined });
    try {
      const response = await this.client.createStrategyAuthoringDraft({
        schemaVersion: REST_SCHEMA_VERSION,
        ...safeRequest,
      });
      this.publish({
        ...this.state,
        authoring: authoringStateFromDraft(response.draft),
        pendingAction: undefined,
        message: undefined,
      });
    } catch (error) {
      this.publish({
        ...this.state,
        authoring: authoringFailure("SAVE", error, undefined),
        pendingAction: undefined,
        message: undefined,
      });
    }
  }

  public async validateStrategyAuthoringDraft(draftId: string): Promise<void> {
    if (!this.authoringTransportAvailable) {
      this.publish({ ...this.state, authoring: UNAVAILABLE_AUTHORING_STATE });
      return;
    }
    const draft = this.state.authoring.draft;
    if (!draft || draft.id !== draftId || draft.status !== "DRAFT") {
      this.publish({
        ...this.state,
        authoring: authoringFailure(
          "VALIDATE",
          new FeatureClientError(409, "The selected authoring draft is not available for validation.", "DRAFT_NOT_LOADED"),
          draft,
        ),
        pendingAction: undefined,
        message: undefined,
      });
      return;
    }
    this.publish({ ...this.state, pendingAction: "Validating authoring draft…", message: undefined });
    try {
      const response = await this.client.validateStrategyAuthoringDraft(draftId, {
        schemaVersion: REST_SCHEMA_VERSION,
      });
      if (response.draft.id !== draft.id || response.draft.ownerUserId !== draft.ownerUserId) {
        throw new FeatureClientError(502, "Feature API returned a draft for a different private resource.", "INVALID_RESPONSE");
      }
      this.publish({
        ...this.state,
        authoring: authoringStateFromDraft(response.draft),
        pendingAction: undefined,
        message: undefined,
      });
    } catch (error) {
      this.publish({
        ...this.state,
        authoring: authoringFailure("VALIDATE", error, draft),
        pendingAction: undefined,
        message: undefined,
      });
    }
  }

  public async approveStrategyAuthoringDraft(draftId: string): Promise<void> {
    if (!this.authoringTransportAvailable) {
      this.publish({ ...this.state, authoring: UNAVAILABLE_AUTHORING_STATE });
      return;
    }
    const draft = this.state.authoring.draft;
    if (!draft || draft.id !== draftId || draft.status !== "VALIDATED") {
      this.publish({
        ...this.state,
        authoring: authoringFailure(
          "APPROVE",
          new FeatureClientError(409, "The selected authoring draft is not available for approval.", "DRAFT_NOT_LOADED"),
          draft,
        ),
        pendingAction: undefined,
        message: undefined,
      });
      return;
    }
    this.publish({ ...this.state, pendingAction: "Approving authoring draft…", message: undefined });
    try {
      const response = await this.client.approveStrategyAuthoringDraft(draftId, {
        schemaVersion: REST_SCHEMA_VERSION,
      });
      if (response.definition.ownerUserId !== draft.ownerUserId) {
        throw new FeatureClientError(502, "Feature API returned a definition for a different private resource.", "INVALID_RESPONSE");
      }
      const approvedDraft: StrategyAuthoringDraftDto = {
        ...draft,
        status: "APPROVED",
        approvedDefinitionId: response.definition.id,
      };
      this.publish({
        ...this.state,
        authoring: {
          ...authoringStateFromDraft(approvedDraft),
          definition: response.definition,
          message: "The server approved this draft and returned an immutable strategy definition.",
        },
        strategyDefinitions: replaceDefinition(this.state.strategyDefinitions, response.definition),
        pendingAction: undefined,
        message: undefined,
      });
    } catch (error) {
      this.publish({
        ...this.state,
        authoring: authoringFailure("APPROVE", error, draft),
        pendingAction: undefined,
        message: undefined,
      });
    }
  }

  public async createStrategy(request: Omit<DefineStrategyRequestDto, "schemaVersion">): Promise<void> {
    this.publish({ ...this.state, pendingAction: "Saving strategy…", message: undefined });
    try {
      await this.client.defineStrategy({ schemaVersion: REST_SCHEMA_VERSION, ...request });
      const definitions = await this.client.strategyDefinitions();
      this.publish({ ...this.state, strategyDefinitions: definitions.items, pendingAction: undefined });
    } catch (error) {
      this.publish({ ...this.state, pendingAction: undefined, message: errorMessage(error, "Unable to save strategy.") });
    }
  }

  public async createComposite(request: Omit<DefineCompositeRequestDto, "schemaVersion">): Promise<void> {
    this.publish({ ...this.state, pendingAction: "Saving composite…", message: undefined });
    try {
      await this.client.defineComposite({ schemaVersion: REST_SCHEMA_VERSION, ...request });
      const composites = await this.client.compositeDefinitions();
      this.publish({ ...this.state, compositeDefinitions: composites.items, pendingAction: undefined });
    } catch (error) {
      this.publish({ ...this.state, pendingAction: undefined, message: errorMessage(error, "Unable to save composite.") });
    }
  }

  public async startSearch(request: Omit<StartSearchRequestDto, "schemaVersion">): Promise<void> {
    this.publish({ ...this.state, pendingAction: "Starting Search Run…", message: undefined });
    try {
      const started = await this.client.startSearch({ schemaVersion: REST_SCHEMA_VERSION, ...request });
      await this.refreshSearch(started.searchRunId);
      this.publish({ ...this.state, pendingAction: undefined });
    } catch (error) {
      this.publish({ ...this.state, pendingAction: undefined, message: errorMessage(error, "Unable to start Search Run.") });
    }
  }

  public async refreshSearch(searchRunId: string): Promise<void> {
    try {
      const response = await this.client.searchStatus(searchRunId);
      const searchRuns = this.state.searchRuns.some((run) => run.searchRunId === searchRunId)
        ? this.state.searchRuns.map((run) => run.searchRunId === searchRunId ? response.searchRun : run)
        : [response.searchRun, ...this.state.searchRuns];
      this.publish({
        ...this.state,
        searchRuns,
        searchRankings: { ...this.state.searchRankings, [searchRunId]: response.ranking },
        message: undefined,
      });
    } catch (error) {
      this.publish({ ...this.state, message: errorMessage(error, "Unable to refresh Search Run progress.") });
    }
  }

  public async cancelSearch(searchRunId: string): Promise<void> {
    this.publish({ ...this.state, pendingAction: "Stopping Search Run…", message: undefined });
    try {
      await this.client.cancelSearch(searchRunId);
      await this.refreshSearch(searchRunId);
      this.publish({ ...this.state, pendingAction: undefined });
    } catch (error) {
      this.publish({ ...this.state, pendingAction: undefined, message: errorMessage(error, "Unable to stop Search Run.") });
    }
  }

  public async startManualBacktest(request: Omit<StartManualBacktestRequestDto, "schemaVersion">): Promise<void> {
    this.publish({ ...this.state, pendingAction: "Running bounded backtest…", message: undefined });
    try {
      const accepted = await this.client.startManualBacktest({ schemaVersion: REST_SCHEMA_VERSION, ...request });
      const candidate = await this.client.candidateStatus(accepted.candidateId);
      if (candidate.candidate.status !== "SUCCEEDED" || !candidate.candidate.experimentId) {
        this.publish({ ...this.state, pendingAction: undefined, message: candidate.candidate.failure?.message ?? "Backtest did not complete." });
        return;
      }
      await this.selectExperiment(candidate.candidate.experimentId);
      this.publish({ ...this.state, pendingAction: undefined });
    } catch (error) {
      this.publish({ ...this.state, pendingAction: undefined, message: errorMessage(error, "Unable to complete backtest.") });
    }
  }

  public async selectExperiment(experimentId: string): Promise<void> {
    this.publish({ ...this.state, pendingAction: "Loading experiment…", message: undefined });
    try {
      const [experiment, trades] = await Promise.all([
        this.client.experiment(experimentId),
        this.client.trades(experimentId),
      ]);
      const experiments = this.state.experiments.some((item) => item.id === experiment.experiment.id)
        ? this.state.experiments.map((item) => item.id === experiment.experiment.id ? experiment.experiment : item)
        : [experiment.experiment, ...this.state.experiments];
      this.publish({ ...this.state, experiments, selectedExperiment: experiment.experiment, trades: trades.items, pendingAction: undefined });
    } catch (error) {
      this.publish({ ...this.state, pendingAction: undefined, message: errorMessage(error, "Unable to load experiment.") });
    }
  }

  private async loadFromClient(): Promise<void> {
    try {
      const [catalog, definitions, composites, runs, experiments, leaderboard] = await Promise.all([
        this.client.strategyCatalog(),
        this.client.strategyDefinitions(),
        this.client.compositeDefinitions(),
        this.client.searchRuns(),
        this.client.experiments(),
        this.client.leaderboard(),
      ]);
      const firstExperiment = experiments.items[0];
      this.publish({
        ...this.state,
        status: "ready",
        descriptors: catalog.items,
        strategyDefinitions: definitions.items,
        compositeDefinitions: composites.items,
        searchRuns: runs.items,
        experiments: experiments.items,
        selectedExperiment: firstExperiment,
        leaderboard,
        trades: [],
        newsStatus: "loading",
        message: undefined,
      });

      const newsPromise = this.client.news({
        schemaVersion: REST_SCHEMA_VERSION,
        limit: 10,
        order: "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC",
      });
      const tradesPromise = firstExperiment ? this.client.trades(firstExperiment.id) : Promise.resolve({ schemaVersion: REST_SCHEMA_VERSION, items: [] });
      const [news, trades] = await Promise.allSettled([newsPromise, tradesPromise]);
      this.publish({
        ...this.state,
        newsStatus: news.status === "fulfilled" ? "ready" : "unavailable",
        news: news.status === "fulfilled" ? news.value : undefined,
        newsMessage: news.status === "rejected" ? errorMessage(news.reason, "News is temporarily unavailable.") : undefined,
        trades: trades.status === "fulfilled" ? trades.value.items : [],
      });
      this.setCacheIfCurrent(this.state);
    } catch (error) {
      this.publish({ ...this.state, status: "error", newsStatus: "unavailable", message: errorMessage(error, "Private workspace is unavailable.") });
    }
  }

  private publish(state: FeatureWorkspaceState): void {
    if (!this.isCurrentRevision()) return;
    this.state = state;
    if (state.status === "ready") this.setCacheIfCurrent(state);
    for (const listener of this.listeners) listener();
  }

  private canUsePrivateCache(): boolean {
    return this.cacheRevision !== undefined && this.privateCache.revision === this.cacheRevision;
  }

  private isCurrentRevision(): boolean {
    return this.cacheRevision === undefined || this.privateCache.revision === this.cacheRevision;
  }

  private setCacheIfCurrent(state: FeatureWorkspaceState): void {
    if (!this.canUsePrivateCache()) return;
    this.privateCache.set(FEATURE_PRIVATE_CACHE_KEY, cacheable(state));
  }
}

export function useFeatureWorkspace(store: FeatureWorkspaceStore): FeatureWorkspaceState {
  return useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
}
