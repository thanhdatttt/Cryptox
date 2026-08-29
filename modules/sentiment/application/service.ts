import type {
  SentimentAnalysisInput,
  SentimentAnalysisService,
  SentimentLabel,
  SentimentModuleDependencies,
  SentimentStoredResult,
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

  return { analyze, readLatestForNews };
}
