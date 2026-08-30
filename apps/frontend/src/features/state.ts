import { useSyncExternalStore } from "react";
import { REST_SCHEMA_VERSION, type DefineCompositeRequestDto, type DefineStrategyRequestDto, type StartManualBacktestRequestDto, type StartSearchRequestDto } from "@cryptox/contracts/rest";
import type { FeatureClient, FeaturePrivateCache, FeatureWorkspaceCache, FeatureWorkspaceState } from "./types";
import { FEATURE_PRIVATE_CACHE_KEY, UNAVAILABLE_AUTHORING_STATE } from "./types";

const EMPTY_STATE: FeatureWorkspaceState = {
  status: "idle",
  authoring: UNAVAILABLE_AUTHORING_STATE,
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

  public constructor(
    private readonly client: FeatureClient,
    private readonly privateCache: FeaturePrivateCache,
  ) {
    this.cacheRevision = privateCache.revision;
  }

  public snapshot = (): FeatureWorkspaceState => this.state;

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public async load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    const cached = this.privateCache.get<FeatureWorkspaceCache>(FEATURE_PRIVATE_CACHE_KEY);
    if (cached) {
      this.publish({ ...EMPTY_STATE, ...cached, status: "ready" });
      return;
    }

    this.publish({ ...EMPTY_STATE, status: "loading", newsStatus: "loading" });
    this.loadPromise = this.loadFromClient().finally(() => {
      this.loadPromise = undefined;
    });
    return this.loadPromise;
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
    this.state = state;
    if (state.status === "ready") this.setCacheIfCurrent(state);
    for (const listener of this.listeners) listener();
  }

  private setCacheIfCurrent(state: FeatureWorkspaceState): void {
    if (this.privateCache.revision !== undefined && this.privateCache.revision !== this.cacheRevision) {
      return;
    }
    this.privateCache.set(FEATURE_PRIVATE_CACHE_KEY, cacheable(state));
  }
}

export function useFeatureWorkspace(store: FeatureWorkspaceStore): FeatureWorkspaceState {
  return useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
}
