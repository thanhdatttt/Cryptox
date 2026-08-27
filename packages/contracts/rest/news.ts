import { REST_SCHEMA_VERSION, RestContractValidationError } from "./common";
import { positiveInteger, recordValue, stringValue } from "./internal-validation";

export interface SentimentResultDto {
  newsId: string;
  label: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  score: number;
  providerId: string;
  analysisProfileId: string;
  modelName: string;
  modelVersion: string;
  analyzedAt: string;
}

export interface NewsItemDto {
  id: string;
  providerId: string;
  providerItemId: string;
  title: string;
  content: string;
  source: string;
  publishedAt: string;
  crawledAt: string;
  relatedCoins: readonly string[];
  url: string;
  sentiment: SentimentResultDto | null;
}

export interface NewsQueryDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  relatedCoins?: readonly string[];
  publishedFrom?: string;
  publishedTo?: string;
  limit: number;
  cursor?: string;
  order: "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC";
}

export interface NewsPageResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  items: readonly NewsItemDto[];
  nextCursor?: string;
}

export function parseNewsQuery(value: unknown): NewsQueryDto {
  const input = recordValue(value, "news query");
  if (
    input.schemaVersion !== REST_SCHEMA_VERSION ||
    input.order !== "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC"
  ) {
    throw new RestContractValidationError("Unsupported news schema or ordering profile");
  }
  let relatedCoins: readonly string[] | undefined;
  if (input.relatedCoins !== undefined) {
    if (!Array.isArray(input.relatedCoins)) {
      throw new RestContractValidationError("relatedCoins must be an array");
    }
    relatedCoins = input.relatedCoins
      .map((coin, index) => stringValue(coin, `relatedCoins[${index}]`))
      .sort();
    if (new Set(relatedCoins).size !== relatedCoins.length) {
      throw new RestContractValidationError("relatedCoins must be distinct");
    }
  }
  const publishedFrom =
    input.publishedFrom === undefined
      ? undefined
      : stringValue(input.publishedFrom, "publishedFrom");
  const publishedTo =
    input.publishedTo === undefined ? undefined : stringValue(input.publishedTo, "publishedTo");
  const fromTime = publishedFrom === undefined ? undefined : Date.parse(publishedFrom);
  const toTime = publishedTo === undefined ? undefined : Date.parse(publishedTo);
  if (
    (fromTime !== undefined && !Number.isFinite(fromTime)) ||
    (toTime !== undefined && !Number.isFinite(toTime)) ||
    (fromTime !== undefined && toTime !== undefined && fromTime >= toTime)
  ) {
    throw new RestContractValidationError("News publication bounds must be valid and increasing");
  }
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    ...(relatedCoins === undefined ? {} : { relatedCoins }),
    ...(publishedFrom === undefined ? {} : { publishedFrom }),
    ...(publishedTo === undefined ? {} : { publishedTo }),
    limit: positiveInteger(input.limit, "limit"),
    ...(input.cursor === undefined ? {} : { cursor: stringValue(input.cursor, "cursor") }),
    order: "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC",
  };
}
