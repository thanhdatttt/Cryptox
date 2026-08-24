"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInMemorySentimentDependencies = createInMemorySentimentDependencies;
exports.createSentimentModule = createSentimentModule;
const node_crypto_1 = require("node:crypto");
const errors_1 = require("../domain/errors");
const rules_1 = require("../domain/rules");
class MemoryResultRepository {
    rows = [];
    sequence = 0;
    async insert(result, input) {
        if (this.rows.some((row) => row.result.newsId === result.newsId && row.result.modelName === result.modelName && row.result.modelVersion === result.modelVersion)) {
            throw new errors_1.SentimentException("DUPLICATE_RESULT", "A result already exists for this News item and model identity.");
        }
        this.rows.push({ input: { ...input, relatedCoins: [...input.relatedCoins] }, result: { ...result }, sequence: ++this.sequence });
        return { ...result };
    }
    async readLatestForNews(newsId) {
        const latest = this.rows
            .filter((row) => row.result.newsId === newsId)
            .sort((left, right) => right.result.analyzedAt.localeCompare(left.result.analyzedAt) || right.sequence - left.sequence)[0];
        return latest ? { ...latest.result } : undefined;
    }
    async readForSnapshot(command) {
        return this.rows
            .filter((row) => row.result.modelName === command.modelName && row.result.modelVersion === command.modelVersion)
            .filter((row) => row.input.relatedCoins.includes(command.relatedCoin))
            .filter((row) => row.input.publishedAt >= command.range.from && row.input.publishedAt < command.range.to)
            .map((row) => ({ input: { ...row.input, relatedCoins: [...row.input.relatedCoins] }, result: { ...row.result } }));
    }
}
class MemorySnapshotRepository {
    snapshots = new Map();
    snapshotIdsByHash = new Map();
    async insertSealed(ref, points) {
        const existingId = this.snapshotIdsByHash.get(ref.sha256);
        if (existingId)
            return { ...this.snapshots.get(existingId).ref, range: { ...this.snapshots.get(existingId).ref.range } };
        this.snapshots.set(ref.id, { ref: { ...ref, range: { ...ref.range } }, points: points.map((point) => ({ ...point })) });
        this.snapshotIdsByHash.set(ref.sha256, ref.id);
        return { ...ref, range: { ...ref.range } };
    }
    async getRef(snapshotId) {
        const ref = this.snapshots.get(snapshotId)?.ref;
        return ref ? { ...ref, range: { ...ref.range } } : undefined;
    }
    async readSealed(snapshotId) {
        const snapshot = this.snapshots.get(snapshotId);
        return snapshot ? { ref: { ...snapshot.ref, range: { ...snapshot.ref.range } }, points: snapshot.points.map((point) => ({ ...point })) } : undefined;
    }
}
const now = () => new Date().toISOString();
const inferenceFailureReason = (error) => {
    const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
    return /timeout/i.test(text) ? "TIMEOUT" : error instanceof errors_1.SentimentException && error.code === "INVALID_RESULT" ? "INVALID_RESULT" : "INFERENCE_ERROR";
};
const clonePoint = (point) => ({ ...point });
const pointForCandle = (snapshot, snapshotId, candleCloseTime) => {
    if (snapshot.ref.id !== snapshotId || !Number.isFinite(Date.parse(candleCloseTime)))
        return undefined;
    const from = Date.parse(snapshot.ref.range.from);
    const to = Date.parse(snapshot.ref.range.to);
    const close = Date.parse(candleCloseTime);
    if (close < from || close >= to)
        return undefined;
    const windowMs = snapshot.ref.aggregationWindowSeconds * 1_000;
    const windowEnd = from + Math.max(1, Math.ceil((close - from) / windowMs)) * windowMs;
    if (windowEnd > to || windowEnd !== close)
        return undefined;
    const point = snapshot.points.find((candidate) => candidate.timestamp === new Date(windowEnd).toISOString());
    return point ? clonePoint(point) : undefined;
};
const snapshotSerialization = (command, points) => JSON.stringify({
    relatedCoin: command.relatedCoin,
    range: command.range,
    aggregationWindowSeconds: command.aggregationWindowSeconds,
    modelName: command.modelName,
    modelVersion: command.modelVersion,
    modelSha256: command.modelSha256,
    points: points.map((point) => [point.timestamp, point.label, point.averageScore]),
});
const aggregateSnapshotPoints = (command, rows) => {
    const from = Date.parse(command.range.from);
    const to = Date.parse(command.range.to);
    const windowMs = command.aggregationWindowSeconds * 1_000;
    const windows = new Map();
    for (const row of rows) {
        (0, rules_1.validateSentimentInput)(row.input);
        const result = (0, rules_1.validateSentimentResult)(row.result, row.input);
        if (result.modelName !== command.modelName || result.modelVersion !== command.modelVersion || !row.input.relatedCoins.includes(command.relatedCoin))
            continue;
        const publishedAt = Date.parse(row.input.publishedAt);
        if (publishedAt < from || publishedAt >= to)
            continue;
        const end = from + Math.max(1, Math.ceil((publishedAt - from) / windowMs)) * windowMs;
        if (end > to)
            continue;
        const bucket = windows.get(end) ?? [];
        bucket.push(result.score);
        windows.set(end, bucket);
    }
    return [...windows.entries()]
        .sort(([left], [right]) => left - right)
        .map(([end, scores]) => {
        const averageScore = Number((scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(12));
        return (0, rules_1.validateSnapshotPoint)({ timestamp: new Date(end).toISOString(), label: (0, rules_1.sentimentLabelFor)(averageScore), averageScore });
    });
};
function createInMemorySentimentDependencies() {
    return {
        analysis: { analyze: async () => { throw new errors_1.SentimentException("ANALYSIS_FAILED", "No Sentiment analysis adapter is configured."); } },
        resultRepository: new MemoryResultRepository(),
        snapshotRepository: new MemorySnapshotRepository(),
        clock: { now },
        observability: { recordInferenceFailure: () => undefined },
    };
}
function createSentimentModule(dependencies = createInMemorySentimentDependencies()) {
    const defaults = createInMemorySentimentDependencies();
    const analysis = dependencies.analysis ?? defaults.analysis;
    const resultRepository = dependencies.resultRepository ?? defaults.resultRepository;
    const snapshotRepository = dependencies.snapshotRepository ?? defaults.snapshotRepository;
    const clock = dependencies.clock ?? defaults.clock;
    const observability = dependencies.observability ?? defaults.observability;
    return {
        async analyze(input) {
            const normalizedInput = (0, rules_1.validateSentimentInput)(input);
            try {
                const analyzed = (0, rules_1.validateSentimentResult)(await analysis.analyze(normalizedInput), normalizedInput);
                return await resultRepository.insert(analyzed, normalizedInput);
            }
            catch (error) {
                observability?.recordInferenceFailure({ newsId: normalizedInput.newsId, reason: inferenceFailureReason(error) });
                throw error instanceof errors_1.SentimentException ? error : new errors_1.SentimentException("ANALYSIS_FAILED", "Sentiment analysis failed.");
            }
        },
        readLatestForNews: async (newsId) => resultRepository.readLatestForNews(newsId),
        async createSnapshot(command) {
            const normalized = (0, rules_1.validateSnapshotCommand)(command);
            const points = aggregateSnapshotPoints(normalized, await resultRepository.readForSnapshot(normalized));
            if (points.length === 0)
                throw new errors_1.SentimentException("INVALID_SNAPSHOT", "Cannot create an empty Sentiment snapshot.");
            const sha256 = (0, node_crypto_1.createHash)("sha256").update(snapshotSerialization(normalized, points), "utf8").digest("hex");
            const ref = {
                id: (0, node_crypto_1.randomUUID)(),
                relatedCoin: normalized.relatedCoin,
                range: { ...normalized.range },
                aggregationWindowSeconds: normalized.aggregationWindowSeconds,
                modelName: normalized.modelName,
                modelVersion: normalized.modelVersion,
                modelSha256: normalized.modelSha256,
                pointCount: points.length,
                sha256,
                createdAt: clock.now(),
            };
            return snapshotRepository.insertSealed(ref, points);
        },
        async getSnapshotRef(snapshotId) {
            const ref = await snapshotRepository.getRef(snapshotId);
            if (!ref)
                throw new errors_1.SentimentException("SNAPSHOT_NOT_FOUND", "Sentiment snapshot was not found.");
            return ref;
        },
        async readSnapshot(snapshotId) {
            const snapshot = await snapshotRepository.readSealed(snapshotId);
            if (!snapshot)
                throw new errors_1.SentimentException("SNAPSHOT_NOT_FOUND", "Sentiment snapshot was not found.");
            const points = snapshot.points.map(rules_1.validateSnapshotPoint);
            if (points.length !== snapshot.ref.pointCount || new Set(points.map((point) => point.timestamp)).size !== points.length) {
                throw new errors_1.SentimentException("INVALID_SNAPSHOT", "Sealed snapshot points are invalid.");
            }
            const sealed = { ref: { ...snapshot.ref, range: { ...snapshot.ref.range } }, points: points.map(clonePoint) };
            return { readAt: (requestedId, candleCloseTime) => pointForCandle(sealed, requestedId, candleCloseTime) };
        },
    };
}
