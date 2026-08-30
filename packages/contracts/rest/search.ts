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

export type SearchGeneratorTypeDto = "RANDOM" | "DOMAIN_GUIDED" | "GENETIC";
export type SeededDiscoveryProfileIdDto =
  | "RANDOM_V1"
  | "DOMAIN_GUIDED_V1"
  | "GENETIC_V1";
type SearchAlgorithmConfigurationDto = Readonly<
  Record<string, number | string | boolean | readonly string[]>
>;

export interface SeededDiscoveryProvenanceDto {
  profileId: SeededDiscoveryProfileIdDto;
  algorithmConfiguration: SearchAlgorithmConfigurationDto;
  datasetIdentity: { datasetId?: string; datasetVersion?: string; provider?: string };
  code: { applicationVersion?: string; gitCommit?: string };
  seed: string;
  defaultBudget: { maxCandidates: 500; maxDurationSeconds: 300 };
}

export interface StartSearchRequestDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  searchSpace: SearchSpaceConfigDto;
  stopCondition: StopConditionDto;
  generatorType: SearchGeneratorTypeDto;
  randomSeed: string;
  leaderboardScopeId: string;
  candidateTemplate: {
    marketInput: MarketInputSelectionDto;
    configuration: BacktestConfigurationDto;
  };
  maxInFlight: number;
  seededDiscovery?: SeededDiscoveryProvenanceDto;
}

export interface StartSearchResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  searchRunId: string;
}

export interface SearchRunStatusDto {
  searchRunId: string;
  ownerUserId: string;
  generatorType: SearchGeneratorTypeDto;
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
  seededDiscovery?: SeededDiscoveryProvenanceDto;
}

export interface StartSeededDiscoveryRequestDto
  extends Omit<StartSearchRequestDto, "generatorType" | "seededDiscovery"> {
  generatorProfileId: SeededDiscoveryProfileIdDto;
  algorithmConfiguration: SearchAlgorithmConfigurationDto;
  datasetIdentity: { datasetId?: string; datasetVersion?: string; provider?: string };
  code: { applicationVersion?: string; gitCommit?: string };
}

export interface SearchRunStatusResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  searchRun: SearchRunStatusDto;
  ranking: readonly SearchRunRankingEntryDto[];
}

const SEARCH_GENERATOR_TYPES: readonly SearchGeneratorTypeDto[] = [
  "RANDOM",
  "DOMAIN_GUIDED",
  "GENETIC",
];
const SEEDED_DISCOVERY_PROFILE_IDS: readonly SeededDiscoveryProfileIdDto[] = [
  "RANDOM_V1",
  "DOMAIN_GUIDED_V1",
  "GENETIC_V1",
];
const PROFILE_FOR_GENERATOR: Record<SearchGeneratorTypeDto, SeededDiscoveryProfileIdDto> = {
  RANDOM: "RANDOM_V1",
  DOMAIN_GUIDED: "DOMAIN_GUIDED_V1",
  GENETIC: "GENETIC_V1",
};

function generatorTypeValue(value: unknown): SearchGeneratorTypeDto {
  if (!SEARCH_GENERATOR_TYPES.includes(value as SearchGeneratorTypeDto)) {
    throw new RestContractValidationError("Unsupported search generator");
  }
  return value as SearchGeneratorTypeDto;
}

function profileIdValue(value: unknown): SeededDiscoveryProfileIdDto {
  if (!SEEDED_DISCOVERY_PROFILE_IDS.includes(value as SeededDiscoveryProfileIdDto)) {
    throw new RestContractValidationError("Unsupported seeded discovery profile");
  }
  return value as SeededDiscoveryProfileIdDto;
}

function parseAlgorithmConfiguration(value: unknown): SearchAlgorithmConfigurationDto {
  const configuration = recordValue(value, "seededDiscovery.algorithmConfiguration");
  for (const [key, item] of Object.entries(configuration)) {
    const validScalar =
      (typeof item === "number" && Number.isFinite(item)) ||
      typeof item === "string" ||
      typeof item === "boolean";
    const validStringArray =
      Array.isArray(item) && item.every((entry) => typeof entry === "string");
    if (!validScalar && !validStringArray) {
      throw new RestContractValidationError(
        `seededDiscovery.algorithmConfiguration.${key} has an unsupported value`,
      );
    }
  }
  return configuration as SearchAlgorithmConfigurationDto;
}

function parseDatasetIdentity(value: unknown): SeededDiscoveryProvenanceDto["datasetIdentity"] {
  const identity = recordValue(value, "seededDiscovery.datasetIdentity");
  return {
    ...(identity.datasetId === undefined
      ? {}
      : { datasetId: stringValue(identity.datasetId, "seededDiscovery.datasetIdentity.datasetId") }),
    ...(identity.datasetVersion === undefined
      ? {}
      : {
          datasetVersion: stringValue(
            identity.datasetVersion,
            "seededDiscovery.datasetIdentity.datasetVersion",
          ),
        }),
    ...(identity.provider === undefined
      ? {}
      : { provider: stringValue(identity.provider, "seededDiscovery.datasetIdentity.provider") }),
  };
}

function parseCode(value: unknown): SeededDiscoveryProvenanceDto["code"] {
  const code = recordValue(value, "seededDiscovery.code");
  return {
    ...(code.applicationVersion === undefined
      ? {}
      : {
          applicationVersion: stringValue(
            code.applicationVersion,
            "seededDiscovery.code.applicationVersion",
          ),
        }),
    ...(code.gitCommit === undefined
      ? {}
      : { gitCommit: stringValue(code.gitCommit, "seededDiscovery.code.gitCommit") }),
  };
}

function parseSeededDiscoveryProvenance(value: unknown): SeededDiscoveryProvenanceDto {
  const provenance = recordValue(value, "seededDiscovery");
  const defaultBudget = recordValue(provenance.defaultBudget, "seededDiscovery.defaultBudget");
  if (defaultBudget.maxCandidates !== 500 || defaultBudget.maxDurationSeconds !== 300) {
    throw new RestContractValidationError("Unsupported seeded discovery budget");
  }
  return {
    profileId: profileIdValue(provenance.profileId),
    algorithmConfiguration: parseAlgorithmConfiguration(provenance.algorithmConfiguration),
    datasetIdentity: parseDatasetIdentity(provenance.datasetIdentity),
    code: parseCode(provenance.code),
    seed: stringValue(provenance.seed, "seededDiscovery.seed"),
    defaultBudget: { maxCandidates: 500, maxDurationSeconds: 300 },
  };
}

export function parseStartSearchRequest(value: unknown): StartSearchRequestDto {
  const input = recordValue(value, "start search request");
  rejectClientIdentityFields(input, "start search request");
  if (input.schemaVersion !== REST_SCHEMA_VERSION) {
    throw new RestContractValidationError("Unsupported REST schema version");
  }
  const generatorType = generatorTypeValue(input.generatorType);
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
  const seededDiscovery =
    input.seededDiscovery === undefined
      ? undefined
      : parseSeededDiscoveryProvenance(input.seededDiscovery);
  if (
    seededDiscovery &&
    seededDiscovery.profileId !== PROFILE_FOR_GENERATOR[generatorType]
  ) {
    throw new RestContractValidationError(
      "Seeded discovery profile does not match the selected generator",
    );
  }
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    searchSpace: {
      availableStrategyDefinitionIds: ids,
      componentCount: { minimum, maximum },
      requireDistinctComponents: true,
    },
    stopCondition: parsedStop as StopConditionDto,
    generatorType,
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
    ...(seededDiscovery ? { seededDiscovery } : {}),
  };
}
