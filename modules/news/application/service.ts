import type { SentimentResult, SentimentInput } from "@cryptox/sentiment";
import {
  NEWS_READ_ORDER_V1,
  type CollectNewsCommand,
  type NewsCollectionResult,
  type NewsModulePublicApi,
  type NewsPage,
  type NewsReadItem,
  type NewsReadQuery,
} from "../api/contracts";
import {
  assertNormalizedNewsItem,
  canonicalProviderId,
  canonicalTimestamp,
  normalizeNewsItem,
} from "./normalization";
import type {
  NewsModuleDependencies,
  NewsProvider,
  NewsReadRecordQuery,
  NormalizedNewsItemRecord,
} from "./ports";

const DEFAULT_COLLECTION_LIMIT = 50;
const MAX_QUERY_LIMIT = 10_000;
const MAX_CURSOR_LENGTH = 2_048;
const SENTIMENT_LABELS = new Set(["POSITIVE", "NEUTRAL", "NEGATIVE"]);

export type NewsFailureCode =
  | "INVALID_QUERY"
  | "INVALID_PROVIDER"
  | "PERSISTENCE_UNAVAILABLE";

export class NewsApplicationError extends Error {
  public readonly name = "NewsApplicationError";

  public constructor(public readonly code: NewsFailureCode, message: string) {
    super(message);
  }
}

interface TimeoutValue<T> {
  kind: "value";
  value: T;
}

interface TimeoutError {
  kind: "error";
  error: unknown;
}

interface TimeoutExpired {
  kind: "timeout";
}

type BoundedResult<T> = TimeoutValue<T> | TimeoutError | TimeoutExpired;

function copy<T>(value: T): T {
  return structuredClone(value);
}

function safeRecord(action: () => void): void {
  try {
    action();
  } catch {
    // Observability must never turn a degraded auxiliary path into a News failure.
  }
}

function validateLimit(value: unknown, defaultValue = DEFAULT_COLLECTION_LIMIT): number {
  if (value === undefined) return defaultValue;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > MAX_QUERY_LIMIT) {
    throw new NewsApplicationError("INVALID_QUERY", `limit must be an integer between 1 and ${MAX_QUERY_LIMIT}`);
  }
  return value;
}

function validateStringList(value: unknown, field: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new NewsApplicationError("INVALID_QUERY", `${field} must be an array`);
  const values = value.map((entry, index) => {
    if (typeof entry !== "string" || !entry.trim()) {
      throw new NewsApplicationError("INVALID_QUERY", `${field}[${index}] must be non-empty`);
    }
    return entry.trim();
  });
  if (new Set(values).size !== values.length) {
    throw new NewsApplicationError("INVALID_QUERY", `${field} must contain distinct values`);
  }
  return values;
}

function validateCursor(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim() || value.length > MAX_CURSOR_LENGTH) {
    throw new NewsApplicationError("INVALID_QUERY", "cursor must be a non-empty opaque value");
  }
  return value;
}

function validateCollectionCommand(command: CollectNewsCommand): {
  providerIds?: readonly string[];
  relatedCoins?: readonly string[];
  publishedAfter?: string;
  limit: number;
} {
  if (!command || typeof command !== "object") {
    throw new NewsApplicationError("INVALID_QUERY", "News collection command must be an object");
  }
  const providerIds = validateStringList(command.providerIds, "providerIds");
  const requestedCoins = validateStringList(command.relatedCoins, "relatedCoins")?.map((coin) => coin.toUpperCase());
  const relatedCoins = requestedCoins && requestedCoins.length > 0 ? requestedCoins : undefined;
  const publishedAfter = command.publishedAfter === undefined
    ? undefined
    : canonicalTimestamp(command.publishedAfter, "publishedAfter");
  return {
    ...(providerIds === undefined ? {} : { providerIds }),
    ...(relatedCoins === undefined ? {} : { relatedCoins }),
    ...(publishedAfter === undefined ? {} : { publishedAfter }),
    limit: validateLimit(command.limit),
  };
}

