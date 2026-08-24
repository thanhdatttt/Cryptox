import type { User, UserRepository } from "../domain/contracts";
export interface SqlQueryClient {
    query<Row>(text: string, values: unknown[]): Promise<{
        rows: Row[];
    }>;
}
export declare class PostgresUserRepository implements UserRepository {
    private readonly pool;
    constructor(pool: SqlQueryClient);
    insert(user: User): Promise<void>;
    findByEmail(email: string): Promise<User | undefined>;
    findById(id: string): Promise<User | undefined>;
}
