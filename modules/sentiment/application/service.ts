import type {
  SentimentAnalysisInput,
  SentimentAnalysisService,
  SentimentLabel,
  SentimentModuleDependencies,
  SentimentStoredResult,
  NewsExtractionProvenanceInput,
  SentimentNewsProvenanceJoin,
} from "./ports";

const LABELS = new Set<SentimentLabel>(["POSITIVE", "NEUTRAL", "NEGATIVE"]);

interface ValidProviderResult {
  label: SentimentLabel;
  score: number;
  providerId: string;
  analysisProfileId: string;
  modelName: string;
  modelVersion: string;
}

export class SentimentApplicationError extends Error {
  constructor(readonly code: string, message = code) {
    super(message);
    this.name = "SentimentApplicationError";
  }
}

function recordFromUnknown(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new SentimentApplicationError("INVALID_SENTIMENT_INPUT");
  }
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new SentimentApplicationError("INVALID_SENTIMENT_INPUT", `${field} is required`);
  }
  return value.trim();
}

function validTimestamp(value: unknown, field: string): string {
  const text = nonEmptyString(value, field);
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) {
    throw new SentimentApplicationError("INVALID_SENTIMENT_INPUT", `${field} must be an ISO timestamp`);
  }
  return new Date(parsed).toISOString();
}

function validateInput(value: unknown): SentimentAnalysisInput {
  const input = recordFromUnknown(value);
  if (!Array.isArray(input.relatedCoins)) {
    throw new SentimentApplicationError("INVALID_SENTIMENT_INPUT", "relatedCoins must be an array");
  }
  const relatedCoins = input.relatedCoins.map((coin, index) => nonEmptyString(coin, `relatedCoins[${index}]`));
  return {
    newsId: nonEmptyString(input.newsId, "newsId"),
    title: nonEmptyString(input.title, "title"),
    content: nonEmptyString(input.content, "content"),
    source: nonEmptyString(input.source, "source"),
    publishedAt: validTimestamp(input.publishedAt, "publishedAt"),
    relatedCoins,
  };
}

function validProviderResult(value: unknown, providerId: string): ValidProviderResult | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const result = value as Record<string, unknown>;
  if (
    typeof result.label !== "string" ||
    !LABELS.has(result.label as SentimentLabel) ||
    typeof result.score !== "number" ||
    !Number.isFinite(result.score) ||
    result.score < -1 ||
    result.score > 1 ||
    result.providerId !== providerId ||
    typeof result.analysisProfileId !== "string" ||
    !result.analysisProfileId.trim() ||
    typeof result.modelName !== "string" ||
    !result.modelName.trim() ||
    typeof result.modelVersion !== "string" ||
    !result.modelVersion.trim()
  ) {
    return undefined;
  }
  return {
    label: result.label as SentimentLabel,
    score: result.score,
    providerId: result.providerId,
    analysisProfileId: result.analysisProfileId,
    modelName: result.modelName,
    modelVersion: result.modelVersion,
  };
}

function providerFailureReason(error: unknown): "TIMEOUT" | "INFERENCE_ERROR" {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { code?: unknown; name?: unknown };
    if (candidate.code === "TIMEOUT" || candidate.name === "TimeoutError") return "TIMEOUT";
  }
  return "INFERENCE_ERROR";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function validNewsExtractionProvenance(value: unknown): NewsExtractionProvenanceInput | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object") throw new SentimentApplicationError("INVALID_PROVENANCE");
  const input = value as Record<string, unknown>;
  if (input.sourceKind !== "CONFIGURED_WEBSITE"
    && input.sourceKind !== "RSS"
    && input.sourceKind !== "HTML"
    && input.sourceKind !== "ALLOWLISTED_URL_IMPORT") {
    throw new SentimentApplicationError("INVALID_PROVENANCE");
  }
  const canonicalUrl = nonEmptyString(input.canonicalUrl, "canonicalUrl");
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(canonicalUrl);
  } catch {
    throw new SentimentApplicationError("INVALID_PROVENANCE");
  }
  if (parsedUrl.protocol !== "https:" || parsedUrl.username || parsedUrl.password) {
    throw new SentimentApplicationError("INVALID_PROVENANCE");
  }
  const normalizedContentHash = nonEmptyString(input.normalizedContentHash, "normalizedContentHash").toLowerCase();
  if (!/^[0-9a-f]{64}$/u.test(normalizedContentHash)) throw new SentimentApplicationError("INVALID_PROVENANCE");
  const extractedAt = validTimestamp(input.extractedAt, "extractedAt");
  const templateVersion = input.templateVersion;
  if (templateVersion !== undefined && (!Number.isSafeInteger(templateVersion) || (templateVersion as number) < 1)) {
    throw new SentimentApplicationError("INVALID_PROVENANCE");
  }
  return {
    sourceKind: input.sourceKind,
    canonicalUrl: parsedUrl.toString(),
    normalizedContentHash,
    ...(templateVersion === undefined ? {} : { templateVersion: templateVersion as number }),
    extractedAt,
  };
}

