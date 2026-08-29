import type {
  Clock,
  SentimentModuleDependencies,
  SentimentObservability,
  SentimentResultRepository,
  SentimentStoredResult,
} from "./ports";
import { createLexiconV1Provider } from "./lexicon";

function copy(result: SentimentStoredResult): SentimentStoredResult {
  return { ...result };
}

export class InMemorySentimentResultRepository implements SentimentResultRepository {
  private readonly results: Array<{ result: SentimentStoredResult; sequence: number }> = [];
  private sequence = 0;

  async insert(result: SentimentStoredResult): Promise<SentimentStoredResult> {
    const existing = this.results.find(
      (entry) =>
        entry.result.newsId === result.newsId &&
        entry.result.modelName === result.modelName &&
        entry.result.modelVersion === result.modelVersion,
    );
    if (existing) return copy(existing.result);
    this.results.push({ result: copy(result), sequence: this.sequence++ });
    return copy(result);
  }

  async readLatestForNews(newsId: string): Promise<SentimentStoredResult | undefined> {
    const matching = this.results
      .filter((entry) => entry.result.newsId === newsId)
      .sort(
        (left, right) =>
          right.result.analyzedAt.localeCompare(left.result.analyzedAt) || right.sequence - left.sequence,
      );
    return matching[0] ? copy(matching[0].result) : undefined;
  }

  get size(): number {
    return this.results.length;
  }
}

const defaultClock: Clock = { now: () => new Date().toISOString() };
const defaultObservability: SentimentObservability = { recordInferenceFailure: () => undefined };

export function createInMemorySentimentDependencies(
  overrides: Partial<Pick<SentimentModuleDependencies, "provider" | "clock" | "observability">> = {},
): SentimentModuleDependencies {
  return {
    provider: overrides.provider ?? createLexiconV1Provider(),
    resultRepository: new InMemorySentimentResultRepository(),
    clock: overrides.clock ?? defaultClock,
    observability: overrides.observability ?? defaultObservability,
  };
}

