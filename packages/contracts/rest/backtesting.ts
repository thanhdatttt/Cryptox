import {
  REST_SCHEMA_VERSION,
  RestContractValidationError,
  type RestMarketTimeframe,
  type RestReplayAvailability,
  type RestTimeRange,
} from "./common";
import type { EvaluationMetricsDto } from "./evaluation";
import type { MarketDataProvenanceDto } from "./market-data";
import type {
  StrategySelectionDto,
  StrategySelectionProvenanceDto,
  StrategySignalDto,
  StrategyVisualizationPointDto,
} from "./strategy";
import {
  finiteNumber,
  recordValue,
  rejectClientIdentityFields,
  stringValue,
  timeframeValue,
  timeRangeValue,
} from "./internal-validation";

export interface MarketInputSelectionIdentityDto {
  pair: string;
  timeframe: RestMarketTimeframe;
  range: RestTimeRange;
}

export type MarketInputSelectionDto = MarketInputSelectionIdentityDto &
  (
    | { datasetId: string; datasetVersion?: string }
    | { datasetId?: never; datasetVersion?: never }
  );

export interface BacktestConfigurationDto {
  executionProfileId: "BACKTEST_EXECUTION_V1";
  initialCapital: number;
  feeRatePercent: number;
  slippageBps: number;
  /** Opaque transport projection; the canonical profile is owned by Backtesting. */
  paperExecutionProvenance?: Readonly<Record<string, string | number>>;
}

export interface StartManualBacktestRequestDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  leaderboardScopeId: string;
  strategySelection: StrategySelectionDto;
  marketInput: MarketInputSelectionDto;
  configuration: BacktestConfigurationDto;
}

export interface BacktestSubmissionResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  candidateId: string;
  status: "ACCEPTED";
}

export interface CandidateFailureDto {
  code:
    | "INVALID_REQUEST"
    | "SATURATED"
    | "STRATEGY_FAILED"
    | "SIMULATION_FAILED"
    | "EVALUATION_FAILED"
    | "RANKING_FAILED"
    | "CANCELLED";
  message: string;
}

export interface CandidateProgressDto {
  candidateId: string;
  ownerUserId: string;
  origin:
    | { kind: "MANUAL"; leaderboardScopeId: string }
    | {
        kind: "SEARCH";
        searchRunId: string;
        leaderboardScopeId: string;
        iterationNumber: number;
      };
  strategySelection: StrategySelectionDto;
  marketInput: MarketInputSelectionDto;
  status: "ACCEPTED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  experimentId?: string;
  failure?: CandidateFailureDto;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  updatedAt: string;
}

export interface CandidateProgressResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  candidate: CandidateProgressDto;
}

export interface SignalTracePointDto {
  source: StrategySelectionDto;
  timestamp: string;
  signal: StrategySignalDto;
  executionNotBefore: string;
}

export interface TradeMarkerDto {
  tradeId: string;
  kind: "ENTRY" | "EXIT";
  timestamp: string;
  price: number;
}

export interface OverlayTracePointDto {
  strategyDefinitionId: string;
  point: StrategyVisualizationPointDto;
}

export interface ExperimentVisualizationDto {
  signals: readonly SignalTracePointDto[];
  overlays: readonly OverlayTracePointDto[];
  tradeMarkers: readonly TradeMarkerDto[];
}

export interface TradeDto {
  id: string;
  experimentId: string;
  sequence: number;
  pair: string;
  entrySignalAt: string;
  entryTime: string;
  entryPrice: number;
  exitSignalAt?: string;
  exitTime: string;
  exitPrice: number;
  positionMode?: string;
  exitReason: "STRATEGY_EXIT" | "RANGE_END" | "STOP_LOSS" | "TAKE_PROFIT";
  quantity: number;
  notionalEntryValue: number;
  grossProfit: number;
  feeAmount: number;
  slippageBps: number;
  profit: number;
  resultPercent: number;
  result: "WIN" | "LOSS" | "BREAKEVEN";
}