function cloneResult(result: SentimentStoredResult): SentimentStoredResult {
  return { ...result };
}

export function joinNewsSentimentProvenance(
  result: SentimentStoredResult | undefined,
  provenance?: NewsExtractionProvenanceInput,
): SentimentNewsProvenanceJoin | undefined {
  if (!result) return undefined;
  const safeResult = cloneResult(result);
  const safeProvenance = validNewsExtractionProvenance(provenance);
  return {
    newsId: safeResult.newsId,
    result: safeResult,
    ...(safeProvenance === undefined ? {} : { newsExtraction: safeProvenance }),
  };
}

function observeFailure(
  dependencies: SentimentModuleDependencies,
  input: SentimentAnalysisInput,
  reason: "TIMEOUT" | "INFERENCE_ERROR" | "INVALID_RESULT",
): void {
  try {
    dependencies.observability.recordInferenceFailure({ newsId: input.newsId, reason });
  } catch {
    // Observability must not replace the original analysis failure.
  }
}

export interface SentimentApplication extends SentimentAnalysisService {
  readLatestForNews(newsId: string): Promise<SentimentStoredResult | undefined>;
  readLatestForNewsWithProvenance(
    newsId: string,
    provenance?: NewsExtractionProvenanceInput,
  ): Promise<SentimentNewsProvenanceJoin | undefined>;
  readAvailability(newsId: string): Promise<
    | { state: "AVAILABLE"; result: SentimentStoredResult }
    | { state: "MISSING" }
    | { state: "DEGRADED"; reason: "TIMEOUT" | "INFERENCE_ERROR" | "INVALID_RESULT" }
  >;
}

export function createSentimentApplication(
  dependencies: SentimentModuleDependencies,
): SentimentApplication {
  const analyze = async (value: unknown): Promise<SentimentStoredResult> => {
    const input = validateInput(value);
    let providerResult: unknown;
    try {
      providerResult = await dependencies.provider.analyze(input);
    } catch (error) {
      const reason = providerFailureReason(error);
      observeFailure(dependencies, input, reason);
      throw new SentimentApplicationError(reason, errorMessage(error));
    }

    const validResult = validProviderResult(providerResult, dependencies.provider.id);
    if (!validResult) {
      observeFailure(dependencies, input, "INVALID_RESULT");
      throw new SentimentApplicationError("INVALID_RESULT", "sentiment provider returned an invalid result");
    }

    const analyzedAt = validTimestamp(dependencies.clock.now(), "analyzedAt");
    const result: SentimentStoredResult = {
      ...validResult,
      newsId: input.newsId,
      analyzedAt,
    };
    return dependencies.resultRepository.insert(Object.freeze(result));
  };

  const readLatestForNews = async (newsId: string): Promise<SentimentStoredResult | undefined> =>
    dependencies.resultRepository.readLatestForNews(nonEmptyString(newsId, "newsId"));

  const readLatestForNewsWithProvenance = async (
    newsId: string,
    provenance?: NewsExtractionProvenanceInput,
  ): Promise<SentimentNewsProvenanceJoin | undefined> => {
    const normalizedNewsId = nonEmptyString(newsId, "newsId");
    const result = await readLatestForNews(normalizedNewsId);
    if (result && result.newsId !== normalizedNewsId) throw new SentimentApplicationError("INVALID_RESULT");
    return joinNewsSentimentProvenance(result, provenance);
  };

  const readAvailability = async (newsId: string): Promise<Awaited<ReturnType<SentimentApplication["readAvailability"]>>> => {
    try {
      const result = await readLatestForNews(newsId);
      return result ? { state: "AVAILABLE", result } : { state: "MISSING" };
    } catch (error) {
      const input = { newsId: nonEmptyString(newsId, "newsId") } as SentimentAnalysisInput;
      observeFailure(dependencies, input, "INFERENCE_ERROR");
      return { state: "DEGRADED", reason: "INFERENCE_ERROR" };
    }
  };

  return { analyze, readLatestForNews, readLatestForNewsWithProvenance, readAvailability };
}
