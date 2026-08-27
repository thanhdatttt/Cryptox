export interface StrategyDefinitionRepository<TDefinition> {
  allocateNextVersion(logicalFamilyKey: string): Promise<number>;
  insert(definition: TDefinition): Promise<TDefinition>;
  getById(id: string): Promise<TDefinition | undefined>;
}
export interface CompositeDefinitionRepository<TDefinition> {
  allocateNextVersion(logicalFamilyKey: string): Promise<number>;
  insert(definition: TDefinition): Promise<TDefinition>;
  getById(id: string): Promise<TDefinition | undefined>;
}