function validateReadQuery(query: NewsReadQuery): NewsReadRecordQuery {
  if (!query || typeof query !== "object") {
    throw new NewsApplicationError("INVALID_QUERY", "News read query must be an object");
  }
  if (query.order !== NEWS_READ_ORDER_V1) {
    throw new NewsApplicationError("INVALID_QUERY", "unsupported News ordering profile");
  }
  const requestedCoins = validateStringList(query.relatedCoins, "relatedCoins")?.map((coin) => coin.toUpperCase());
  const relatedCoins = requestedCoins && requestedCoins.length > 0 ? requestedCoins : undefined;
  const publishedFrom = query.publishedFrom === undefined
    ? undefined
    : canonicalTimestamp(query.publishedFrom, "publishedFrom");
  const publishedTo = query.publishedTo === undefined
    ? undefined
    : canonicalTimestamp(query.publishedTo, "publishedTo");
  if (publishedFrom !== undefined && publishedTo !== undefined && Date.parse(publishedFrom) >= Date.parse(publishedTo)) {
    throw new NewsApplicationError("INVALID_QUERY", "publishedFrom must be before publishedTo");
  }
  const cursor = validateCursor(query.cursor);
  return {
    ...(relatedCoins === undefined ? {} : { relatedCoins }),
    ...(publishedFrom === undefined ? {} : { publishedFrom }),
    ...(publishedTo === undefined ? {} : { publishedTo }),
    limit: validateLimit(query.limit),
    ...(cursor === undefined ? {} : { cursor }),
    order: NEWS_READ_ORDER_V1,
  };
}

function validSentimentResult(value: unknown, newsId: string): value is SentimentResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<SentimentResult>;
  return result.newsId === newsId
    && typeof result.label === "string"
    && SENTIMENT_LABELS.has(result.label)
    && typeof result.score === "number"
    && Number.isFinite(result.score)
    && result.score >= -1
    && result.score <= 1
    && typeof result.providerId === "string"
    && Boolean(result.providerId.trim())
    && typeof result.analysisProfileId === "string"
    && Boolean(result.analysisProfileId.trim())
    && typeof result.modelName === "string"
    && Boolean(result.modelName.trim())
    && typeof result.modelVersion === "string"
    && Boolean(result.modelVersion.trim())
    && typeof result.analyzedAt === "string"
    && Number.isFinite(Date.parse(result.analyzedAt));
}

function sentimentInput(item: NormalizedNewsItemRecord): SentimentInput {
  return {
    newsId: item.id,
    title: item.title,
    content: item.content,
    source: item.source,
    publishedAt: item.publishedAt,
    relatedCoins: item.relatedCoins,
  };
}

export class NewsApplicationService implements NewsModulePublicApi {
  public constructor(private readonly dependencies: NewsModuleDependencies) {
    if (!Number.isSafeInteger(dependencies.sentimentTimeoutMs) || dependencies.sentimentTimeoutMs < 1) {
      throw new Error("News Sentiment timeout must be a positive safe integer");
    }
  }

  private recordProviderFailure(providerId: string, detail: string): void {
    safeRecord(() => this.dependencies.observability.recordProviderFailure({ providerId, detail }));
  }

