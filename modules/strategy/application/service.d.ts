import type { CombinationMethod, CompositeStrategyDefinition, Signal, Strategy, StrategyDefinition, StrategyPluginDescriptor } from "../domain/contracts";
import type { CompositeDefinitionRepository, StrategyDefinitionRepository } from "./ports";
export interface StrategyModuleDependencies {
    artifactResolver: import("../domain/contracts").StrategyArtifactResolver;
    definitionRepository: StrategyDefinitionRepository;
    compositeRepository: CompositeDefinitionRepository;
}
export interface StrategyModuleRuntime {
    listStrategies(): StrategyPluginDescriptor[];
    resolveStrategy(definition: StrategyDefinition): Promise<Strategy>;
    combineSignals(definition: CompositeStrategyDefinition, signals: Array<{
        strategyDefinitionId: string;
        signal: Signal;
    }>): Signal;
    listDefinitions(userId: string): Promise<StrategyDefinition[]>;
    readDefinitions(userId: string, ids: string[]): Promise<StrategyDefinition[]>;
    listComposites(userId: string): Promise<CompositeStrategyDefinition[]>;
    readComposite(userId: string, id: string): Promise<CompositeStrategyDefinition>;
    defineStrategy(userId: string, strategyName: string, parameters: Record<string, number | string>): Promise<StrategyDefinition>;
    defineComposite(userId: string, command: {
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
    buildVisualization(definition: StrategyDefinition): [];
}
export declare function createInMemoryStrategyDependencies(): StrategyModuleDependencies;
export declare function createStrategyModule(dependencies?: StrategyModuleDependencies): StrategyModuleRuntime;
