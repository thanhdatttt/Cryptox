import type { NewsItem } from "../domain/contracts";
import type { NewsRepository } from "../application/ports";
export interface NewsSqlClient {
    query<Row>(text: string, values: unknown[]): Promise<{
        rows: Row[];
    }>;
}
export declare class PostgresNewsRepository implements NewsRepository {
    private readonly client;
    constructor(client: NewsSqlClient);
    insert(value: NewsItem): Promise<NewsItem>;
    readAll(): Promise<NewsItem[]>;
}
