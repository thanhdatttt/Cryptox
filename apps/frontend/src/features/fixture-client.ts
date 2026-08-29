import { REST_SCHEMA_VERSION, type BacktestSubmissionResponseDto, type CandidateProgressDto, type CandidateProgressResponseDto, type CompositeStrategyDefinitionDto, type DefineCompositeRequestDto, type DefineCompositeResponseDto, type DefineStrategyRequestDto, type DefineStrategyResponseDto, type ExperimentResponseDto, type LeaderboardTopKResponseDto, type NewsPageResponseDto, type SearchRunRankingEntryDto, type SearchRunStatusDto, type SearchRunStatusResponseDto, type StartManualBacktestRequestDto, type StartSearchRequestDto, type StartSearchResponseDto, type StrategyCatalogResponseDto, type StrategyDefinitionDto, type TradePageResponseDto } from "@cryptox/contracts/rest";
import { createFixtureCompositeDefinition, createFixtureExperiment, createFixtureLeaderboard, createFixtureNews, createFixtureSearchRun, createFixtureStrategyDefinitions, FIXTURE_NOW } from "./fixture-data";
import type { FeatureClient } from "./types";
import { FeatureClientError } from "./clients";

export interface FixtureFeatureClientOptions {
  readonly ownerUserId: string;
}

function response<T>(value: T): T {
  return value;
}

export class FixtureFeatureClient implements FeatureClient {
  private readonly definitions: StrategyDefinitionDto[];
  private readonly composites: CompositeStrategyDefinitionDto[];
  private readonly runs = new Map<string, SearchRunStatusDto>();
  private readonly candidates = new Map<string, CandidateProgressDto>();
  private readonly experimentsById = new Map<string, ReturnType<typeof createFixtureExperiment>>();
  private readonly ownerUserId: string;
  private nextDefinition = 3;
  private nextRun = 2;
  private nextExperiment = 2;

  public constructor(options: FixtureFeatureClientOptions) {
    this.ownerUserId = options.ownerUserId;
    this.definitions = [...createFixtureStrategyDefinitions(options.ownerUserId)];
    this.composites = [createFixtureCompositeDefinition(options.ownerUserId, this.definitions)];
    const initialRun = createFixtureSearchRun(options.ownerUserId, this.definitions);
    this.runs.set(initialRun.searchRunId, initialRun);
    const initialExperiment = createFixtureExperiment(options.ownerUserId, this.definitions[0]!);
    this.experimentsById.set(initialExperiment.id, initialExperiment);
    this.candidates.set(initialExperiment.candidateId, {
      candidateId: initialExperiment.candidateId,
      ownerUserId: options.ownerUserId,
      origin: { kind: "SEARCH", searchRunId: initialRun.searchRunId, leaderboardScopeId: initialRun.leaderboardScopeId, iterationNumber: 1 },
      strategySelection: { kind: "STRATEGY", strategyDefinitionId: this.definitions[0]!.id },
      marketInput: initialRun.candidateTemplate.marketInput,
      status: "SUCCEEDED",
      experimentId: initialExperiment.id,
      createdAt: FIXTURE_NOW,
      startedAt: "2026-08-28T12:00:01.000Z",
      completedAt: "2026-08-28T12:00:05.000Z",
      durationMs: 248,
      updatedAt: FIXTURE_NOW,
    });
  }

  public async strategyCatalog(): Promise<StrategyCatalogResponseDto> {
    const { FIXTURE_STRATEGY_DESCRIPTORS } = await import("./fixture-data");
    return response({ schemaVersion: REST_SCHEMA_VERSION, items: FIXTURE_STRATEGY_DESCRIPTORS });
  }

  public async strategyDefinitions() {
    return response({ schemaVersion: REST_SCHEMA_VERSION as 1, items: [...this.definitions] });
  }

  public async compositeDefinitions() {
    return response({ schemaVersion: REST_SCHEMA_VERSION as 1, items: [...this.composites] });
  }

