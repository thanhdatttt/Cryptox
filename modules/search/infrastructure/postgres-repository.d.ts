import type { SearchModuleDependencies, SearchRunRepository } from "../application/ports";
import type { SearchRun } from "../domain/contracts";
export interface SearchSqlClient {
    query<Row>(text: string, values: unknown[]): Promise<{
        rows: Row[];
    }>;
}
export declare class PostgresSearchRunRepository implements SearchRunRepository {
    private readonly pool;
    constructor(pool: SearchSqlClient);
    private fields;
    get(id: string): Promise<SearchRun | undefined>;
    insert(input: SearchRun): Promise<SearchRun>;
    save(input: SearchRun): Promise<SearchRun>;
    listRunning(): Promise<SearchRun[]>;
}
export declare const createPostgresSearchDependencies: (pool: SearchSqlClient, input: Omit<SearchModuleDependencies, "searchRunRepository" | "generators"> & {
    generators?: SearchModuleDependencies["generators"];
}) => SearchModuleDependencies;
