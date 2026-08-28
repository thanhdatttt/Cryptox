import {
  REST_MARKET_TIMEFRAMES,
  RestContractValidationError,
  type RestMarketTimeframe,
  type RestTimeRange,
} from "./common";

export function recordValue(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new RestContractValidationError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new RestContractValidationError(`${label} must be a non-empty string`);
  }
  return value;
}

export function rejectClientIdentityFields(
  value: Record<string, unknown>,
  label: string,
): void {
  if (value.userId !== undefined || value.ownerUserId !== undefined) {
    throw new RestContractValidationError(
      `${label} must not include userId or ownerUserId; identity comes from authenticated context`,
    );
  }
}

export function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RestContractValidationError(`${label} must be finite`);
  }
  return value;
}

export function positiveInteger(value: unknown, label: string): number {
  const number = finiteNumber(value, label);
  if (!Number.isInteger(number) || number <= 0) {
    throw new RestContractValidationError(`${label} must be a positive integer`);
  }
  return number;
}

export function timeframeValue(value: unknown, label: string): RestMarketTimeframe {
  if (!REST_MARKET_TIMEFRAMES.includes(value as RestMarketTimeframe)) {
    throw new RestContractValidationError(`${label} is not supported`);
  }
  return value as RestMarketTimeframe;
}

export function timeRangeValue(value: unknown, label: string): RestTimeRange {
  const range = recordValue(value, label);
  const from = stringValue(range.from, `${label}.from`);
  const to = stringValue(range.to, `${label}.to`);
  const fromTime = Date.parse(from);
  const toTime = Date.parse(to);
  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime) || fromTime >= toTime) {
    throw new RestContractValidationError(`${label} must be a non-empty increasing range`);
  }
  return { from, to };
}