export interface ExperimentDto {
  id: string;
  candidateId: string;
  searchRunId?: string;
  strategy: StrategySelectionProvenanceDto;
  marketData: MarketDataProvenanceDto;
  configuration: BacktestConfigurationDto;
  metrics: EvaluationMetricsDto;
  rankingConfigurationId: string;
  code: { applicationVersion?: string; gitCommit?: string };
  replay: RestReplayAvailability;
  visualization: ExperimentVisualizationDto;
  createdAt: string;
  paperExecutionProvenance?: BacktestConfigurationDto["paperExecutionProvenance"];
}

export interface ExperimentResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  experiment: ExperimentDto;
}

export interface TradePageResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  items: readonly TradeDto[];
  nextCursor?: string;
}

function parseStrategySelection(value: unknown): StrategySelectionDto {
  const selection = recordValue(value, "strategySelection");
  if (selection.kind === "STRATEGY") {
    if (selection.compositeDefinitionId !== undefined) {
      throw new RestContractValidationError("Strategy selection cannot include a composite ID");
    }
    return {
      kind: "STRATEGY",
      strategyDefinitionId: stringValue(
        selection.strategyDefinitionId,
        "strategyDefinitionId",
      ),
    };
  }
  if (selection.kind === "COMPOSITE") {
    if (selection.strategyDefinitionId !== undefined) {
      throw new RestContractValidationError("Composite selection cannot include a strategy ID");
    }
    return {
      kind: "COMPOSITE",
      compositeDefinitionId: stringValue(
        selection.compositeDefinitionId,
        "compositeDefinitionId",
      ),
    };
  }
  throw new RestContractValidationError("Unknown strategy selection kind");
}

export function parseStartManualBacktestRequest(value: unknown): StartManualBacktestRequestDto {
  const input = recordValue(value, "manual backtest request");
  rejectClientIdentityFields(input, "manual backtest request");
  if (input.schemaVersion !== REST_SCHEMA_VERSION) {
    throw new RestContractValidationError("Unsupported REST schema version");
  }
  const marketInput = parseMarketInputSelection(input.marketInput);
  const configuration = parseBacktestConfiguration(input.configuration);
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    leaderboardScopeId: stringValue(input.leaderboardScopeId, "leaderboardScopeId"),
    strategySelection: parseStrategySelection(input.strategySelection),
    marketInput,
    configuration,
  };
}

export function parseMarketInputSelection(value: unknown): MarketInputSelectionDto {
  const marketInput = recordValue(value, "marketInput");
  const hasDatasetId = marketInput.datasetId !== undefined;
  const hasDatasetVersion = marketInput.datasetVersion !== undefined;
  if (!hasDatasetId && hasDatasetVersion) {
    throw new RestContractValidationError("datasetVersion requires datasetId");
  }
  return {
    pair: stringValue(marketInput.pair, "pair"),
    timeframe: timeframeValue(marketInput.timeframe, "timeframe"),
    range: timeRangeValue(marketInput.range, "range"),
    ...(hasDatasetId
      ? {
          datasetId: stringValue(marketInput.datasetId, "datasetId"),
          ...(hasDatasetVersion
            ? { datasetVersion: stringValue(marketInput.datasetVersion, "datasetVersion") }
            : {}),
        }
      : {}),
  } as MarketInputSelectionDto;
}

export function parseBacktestConfiguration(value: unknown): BacktestConfigurationDto {
  const configuration = recordValue(value, "configuration");
  if (configuration.executionProfileId !== "BACKTEST_EXECUTION_V1") {
    throw new RestContractValidationError("Unsupported backtest execution profile");
  }
  const initialCapital = finiteNumber(configuration.initialCapital, "initialCapital");
  const feeRatePercent = finiteNumber(configuration.feeRatePercent, "feeRatePercent");
  const slippageBps = finiteNumber(configuration.slippageBps, "slippageBps");
  if (initialCapital <= 0 || feeRatePercent < 0 || slippageBps < 0) {
    throw new RestContractValidationError("Backtest numeric configuration is out of range");
  }
  const base: Omit<BacktestConfigurationDto, "paperExecution"> = {
    executionProfileId: "BACKTEST_EXECUTION_V1",
    initialCapital,
    feeRatePercent,
    slippageBps,
  };
  return base;
}
