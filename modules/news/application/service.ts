import type { NewsReadItem, NewsSentimentPort } from "../domain/contracts";
import { NewsException } from "../domain/errors";
import { validateNewsItem } from "../domain/rules";
import type { NewsItem } from "../domain/contracts";
import type { NewsModuleDependencies, NewsRepository } from "./ports";

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

export interface NewsModuleRuntime {
  collect(): Promise<void>;
  readNews(): Promise<NewsReadItem[]>;
}

export function createInMemoryNewsDependencies(): NewsModuleDependencies {
  return { providers: [], newsRepository: new MemoryNewsRepository(), sentiment: unavailableSentiment, observability: { recordSentimentFailure: () => undefined } };
}

export function createNewsModule(dependencies: InternalDependencies = createInMemoryNewsDependencies()): NewsModuleRuntime {
  const defaults = createInMemoryNewsDependencies();
  const providers = dependencies.providers ?? defaults.providers;
  const newsRepository = dependencies.newsRepository ?? defaults.newsRepository;
  const sentiment = dependencies.sentiment ?? defaults.sentiment;
  const observability = dependencies.observability ?? defaults.observability;

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
      await sentiment.analyze(toSentimentInput(persisted));
    } catch (error) {
      observability?.recordSentimentFailure({ newsId: persisted.id, reason: sentimentFailureReason(error) });
    }
  };

  return {
    async collect() {
      for (const provider of providers) {
        let items: NewsItem[];
        try {
          items = await provider.fetch();
        } catch {
          throw new NewsException("PROVIDER_UNAVAILABLE", `News provider ${provider.name} is unavailable.`);
        }
        for (const item of items) await persistAndAnalyze(item);
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
          observability?.recordSentimentFailure({ newsId: item.id, reason: sentimentFailureReason(error) });
          return item;
        }
      }));
    },
  };
}
