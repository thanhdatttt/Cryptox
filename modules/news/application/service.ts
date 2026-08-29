import type { NewsReadItem, NewsSentimentPort } from "../domain/contracts";
import { NewsException } from "../domain/errors";
import { validateNewsItem } from "../domain/rules";
import type { NewsItem } from "../domain/contracts";
import type { NewsModuleDependencies, NewsObservability, NewsRepository } from "./ports";

type InternalDependencies = Partial<NewsModuleDependencies>;

class MemoryNewsRepository implements NewsRepository {
  private readonly rowsByUrl = new Map<string, NewsItem>();

  async insert(item: NewsItem): Promise<NewsItem> {
    const existing = this.rowsByUrl.get(item.url);
    if (existing) return { ...existing, relatedCoins: [...existing.relatedCoins] };
    this.rowsByUrl.set(item.url, { ...item, relatedCoins: [...item.relatedCoins] });
    return { ...item, relatedCoins: [...item.relatedCoins] };
  }

  async readAll(): Promise<NewsItem[]> {
    return [...this.rowsByUrl.values()].map((item) => ({ ...item, relatedCoins: [...item.relatedCoins] }));
  }
}

const unavailableSentiment: NewsSentimentPort = {
  analyze: async () => { throw new Error("SENTIMENT_NOT_CONFIGURED"); },
  readLatestForNews: async () => undefined,
};

const sentimentFailureReason = (error: unknown): "TIMEOUT" | "INFERENCE_ERROR" => /timeout/i.test(error instanceof Error ? `${error.name} ${error.message}` : String(error)) ? "TIMEOUT" : "INFERENCE_ERROR";
const toSentimentInput = (item: NewsItem) => ({ newsId: item.id, title: item.title, content: item.content, source: item.source, publishedAt: item.publishedAt, relatedCoins: [...item.relatedCoins] });

const providerFailureReason = (error: unknown): "TIMEOUT" | "ERROR" => /timeout|abort/i.test(error instanceof Error ? `${error.name} ${error.message}` : String(error)) ? "TIMEOUT" : "ERROR";

const defaultObservability = (): NewsObservability => ({
  recordProviderFailure: ({ providerName, stage, reason }) => {
    console.warn(`[news] provider failure: ${providerName} ${stage} ${reason}`);
  },
  recordSentimentFailure: ({ newsId, reason }) => {
    console.warn(`[news] sentiment failure: ${newsId} ${reason}`);
  },
});

const observeProviderFailure = (observability: NewsObservability | undefined, input: Parameters<NonNullable<NewsObservability["recordProviderFailure"]>>[0]): void => {
  try { observability?.recordProviderFailure?.(input); } catch { /* Observability must not affect collection. */ }
};

const observeSentimentFailure = (observability: NewsObservability | undefined, input: Parameters<NonNullable<NewsObservability["recordSentimentFailure"]>>[0]): void => {
  try { observability?.recordSentimentFailure?.(input); } catch { /* Observability must not affect collection. */ }
};

export interface NewsModuleRuntime {
  collect(): Promise<void>;
  readNews(): Promise<NewsReadItem[]>;
}

export function createInMemoryNewsDependencies(): NewsModuleDependencies {
  return { providers: [], newsRepository: new MemoryNewsRepository(), sentiment: unavailableSentiment };
}

export function createNewsModule(dependencies: InternalDependencies = createInMemoryNewsDependencies()): NewsModuleRuntime {
  const defaults = createInMemoryNewsDependencies();
  const providers = dependencies.providers ?? defaults.providers;
  const newsRepository = dependencies.newsRepository ?? defaults.newsRepository;
  const sentiment = dependencies.sentiment ?? defaults.sentiment;
  const observability = dependencies.observability ?? defaultObservability();

  const persistAndAnalyze = async (rawItem: NewsItem): Promise<void> => {
    const item = validateNewsItem(rawItem);
    let persisted: NewsItem;
    try {
      persisted = await newsRepository.insert(item);
    } catch (error) {
      if (error instanceof NewsException) throw error;
      throw new NewsException("PERSISTENCE_FAILED", "News item could not be persisted.");
    }
    try {
      await sentiment.analyze(toSentimentInput(validateNewsItem(persisted)));
    } catch (error) {
      observeSentimentFailure(observability, { newsId: persisted.id, reason: sentimentFailureReason(error) });
    }
  };

  return {
    async collect() {
      for (const provider of providers) {
        let items: unknown;
        try {
          items = await provider.fetch();
        } catch (error) {
          observeProviderFailure(observability, { providerName: provider.name, stage: "FETCH", reason: providerFailureReason(error) });
          continue;
        }
        if (!Array.isArray(items)) {
          observeProviderFailure(observability, { providerName: provider.name, stage: "SCHEMA", reason: "INVALID_OUTPUT" });
          continue;
        }
        for (const item of items) {
          try {
            await persistAndAnalyze(item as NewsItem);
          } catch (error) {
            const stage = error instanceof NewsException && error.code === "INVALID_NEWS_ITEM" ? "VALIDATION" : "PERSISTENCE";
            observeProviderFailure(observability, { providerName: provider.name, stage, reason: "ERROR" });
          }
        }
      }
    },

    async readNews() {
      const items = (await newsRepository.readAll()).map(validateNewsItem)
        .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt) || left.id.localeCompare(right.id));
      return Promise.all(items.map(async (item) => {
        try {
          const sentimentResult = await sentiment.readLatestForNews(item.id);
          return sentimentResult ? { ...item, sentiment: sentimentResult } : item;
        } catch (error) {
          observeSentimentFailure(observability, { newsId: item.id, reason: sentimentFailureReason(error) });
          return item;
        }
      }));
    },
  };
}
