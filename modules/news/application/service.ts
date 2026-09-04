import type { NewsReadItem, NewsSentimentPort } from "../domain/contracts";
import { NewsException } from "../domain/errors";
import { validateNewsItem } from "../domain/rules";
import type { NewsItem } from "../domain/contracts";
import type { NewsModuleDependencies, NewsObservability, NewsRepository } from "./ports";

type InternalDependencies = Partial<NewsModuleDependencies>;

class MemoryNewsRepository implements NewsRepository {
  private readonly rows = new Map<string, { item: NewsItem; userId?: string }>();

  async insert(item: NewsItem, userId?: string): Promise<NewsItem> {
    const key = `${userId ?? ""}|${item.url}`;
    const existing = this.rows.get(key);
    if (existing) return { ...existing.item, relatedCoins: [...existing.item.relatedCoins] };
    this.rows.set(key, { item: { ...item, relatedCoins: [...item.relatedCoins] }, userId });
    return { ...item, relatedCoins: [...item.relatedCoins] };
  }

  async readAll(userId?: string): Promise<NewsItem[]> {
    return [...this.rows.values()]
      .filter((record) => (userId ? record.userId === userId : true))
      .map((record) => ({ ...record.item, relatedCoins: [...record.item.relatedCoins] }));
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
import type { ExtractionTemplate } from "../domain/template-contracts";
import { InMemoryNewsTemplateRepository, type NewsTemplateRepository } from "../infrastructure/template-repository";
import { createLlmTemplateGenerator, type NewsTemplateGenerator } from "../infrastructure/llm-template-generator";
import { extractWithTemplate, validateExtractedItems } from "../infrastructure/template-engine";

export interface NewsCollectOptions {
  sourceType?: string;
  sources?: Array<{ name: string; url: string; type: string }>;
  html?: string;
  coin?: string;
  autoHealing?: boolean;
}

export interface NewsModuleRuntime {
  collect(options?: NewsCollectOptions, userId?: string): Promise<void>;
  readNews(userId?: string): Promise<NewsReadItem[]>;
  getTemplates(): Promise<ExtractionTemplate[]>;
  applyTemplate(domain: string, version: string): Promise<ExtractionTemplate>;
  healTemplate(domain: string, html?: string, autoApply?: boolean): Promise<ExtractionTemplate>;
}

export function createInMemoryNewsDependencies(): NewsModuleDependencies {
  return {
    providers: [],
    newsRepository: new MemoryNewsRepository(),
    sentiment: unavailableSentiment,
    templateRepository: new InMemoryNewsTemplateRepository(),
    templateGenerator: createLlmTemplateGenerator(),
  };
}

export function createNewsModule(dependencies: InternalDependencies = createInMemoryNewsDependencies()): NewsModuleRuntime {
  const defaults = createInMemoryNewsDependencies();
  const providers = dependencies.providers ?? defaults.providers;
  const newsRepository = dependencies.newsRepository ?? defaults.newsRepository;
  const sentiment = dependencies.sentiment ?? defaults.sentiment;
  const observability = dependencies.observability ?? defaultObservability();
  const interpreter = dependencies.interpreter;
  const crawlerLimits = dependencies.crawlerLimits;

  const persistAndAnalyze = async (rawItem: NewsItem, userId?: string): Promise<void> => {
    const item = validateNewsItem(rawItem);
    let persisted: NewsItem;
    try {
      persisted = await newsRepository.insert(item, userId);
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
      const seenUrls = new Set<string>();

      const articleBlocks = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/gi) || [];
      const divBlocks = html.match(/<(?:div|section)\b[^>]*(?:card|article|news|post|item|feed)[^>]*>[\s\S]*?<\/(?:div|section)>/gi) || [];
      const allBlocks = [...articleBlocks, ...divBlocks];

      for (const block of allBlocks) {
        const titleMatch = block.match(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/i)
          ?? block.match(/<(?:span|div|a)\b[^>]*(?:title|headline)[^>]*>([\s\S]*?)<\/(?:span|div|a)>/i);
        const linkMatch = block.match(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i);
        const descMatch = block.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
        const dateMatch = block.match(/<time\b[^>]*\bdatetime=["']([^"']+)["'][^>]*>/i)
          ?? block.match(/<time\b[^>]*>([\s\S]*?)<\/time>/i);

        if (linkMatch) {
          let rawHref = linkMatch[1]!.trim();
          if (rawHref.startsWith("/")) rawHref = origin + rawHref;
          if (!rawHref.startsWith("http")) continue;

          try {
            const pathname = new URL(rawHref).pathname;
            if (/^\/(?:privacy|terms|about|contact|tag|category|author|price|login|register|feed)($|\/)/i.test(pathname) || pathname === "/" || pathname === "/news" || pathname === "/read") {
              continue;
            }
          } catch {
            continue;
          }

          let rawTitle = titleMatch ? titleMatch[1]!.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
          if (!rawTitle || rawTitle.length < 10) {
            const linkTextMatch = block.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i);
            if (linkTextMatch) {
              const txt = linkTextMatch[1]!.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
              if (txt.length >= 15) rawTitle = txt;
            }
          }

          if (rawTitle.length < 15 || /^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d)/i.test(rawTitle)) {
            const anyH = block.match(/<(?:h[1-6]|span|div)\b[^>]*(?:title|headline|text-lg|font-bold|font-semibold)[^>]*>([\s\S]*?)<\/(?:h[1-6]|span|div)>/i);
            if (anyH) {
              const candidate = anyH[1]!.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
              if (candidate.length >= 15 && !/^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d)/i.test(candidate)) {
                rawTitle = candidate;
              }
            }
          }

          if (rawTitle.length < 15 || seenUrls.has(rawHref)) continue;

          const rawDesc = descMatch ? descMatch[1]!.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : rawTitle;
          seenUrls.add(rawHref);

          let publishedAt = now;
          if (dateMatch) {
            const parsed = dateMatch[1] ? Date.parse(dateMatch[1]) : Date.parse(dateMatch[0]!.replace(/<[^>]+>/g, "").trim());
            if (Number.isFinite(parsed)) publishedAt = new Date(parsed).toISOString();
          }

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
              publishedAt,
              crawledAt: now,
              relatedCoins: coins,
              url: rawHref,
            }));
          } catch {
            // ignore invalid items
          }

          if (results.length >= 25) break;
        }
      }

      if (results.length === 0) {
        const linkMatches = html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
        for (const m of linkMatches) {
          let rawHref = m[1]!.trim();
          if (rawHref.startsWith("/")) rawHref = origin + rawHref;
          if (!rawHref.startsWith("http")) continue;

          const pathname = new URL(rawHref).pathname;
          if (!/(?:\/[0-9]{4,}|\/read\/|\/news\/[a-z0-9-]+|\/[0-9]{4}\/[0-9]{2}\/)/i.test(pathname)) continue;
          if (seenUrls.has(rawHref)) continue;

          const rawTitle = m[2]!.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (rawTitle.length < 15 || /^(?:read more|continue reading|learn more|click here)/i.test(rawTitle)) continue;

          seenUrls.add(rawHref);
          const textToScan = rawTitle.toUpperCase();
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
              content: rawTitle.slice(0, 5000),
              source: sourceName,
              publishedAt: now,
              crawledAt: now,
              relatedCoins: coins,
              url: rawHref,
            }));
          } catch {
            // ignore invalid items
          }
          if (results.length >= 25) break;
        }
      }

      return results;
    } catch {
      return [];
    }
  };

  const templateRepo = dependencies.templateRepository ?? defaults.templateRepository;
  const templateGen = dependencies.templateGenerator ?? defaults.templateGenerator;

  return {
    async collect(options?: NewsCollectOptions, userId?: string) {
      // 1. If HTML is directly supplied
      if (options?.html && options.html.trim().length > 0) {
        const items = parseHtmlContent(options.html, options.coin);
        for (const item of items) {
          try {
            await persistAndAnalyze(item, userId);
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
            let domain = "";
            try {
              domain = new URL(src.url).hostname.replace(/^www\./i, "");
            } catch {
              domain = src.name.toLowerCase().replace(/\s+/g, "");
            }

            // 1. Fetch raw webpage HTML
            let html = "";
            try {
              const res = await globalThis.fetch(src.url, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                },
              });
              if (res.ok) html = await res.text();
            } catch (err) {
              observeProviderFailure(observability, { providerName: sourceName, stage: "FETCH", reason: providerFailureReason(err) });
            }

            if (html) {
              // 2. Look up active template for domain in PostgreSQL
              let activeTemplate = templateRepo ? await templateRepo.findActiveByDomain(domain) : undefined;

              // 3. Cold Start: If no template in DB, invoke LLM to generate v1.0 template and persist
              if (!activeTemplate && templateGen) {
                try {
                  const generated = await templateGen.generateTemplate(domain, html);
                  if (templateRepo) {
                    activeTemplate = await templateRepo.save(generated);
                  } else {
                    activeTemplate = generated;
                  }
                } catch {
                  // fallback
                }
              }

              // 4. Token-Free Extraction: Extract articles using active template
              if (activeTemplate) {
                websiteItems = extractWithTemplate(html, activeTemplate, src.url, sourceName, options?.coin);
                const stats = validateExtractedItems(websiteItems);

                // 5. Self-Healing Drift Detection: If defect rate > 10%
                if (stats.isHighError && templateGen) {
                  try {
                    const repaired = await templateGen.repairTemplate(domain, activeTemplate, html, stats);
                    const shouldAutoApply = options?.autoHealing !== false;
                    repaired.isActive = shouldAutoApply;

                    if (templateRepo) {
                      await templateRepo.save(repaired);
                    }

                    if (shouldAutoApply) {
                      const reExtracted = extractWithTemplate(html, repaired, src.url, sourceName, options?.coin);
                      if (reExtracted.length > 0) websiteItems = reExtracted;
                    }
                  } catch (err) {
                    observeProviderFailure(observability, { providerName: sourceName, stage: "MODEL", reason: providerFailureReason(err) });
                  }
                }
              }

              if (websiteItems.length < 5) {
                const scraped = await scrapeWebsiteArticles(src.url, sourceName, options?.coin);
                const existingUrls = new Set(websiteItems.map((it) => it.url));
                for (const it of scraped) {
                  if (!existingUrls.has(it.url)) {
                    websiteItems.push(it);
                    existingUrls.add(it.url);
                  }
                }
              }
            }

            // 6. Persist all discovered items
            for (const rawItem of websiteItems) {
              const item = { ...rawItem };
              if (options?.coin && options.coin !== "ALL" && !item.relatedCoins.includes(options.coin.toUpperCase())) {
                item.relatedCoins = [...item.relatedCoins, options.coin.toUpperCase()];
              }
              try {
                await persistAndAnalyze(item, userId);
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
                  await persistAndAnalyze(item, userId);
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
            await persistAndAnalyze(item as NewsItem, userId);
          } catch (error) {
            const stage = error instanceof NewsException && error.code === "INVALID_NEWS_ITEM" ? "VALIDATION" : "PERSISTENCE";
            observeProviderFailure(observability, { providerName: provider.name, stage, reason: "ERROR" });
          }
        }
      }
    },

    async readNews(userId?: string) {
      const items = (await newsRepository.readAll(userId)).map(validateNewsItem)
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

    async getTemplates(): Promise<ExtractionTemplate[]> {
      return templateRepo ? templateRepo.findAll() : [];
    },

    async applyTemplate(domain: string, version: string): Promise<ExtractionTemplate> {
      if (!templateRepo) throw new Error("TEMPLATE_REPOSITORY_NOT_AVAILABLE");
      return templateRepo.setActiveVersion(domain, version);
    },

    async healTemplate(domain: string, html?: string, autoApply: boolean = true): Promise<ExtractionTemplate> {
      if (!templateRepo || !templateGen) throw new Error("SELF_HEALING_NOT_CONFIGURED");
      let active = await templateRepo.findActiveByDomain(domain);
      if (!active) {
        active = await templateGen.generateTemplate(domain, html || "");
        await templateRepo.save(active);
      }
      const repaired = await templateGen.repairTemplate(domain, active, html || "", {
        evaluatedCount: 1,
        emptyFieldsPercent: 100,
        formatErrorsPercent: 0,
        totalDefectPercent: 100,
        integrityPercent: 0,
        isHighError: true,
        confidence: 0.5,
      });
      repaired.isActive = autoApply;
      return templateRepo.save(repaired);
    },
  };
}
