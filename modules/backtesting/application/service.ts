import { randomUUID } from "node:crypto";
import type {
  AuthenticatedRequestContext,
  AuthenticatedUserId,
} from "modules/auth/api";
import type {
  Candle,
  DatasetSnapshotRef,
  MarketDataProvenance,
} from "@cryptox/market-data";
import type { EvaluationMetrics } from "@cryptox/evaluation";
import type {
  Strategy,
  StrategyAnalysis,
  StrategySelectionProvenance,
} from "@cryptox/strategy";
import {
  type BacktestingModulePublicApi,
  type BacktestConfiguration,
  type BacktestSubmissionAccepted,
  type CandidateFailureCode,
  type CandidatePage,
  type CandidatePageRequest,
  type CandidateProgress,
  type CompletedBacktestResult,
  type Experiment,
  type MarketInputSelection,
  type SearchCandidateSummary,
  type StartManualBacktestCommand,
  type SubmitSearchCandidateCommand,
  type TradePage,
  type TradePageRequest,
} from "../api/contracts";
import { BACKTEST_EXECUTION_V1_ID } from "../api/contracts";
import {
  type BacktestExecutionPort,
  type BacktestExecutionRequest,
  type BacktestTerminalOutcome,
  type BacktestingApplicationDependencies,
  type BacktestingCompletionUnitOfWork,
} from "./ports";
import { simulateBacktest } from "../domain/simulator";

export interface BacktestingCandidate extends CandidateProgress {
  readonly configuration: BacktestConfiguration;
}

/**
 * Internal persistence payload. The public Experiment contract deliberately
 * does not expose the simulator's equity curve, but the database still owns
 * the actual curve for provenance and later projections.
 */
export interface InternalPersistedExperiment extends Experiment {
  readonly endingCapital: number;
  readonly equityCurve: ReadonlyArray<{ timestamp: string; value: number }>;
}

export interface CandidateExecutionRequest extends BacktestExecutionRequest {
  readonly ownerUserId: AuthenticatedUserId;
}

export interface CandidateRunResult {
  readonly experimentId: string;
  readonly rankingAdmitted: boolean;
}

export class BacktestingApplicationError extends Error {
  public readonly name = "BacktestingApplicationError";

  public constructor(
    public readonly code:
      | "UNAUTHENTICATED"
      | "NOT_FOUND"
      | "INVALID_REQUEST"
      | "SATURATED"
      | "STRATEGY_FAILED"
      | "SIMULATION_FAILED"
      | "EVALUATION_FAILED"
      | "RANKING_FAILED"
      | "CANCELLED",
    message: string = code,
  ) {
    super(message);
  }
}

function contextOwner(context: AuthenticatedRequestContext): AuthenticatedUserId {
  if (!context || typeof context.authenticatedUserId !== "string" || !context.authenticatedUserId.trim()) {
    throw new BacktestingApplicationError("UNAUTHENTICATED");
  }
  return context.authenticatedUserId;
}

function nonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new BacktestingApplicationError("INVALID_REQUEST", `${field} must be non-empty`);
  }
  return value.trim();
}

function finite(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new BacktestingApplicationError("INVALID_REQUEST", `${field} must be finite`);
  }
  return value;
}

function validatePage(page: CandidatePageRequest | TradePageRequest): void {
  if (!page || !Number.isInteger(page.limit) || page.limit < 1 || page.limit > 100) {
    throw new BacktestingApplicationError("INVALID_REQUEST", "page limit must be between 1 and 100");
  }
}

function validateConfiguration(configuration: BacktestConfiguration): BacktestConfiguration {
  if (!configuration || configuration.executionProfileId !== BACKTEST_EXECUTION_V1_ID) {
    throw new BacktestingApplicationError("INVALID_REQUEST", "unsupported execution profile");
  }
  const initialCapital = finite(configuration.initialCapital, "initialCapital");
  const feeRatePercent = finite(configuration.feeRatePercent, "feeRatePercent");
  const slippageBps = finite(configuration.slippageBps, "slippageBps");
  if (initialCapital <= 0 || feeRatePercent < 0 || slippageBps < 0 || slippageBps >= 10_000) {
    throw new BacktestingApplicationError("INVALID_REQUEST", "invalid execution configuration");
  }
  return { ...configuration };
}

