import { createHash, randomUUID } from "node:crypto";
import type {
  CreateSentimentSnapshotCommand,
  SentimentDatasetSnapshotRef,
  SentimentInput,
  SentimentResult,
  SentimentSnapshotPoint,
  SentimentSnapshotReader,
} from "../domain/contracts";
import { SentimentException } from "../domain/errors";
import { sentimentLabelFor, sentimentSnapshotSerialization, validateSentimentInput, validateSentimentResult, validateSnapshotCommand, validateSnapshotPoint } from "../domain/rules";
import type { SealedSentimentSnapshot, SentimentModuleDependencies, SentimentResultRepository, SentimentSnapshotRepository } from "./ports";

type InternalDependencies = Partial<SentimentModuleDependencies>;
type StoredResult = { input: SentimentInput; result: SentimentResult; sequence: number };

class MemoryResultRepository implements SentimentResultRepository {
  private readonly rows: StoredResult[] = [];
  private sequence = 0;

  async insert(result: SentimentResult, input: SentimentInput): Promise<SentimentResult> {
    if (this.rows.some((row) => row.result.newsId === result.newsId && row.result.modelName === result.modelName && row.result.modelVersion === result.modelVersion)) {
      throw new SentimentException("DUPLICATE_RESULT", "A result already exists for this News item and model identity.");
    }
    this.rows.push({ input: { ...input, relatedCoins: [...input.relatedCoins] }, result: { ...result }, sequence: ++this.sequence });
    return { ...result };
  }

  async readLatestForNews(newsId: string): Promise<SentimentResult | undefined> {
    const latest = this.rows
      .filter((row) => row.result.newsId === newsId)
      .sort((left, right) => right.result.analyzedAt.localeCompare(left.result.analyzedAt) || right.sequence - left.sequence)[0];
    return latest ? { ...latest.result } : undefined;
  }

  async readForSnapshot(command: Pick<CreateSentimentSnapshotCommand, "relatedCoin" | "range" | "modelName" | "modelVersion">) {
    return this.rows
      .filter((row) => row.result.modelName === command.modelName && row.result.modelVersion === command.modelVersion)
      .filter((row) => row.input.relatedCoins.includes(command.relatedCoin))
      .filter((row) => row.input.publishedAt >= command.range.from && row.input.publishedAt < command.range.to)
      .map((row) => ({ input: { ...row.input, relatedCoins: [...row.input.relatedCoins] }, result: { ...row.result } }));
  }
}

class MemorySnapshotRepository implements SentimentSnapshotRepository {
  private readonly snapshots = new Map<string, SealedSentimentSnapshot>();
  private readonly snapshotIdsByHash = new Map<string, string>();

  async insertSealed(ref: SentimentDatasetSnapshotRef, points: SentimentSnapshotPoint[]): Promise<SentimentDatasetSnapshotRef> {
    const existingId = this.snapshotIdsByHash.get(ref.sha256);
    if (existingId) return { ...this.snapshots.get(existingId)!.ref, range: { ...this.snapshots.get(existingId)!.ref.range } };
    this.snapshots.set(ref.id, { ref: { ...ref, range: { ...ref.range } }, points: points.map((point) => ({ ...point })) });
    this.snapshotIdsByHash.set(ref.sha256, ref.id);
    return { ...ref, range: { ...ref.range } };
  }

  async getRef(snapshotId: string): Promise<SentimentDatasetSnapshotRef | undefined> {
    const ref = this.snapshots.get(snapshotId)?.ref;
    return ref ? { ...ref, range: { ...ref.range } } : undefined;
  }

  async readSealed(snapshotId: string): Promise<SealedSentimentSnapshot | undefined> {
    const snapshot = this.snapshots.get(snapshotId);
    return snapshot ? { ref: { ...snapshot.ref, range: { ...snapshot.ref.range } }, points: snapshot.points.map((point) => ({ ...point })) } : undefined;
  }
}

const now = (): string => new Date().toISOString();
const inferenceFailureReason = (error: unknown): "TIMEOUT" | "INFERENCE_ERROR" | "INVALID_RESULT" => {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /timeout/i.test(text) ? "TIMEOUT" : error instanceof SentimentException && error.code === "INVALID_RESULT" ? "INVALID_RESULT" : "INFERENCE_ERROR";
};
const clonePoint = (point: SentimentSnapshotPoint): SentimentSnapshotPoint => ({ ...point });

const pointForCandle = (snapshot: SealedSentimentSnapshot, snapshotId: string, candleCloseTime: string): SentimentSnapshotPoint | undefined => {
  if (snapshot.ref.id !== snapshotId || !Number.isFinite(Date.parse(candleCloseTime))) return undefined;
  const from = Date.parse(snapshot.ref.range.from);
  const to = Date.parse(snapshot.ref.range.to);
  const close = Date.parse(candleCloseTime);
  if (close <= from || close > to) return undefined;
  const windowMs = snapshot.ref.aggregationWindowSeconds * 1_000;
  const windowEnd = from + Math.max(1, Math.ceil((close - from) / windowMs)) * windowMs;
  if (windowEnd > to || windowEnd !== close) return undefined;
  const point = snapshot.points.find((candidate) => candidate.timestamp === new Date(windowEnd).toISOString());
  return point ? clonePoint(point) : undefined;
};

