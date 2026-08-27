import {
  REST_SCHEMA_VERSION,
  RestContractValidationError,
  type RestMarketTimeframe,
  type RestTimeRange,
} from "./common";
import {
  positiveInteger,
  recordValue,
  stringValue,
  timeframeValue,
  timeRangeValue,
} from "./internal-validation";

export interface MarketHistoryRequestDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  pair: string;
  timeframe: RestMarketTimeframe;
  range: RestTimeRange;
  limit?: number;
  cursor?: string;
  includeForming?: boolean;
  completeness: "ALLOW_PARTIAL" | "REQUIRE_COMPLETE";
}

export interface CandleDto {
  pair: string;
  timeframe: RestMarketTimeframe;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

export interface MarketDataProvenanceIdentityDto {
  provider: string;
  pair: string;
  timeframe: RestMarketTimeframe;
  range: RestTimeRange;
}

export type MarketDataProvenanceDto = MarketDataProvenanceIdentityDto &
  (
    | {
        replayGuarantee: "EXACT_REPLAY_AVAILABLE";
        datasetId: string;
        datasetVersion: string;
        replayLimitation?: never;
      }
    | {
        replayGuarantee: "TRACEABLE";
        datasetId?: string;
        datasetVersion?: string;
        replayLimitation: string;
      }
  );

export interface MarketHistoryResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  pair: string;
  timeframe: RestMarketTimeframe;
  range: RestTimeRange;
  candles: readonly CandleDto[];
  complete: boolean;
  missingRanges: readonly RestTimeRange[];
  formingIncluded: boolean;
  asOf: string;
  provenance: MarketDataProvenanceDto;
  nextCursor?: string;
}

export function parseMarketHistoryRequest(value: unknown): MarketHistoryRequestDto {
  const input = recordValue(value, "market history request");
  if (input.schemaVersion !== REST_SCHEMA_VERSION) {
    throw new RestContractValidationError("Unsupported REST schema version");
  }
  const completeness = input.completeness;
  if (completeness !== "ALLOW_PARTIAL" && completeness !== "REQUIRE_COMPLETE") {
    throw new RestContractValidationError("Invalid completeness policy");
  }
  if (input.includeForming !== undefined && typeof input.includeForming !== "boolean") {
    throw new RestContractValidationError("includeForming must be boolean");
  }
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    pair: stringValue(input.pair, "pair"),
    timeframe: timeframeValue(input.timeframe, "timeframe"),
    range: timeRangeValue(input.range, "range"),
    ...(input.limit === undefined ? {} : { limit: positiveInteger(input.limit, "limit") }),
    ...(input.cursor === undefined ? {} : { cursor: stringValue(input.cursor, "cursor") }),
    ...(input.includeForming === undefined ? {} : { includeForming: input.includeForming }),
    completeness,
  };
}