function validateMarketInput(input: MarketInputSelection): MarketInputSelection {
  if (!input || typeof input !== "object") {
    throw new BacktestingApplicationError("INVALID_REQUEST", "marketInput is required");
  }
  const pair = nonEmpty(input.pair, "marketInput.pair");
  const timeframe = nonEmpty(input.timeframe, "marketInput.timeframe");
  const from = nonEmpty(input.range?.from, "marketInput.range.from");
  const to = nonEmpty(input.range?.to, "marketInput.range.to");
  if (!Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to)) || Date.parse(to) <= Date.parse(from)) {
    throw new BacktestingApplicationError("INVALID_REQUEST", "marketInput.range must be ordered timestamps");
  }
  if (input.datasetId !== undefined) nonEmpty(input.datasetId, "marketInput.datasetId");
  return {
    pair,
    timeframe: timeframe as MarketInputSelection["timeframe"],
    range: { from: new Date(Date.parse(from)).toISOString(), to: new Date(Date.parse(to)).toISOString() },
    ...(input.datasetId === undefined
      ? {}
      : { datasetId: input.datasetId, ...(input.datasetVersion ? { datasetVersion: input.datasetVersion } : {}) }),
  } as MarketInputSelection;
}

function cloneCandidate(candidate: BacktestingCandidate): BacktestingCandidate {
  return {
    ...candidate,
    origin: { ...candidate.origin },
    strategySelection: { ...candidate.strategySelection },
    marketInput: {
      ...candidate.marketInput,
      range: { ...candidate.marketInput.range },
    },
    configuration: { ...candidate.configuration },
    ...(candidate.failure ? { failure: { ...candidate.failure } } : {}),
  };
}

function cloneExperiment(experiment: Experiment): Experiment {
  const publicExperiment = structuredClone(experiment) as Experiment &
    Partial<Pick<InternalPersistedExperiment, "endingCapital" | "equityCurve">>;
  // The internal persistence fields are intentionally not part of the frozen
  // read contract, even though in-process repositories retain them.
  Reflect.deleteProperty(publicExperiment, "endingCapital");
  Reflect.deleteProperty(publicExperiment, "equityCurve");
  return publicExperiment;
}

function failureCodeFromMessage(message: string): CandidateFailureCode {
  const match = /^\[([A-Z_]+)\]/.exec(message);
  const code = match?.[1];
  if (
    code === "STRATEGY_FAILED" ||
    code === "SIMULATION_FAILED" ||
    code === "EVALUATION_FAILED" ||
    code === "RANKING_FAILED" ||
    code === "CANCELLED"
  ) return code;
  return "SIMULATION_FAILED";
}

function pipelineError(code: Exclude<CandidateFailureCode, "INVALID_REQUEST" | "SATURATED">, error: unknown): never {
  const detail = error instanceof Error ? error.message : String(error);
  throw new Error(`[${code}] ${detail}`);
}

function throwIfCancelled(signal: AbortSignal): void {
  if (signal.aborted) {
    pipelineError("CANCELLED", new BacktestingApplicationError("CANCELLED"));
  }
}

function compositeStrategy(
  definitions: readonly { id: string; strategy: Strategy }[],
  combine: (signals: ReadonlyArray<{ strategyDefinitionId: string; signal: "BUY" | "SELL" | "HOLD" }>) => "BUY" | "SELL" | "HOLD",
): Strategy {
  return {
    name: "COMPOSITE",
    category: "INFORMATION",
    analyze(context): StrategyAnalysis {
      const analyses = definitions.map(({ strategy }) => strategy.analyze(context));
      const signal = combine(
        analyses.map((analysis, index) => ({ strategyDefinitionId: definitions[index]!.id, signal: analysis.signal })),
      );
      return {
        signal,
        signalAt: analyses.map((analysis) => analysis.signalAt).sort().at(-1) ?? context.candles.at(-1)?.timestamp ?? "",
        visualization: analyses.flatMap((analysis) => analysis.visualization),
      };
    },
  };
}

