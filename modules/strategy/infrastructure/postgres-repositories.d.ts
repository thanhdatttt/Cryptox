import type { CompositeStrategyDefinition, StrategyDefinition } from "../domain/contracts";
import type { CompositeDefinitionRepository, StrategyDefinitionRepository, StrategyGenerationRequest, StrategyGenerationRepository, StrategyGenerationUnitOfWork } from "../application/ports";
import type { StrategyModuleDependencies } from "../application/service";
export interface StrategySqlTransactionClient {
    query<Row>(text: string, values: unknown[]): Promise<{
        rows: Row[];
    }>;
    release(): void;
}
export interface StrategySqlQueryClient {
    query<Row>(text: string, values: unknown[]): Promise<{
        rows: Row[];
    }>;
    connect?(): Promise<StrategySqlTransactionClient>;
}
export declare class PostgresStrategyDefinitionRepository implements StrategyDefinitionRepository {
    private readonly pool;
    constructor(pool: StrategySqlQueryClient);
    insert(ownerUserId: string, value: StrategyDefinition): Promise<StrategyDefinition>;
    list(ownerUserId: string): Promise<StrategyDefinition[]>;
    listByIds(ownerUserId: string, ids: string[]): Promise<StrategyDefinition[]>;
    listByLogicalFamily(ownerUserId: string, logicalFamilyKey: string): Promise<StrategyDefinition[]>;
    exists(id: string): Promise<boolean>;
}
export declare class PostgresCompositeDefinitionRepository implements CompositeDefinitionRepository {
    private readonly pool;
    constructor(pool: StrategySqlQueryClient);
    insert(ownerUserId: string, value: CompositeStrategyDefinition): Promise<CompositeStrategyDefinition>;
    list(ownerUserId: string): Promise<CompositeStrategyDefinition[]>;
    get(ownerUserId: string, id: string): Promise<CompositeStrategyDefinition | undefined>;
    listByLogicalFamily(ownerUserId: string, logicalFamilyKey: string): Promise<CompositeStrategyDefinition[]>;
}
export declare class PostgresStrategyGenerationRepository implements StrategyGenerationRepository {
    private readonly client;
    constructor(client: StrategySqlQueryClient);
    insert(value: StrategyGenerationRequest): Promise<StrategyGenerationRequest>;
}
export declare class PostgresStrategyGenerationUnitOfWork implements StrategyGenerationUnitOfWork {
    private readonly client;
    constructor(client: StrategySqlQueryClient);
    commit(input: Parameters<StrategyGenerationUnitOfWork["commit"]>[0]): Promise<void>;
}
export declare const createPostgresStrategyDependencies: (pool: StrategySqlQueryClient) => StrategyModuleDependencies;