  private async bounded<T>(operation: () => Promise<T>): Promise<BoundedResult<T>> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const operationResult = Promise.resolve()
      .then(operation)
      .then((value): TimeoutValue<T> => ({ kind: "value", value }))
      .catch((error: unknown): TimeoutError => ({ kind: "error", error }));
    const timeoutResult = new Promise<TimeoutExpired>((resolve) => {
      timer = setTimeout(() => resolve({ kind: "timeout" }), this.dependencies.sentimentTimeoutMs);
      (timer as unknown as { unref?: () => void }).unref?.();
    });
    const result = await Promise.race([operationResult, timeoutResult]);
    if (timer !== undefined) clearTimeout(timer);
    return result;
  }

  private async requestSentiment(item: NormalizedNewsItemRecord): Promise<void> {
    const result = await this.bounded(() => this.dependencies.sentiment.analyze(sentimentInput(item)));
    if (result.kind === "timeout") {
      safeRecord(() => this.dependencies.observability.recordSentimentFailure({ newsId: item.id, reason: "TIMEOUT" }));
      return;
    }
    if (result.kind === "error") {
      safeRecord(() => this.dependencies.observability.recordSentimentFailure({ newsId: item.id, reason: "INFERENCE_ERROR" }));
      return;
    }
    if (!validSentimentResult(result.value, item.id)) {
      safeRecord(() => this.dependencies.observability.recordSentimentFailure({ newsId: item.id, reason: "INVALID_RESULT" }));
    }
  }

  private async readSentiment(item: NormalizedNewsItemRecord): Promise<SentimentResult | null> {
    const result = await this.bounded(() => this.dependencies.sentiment.readLatestForNews(item.id));
    if (result.kind === "timeout") {
      safeRecord(() => this.dependencies.observability.recordSentimentFailure({ newsId: item.id, reason: "TIMEOUT" }));
      return null;
    }
    if (result.kind === "error") {
      safeRecord(() => this.dependencies.observability.recordSentimentFailure({ newsId: item.id, reason: "INFERENCE_ERROR" }));
      return null;
    }
    if (result.value === undefined) return null;
    if (!validSentimentResult(result.value, item.id)) {
      safeRecord(() => this.dependencies.observability.recordSentimentFailure({ newsId: item.id, reason: "INVALID_RESULT" }));
      return null;
    }
    return copy(result.value);
  }

  private selectProviders(providerIds: readonly string[] | undefined): NewsProvider[] {
    const providers = [...this.dependencies.providers];
    if (providerIds === undefined || providerIds.length === 0) return providers;
    const wanted = new Set(providerIds.map((providerId) => canonicalProviderId(providerId)));
    const selected = providers.filter((provider) => {
      try {
        return wanted.has(canonicalProviderId(provider.id));
      } catch {
        return false;
      }
    });
    for (const providerId of wanted) {
      if (!selected.some((provider) => {
        try {
          return canonicalProviderId(provider.id) === providerId;
        } catch {
          return false;
        }
      })) {
        this.recordProviderFailure(providerId, "requested provider is not configured");
      }
    }
    return selected;
  }

  public async collect(command: CollectNewsCommand): Promise<NewsCollectionResult> {
    const input = validateCollectionCommand(command);
    const result: NewsCollectionResult = {
      fetchedCount: 0,
      storedCount: 0,
      duplicateCount: 0,
      rejectedCount: 0,
    };
    const providers = this.selectProviders(input.providerIds);
    for (const provider of providers) {
      let providerId: string;
      try {
        providerId = canonicalProviderId(provider.id);
      } catch {
        this.recordProviderFailure("unknown", "configured provider has an invalid id");
        continue;
      }
      let values: readonly NormalizedNewsItemRecord[];
      try {
        const fetched = await provider.fetch({
          ...(input.relatedCoins === undefined ? {} : { relatedCoins: input.relatedCoins }),
          ...(input.publishedAfter === undefined ? {} : { publishedAfter: input.publishedAfter }),
          limit: input.limit,
        });
        if (!Array.isArray(fetched)) throw new Error("provider did not return an array");
        values = fetched;
        result.fetchedCount += fetched.length;
      } catch {
        this.recordProviderFailure(providerId, "provider fetch failed");
        continue;
      }
      for (const value of values) {
        let item: NormalizedNewsItemRecord;
        try {
          item = normalizeNewsItem(value, providerId);
        } catch (error) {
          result.rejectedCount += 1;
          this.recordProviderFailure(providerId, `malformed provider item rejected: ${error instanceof Error ? error.message : "unknown error"}`);
          continue;
        }
        if (input.publishedAfter !== undefined && Date.parse(item.publishedAt) < Date.parse(input.publishedAfter)) continue;
        if (input.relatedCoins !== undefined && !input.relatedCoins.some((coin) => item.relatedCoins.includes(coin))) continue;
        const stored = await this.dependencies.newsRepository.upsertByProviderIdentity(item);
        if (!stored || typeof stored.inserted !== "boolean") {
          throw new NewsApplicationError("PERSISTENCE_UNAVAILABLE", "News repository returned an invalid upsert result");
        }
        const storedItem = assertNormalizedNewsItem(stored.item);
        if (!stored.inserted) {
          result.duplicateCount += 1;
          continue;
        }
        result.storedCount += 1;
        await this.requestSentiment(storedItem);
      }
    }
    return result;
  }

  public async readNews(query: NewsReadQuery): Promise<NewsPage> {
    const input = validateReadQuery(query);
    const page = await this.dependencies.newsRepository.read(input);
    if (!page || !Array.isArray(page.items)) {
      throw new NewsApplicationError("PERSISTENCE_UNAVAILABLE", "News repository returned an invalid page");
    }
    const items = page.items.map((value) => assertNormalizedNewsItem(value));
    const readItems = await Promise.all(items.map(async (item): Promise<NewsReadItem> => ({
      ...copy(item),
      sentiment: await this.readSentiment(item),
    })));
    return {
      items: readItems,
      ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }),
    };
  }
}
