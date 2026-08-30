import type { SearchModuleDependencies, SearchRunRepository } from "../application/ports";
import type { SearchRun } from "../domain/contracts";
import type { CancellationUnitOfWork } from "modules/backtesting/api";
export interface SearchSqlClient {
    query<Row>(text: string, values: unknown[]): Promise<{
        rows: Row[];
    }>;
    connect?(): Promise<{
        query<Row>(text: string, values: unknown[]): Promise<{
            rows: Row[];
        }>;
        release(): void;
    }>;
}
export declare const createPostgresCancellationUnitOfWork: (pool: SearchSqlClient) => Promise<CancellationUnitOfWork>;
export declare class PostgresSearchRunRepository implements SearchRunRepository {
    private readonly pool;
    constructor(pool: SearchSqlClient);
    private fields;
    get(id: string): Promise<SearchRun | undefined>;
    getByOwner(ownerUserId: string, id: string): Promise<SearchRun | undefined>;
    getByOwnerForUpdate(ownerUserId: string, id: string, unitOfWork: CancellationUnitOfWork): Promise<SearchRun | undefined>;
    insert(input: SearchRun): Promise<SearchRun>;
    save(input: SearchRun, unitOfWork?: CancellationUnitOfWork): Promise<SearchRun>;
    listRunning(): Promise<SearchRun[]>;
    withRunLock<T>(ownerUserId: string, id: string, operation: (run: SearchRun | undefined, unitOfWork?: CancellationUnitOfWork) => Promise<T>): Promise<T>;
}
export declare const createPostgresSearchDependencies: (pool: SearchSqlClient, input: Omit<SearchModuleDependencies, "searchRunRepository" | "generators" | "beginCancellation"> & {
    generators?: SearchModuleDependencies["generators"];
    idGenerator?: () => string;
    beginCancellation?: SearchModuleDependencies["beginCancellation"];
}) => SearchModuleDependencies;
