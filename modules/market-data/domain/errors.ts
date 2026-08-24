export type MarketDataErrorCode =
  | "INVALID_PAIR" | "UNSUPPORTED_PAIR" | "INVALID_TIMEFRAME" | "UNSUPPORTED_TIMEFRAME"
  | "INVALID_RANGE" | "INVALID_CURSOR" | "RANGE_TOO_LARGE" | "NO_DATA"
  | "HISTORY_UNAVAILABLE" | "HISTORY_INCOMPLETE" | "DATASET_EMPTY" | "DATASET_GAP"
  | "DATASET_NOT_FOUND" | "DATASET_NOT_SEALED" | "DATASET_INTEGRITY_FAILURE"
  | "SUBSCRIPTION_REJECTED" | "PROVIDER_UNAVAILABLE" | "PROVIDER_RATE_LIMITED"
  | "PROVIDER_PAYLOAD_INVALID" | "MARKET_DATA_UNAVAILABLE" | "INTERNAL_ERROR";

export class MarketDataException extends Error {
  constructor(readonly code: MarketDataErrorCode, message: string, readonly retryable = false, readonly details?: Record<string, unknown>) {
    super(message);
    this.name = "MarketDataException";
  }
}
