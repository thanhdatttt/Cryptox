import type { StrategyArtifactResolver, StrategyDefinition, CompositeStrategyDefinition } from "../domain/contracts";
import type { StrategyDefinitionRepository, CompositeDefinitionRepository } from "../application/ports";
export interface StrategyModuleDependencies {
    artifactResolver: StrategyArtifactResolver;
    definitionRepository: StrategyDefinitionRepository;
    compositeRepository: CompositeDefinitionRepository;
}
export { createStrategyModule } from "./index";
export type { StrategyDefinition, CompositeStrategyDefinition };
