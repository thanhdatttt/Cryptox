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

import { createHash } from "node:crypto";
import { createRssFeedProvider } from "../infrastructure/coindesk-rss-provider";
import { createCrawlerNewsProvider } from "../infrastructure/crawler-provider";

export interface NewsCollectOptions {
  sourceType?: string;
  sources?: Array<{ name: string; url: string; type: string }>;
  html?: string;
  coin?: string;
}

export interface NewsModuleRuntime {
  collect(options?: NewsCollectOptions): Promise<void>;
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
  const interpreter = dependencies.interpreter;
  const crawlerLimits = dependencies.crawlerLimits;

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

  const parseHtmlContent = (html: string, targetCoin?: string): NewsItem[] => {
    const titleMatch = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html) ?? /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "Uploaded HTML News Document";
    const bodyMatch = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html) ?? /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html);
    const rawContent = (bodyMatch ? bodyMatch[1] : html).replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!rawTitle || !rawContent) return [];

    const textToScan = `${rawTitle} ${rawContent}`.toUpperCase();
    const coins: string[] = [];
    if (targetCoin && targetCoin !== "ALL" && !coins.includes(targetCoin.toUpperCase())) {
      coins.push(targetCoin.toUpperCase());
    }
    for (const c of ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE"]) {
      if (textToScan.includes(c) && !coins.includes(c)) coins.push(c);
    }
    if (coins.length === 0) coins.push("BTC");

    const hash = createHash("sha256").update(rawTitle + rawContent.slice(0, 100), "utf8").digest("hex");
    const canonicalUrl = `https://local.html-upload.test/articles/${hash.slice(0, 16)}`;
    const now = new Date().toISOString();

    try {
      return [validateNewsItem({
        id: hash.slice(0, 24),
        title: rawTitle.slice(0, 500),
        content: rawContent.slice(0, 5000),
        source: "HTML_UPLOAD",
        publishedAt: now,
        crawledAt: now,
        relatedCoins: coins,
        url: canonicalUrl,
      })];
    } catch {
      return [];
    }
  };

  const scrapeWebsiteArticles = async (url: string, sourceName: string, targetCoin?: string): Promise<NewsItem[]> => {
    try {
      const response = await globalThis.fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (!response.ok) return [];
      const html = await response.text();
      const origin = new URL(url).origin;
      const now = new Date().toISOString();
      const results: NewsItem[] = [];

      const articleBlocks = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/gi) || [];
      const blocksToScan = articleBlocks.length > 0 ? articleBlocks : (html.match(/<(?:div|section)\b[^>]*(?:card|article|news|post|item)[^>]*>[\s\S]*?<\/(?:div|section)>/gi) || []).slice(0, 20);

      for (const block of blocksToScan.slice(0, 15)) {
        const titleMatch = block.match(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/i);
        const linkMatch = block.match(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i);
        const descMatch = block.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);

        if (titleMatch && linkMatch) {
          const rawTitle = titleMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          const rawDesc = descMatch ? descMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : rawTitle;
          let rawHref = linkMatch[1].trim();
          if (rawHref.startsWith("/")) rawHref = origin + rawHref;

          if (rawTitle.length >= 10 && rawHref.startsWith("http") && !results.some((r) => r.url === rawHref)) {
            const textToScan = `${rawTitle} ${rawDesc}`.toUpperCase();
            const coins: string[] = [];
            if (targetCoin && targetCoin !== "ALL" && !coins.includes(targetCoin.toUpperCase())) {
              coins.push(targetCoin.toUpperCase());
            }
            for (const c of ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE"]) {
              if (textToScan.includes(c) && !coins.includes(c)) coins.push(c);
            }
            if (coins.length === 0) coins.push("BTC");

            const id = createHash("sha256").update(rawHref, "utf8").digest("hex").slice(0, 24);
            try {
              results.push(validateNewsItem({
                id,
                title: rawTitle.slice(0, 500),
                content: rawDesc.slice(0, 5000),
                source: sourceName,
                publishedAt: now,
                crawledAt: now,
                relatedCoins: coins,
                url: rawHref,
              }));
            } catch {
              // ignore invalid items
            }
          }
        }
      }
      return results;
    } catch {
      return [];
    }
  };

  return {
    async collect(options?: NewsCollectOptions) {
      // 1. If HTML is directly supplied
      if (options?.html && options.html.trim().length > 0) {
        const items = parseHtmlContent(options.html, options.coin);
        for (const item of items) {
          try {
            await persistAndAnalyze(item);
          } catch (error) {
            const stage = error instanceof NewsException && error.code === "INVALID_NEWS_ITEM" ? "VALIDATION" : "PERSISTENCE";
            observeProviderFailure(observability, { providerName: "HTML_UPLOAD", stage, reason: "ERROR" });
          }
        }
        return;
      }

      // 2. If specific sources are passed from the frontend
      if (options?.sources && options.sources.length > 0) {
        for (const src of options.sources) {
          if (!src.url || !src.url.startsWith("http")) continue;
          const sourceName = src.name.replace(/\s+RSS$/i, "").replace(/\s+News$/i, "").trim().toUpperCase();

          if (src.type === "WEBSITE") {
            let websiteItems: NewsItem[] = [];

            // 1. Try LLM crawler if interpreter is configured
            if (interpreter) {
              try {
                const crawlerProvider = createCrawlerNewsProvider({
                  sourceUrls: [src.url],
                  interpreter,
                  name: sourceName,
                  limits: crawlerLimits,
                  observability,
                });
                const fetched = await crawlerProvider.fetch();
                if (Array.isArray(fetched) && fetched.length > 0) {
                  websiteItems = fetched;
                }
              } catch (error) {
                observeProviderFailure(observability, { providerName: sourceName, stage: "MODEL", reason: providerFailureReason(error) });
              }
            }

            // 2. Fallback to direct HTML scraper if LLM had 0 results or failed/rate-limited
            if (websiteItems.length === 0) {
              try {
                const scraped = await scrapeWebsiteArticles(src.url, sourceName, options.coin);
                if (scraped.length > 0) {
                  websiteItems = scraped;
                }
              } catch (error) {
                observeProviderFailure(observability, { providerName: sourceName, stage: "FETCH", reason: providerFailureReason(error) });
              }
            }

            // 3. Persist and analyze all discovered items
            for (const rawItem of websiteItems) {
              const item = { ...rawItem };
              if (options.coin && options.coin !== "ALL" && !item.relatedCoins.includes(options.coin.toUpperCase())) {
                item.relatedCoins = [...item.relatedCoins, options.coin.toUpperCase()];
              }
              try {
                await persistAndAnalyze(item);
              } catch {
                // ignore invalid or duplicated
              }
            }
            continue;
          }

          // RSS type — use the generic RSS/Atom XML parser
          try {
            const provider = createRssFeedProvider({
              url: src.url,
              sourceName,
              observability,
            });
            const items = await provider.fetch();
            if (Array.isArray(items)) {
              for (const rawItem of items) {
                const item = { ...rawItem };
                if (options.coin && options.coin !== "ALL" && !item.relatedCoins.includes(options.coin.toUpperCase())) {
                  item.relatedCoins = [...item.relatedCoins, options.coin.toUpperCase()];
                }
                try {
                  await persistAndAnalyze(item);
                } catch {
                  // ignore invalid or duplicated
                }
              }
            }
          } catch (error) {
            observeProviderFailure(observability, { providerName: sourceName, stage: "FETCH", reason: providerFailureReason(error) });
          }
        }
        return;
      }

      // 3. Default fallback providers
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
