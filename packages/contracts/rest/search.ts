import { REST_SCHEMA_VERSION, RestContractValidationError } from "./common";
import type { SearchRunRankingEntryDto } from "./leaderboard";
import {
  parseBacktestConfiguration,
  parseMarketInputSelection,
  type BacktestConfigurationDto,
  type MarketInputSelectionDto,
} from "./backtesting";
import {
  positiveInteger,
  recordValue,
  rejectClientIdentityFields,
  stringValue,
} from "./internal-validation";

export interface SearchSpaceConfigDto {
  availableStrategyDefinitionIds: readonly string[];
  componentCount: { minimum: number; maximum: number };
  requireDistinctComponents: true;
}

type StopConditionFieldsDto = {
  maxCandidates?: number;
  maxDurationSeconds?: number;
  noImprovementAfterIterations?: number;
};

export type StopConditionDto =
  | (StopConditionFieldsDto & { maxCandidates: number })
  | (StopConditionFieldsDto & { maxDurationSeconds: number })
  | (StopConditionFieldsDto & { noImprovementAfterIterations: number });

export interface StartSearchRequestDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  searchSpace: SearchSpaceConfigDto;
  stopCondition: StopConditionDto;
  generatorType: "RANDOM";
  randomSeed: string;
  leaderboardScopeId: string;
  candidateTemplate: {
    marketInput: MarketInputSelectionDto;
    configuration: BacktestConfigurationDto;
  };
  maxInFlight: number;
}

export interface StartSearchResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  searchRunId: string;
}

export interface SearchRunStatusDto {
  searchRunId: string;
  ownerUserId: string;
  generatorType: "RANDOM";
  randomSeed: string;
  searchSpace: SearchSpaceConfigDto;
  stopCondition: StopConditionDto;
  leaderboardScopeId: string;
  candidateTemplate: {
    marketInput: MarketInputSelectionDto;
    configuration: BacktestConfigurationDto;
  };
  maxInFlight: number;
  state: "CREATED" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED" | "FAILED";
  activeCandidateIds: readonly string[];
  submittedCandidateCount: number;
  completedCandidateCount: number;
  failedCandidateCount: number;
  averageBacktestDurationMs: number | null;
  currentTopLeaderboardEntryId?: string;
  createdAt: string;
  startedAt?: string;
  updatedAt: string;
  endedAt?: string;
  stopReason?:
    | "MAX_CANDIDATES"
    | "MAX_DURATION"
    | "NO_IMPROVEMENT"
    | "SEARCH_SPACE_EXHAUSTED"
    | "USER_CANCELLED"
    | "ERROR";
  lastError?: string;
  seededDiscovery?: {
    profileId: string;
    algorithmConfiguration: Readonly<Record<string, number | string | boolean | readonly string[]>>;
    datasetIdentity: { datasetId?: string; datasetVersion?: string; provider?: string };
    code: { applicationVersion?: string; gitCommit?: string };
    seed: string;
    defaultBudget: { maxCandidates: 500; maxDurationSeconds: 300 };
  };
}

export interface StartSeededDiscoveryRequestDto extends Omit<StartSearchRequestDto, "generatorType"> {
  generatorProfileId: string;
  algorithmConfiguration: Readonly<Record<string, number | string | boolean | readonly string[]>>;
  datasetIdentity: { datasetId?: string; datasetVersion?: string; provider?: string };
  code: { applicationVersion?: string; gitCommit?: string };
}

export interface SearchRunStatusResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  searchRun: SearchRunStatusDto;
  ranking: readonly SearchRunRankingEntryDto[];
}

export function parseStartSearchRequest(value: unknown): StartSearchRequestDto {
  const input = recordValue(value, "start search request");
  rejectClientIdentityFields(input, "start search request");
  if (input.schemaVersion !== REST_SCHEMA_VERSION || input.generatorType !== "RANDOM") {
    throw new RestContractValidationError("Unsupported search schema or generator");
  }
  const searchSpace = recordValue(input.searchSpace, "searchSpace");
  if (!Array.isArray(searchSpace.availableStrategyDefinitionIds)) {
    throw new RestContractValidationError("availableStrategyDefinitionIds must be an array");
  }
  const ids = searchSpace.availableStrategyDefinitionIds.map((id, index) =>
    stringValue(id, `availableStrategyDefinitionIds[${index}]`),
  );
  if (new Set(ids).size !== ids.length || searchSpace.requireDistinctComponents !== true) {
    throw new RestContractValidationError("Search components must be distinct");
  }
  const count = recordValue(searchSpace.componentCount, "componentCount");
  const minimum = positiveInteger(count.minimum, "componentCount.minimum");
  const maximum = positiveInteger(count.maximum, "componentCount.maximum");
  if (minimum < 2 || minimum > maximum || maximum > ids.length) {
    throw new RestContractValidationError("Invalid component count bounds");
  }
  const stop = recordValue(input.stopCondition, "stopCondition");
  const parsedStop = {
    ...(stop.maxCandidates === undefined
      ? {}
      : { maxCandidates: positiveInteger(stop.maxCandidates, "maxCandidates") }),
    ...(stop.maxDurationSeconds === undefined
      ? {}
      : { maxDurationSeconds: positiveInteger(stop.maxDurationSeconds, "maxDurationSeconds") }),
    ...(stop.noImprovementAfterIterations === undefined
      ? {}
      : {
          noImprovementAfterIterations: positiveInteger(
            stop.noImprovementAfterIterations,
            "noImprovementAfterIterations",
          ),
        }),
  };
  if (Object.keys(parsedStop).length === 0) {
    throw new RestContractValidationError("At least one finite stop condition is required");
  }
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    searchSpace: {
      availableStrategyDefinitionIds: ids,
      componentCount: { minimum, maximum },
      requireDistinctComponents: true,
    },
    stopCondition: parsedStop as StopConditionDto,
    generatorType: "RANDOM",
    randomSeed: stringValue(input.randomSeed, "randomSeed"),
    leaderboardScopeId: stringValue(input.leaderboardScopeId, "leaderboardScopeId"),
    candidateTemplate: (() => {
      const template = recordValue(input.candidateTemplate, "candidateTemplate");
      return {
        marketInput: parseMarketInputSelection(template.marketInput),
        configuration: parseBacktestConfiguration(template.configuration),
      };
    })(),
    maxInFlight: positiveInteger(input.maxInFlight, "maxInFlight"),
  };
}
