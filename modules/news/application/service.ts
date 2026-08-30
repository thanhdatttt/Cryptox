import { createHash, randomUUID } from "node:crypto";
import type { SentimentResult, SentimentInput } from "@cryptox/sentiment";
import {
  type CollectNewsCommand,
  type NewsCollectionResult,
  type NewsModulePublicApi,
  type NewsPage,
  type NewsReadItem,
  type NewsReadQuery,
  type SafeUrlImportRequest,
  type SafeUrlImportState,
} from "../api/contracts";
import {
  assertNormalizedNewsItem,
  canonicalProviderId,
  canonicalTimestamp,
  canonicalizeNewsUrl,
  normalizeExtractionProvenance,
  normalizeNewsItem,
} from "./normalization";
import type {
  ExtractionTemplateRecord,
  NewsProviderDocument,
  NewsModuleDependencies,
  NewsProvider,
  NewsReadRecordQuery,
  NewsRawHtmlArtifact,
  NewsSourceKind,
  NormalizedNewsItemRecord,
  SafeNewsFailureReason,
  StoredNewsExtractionProvenance,
} from "./ports";

const NEWS_READ_ORDER_V1 =
  "PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC" as const;
const EXTERNAL_CONTENT_SAFETY_V1 = {
  id: "EXTERNAL_CONTENT_SAFETY_V1",
  allowedSchemes: ["https"],
  maximumRedirects: 3,
  timeoutMs: 20_000,
  maximumBodyBytes: 1_048_576,
  rawHtmlRetentionDays: 7,
  normalizedRetentionDays: 90,
  excluded: ["CREDENTIALS", "COOKIES", "ARBITRARY_URL_PERSISTENCE", "AUTOMATIC_PROMOTION"],
} as const;

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

async function safeRecordAsync(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch {
    // Optional provenance/retention adapters must not turn a stored News item into a lost item.
  }
}

function addDays(timestamp: string, days: number): string {
  return new Date(Date.parse(timestamp) + days * 24 * 60 * 60 * 1_000).toISOString();
}

function publicNewsItem(item: NormalizedNewsItemRecord): NewsReadItem {
  return {
    id: item.id,
    providerId: item.providerId,
    providerItemId: item.providerItemId,
    title: item.title,
    content: item.content,
    source: item.source,
    publishedAt: item.publishedAt,
    crawledAt: item.crawledAt,
    relatedCoins: [...item.relatedCoins],
    url: item.url,
    ...(item.extraction === undefined ? {} : { extraction: item.extraction }),
    sentiment: null,
  };
}

function safeFailureReason(value: unknown): SafeNewsFailureReason | undefined {
  if (!value || typeof value !== "object") return undefined;
  const reason = (value as { reason?: unknown }).reason;
  return reason === "NOT_HTTPS"
    || reason === "NOT_ALLOWLISTED"
    || reason === "UNSAFE_DESTINATION"
    || reason === "REDIRECT_LIMIT"
    || reason === "TIMEOUT"
    || reason === "BODY_TOO_LARGE"
    || reason === "DNS_FAILURE"
    || reason === "HTTP_ERROR"
    || reason === "INVALID_RESPONSE"
    ? reason
    : undefined;
}

function importRejectionReason(value: unknown): Extract<SafeUrlImportState, { status: "REJECTED" }>["reason"] {
  const reason = safeFailureReason(value);
  if (reason === "NOT_HTTPS"
    || reason === "NOT_ALLOWLISTED"
    || reason === "UNSAFE_DESTINATION"
    || reason === "REDIRECT_LIMIT"
    || reason === "TIMEOUT"
    || reason === "BODY_TOO_LARGE") return reason;
  return "UNSAFE_DESTINATION";
}

function sourceKindForDocument(document: NewsProviderDocument): NewsSourceKind {
  return document.sourceKind;
}

function importedProviderItemId(value: unknown, canonicalUrl: string, index: number): string {
  if (typeof value === "string") {
    const candidate = value.trim();
    if (candidate && candidate.length <= 512 && !/^[a-z][a-z0-9+.-]*:/iu.test(candidate) && !candidate.startsWith("/")) {
      return candidate;
    }
  }
  const digest = createHash("sha256").update(`${canonicalUrl}\0${index}`, "utf8").digest("hex");
  return `import-${digest.slice(0, 32)}`;
}