  public async defineStrategy(request: DefineStrategyRequestDto): Promise<DefineStrategyResponseDto> {
    const definition: StrategyDefinitionDto = {
      id: `${this.ownerUserId}-strategy-${this.nextDefinition++}`,
      ownerUserId: this.ownerUserId,
      logicalFamilyKey: request.logicalFamilyKey,
      strategyName: request.strategyName,
      implementationVersion: "1.0.0",
      behaviorProfileId: "TECHNICAL_PROFILES_V1",
      version: 1,
      parameters: { ...request.parameters },
      createdAt: FIXTURE_NOW,
    };
    this.definitions.push(definition);
    return { schemaVersion: REST_SCHEMA_VERSION, definition };
  }

  public async defineComposite(request: DefineCompositeRequestDto): Promise<DefineCompositeResponseDto> {
    const components = request.strategyDefinitionIds.map((id) => this.ownedDefinition(id));
    const definition: CompositeStrategyDefinitionDto = {
      id: `${this.ownerUserId}-composite-${this.composites.length + 1}`,
      ownerUserId: this.ownerUserId,
      logicalFamilyKey: request.logicalFamilyKey,
      version: 1,
      method: "MAJORITY_VOTE",
      combinationProfileId: request.combinationProfileId,
      components: components.map((item) => ({ strategyDefinitionId: item.id, strategyDefinitionVersion: item.version })),
      createdAt: FIXTURE_NOW,
    };
    this.composites.push(definition);
    return { schemaVersion: REST_SCHEMA_VERSION, definition };
  }

  public async searchRuns() {
    return response({ schemaVersion: REST_SCHEMA_VERSION as 1, items: [...this.runs.values()] });
  }

  public async startSearch(request: StartSearchRequestDto): Promise<StartSearchResponseDto> {
    request.searchSpace.availableStrategyDefinitionIds.forEach((id) => this.ownedDefinition(id));
    const id = `${this.ownerUserId}-search-${this.nextRun++}`;
    const run: SearchRunStatusDto = {
      searchRunId: id,
      ownerUserId: this.ownerUserId,
      generatorType: "RANDOM",
      randomSeed: request.randomSeed,
      searchSpace: request.searchSpace,
      stopCondition: request.stopCondition,
      leaderboardScopeId: request.leaderboardScopeId,
      candidateTemplate: request.candidateTemplate,
      maxInFlight: request.maxInFlight,
      state: "RUNNING",
      activeCandidateIds: [],
      submittedCandidateCount: 0,
      completedCandidateCount: 0,
      failedCandidateCount: 0,
      averageBacktestDurationMs: null,
      createdAt: FIXTURE_NOW,
      startedAt: FIXTURE_NOW,
      updatedAt: FIXTURE_NOW,
    };
    this.runs.set(id, run);
    return { schemaVersion: REST_SCHEMA_VERSION, searchRunId: id };
  }

  public async searchStatus(searchRunId: string): Promise<SearchRunStatusResponseDto> {
    const current = this.ownedRun(searchRunId);
    const limit = typeof current.stopCondition.maxCandidates === "number" ? current.stopCondition.maxCandidates : 4;
    const completed: SearchRunStatusDto = current.state === "RUNNING"
      ? {
          ...current,
          state: "COMPLETED",
          submittedCandidateCount: limit,
          completedCandidateCount: Math.max(0, limit - 1),
          failedCandidateCount: 1,
          averageBacktestDurationMs: 241,
          updatedAt: FIXTURE_NOW,
          endedAt: FIXTURE_NOW,
          stopReason: "MAX_CANDIDATES",
        }
      : current;
    this.runs.set(searchRunId, completed);
    const ranking: SearchRunRankingEntryDto[] = completed.state === "COMPLETED"
      ? [{ rank: 1, searchRunId, leaderboardScopeId: completed.leaderboardScopeId, candidateId: `${this.ownerUserId}-candidate-1`, experimentId: `${this.ownerUserId}-experiment-1`, rankingConfigurationId: "LINEAR_REQUIRED_V1", score: 41.42 }]
      : [];
    return { schemaVersion: REST_SCHEMA_VERSION, searchRun: completed, ranking };
  }

  public async cancelSearch(searchRunId: string): Promise<void> {
    const current = this.ownedRun(searchRunId);
    if (current.state === "COMPLETED" || current.state === "CANCELLED") return;
    this.runs.set(searchRunId, { ...current, state: "CANCELLED", updatedAt: FIXTURE_NOW, endedAt: FIXTURE_NOW, stopReason: "USER_CANCELLED" });
  }

