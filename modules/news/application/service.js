"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInMemoryNewsDependencies = createInMemoryNewsDependencies;
exports.createNewsModule = createNewsModule;
const errors_1 = require("../domain/errors");
const rules_1 = require("../domain/rules");
class MemoryNewsRepository {
    rowsByUrl = new Map();
    async insert(item) {
        const existing = this.rowsByUrl.get(item.url);
        if (existing)
            return { ...existing, relatedCoins: [...existing.relatedCoins] };
        this.rowsByUrl.set(item.url, { ...item, relatedCoins: [...item.relatedCoins] });
        return { ...item, relatedCoins: [...item.relatedCoins] };
    }
    async readAll() {
        return [...this.rowsByUrl.values()].map((item) => ({ ...item, relatedCoins: [...item.relatedCoins] }));
    }
}
const unavailableSentiment = {
    analyze: async () => { throw new Error("SENTIMENT_NOT_CONFIGURED"); },
    readLatestForNews: async () => undefined,
};
const sentimentFailureReason = (error) => /timeout/i.test(error instanceof Error ? `${error.name} ${error.message}` : String(error)) ? "TIMEOUT" : "INFERENCE_ERROR";
const toSentimentInput = (item) => ({ newsId: item.id, title: item.title, content: item.content, source: item.source, publishedAt: item.publishedAt, relatedCoins: [...item.relatedCoins] });
function createInMemoryNewsDependencies() {
    return { providers: [], newsRepository: new MemoryNewsRepository(), sentiment: unavailableSentiment, observability: { recordSentimentFailure: () => undefined } };
}
function createNewsModule(dependencies = createInMemoryNewsDependencies()) {
    const defaults = createInMemoryNewsDependencies();
    const providers = dependencies.providers ?? defaults.providers;
    const newsRepository = dependencies.newsRepository ?? defaults.newsRepository;
    const sentiment = dependencies.sentiment ?? defaults.sentiment;
    const observability = dependencies.observability ?? defaults.observability;
    const persistAndAnalyze = async (rawItem) => {
        const item = (0, rules_1.validateNewsItem)(rawItem);
        let persisted;
        try {
            persisted = await newsRepository.insert(item);
        }
        catch (error) {
            if (error instanceof errors_1.NewsException)
                throw error;
            throw new errors_1.NewsException("PERSISTENCE_FAILED", "News item could not be persisted.");
        }
        try {
            await sentiment.analyze(toSentimentInput(persisted));
        }
        catch (error) {
            observability?.recordSentimentFailure({ newsId: persisted.id, reason: sentimentFailureReason(error) });
        }
    };
    return {
        async collect() {
            for (const provider of providers) {
                let items;
                try {
                    items = await provider.fetch();
                }
                catch {
                    throw new errors_1.NewsException("PROVIDER_UNAVAILABLE", `News provider ${provider.name} is unavailable.`);
                }
                for (const item of items)
                    await persistAndAnalyze(item);
            }
        },
        async readNews() {
            const items = (await newsRepository.readAll()).map(rules_1.validateNewsItem)
                .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt) || left.id.localeCompare(right.id));
            return Promise.all(items.map(async (item) => {
                try {
                    const sentimentResult = await sentiment.readLatestForNews(item.id);
                    return sentimentResult ? { ...item, sentiment: sentimentResult } : item;
                }
                catch (error) {
                    observability?.recordSentimentFailure({ newsId: item.id, reason: sentimentFailureReason(error) });
                    return item;
                }
            }));
        },
    };
}