function documentItem(
  value: NormalizedNewsItemRecord,
  providerId: string,
  document: NewsProviderDocument | undefined,
): NormalizedNewsItemRecord {
  const normalized = normalizeNewsItem(value, providerId);
  if (!document || normalized.extraction !== undefined) return normalized;
  return normalizeNewsItem({
    ...normalized,
    extraction: normalizeExtractionProvenance({
      sourceKind: sourceKindForDocument(document),
      canonicalUrl: document.canonicalUrl,
      normalizedContentHash: normalized.normalizedContentHash,
      extractedAt: document.extractedAt,
      normalizedRetainUntil: addDays(document.extractedAt, EXTERNAL_CONTENT_SAFETY_V1.normalizedRetentionDays),
    }, {
      canonicalUrl: document.canonicalUrl,
      normalizedContentHash: normalized.normalizedContentHash ?? "",
      extractedAt: document.extractedAt,
    }),
  }, providerId);
}

function safeTemplateValue(value: unknown, field = "template"): void {
  if (typeof value === "string") {
    if (/^(?:https?|ftp):\/\//iu.test(value) || /(?:password|secret|credential|cookie|authorization|api[_-]?key|token)/iu.test(field)) {
      throw new NewsApplicationError("INVALID_PROVIDER", "template contains a forbidden URL or secret");
    }
    return;
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    if (typeof value === "number" && !Number.isFinite(value)) throw new NewsApplicationError("INVALID_PROVIDER", "template contains a non-finite value");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => safeTemplateValue(entry, `${field}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) => safeTemplateValue(entry, `${field}.${key}`));
    return;
  }
  throw new NewsApplicationError("INVALID_PROVIDER", "template contains an unsupported value");
}

function cloneTemplate(template: ExtractionTemplateRecord): ExtractionTemplateRecord {
  return structuredClone(template);
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

  private recordExternalFailure(sourceId: string, reason: SafeNewsFailureReason): void {
    safeRecord(() => this.dependencies.observability.recordExternalContentFailure?.({ sourceId, reason }));
  }

  private async persistDocumentArtifacts(
    item: NormalizedNewsItemRecord,
    document: NewsProviderDocument | undefined,
  ): Promise<void> {
    if (!document) return;
    const collectedAt = canonicalTimestamp(document.extractedAt, "extractedAt");
    if (Buffer.byteLength(document.body, "utf8") > EXTERNAL_CONTENT_SAFETY_V1.maximumBodyBytes) {
      throw new NewsApplicationError("INVALID_PROVIDER", "provider document exceeds the News body limit");
    }
    if (item.extraction && this.dependencies.extractionProvenanceRepository) {
      const provenance: StoredNewsExtractionProvenance = {
        ...item.extraction,
        id: randomUUID(),
        newsId: item.id,
      };
      await safeRecordAsync(async () => {
        await this.dependencies.extractionProvenanceRepository!.insert(provenance);
      });
    }
    if (this.dependencies.rawHtmlRepository) {
      const artifact: NewsRawHtmlArtifact = {
        id: randomUUID(),
        newsId: item.id,
        body: document.body,
        collectedAt,
        purgeAfter: addDays(collectedAt, EXTERNAL_CONTENT_SAFETY_V1.rawHtmlRetentionDays),
      };
      await safeRecordAsync(async () => {
        await this.dependencies.rawHtmlRepository!.insert(artifact);
      });
    }
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
      let document: NewsProviderDocument | undefined;
      try {
        const request = {
          ...(input.relatedCoins === undefined ? {} : { relatedCoins: input.relatedCoins }),
          ...(input.publishedAfter === undefined ? {} : { publishedAfter: input.publishedAfter }),
          limit: input.limit,
        };
        if (provider.fetchDocument) {
          document = await provider.fetchDocument(request);
          if (!document || !Array.isArray(document.items)) throw new Error("provider document is invalid");
          if (typeof document.body !== "string"
            || Buffer.byteLength(document.body, "utf8") > EXTERNAL_CONTENT_SAFETY_V1.maximumBodyBytes) {
            throw new Error("provider document exceeds the News body limit");
          }
          values = document.items;
        } else {
          const fetched = await provider.fetch(request);
          if (!Array.isArray(fetched)) throw new Error("provider did not return an array");
          values = fetched;
        }
        result.fetchedCount += values.length;
      } catch {
        this.recordProviderFailure(providerId, "provider fetch failed");
        continue;
      }
      for (const value of values) {
        let item: NormalizedNewsItemRecord;
        try {
          item = documentItem(value, providerId, document);
        } catch (error) {
          result.rejectedCount += 1;
          this.recordProviderFailure(providerId, `malformed provider item rejected: ${error instanceof Error ? error.message : "unknown error"}`);
          continue;
        }
        if (input.publishedAfter !== undefined && Date.parse(item.publishedAt) < Date.parse(input.publishedAfter)) continue;
        if (input.relatedCoins !== undefined && !input.relatedCoins.some((coin) => item.relatedCoins.includes(coin))) continue;
        let stored: Awaited<ReturnType<NewsModuleDependencies["newsRepository"]["upsertByProviderIdentity"]>>;
        try {
          stored = await this.dependencies.newsRepository.upsertByProviderIdentity(item);
        } catch {
          result.rejectedCount += 1;
          this.recordProviderFailure(providerId, "News persistence rejected the item");
          continue;
        }
        if (!stored || typeof stored.inserted !== "boolean") {
          throw new NewsApplicationError("PERSISTENCE_UNAVAILABLE", "News repository returned an invalid upsert result");
        }
        const storedItem = assertNormalizedNewsItem(stored.item);
        if (!stored.inserted) {
          result.duplicateCount += 1;
          continue;
        }
        result.storedCount += 1;
        await this.persistDocumentArtifacts(storedItem, document);
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
      ...publicNewsItem(copy(item)),
      sentiment: await this.readSentiment(item),
    })));
    return {
      items: readItems,
      ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }),
    };
  }

  /**
   * Imports one URL through the injected backend-only safety adapter. The
   * request URL is never persisted; only the validated final canonical URL is.
   */
  public async importUrl(request: SafeUrlImportRequest): Promise<SafeUrlImportState> {
    if (!request || typeof request !== "object" || typeof request.url !== "string" || !request.url.trim()
      || typeof request.sourceId !== "string" || !request.sourceId.trim()) {
      return { status: "REJECTED", reason: "NOT_ALLOWLISTED" };
    }
    const safeFetcher = this.dependencies.safeUrlFetcher;
    const extractor = this.dependencies.urlImportExtractor;
    if (!safeFetcher || !extractor) {
      this.recordExternalFailure(request.sourceId, "NOT_ALLOWLISTED");
      return { status: "REJECTED", reason: "NOT_ALLOWLISTED" };
    }
    let fetched: Awaited<ReturnType<NonNullable<NewsModuleDependencies["safeUrlFetcher"]>["fetch"]>>;
    try {
      fetched = await safeFetcher.fetch({
        url: request.url,
        sourceId: request.sourceId,
        timeoutMs: EXTERNAL_CONTENT_SAFETY_V1.timeoutMs,
        maximumRedirects: EXTERNAL_CONTENT_SAFETY_V1.maximumRedirects,
        maximumBodyBytes: EXTERNAL_CONTENT_SAFETY_V1.maximumBodyBytes,
      });
    } catch (error) {
      const reason = importRejectionReason(error);
      this.recordExternalFailure(request.sourceId, reason);
      return { status: "REJECTED", reason };
    }
    let canonicalFetchedUrl: string;
    try {
      canonicalFetchedUrl = canonicalizeNewsUrl(fetched.canonicalUrl);
      const parsed = new URL(canonicalFetchedUrl);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("unsafe fetched URL");
    } catch {
      this.recordExternalFailure(request.sourceId, "UNSAFE_DESTINATION");
      return { status: "REJECTED", reason: "UNSAFE_DESTINATION" };
    }
    if (Buffer.byteLength(fetched.body, "utf8") > EXTERNAL_CONTENT_SAFETY_V1.maximumBodyBytes) {
      this.recordExternalFailure(request.sourceId, "BODY_TOO_LARGE");
      return { status: "REJECTED", reason: "BODY_TOO_LARGE" };
    }
    let document: NewsProviderDocument;
    try {
      document = await extractor.extract({
        request,
        canonicalUrl: canonicalFetchedUrl,
        body: fetched.body,
        contentType: fetched.contentType,
        redirects: fetched.redirects,
        extractedAt: this.dependencies.clock?.now() ?? new Date().toISOString(),
      });
      if (!document || !Array.isArray(document.items)) throw new Error("import extractor returned an invalid document");
    } catch {
      safeRecord(() => this.dependencies.observability.recordExtractionFailure?.({ sourceId: request.sourceId }));
      return { status: "REJECTED", reason: "NOT_ALLOWLISTED" };
    }

    let providerId: string;
    try {
      providerId = canonicalProviderId(request.sourceId);
    } catch {
      return { status: "REJECTED", reason: "NOT_ALLOWLISTED" };
    }
    let importedId: string | undefined;
    for (const [index, value] of document.items.entries()) {
      try {
        const raw = value as NormalizedNewsItemRecord;
        const safeProviderItemId = importedProviderItemId(raw.providerItemId, canonicalFetchedUrl, index);
        const normalized = normalizeNewsItem({
          ...raw,
          id: undefined,
          providerId,
          providerItemId: safeProviderItemId,
          url: canonicalFetchedUrl,
        }, providerId);
        const importedTemplate = normalized.extraction?.template;
        const withProvenance = normalizeNewsItem({
          ...normalized,
          extraction: normalizeExtractionProvenance({
            sourceKind: "ALLOWLISTED_URL_IMPORT",
            canonicalUrl: canonicalFetchedUrl,
            normalizedContentHash: normalized.normalizedContentHash,
            extractedAt: document.extractedAt,
            ...(importedTemplate === undefined ? {} : { template: importedTemplate }),
            normalizedRetainUntil: addDays(document.extractedAt, EXTERNAL_CONTENT_SAFETY_V1.normalizedRetentionDays),
          }, {
            canonicalUrl: canonicalFetchedUrl,
            normalizedContentHash: normalized.normalizedContentHash ?? "",
            extractedAt: document.extractedAt,
          }),
        }, providerId);
        const stored = await this.dependencies.newsRepository.upsertByProviderIdentity(withProvenance);
        const storedItem = assertNormalizedNewsItem(stored.item);
        importedId ??= storedItem.id;
        if (stored.inserted) {
          await this.persistDocumentArtifacts(storedItem, {
            ...document,
            sourceKind: "ALLOWLISTED_URL_IMPORT",
            canonicalUrl: canonicalFetchedUrl,
            body: fetched.body,
            contentType: fetched.contentType,
            redirects: fetched.redirects,
          });
          await this.requestSentiment(storedItem);
        }
      } catch {
        safeRecord(() => this.dependencies.observability.recordExtractionFailure?.({ sourceId: request.sourceId }));
      }
    }
    return {
      status: "FETCHED",
      canonicalUrl: canonicalFetchedUrl,
      ...(importedId === undefined ? {} : { newsItemId: importedId }),
    };
  }

  public safeUrlImport(request: SafeUrlImportRequest): Promise<SafeUrlImportState> {
    return this.importUrl(request);
  }

  public importSafeUrl(request: SafeUrlImportRequest): Promise<SafeUrlImportState> {
    return this.importUrl(request);
  }

  public async proposeTemplate(input: {
    sourceId: string;
    configuration: Readonly<Record<string, unknown>>;
    diff?: Readonly<Record<string, string | number | boolean>>;
    metrics?: Readonly<Record<string, number>>;
    supersedesTemplateId?: string;
    createdAt?: string;
    id?: string;
  }): Promise<ExtractionTemplateRecord> {
    const repository = this.dependencies.templateRepository as (typeof this.dependencies.templateRepository & {
      nextVersion?: (sourceId: string) => Promise<number>;
      readById?: (templateId: string) => Promise<ExtractionTemplateRecord | undefined>;
    }) | undefined;
    if (!repository) throw new NewsApplicationError("PERSISTENCE_UNAVAILABLE", "extraction template repository is not configured");
    if (!input || typeof input.sourceId !== "string" || !input.sourceId.trim()) {
      throw new NewsApplicationError("INVALID_PROVIDER", "template source is required");
    }
    if (!input.configuration || typeof input.configuration !== "object" || Array.isArray(input.configuration)) {
      throw new NewsApplicationError("INVALID_PROVIDER", "template configuration must be an object");
    }
    safeTemplateValue(input.configuration, "configuration");
    if (input.diff !== undefined) safeTemplateValue(input.diff, "diff");
    if (input.metrics !== undefined) {
      safeTemplateValue(input.metrics, "metrics");
      if (Object.values(input.metrics).some((metric) => typeof metric !== "number" || !Number.isFinite(metric))) {
        throw new NewsApplicationError("INVALID_PROVIDER", "template metrics must be finite numbers");
      }
    }
    const active = await repository.readActive(input.sourceId);
    if (input.supersedesTemplateId !== undefined && active?.id !== input.supersedesTemplateId) {
      throw new NewsApplicationError("INVALID_PROVIDER", "template refinement base is not the active approved version");
    }
    const createdAt = canonicalTimestamp(input.createdAt ?? this.dependencies.clock?.now() ?? new Date().toISOString(), "createdAt");
    const version = repository.nextVersion
      ? await repository.nextVersion(input.sourceId)
      : (active?.version ?? 0) + 1;
    const template: ExtractionTemplateRecord = {
      id: input.id?.trim() || randomUUID(),
      sourceId: input.sourceId.trim(),
      version,
      status: "DRAFT",
      configuration: structuredClone(input.configuration),
      ...(active === undefined ? {} : { supersedesTemplateId: active.id }),
      diff: input.diff === undefined ? {} : structuredClone(input.diff),
      metrics: input.metrics === undefined ? {} : structuredClone(input.metrics),
      createdAt,
      retainUntil: addDays(createdAt, EXTERNAL_CONTENT_SAFETY_V1.normalizedRetentionDays),
    };
    return cloneTemplate(await repository.insertDraft(template));
  }

  public selfHealTemplate(input: Omit<Parameters<NewsApplicationService["proposeTemplate"]>[0], "supersedesTemplateId">): Promise<ExtractionTemplateRecord> {
    return this.proposeTemplate(input);
  }

  public refineExtractionTemplate(input: Parameters<NewsApplicationService["proposeTemplate"]>[0]): Promise<ExtractionTemplateRecord> {
    return this.proposeTemplate(input);
  }

  public async approveTemplate(templateId: string): Promise<ExtractionTemplateRecord | undefined> {
    if (!this.dependencies.templateRepository) throw new NewsApplicationError("PERSISTENCE_UNAVAILABLE", "extraction template repository is not configured");
    return this.dependencies.templateRepository.approve(templateId).then((template) => template ? cloneTemplate(template) : undefined);
  }

  public async rollbackTemplate(sourceId: string, templateId: string): Promise<ExtractionTemplateRecord | undefined> {
    const repository = this.dependencies.templateRepository as (typeof this.dependencies.templateRepository & {
      rollback?: (sourceId: string, templateId: string) => Promise<ExtractionTemplateRecord | undefined>;
    }) | undefined;
    if (!repository?.rollback) throw new NewsApplicationError("PERSISTENCE_UNAVAILABLE", "template rollback is not configured");
    return repository.rollback(sourceId, templateId).then((template) => template ? cloneTemplate(template) : undefined);
  }

  public async purgeRetention(now: string): Promise<{
    normalizedNewsItems: number;
    rawHtmlArtifacts: number;
    extractionProvenance: number;
    templates: number;
  }> {
    const rawHtmlArtifacts = await this.dependencies.rawHtmlRepository?.purgeExpired(now) ?? 0;
    const extractionProvenance = await this.dependencies.extractionProvenanceRepository?.purgeExpired(now) ?? 0;
    const protectedTemplateIds = await this.dependencies.extractionProvenanceRepository?.readLiveTemplateIds?.(now) ?? [];
    const templates = await this.dependencies.templateRepository?.purgeExpired(now, protectedTemplateIds) ?? 0;
    const normalizedNewsItems = await this.dependencies.newsRepository.purgeExpired?.(now) ?? 0;
    return { normalizedNewsItems, rawHtmlArtifacts, extractionProvenance, templates };
  }

  public purgeExpired(now: string): Promise<{
    normalizedNewsItems: number;
    rawHtmlArtifacts: number;
    extractionProvenance: number;
    templates: number;
  }> {
    return this.purgeRetention(now);
  }
}
