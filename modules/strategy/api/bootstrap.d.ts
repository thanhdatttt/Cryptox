import type { StrategyArtifactResolver, StrategyDefinition, CompositeStrategyDefinition } from "../domain/contracts";
import type { StrategyDefinitionRepository, CompositeDefinitionRepository } from "../application/ports";
export interface StrategyModuleDependencies {
    artifactResolver: StrategyArtifactResolver;
    definitionRepository: StrategyDefinitionRepository;
    compositeRepository: CompositeDefinitionRepository;
}
import type { StrategyModulePublicApi } from "./index";
import type { CombinationMethod } from "../domain/contracts";
export declare function createStrategyModule(_deps: StrategyModuleDependencies): StrategyModulePublicApi & {
    defineStrategy(strategyName: string, parameters: Record<string, number | string>): Promise<StrategyDefinition>;
    defineComposite(command: {
        method: CombinationMethod;
        components: Array<{
            strategyDefinitionId: string;
            weight: number;
        }>;
        thresholds?: {
            buy: number;
            sell: number;
        };
    }): Promise<CompositeStrategyDefinition>;
};
export type { StrategyDefinition, CompositeStrategyDefinition };
