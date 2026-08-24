import type { CompositeStrategyDefinition, StrategyDefinition } from "../domain/contracts";
export interface StrategyDefinitionRepository {
  insert(definition: StrategyDefinition): Promise<StrategyDefinition>;
  listByIds(ids: string[]): Promise<StrategyDefinition[]>;
}
export interface CompositeDefinitionRepository {
  insert(definition: CompositeStrategyDefinition): Promise<CompositeStrategyDefinition>;
  get(id: string): Promise<CompositeStrategyDefinition | undefined>;
}
