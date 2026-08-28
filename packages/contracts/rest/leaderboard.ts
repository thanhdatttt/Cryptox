import { REST_SCHEMA_VERSION, RestContractValidationError } from "./common";
import {
  positiveInteger,
  recordValue,
  rejectClientIdentityFields,
  stringValue,
} from "./internal-validation";

export interface RankingConfigurationDto {
  id: string;
  profileId: "LINEAR_REQUIRED_V1";
  version: 1;
  name: string;
  description?: string;
  formula: {
    totalReturnPercentWeight: 0.5;
    winRatePercentWeight: 0.3;
    maxDrawdownMagnitudePercentWeight: -0.2;
  };
  minimumNumberOfTrades: 1;
  tieBreakers: readonly [
    { field: "SCORE"; direction: "DESCENDING" },
    { field: "TOTAL_RETURN_PERCENT"; direction: "DESCENDING" },
    { field: "MAX_DRAWDOWN_MAGNITUDE_PERCENT"; direction: "ASCENDING" },
    { field: "WIN_RATE_PERCENT"; direction: "DESCENDING" },
    { field: "EXPERIMENT_ID"; direction: "ASCENDING" },
  ];
  createdAt: string;
}

export interface LeaderboardScopeDto {
  id: string;
  ownerUserId: string;
  name: string;
  k: number;
  rankingConfigurationId: string;
  comparisonKey: string;
  createdAt: string;
}

export interface CreateLeaderboardScopeRequestDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  name: string;
  k?: number;
  rankingConfigurationId: string;
  comparisonKey: string;
}

export interface CreateLeaderboardScopeResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  scope: LeaderboardScopeDto;
}

export interface LeaderboardEntryDto {
  id: string;
  rank: number;
  candidateId: string;
  searchRunId?: string;
  experimentId: string;
  leaderboardScopeId: string;
  rankingConfigurationId: string;
  score: number;
  addedAt: string;
}

export interface SearchRunRankingEntryDto {
  rank: number;
  searchRunId: string;
  leaderboardScopeId: string;
  candidateId: string;
  experimentId: string;
  rankingConfigurationId: string;
  score: number;
}

export interface LeaderboardTopKResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  scope: LeaderboardScopeDto;
  rankingConfiguration: RankingConfigurationDto;
  entries: readonly LeaderboardEntryDto[];
}

export function parseCreateLeaderboardScopeRequest(
  value: unknown,
): CreateLeaderboardScopeRequestDto {
  const input = recordValue(value, "create leaderboard scope request");
  rejectClientIdentityFields(input, "create leaderboard scope request");
  if (input.schemaVersion !== REST_SCHEMA_VERSION) {
    throw new RestContractValidationError("Unsupported REST schema version");
  }
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    name: stringValue(input.name, "name"),
    ...(input.k === undefined ? {} : { k: positiveInteger(input.k, "k") }),
    rankingConfigurationId: stringValue(
      input.rankingConfigurationId,
      "rankingConfigurationId",
    ),
    comparisonKey: stringValue(input.comparisonKey, "comparisonKey"),
  };
}
