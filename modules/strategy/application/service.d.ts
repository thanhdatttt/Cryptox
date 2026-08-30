import type { CombinationMethod, CompositeStrategyDefinition, Signal, Strategy, StrategyContext, StrategyDefinition, StrategyPluginDescriptor, StrategyVisualizationOverlay } from "../domain/contracts";
import type { CompositeDefinitionRepository, StrategyDefinitionRepository, StrategyGenerationAdapter, StrategyGenerationSource, StrategyGenerationUnitOfWork, StrategySourceLoader } from "./ports";
export interface StrategyModuleDependencies {
    artifactResolver: import("../domain/contracts").StrategyArtifactResolver;
    definitionRepository: StrategyDefinitionRepository;
    compositeRepository: CompositeDefinitionRepository;
    generationAdapter?: StrategyGenerationAdapter;
    sourceLoader?: StrategySourceLoader;
    generationUnitOfWork?: StrategyGenerationUnitOfWork;
    modelName?: string;
    modelVersion?: string;
    promptVersion?: string;
    modelTimeoutMs?: number;
    registry?: import("../domain/contracts").StrategyRegistry;
}
export type { GeneratedStrategyProposal, StrategyGenerationAdapter, StrategyGenerationSource, StrategySourceLoader } from "./ports";
export interface StrategyGenerationResult {
    generationId: string;
    kind: "SINGLE" | "COMPOSITE";
    strategyDefinition?: StrategyDefinition;
    compositeStrategyDefinition?: CompositeStrategyDefinition;
    modelName: string;
    modelVersion: string;
    promptVersion: string;
}
export interface StrategyModuleRuntime {
    listStrategies(): StrategyPluginDescriptor[];
    resolveStrategy(definition: StrategyDefinition): Promise<Strategy>;
    combineSignals(definition: CompositeStrategyDefinition, signals: Array<{
        strategyDefinitionId: string;
        signal: Signal;
    }>): Signal;
    buildVisualization(definition: StrategyDefinition, contexts: StrategyContext[]): StrategyVisualizationOverlay[];
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
    generateStrategy(userId: string, source: StrategyGenerationSource): Promise<StrategyGenerationResult>;
}
export declare function createInMemoryStrategyDependencies(): StrategyModuleDependencies;
export declare function createStrategyModule(dependencies?: StrategyModuleDependencies): StrategyModuleRuntime;
