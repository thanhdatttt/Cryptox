import type { CreateSentimentSnapshotCommand, SentimentDatasetSnapshotRef, SentimentInput, SentimentResult, SentimentSnapshotPoint } from "../domain/contracts";
import type { SealedSentimentSnapshot, SentimentResultRepository, SentimentSnapshotRepository } from "../application/ports";
export interface SentimentSqlClient {
    query<Row>(text: string, values: unknown[]): Promise<{
        rows: Row[];
    }>;
    connect?(): Promise<SentimentSqlTransactionClient>;
}
export interface SentimentSqlTransactionClient {
    query<Row>(text: string, values: unknown[]): Promise<{
        rows: Row[];
    }>;
    release(): void;
}
export declare class PostgresSentimentResultRepository implements SentimentResultRepository {
    private readonly client;
    constructor(client: SentimentSqlClient);
    insert(value: SentimentResult, input: SentimentInput): Promise<SentimentResult>;
    readLatestForNews(newsId: string): Promise<SentimentResult | undefined>;
    readForSnapshot(command: Pick<CreateSentimentSnapshotCommand, "relatedCoin" | "range" | "modelName" | "modelVersion">): Promise<{
        input: {
            newsId: string;
            title: string;
            content: string;
            source: string;
            publishedAt: string;
            relatedCoins: string[];
        };
        result: SentimentResult;
    }[]>;
}
export declare class PostgresSentimentSnapshotRepository implements SentimentSnapshotRepository {
    private readonly client;
    constructor(client: SentimentSqlClient);
    private validateSealed;
    insertSealed(ref: SentimentDatasetSnapshotRef, points: SentimentSnapshotPoint[]): Promise<SentimentDatasetSnapshotRef>;
    getRef(snapshotId: string): Promise<SentimentDatasetSnapshotRef | undefined>;
    readSealed(snapshotId: string): Promise<SealedSentimentSnapshot | undefined>;
}
