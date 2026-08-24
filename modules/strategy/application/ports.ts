import type { CompositeStrategyDefinition, StrategyDefinition } from "../domain/contracts";
export interface StrategyDefinitionRepository {
  insert(definition: StrategyDefinition): Promise<StrategyDefinition>;
}
export interface CompositeDefinitionRepository {
  insert(definition: CompositeStrategyDefinition): Promise<CompositeStrategyDefinition>;
}
