export interface StrategyDefinitionRepository<TDefinition> {
  insert(definition: TDefinition): Promise<TDefinition>;
}
export interface CompositeDefinitionRepository<TDefinition> {
  insert(definition: TDefinition): Promise<TDefinition>;
}