const aggregateSnapshotPoints = (command: CreateSentimentSnapshotCommand, rows: Awaited<ReturnType<SentimentResultRepository["readForSnapshot"]>>): SentimentSnapshotPoint[] => {
  const from = Date.parse(command.range.from);
  const to = Date.parse(command.range.to);
  const windowMs = command.aggregationWindowSeconds * 1_000;
  const windows = new Map<number, number[]>();
  for (const row of rows) {
    validateSentimentInput(row.input);
    const result = validateSentimentResult(row.result, row.input);
    if (result.modelName !== command.modelName || result.modelVersion !== command.modelVersion || !row.input.relatedCoins.includes(command.relatedCoin)) continue;
    const publishedAt = Date.parse(row.input.publishedAt);
    if (publishedAt < from || publishedAt >= to) continue;
    const end = from + Math.max(1, Math.ceil((publishedAt - from) / windowMs)) * windowMs;
    if (end > to) continue;
    const bucket = windows.get(end) ?? [];
    bucket.push(result.score);
    windows.set(end, bucket);
  }
  return [...windows.entries()]
    .sort(([left], [right]) => left - right)
    .map(([end, scores]) => {
      const averageScore = Number((scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(12));
      return validateSnapshotPoint({ timestamp: new Date(end).toISOString(), label: sentimentLabelFor(averageScore), averageScore });
    });
};

export interface SentimentModuleRuntime {
  analyze(input: SentimentInput): Promise<SentimentResult>;
  readLatestForNews(newsId: string): Promise<SentimentResult | undefined>;
  createSnapshot(command: CreateSentimentSnapshotCommand): Promise<SentimentDatasetSnapshotRef>;
  getSnapshotRef(snapshotId: string): Promise<SentimentDatasetSnapshotRef>;
  readSnapshot(snapshotId: string): Promise<SentimentSnapshotReader>;
}

export function createInMemorySentimentDependencies(): SentimentModuleDependencies {
  return {
    analysis: { analyze: async () => { throw new SentimentException("ANALYSIS_FAILED", "No Sentiment analysis adapter is configured."); } },
    resultRepository: new MemoryResultRepository(),
    snapshotRepository: new MemorySnapshotRepository(),
    clock: { now },
    observability: { recordInferenceFailure: () => undefined },
  };
}

export function createSentimentModule(dependencies: InternalDependencies = createInMemorySentimentDependencies()): SentimentModuleRuntime {
  const defaults = createInMemorySentimentDependencies();
  const analysis = dependencies.analysis ?? defaults.analysis;
  const resultRepository = dependencies.resultRepository ?? defaults.resultRepository;
  const snapshotRepository = dependencies.snapshotRepository ?? defaults.snapshotRepository;
  const clock = dependencies.clock ?? defaults.clock;
  const observability = dependencies.observability ?? defaults.observability;

  return {
    async analyze(input) {
      const normalizedInput = validateSentimentInput(input);
      try {
        const analyzed = validateSentimentResult(await analysis.analyze(normalizedInput), normalizedInput);
        return await resultRepository.insert(analyzed, normalizedInput);
      } catch (error) {
        observability?.recordInferenceFailure({ newsId: normalizedInput.newsId, reason: inferenceFailureReason(error) });
        throw error instanceof SentimentException ? error : new SentimentException("ANALYSIS_FAILED", "Sentiment analysis failed.");
      }
    },

    readLatestForNews: async (newsId) => resultRepository.readLatestForNews(newsId),

    async createSnapshot(command) {
      const normalized = validateSnapshotCommand(command);
      const points = aggregateSnapshotPoints(normalized, await resultRepository.readForSnapshot(normalized));
      if (points.length === 0) throw new SentimentException("INVALID_SNAPSHOT", "Cannot create an empty Sentiment snapshot.");
      const sha256 = createHash("sha256").update(sentimentSnapshotSerialization(normalized, points), "utf8").digest("hex");
      const ref: SentimentDatasetSnapshotRef = {
        id: randomUUID(),
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
      if (!ref) throw new SentimentException("SNAPSHOT_NOT_FOUND", "Sentiment snapshot was not found.");
      return ref;
    },

    async readSnapshot(snapshotId) {
      const snapshot = await snapshotRepository.readSealed(snapshotId);
      if (!snapshot) throw new SentimentException("SNAPSHOT_NOT_FOUND", "Sentiment snapshot was not found.");
      const points = snapshot.points.map(validateSnapshotPoint);
      if (points.length !== snapshot.ref.pointCount || new Set(points.map((point) => point.timestamp)).size !== points.length) {
        throw new SentimentException("INVALID_SNAPSHOT", "Sealed snapshot points are invalid.");
      }
      const sealed: SealedSentimentSnapshot = { ref: { ...snapshot.ref, range: { ...snapshot.ref.range } }, points: points.map(clonePoint) };
      return { readAt: (requestedId, candleCloseTime) => pointForCandle(sealed, requestedId, candleCloseTime) };
    },
  };
}
