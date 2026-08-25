import type { CompositeStrategyDefinition, StrategyDefinition } from "../domain/contracts";
export interface StrategyDefinitionRepository {
  insert(ownerUserId: string, definition: StrategyDefinition): Promise<StrategyDefinition>;
  list(ownerUserId: string): Promise<StrategyDefinition[]>;
  listByIds(ownerUserId: string, ids: string[]): Promise<StrategyDefinition[]>;
  listByLogicalFamily(ownerUserId: string, logicalFamilyKey: string): Promise<StrategyDefinition[]>;
}
export interface CompositeDefinitionRepository {
  insert(ownerUserId: string, definition: CompositeStrategyDefinition): Promise<CompositeStrategyDefinition>;
  list(ownerUserId: string): Promise<CompositeStrategyDefinition[]>;
  get(ownerUserId: string, id: string): Promise<CompositeStrategyDefinition | undefined>;
  listByLogicalFamily(ownerUserId: string, logicalFamilyKey: string): Promise<CompositeStrategyDefinition[]>;
}
