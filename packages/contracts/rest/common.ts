export const REST_SCHEMA_VERSION = 1 as const;

export const REST_MARKET_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
export type RestMarketTimeframe = (typeof REST_MARKET_TIMEFRAMES)[number];

export interface RestTimeRange {
  from: string;
  to: string;
}

export interface RestError {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  error: {
    code: string;
    message: string;
    details?: Readonly<Record<string, string | number | boolean>>;
  };
}

export const REST_PRIVATE_RESOURCE_FAILURES = {
  unauthenticated: { code: "UNAUTHENTICATED", httpStatus: 401 },
  missingOrCrossUser: { code: "NOT_FOUND", httpStatus: 404 },
} as const;

export type RestPrivateResourceError =
  | {
      schemaVersion: typeof REST_SCHEMA_VERSION;
      httpStatus: 401;
      error: { code: "UNAUTHENTICATED"; message: string };
    }
  | {
      schemaVersion: typeof REST_SCHEMA_VERSION;
      httpStatus: 404;
      error: { code: "NOT_FOUND"; message: string };
    };

export interface RestPageRequest {
  limit: number;
  cursor?: string;
}

export type RestReplayUnavailableInput = "HISTORICAL_DATA" | "EXECUTABLE_CODE";
export type RestReplayAvailability =
  | {
      guarantee: "EXACT_REPLAY_AVAILABLE";
      unavailableInputs: readonly [];
      limitation?: never;
    }
  | {
      guarantee: "TRACEABLE";
      unavailableInputs: readonly [RestReplayUnavailableInput, ...RestReplayUnavailableInput[]];
      limitation: string;
    };

export class RestContractValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RestContractValidationError";
  }
}