type Dependencies = BacktestingApplicationDependencies<
  BacktestingCandidate,
  StartManualBacktestCommand | SubmitSearchCandidateCommand,
  Experiment,
  import("../api/contracts").Trade
>;

export interface BacktestingApplication extends BacktestingModulePublicApi {
  runCandidate(request: CandidateExecutionRequest, signal: AbortSignal): Promise<CandidateRunResult>;
}

/**
 * SearchRun is owned by the Search module.  The implementation accepts its
 * narrow public-module guard here instead of importing Search persistence or
 * domain code into Backtesting.
 */
export interface BacktestingApplicationOptions {
  readonly searchRunOwnerGuard?: (
    context: AuthenticatedRequestContext,
    searchRunId: string,
  ) => Promise<void>;
}

export function createBacktestingApplication(
  dependencies: Dependencies,
  options: BacktestingApplicationOptions = {},
): BacktestingApplication {
  const execution = dependencies.execution as BacktestExecutionPort<CandidateExecutionRequest, CandidateRunResult>;
  const completionUnitOfWork = dependencies.completionUnitOfWork as BacktestingCompletionUnitOfWork<
    Experiment,
    import("../api/contracts").Trade
  >;

  const saveFailure = async (
    ownerUserId: AuthenticatedUserId,
    candidate: BacktestingCandidate,
    code: CandidateFailureCode,
    message: string,
    completedAt = dependencies.clock.now(),
  ): Promise<void> => {
    if (["SUCCEEDED", "FAILED", "CANCELLED"].includes(candidate.status)) return;
    const startedAt = candidate.startedAt;
    await dependencies.candidateRepository.save(ownerUserId, {
      ...candidate,
      status: code === "CANCELLED" ? "CANCELLED" : "FAILED",
      failure: { code, message },
      completedAt,
      ...(startedAt ? { durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)) } : {}),
      updatedAt: completedAt,
    });
  };

  const handleOutcome = async (
    ownerUserId: AuthenticatedUserId,
    candidateId: string,
    outcome: BacktestTerminalOutcome<CandidateRunResult>,
  ): Promise<void> => {
    const candidate = await dependencies.candidateRepository.getByOwnerAndId(ownerUserId, candidateId);
    if (!candidate || ["SUCCEEDED", "FAILED", "CANCELLED"].includes(candidate.status)) return;
    if (outcome.state === "SUCCEEDED") {
      const completedAt = outcome.completedAt;
      await dependencies.candidateRepository.save(ownerUserId, {
        ...candidate,
        status: "SUCCEEDED",
        experimentId: outcome.result.experimentId,
        completedAt,
        ...(candidate.startedAt ? { durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(candidate.startedAt)) } : {}),
        updatedAt: completedAt,
      });
      return;
    }
    if (outcome.state === "CANCELLED") {
      await saveFailure(ownerUserId, candidate, "CANCELLED", "backtest was cancelled", outcome.completedAt);
      return;
    }
    await saveFailure(ownerUserId, candidate, failureCodeFromMessage(outcome.failure.message), outcome.failure.message, outcome.completedAt);
  };

  const submit = async (
    context: AuthenticatedRequestContext,
    command: StartManualBacktestCommand | SubmitSearchCandidateCommand,
  ): Promise<BacktestSubmissionAccepted> => {
    const ownerUserId = contextOwner(context);
    if (!command || typeof command !== "object") throw new BacktestingApplicationError("INVALID_REQUEST");
    const marketInput = validateMarketInput(command.marketInput);
    const configuration = validateConfiguration(command.configuration);
    if ("searchRunId" in command) {
      const searchRunId = nonEmpty(command.searchRunId, "searchRunId");
      if (!Number.isInteger(command.iterationNumber) || command.iterationNumber < 1) {
        throw new BacktestingApplicationError("INVALID_REQUEST", "iterationNumber must be a positive integer");
      }
      if (!options.searchRunOwnerGuard) {
        throw new BacktestingApplicationError("NOT_FOUND", "SearchRun ownership adapter is not configured");
      }
      await options.searchRunOwnerGuard(context, searchRunId);
    }
    if (command.strategySelection.kind === "STRATEGY") {
      const definition = await dependencies.strategy.readStrategyDefinition(
        context,
        nonEmpty(command.strategySelection.strategyDefinitionId, "strategyDefinitionId"),
      );
      if (definition.ownerUserId !== ownerUserId) throw new BacktestingApplicationError("NOT_FOUND");
    } else if (command.strategySelection.kind === "COMPOSITE") {
      const definition = await dependencies.strategy.readCompositeDefinition(
        context,
        nonEmpty(command.strategySelection.compositeDefinitionId, "compositeDefinitionId"),
      );
      if (definition.ownerUserId !== ownerUserId) throw new BacktestingApplicationError("NOT_FOUND");
      const components = await Promise.all(
        definition.components.map((component) => dependencies.strategy.readStrategyDefinition(context, component.strategyDefinitionId)),
      );
      if (components.some((component) => component.ownerUserId !== ownerUserId)) {
        throw new BacktestingApplicationError("NOT_FOUND");
      }
    } else {
      throw new BacktestingApplicationError("INVALID_REQUEST", "strategySelection kind is unsupported");
    }
    const leaderboardScope = await dependencies.leaderboard.getLeaderboardScope(context, nonEmpty(command.leaderboardScopeId, "leaderboardScopeId"));
    if (leaderboardScope.ownerUserId !== ownerUserId) {
      throw new BacktestingApplicationError("NOT_FOUND");
    }
    const candidate = await dependencies.candidateRepository.insert(ownerUserId, {
      ...command,
      leaderboardScopeId: nonEmpty(command.leaderboardScopeId, "leaderboardScopeId"),
      marketInput,
      configuration,
      strategySelection: command.strategySelection,
    });
    let submission;
    try {
      submission = await execution.submit({ candidateId: candidate.candidateId, ownerUserId });
    } catch (error) {
      await saveFailure(ownerUserId, candidate, "SIMULATION_FAILED", error instanceof Error ? error.message : String(error));
      return { candidateId: candidate.candidateId, status: "ACCEPTED" };
    }
    if (!submission.accepted) {
      await saveFailure(ownerUserId, candidate, "SATURATED", "local backtest capacity is saturated");
      return { candidateId: candidate.candidateId, status: "ACCEPTED" };
    }
    void submission.outcome
      .then((outcome) => handleOutcome(ownerUserId, candidate.candidateId, outcome))
      .catch(async (error: unknown) => {
        try {
          const current = await dependencies.candidateRepository.getByOwnerAndId(ownerUserId, candidate.candidateId);
          if (!current || ["SUCCEEDED", "FAILED", "CANCELLED"].includes(current.status)) return;
          await saveFailure(
            ownerUserId,
            current,
            "SIMULATION_FAILED",
            `terminal outcome persistence failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        } catch {
          // There is no second durable sink in this module.  Keep the rejection
          // handled; a shared persistence/alerting boundary is outside B-02.
        }
      });
    return { candidateId: candidate.candidateId, status: "ACCEPTED" };
  };

  const startManual = (context: AuthenticatedRequestContext, command: StartManualBacktestCommand) =>
    submit(context, command);
  const submitSearchCandidate = (context: AuthenticatedRequestContext, command: SubmitSearchCandidateCommand) =>
    submit(context, command);

  const status = async (context: AuthenticatedRequestContext, candidateId: string): Promise<CandidateProgress> => {
    const candidate = await dependencies.candidateRepository.getByOwnerAndId(contextOwner(context), nonEmpty(candidateId, "candidateId"));
    if (!candidate) throw new BacktestingApplicationError("NOT_FOUND");
    return cloneCandidate(candidate);
  };

  const listCandidates = async (
    context: AuthenticatedRequestContext,
    searchRunId: string,
    page: CandidatePageRequest,
  ): Promise<CandidatePage> => {
    validatePage(page);
    const ownerUserId = contextOwner(context);
    const items = [...await dependencies.candidateRepository.listByOwnerAndSearchRun(ownerUserId, nonEmpty(searchRunId, "searchRunId"))]
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.candidateId.localeCompare(right.candidateId));
    const start = page.cursor ? Math.max(0, items.findIndex((item) => item.candidateId === page.cursor) + 1) : 0;
    const selected = items.slice(start, start + page.limit).map(cloneCandidate);
    return {
      items: selected,
      ...(start + selected.length < items.length && selected.length > 0 ? { nextCursor: selected.at(-1)!.candidateId } : {}),
    };
  };

  const cancelCandidate = async (context: AuthenticatedRequestContext, candidateId: string): Promise<void> => {
    const ownerUserId = contextOwner(context);
    const candidate = await dependencies.candidateRepository.getByOwnerAndId(ownerUserId, nonEmpty(candidateId, "candidateId"));
    if (!candidate) throw new BacktestingApplicationError("NOT_FOUND");
    if (["SUCCEEDED", "FAILED", "CANCELLED"].includes(candidate.status)) return;
    await execution.cancel(candidate.candidateId);
  };

  const runCandidate = async (request: CandidateExecutionRequest, signal: AbortSignal): Promise<CandidateRunResult> => {
    const candidate = await dependencies.candidateRepository.getByOwnerAndId(request.ownerUserId, request.candidateId);
    if (!candidate) pipelineError("SIMULATION_FAILED", new BacktestingApplicationError("NOT_FOUND"));
    if (signal.aborted) pipelineError("CANCELLED", new BacktestingApplicationError("CANCELLED"));
    const startedAt = dependencies.clock.now();
    await dependencies.candidateRepository.save(request.ownerUserId, {
      ...candidate,
      status: "RUNNING",
      startedAt,
      updatedAt: startedAt,
    });

    try {
      const context: AuthenticatedRequestContext = { authenticatedUserId: request.ownerUserId };
      const scope = await dependencies.leaderboard.getLeaderboardScope(context, candidate.origin.leaderboardScopeId);
      let strategyProvenance: StrategySelectionProvenance;
      let strategy: Strategy;
      if (candidate.strategySelection.kind === "STRATEGY") {
        const definition = await dependencies.strategy.readStrategyDefinition(context, candidate.strategySelection.strategyDefinitionId);
        strategyProvenance = { kind: "STRATEGY", definition };
        strategy = await dependencies.strategy.resolveStrategy(definition);
      } else {
        const definition = await dependencies.strategy.readCompositeDefinition(context, candidate.strategySelection.compositeDefinitionId);
        const componentDefinitions = await Promise.all(
          definition.components.map((component) => dependencies.strategy.readStrategyDefinition(context, component.strategyDefinitionId)),
        );
        strategyProvenance = { kind: "COMPOSITE", definition, componentDefinitions };
        strategy = compositeStrategy(
          await Promise.all(componentDefinitions.map(async (component) => ({ id: component.id, strategy: await dependencies.strategy.resolveStrategy(component) }))),
          (signals) => dependencies.strategy.combineSignals(definition, signals),
        );
      }

      let snapshot: DatasetSnapshotRef;
      let candles: Candle[] = [];
      if (candidate.marketInput.datasetId) {
        let cursor: string | undefined;
        for (let page = 0; page < 100; page += 1) {
          const result = await dependencies.marketData.readDatasetSnapshot({ snapshotId: candidate.marketInput.datasetId, ...(cursor ? { cursor } : {}) });
          if (
            result.snapshot.pair !== candidate.marketInput.pair ||
            result.snapshot.timeframe !== candidate.marketInput.timeframe ||
            result.snapshot.range.from !== candidate.marketInput.range.from ||
            result.snapshot.range.to !== candidate.marketInput.range.to
          ) throw new Error("dataset snapshot does not match candidate market input");
          snapshot = result.snapshot;
          candles.push(...result.candles);
          cursor = result.nextCursor;
          if (!cursor) break;
          if (page === 99) throw new Error("dataset snapshot pagination exceeded bound");
        }
        if (!snapshot!) throw new Error("dataset snapshot was empty");
      } else {
        snapshot = await dependencies.marketData.createDatasetSnapshot({ ...candidate.marketInput });
        const result = await dependencies.marketData.readDatasetSnapshot({ snapshotId: snapshot.id });
        candles = [...result.candles];
        let cursor = result.nextCursor;
        for (let page = 0; cursor && page < 99; page += 1) {
          const next = await dependencies.marketData.readDatasetSnapshot({ snapshotId: snapshot.id, cursor });
          candles.push(...next.candles);
          cursor = next.nextCursor;
        }
        if (cursor) throw new Error("dataset snapshot pagination exceeded bound");
      }
      if (candles.length === 0) throw new Error("historical dataset contains no candles");
      if (signal.aborted) pipelineError("CANCELLED", new BacktestingApplicationError("CANCELLED"));

      const experimentId = randomUUID();
      let result: CompletedBacktestResult;
      try {
        result = simulateBacktest({
          candidateId: candidate.candidateId,
          experimentId,
          pair: candidate.marketInput.pair,
          timeframe: candidate.marketInput.timeframe,
          candles,
          strategy,
          strategySelection: candidate.strategySelection,
          startedAt,
          completedAt: dependencies.clock.now(),
          ...candidate.configuration,
        });
      } catch (error) {
        const simulationCode = typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "STRATEGY_FAILED"
          ? "STRATEGY_FAILED"
          : "SIMULATION_FAILED";
        pipelineError(simulationCode, error);
      }

      let metrics: EvaluationMetrics;
      try {
        metrics = dependencies.evaluation.evaluator.evaluate({
          candidateId: result.candidateId,
          initialCapital: result.initialCapital,
          endingCapital: result.endingCapital,
          trades: result.trades,
          equityCurve: result.equityCurve,
        });
      } catch (error) {
        pipelineError("EVALUATION_FAILED", error);
      }

      const marketData: MarketDataProvenance = snapshot.replayGuarantee === "EXACT_REPLAY_AVAILABLE"
        ? {
            provider: snapshot.provider,
            pair: snapshot.pair,
            timeframe: snapshot.timeframe,
            range: snapshot.range,
            replayGuarantee: "EXACT_REPLAY_AVAILABLE",
            datasetId: snapshot.id,
            datasetVersion: snapshot.version,
          }
        : {
            provider: snapshot.provider,
            pair: snapshot.pair,
            timeframe: snapshot.timeframe,
            range: snapshot.range,
            replayGuarantee: "TRACEABLE",
            ...(snapshot.id ? { datasetId: snapshot.id } : {}),
            ...(snapshot.version ? { datasetVersion: snapshot.version } : {}),
            replayLimitation: snapshot.replayLimitation,
          };
      const gitCommit = process.env.GIT_COMMIT?.trim();
      const code = {
        applicationVersion: dependencies.evaluation.runtimeVersion,
        ...(gitCommit ? { gitCommit } : {}),
      };
      const replay = marketData.replayGuarantee === "EXACT_REPLAY_AVAILABLE" && gitCommit
        ? { guarantee: "EXACT_REPLAY_AVAILABLE" as const, unavailableInputs: [] as const }
        : {
            guarantee: "TRACEABLE" as const,
            unavailableInputs: (marketData.replayGuarantee === "EXACT_REPLAY_AVAILABLE"
              ? ["EXECUTABLE_CODE"]
              : ["HISTORICAL_DATA", "EXECUTABLE_CODE"]) as ["HISTORICAL_DATA" | "EXECUTABLE_CODE", ...("HISTORICAL_DATA" | "EXECUTABLE_CODE")[]],
            limitation: marketData.replayGuarantee === "EXACT_REPLAY_AVAILABLE"
              ? "the executable code commit was not recorded"
              : marketData.replayLimitation,
          };
      const experiment: InternalPersistedExperiment = {
        id: experimentId,
        candidateId: candidate.candidateId,
        ...(candidate.origin.kind === "SEARCH" ? { searchRunId: candidate.origin.searchRunId } : {}),
        strategy: strategyProvenance,
        marketData,
        configuration: { ...candidate.configuration },
        metrics,
        rankingConfigurationId: scope.rankingConfigurationId,
        code,
        replay,
        visualization: result.visualization,
        createdAt: dependencies.clock.now(),
        endingCapital: result.endingCapital,
        equityCurve: result.equityCurve,
      };
      const leaderboardSubmission = {
        leaderboardScopeId: candidate.origin.leaderboardScopeId,
        experiment: {
          executionState: "SUCCEEDED" as const,
          experimentId: experiment.id,
          candidateId: candidate.candidateId,
          ...(candidate.origin.kind === "SEARCH" ? { searchRunId: candidate.origin.searchRunId } : {}),
          metrics,
          ownerUserId: request.ownerUserId,
        },
      };
      throwIfCancelled(signal);
      let completion: { experiment: Experiment; leaderboard: { admitted: boolean } };
      try {
        completion = await completionUnitOfWork.commit(
          { ownerUserId: request.ownerUserId, experiment, trades: result.trades, leaderboardSubmission },
          {
            insertExperiment: (ownerUserId, value, trades) => {
              throwIfCancelled(signal);
              return dependencies.experimentRepository.insertForCandidateOwner(ownerUserId, value, trades);
            },
            submitLeaderboard: (ownerUserId, submission) => {
              throwIfCancelled(signal);
              return dependencies.leaderboard.submit(
                { authenticatedUserId: ownerUserId },
                submission,
              );
            },
          },
        );
      } catch (error) {
        if (signal.aborted) pipelineError("CANCELLED", error);
        pipelineError("RANKING_FAILED", error);
      }
      return { experimentId: completion.experiment.id, rankingAdmitted: completion.leaderboard.admitted };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("[")) throw error;
      pipelineError("SIMULATION_FAILED", error);
    }
  };

  const summarizeSearchCandidates = async (context: AuthenticatedRequestContext, searchRunId: string): Promise<SearchCandidateSummary> => {
    const items = await dependencies.candidateRepository.listByOwnerAndSearchRun(contextOwner(context), nonEmpty(searchRunId, "searchRunId"));
    const durations = items.map((item) => item.durationMs).filter((duration): duration is number => duration !== undefined && Number.isFinite(duration));
    return {
      searchRunId,
      activeCandidateIds: items.filter((item) => item.status === "ACCEPTED" || item.status === "RUNNING").map((item) => item.candidateId),
      submittedCandidateCount: items.length,
      completedCandidateCount: items.filter((item) => item.status === "SUCCEEDED").length,
      failedCandidateCount: items.filter((item) => item.status === "FAILED" || item.status === "CANCELLED").length,
      averageBacktestDurationMs: durations.length ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length : null,
    };
  };

  const cancelSearchCandidates = async (context: AuthenticatedRequestContext, searchRunId: string) => {
    const ownerUserId = contextOwner(context);
    const items = await dependencies.candidateRepository.listByOwnerAndSearchRun(ownerUserId, nonEmpty(searchRunId, "searchRunId"));
    const candidateIds: string[] = [];
    for (const item of items) {
      if (item.status === "ACCEPTED" || item.status === "RUNNING") {
        await execution.cancel(item.candidateId);
        candidateIds.push(item.candidateId);
      }
    }
    return { candidateIds };
  };

  const readExperiment = async (context: AuthenticatedRequestContext, experimentId: string): Promise<Experiment> => {
    const experiment = await dependencies.experimentRepository.getByCandidateOwnerAndId(contextOwner(context), nonEmpty(experimentId, "experimentId"));
    if (!experiment) throw new BacktestingApplicationError("NOT_FOUND");
    return cloneExperiment(experiment);
  };

  return {
    startManual,
    submitSearchCandidate,
    status,
    summarizeSearchCandidates,
    listSearchCandidates: listCandidates,
    cancelSearchCandidates,
    cancelCandidate,
    readExperiment,
    listSearchExperiments: async (context, searchRunId) =>
      (await dependencies.experimentRepository.listByCandidateOwnerAndSearchRun(contextOwner(context), nonEmpty(searchRunId, "searchRunId"))).map(cloneExperiment),
    listExperimentTrades: async (context, experimentId, page): Promise<TradePage> => {
      validatePage(page);
      const result = await dependencies.experimentRepository.listTradesByCandidateOwner(contextOwner(context), nonEmpty(experimentId, "experimentId"), page);
      return structuredClone(result);
    },
    runCandidate,
  };
}

export function createBacktestRunner(application: Pick<BacktestingApplication, "runCandidate">) {
  return {
    run: (request: CandidateExecutionRequest, signal: AbortSignal) => application.runCandidate(request, signal),
  };
}
