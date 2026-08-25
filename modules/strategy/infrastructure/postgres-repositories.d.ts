import type { CompositeStrategyDefinition, StrategyDefinition } from "../domain/contracts";
import type { CompositeDefinitionRepository, StrategyDefinitionRepository } from "../application/ports";
import type { StrategyModuleDependencies } from "../application/service";
export interface StrategySqlQueryClient {
    query<Row>(text: string, values: unknown[]): Promise<{
        rows: Row[];
    }>;
}
export declare class PostgresStrategyDefinitionRepository implements StrategyDefinitionRepository {
    private readonly pool;
    constructor(pool: StrategySqlQueryClient);
    insert(ownerUserId: string, value: StrategyDefinition): Promise<StrategyDefinition>;
    list(ownerUserId: string): Promise<StrategyDefinition[]>;
    listByIds(ownerUserId: string, ids: string[]): Promise<StrategyDefinition[]>;
    listByLogicalFamily(ownerUserId: string, logicalFamilyKey: string): Promise<StrategyDefinition[]>;
}
export declare class PostgresCompositeDefinitionRepository implements CompositeDefinitionRepository {
    private readonly pool;
    constructor(pool: StrategySqlQueryClient);
    insert(ownerUserId: string, value: CompositeStrategyDefinition): Promise<CompositeStrategyDefinition>;
    list(ownerUserId: string): Promise<CompositeStrategyDefinition[]>;
    get(ownerUserId: string, id: string): Promise<CompositeStrategyDefinition | undefined>;
    listByLogicalFamily(ownerUserId: string, logicalFamilyKey: string): Promise<CompositeStrategyDefinition[]>;
}
export declare const createPostgresStrategyDependencies: (pool: StrategySqlQueryClient) => StrategyModuleDependencies;
