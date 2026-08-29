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
const providerFailureReason = (error) => /timeout|abort/i.test(error instanceof Error ? `${error.name} ${error.message}` : String(error)) ? "TIMEOUT" : "ERROR";
const defaultObservability = () => ({
    recordProviderFailure: ({ providerName, stage, reason }) => {
        console.warn(`[news] provider failure: ${providerName} ${stage} ${reason}`);
    },
    recordSentimentFailure: ({ newsId, reason }) => {
        console.warn(`[news] sentiment failure: ${newsId} ${reason}`);
    },
});
const observeProviderFailure = (observability, input) => {
    try {
        observability?.recordProviderFailure?.(input);
    }
    catch { }
};
const observeSentimentFailure = (observability, input) => {
    try {
        observability?.recordSentimentFailure?.(input);
    }
    catch { }
};
function createInMemoryNewsDependencies() {
    return { providers: [], newsRepository: new MemoryNewsRepository(), sentiment: unavailableSentiment };
}
function createNewsModule(dependencies = createInMemoryNewsDependencies()) {
    const defaults = createInMemoryNewsDependencies();
    const providers = dependencies.providers ?? defaults.providers;
    const newsRepository = dependencies.newsRepository ?? defaults.newsRepository;
    const sentiment = dependencies.sentiment ?? defaults.sentiment;
    const observability = dependencies.observability ?? defaultObservability();
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
            await sentiment.analyze(toSentimentInput((0, rules_1.validateNewsItem)(persisted)));
        }
        catch (error) {
            observeSentimentFailure(observability, { newsId: persisted.id, reason: sentimentFailureReason(error) });
        }
    };
    return {
        async collect() {
            for (const provider of providers) {
                let items;
                try {
                    items = await provider.fetch();
                }
                catch (error) {
                    observeProviderFailure(observability, { providerName: provider.name, stage: "FETCH", reason: providerFailureReason(error) });
                    continue;
                }
                if (!Array.isArray(items)) {
                    observeProviderFailure(observability, { providerName: provider.name, stage: "SCHEMA", reason: "INVALID_OUTPUT" });
                    continue;
                }
                for (const item of items) {
                    try {
                        await persistAndAnalyze(item);
                    }
                    catch (error) {
                        const stage = error instanceof errors_1.NewsException && error.code === "INVALID_NEWS_ITEM" ? "VALIDATION" : "PERSISTENCE";
                        observeProviderFailure(observability, { providerName: provider.name, stage, reason: "ERROR" });
                    }
                }
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
                    observeSentimentFailure(observability, { newsId: item.id, reason: sentimentFailureReason(error) });
                    return item;
                }
            }));
        },
    };
}