  public async startManualBacktest(request: StartManualBacktestRequestDto): Promise<BacktestSubmissionResponseDto> {
    const definition = request.strategySelection.kind === "STRATEGY"
      ? this.ownedDefinition(request.strategySelection.strategyDefinitionId)
      : this.definitions[0]!;
    const candidateId = `${this.ownerUserId}-candidate-manual-${this.nextExperiment}`;
    const experiment = createFixtureExperiment(this.ownerUserId, definition, String(this.nextExperiment++));
    const candidate: CandidateProgressDto = {
      candidateId,
      ownerUserId: this.ownerUserId,
      origin: { kind: "MANUAL", leaderboardScopeId: request.leaderboardScopeId },
      strategySelection: request.strategySelection,
      marketInput: request.marketInput,
      status: "SUCCEEDED",
      experimentId: experiment.id,
      createdAt: FIXTURE_NOW,
      startedAt: FIXTURE_NOW,
      completedAt: FIXTURE_NOW,
      durationMs: 215,
      updatedAt: FIXTURE_NOW,
    };
    this.candidates.set(candidateId, candidate);
    this.experimentsById.set(experiment.id, { ...experiment, candidateId });
    return { schemaVersion: REST_SCHEMA_VERSION, candidateId, status: "ACCEPTED" };
  }

  public async candidateStatus(candidateId: string): Promise<CandidateProgressResponseDto> {
    return { schemaVersion: REST_SCHEMA_VERSION, candidate: this.ownedCandidate(candidateId) };
  }

  public async experiments() {
    return response({ schemaVersion: REST_SCHEMA_VERSION as 1, items: [...this.experimentsById.values()] });
  }

  public async experiment(experimentId: string): Promise<ExperimentResponseDto> {
    return { schemaVersion: REST_SCHEMA_VERSION, experiment: this.ownedExperiment(experimentId) };
  }

  public async trades(experimentId: string): Promise<TradePageResponseDto> {
    const experiment = this.ownedExperiment(experimentId);
    const first = experiment.visualization.tradeMarkers[0];
    const second = experiment.visualization.tradeMarkers[1];
    return {
      schemaVersion: REST_SCHEMA_VERSION,
      items: first && second
        ? [{
            id: first.tradeId,
            experimentId,
            sequence: 1,
            pair: experiment.marketData.pair,
            entrySignalAt: first.timestamp,
            entryTime: first.timestamp,
            entryPrice: first.price,
            exitSignalAt: second.timestamp,
            exitTime: second.timestamp,
            exitPrice: second.price,
            exitReason: "STRATEGY_EXIT",
            quantity: 0.4,
            notionalEntryValue: first.price * 0.4,
            grossProfit: (second.price - first.price) * 0.4,
            feeAmount: 0.08,
            slippageBps: 0,
            profit: (second.price - first.price) * 0.4,
            resultPercent: 1.25,
            result: "WIN",
          }]
        : [],
      nextCursor: undefined,
    };
  }

  public async leaderboard(): Promise<LeaderboardTopKResponseDto> {
    const experiment = this.experimentsById.values().next().value;
    return createFixtureLeaderboard(this.ownerUserId, experiment ?? createFixtureExperiment(this.ownerUserId, this.definitions[0]!));
  }

  public async news(): Promise<NewsPageResponseDto> {
    return createFixtureNews();
  }

  private ownedDefinition(id: string): StrategyDefinitionDto {
    const definition = this.definitions.find((item) => item.id === id);
    if (!definition) throw new FeatureClientError(404, "That private strategy was not found.", "NOT_FOUND");
    return definition;
  }

  private ownedRun(id: string): SearchRunStatusDto {
    const run = this.runs.get(id);
    if (!run) throw new FeatureClientError(404, "That private Search Run was not found.", "NOT_FOUND");
    return run;
  }

  private ownedCandidate(id: string): CandidateProgressDto {
    const candidate = this.candidates.get(id);
    if (!candidate) throw new FeatureClientError(404, "That private candidate was not found.", "NOT_FOUND");
    return candidate;
  }

  private ownedExperiment(id: string) {
    const experiment = this.experimentsById.get(id);
    if (!experiment) throw new FeatureClientError(404, "That private experiment was not found.", "NOT_FOUND");
    return experiment;
  }
}
