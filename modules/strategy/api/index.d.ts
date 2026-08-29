import type { StrategyDefinition, CompositeStrategyDefinition, Strategy, Signal, StrategyPluginDescriptor, CombinationMethod } from "../domain/contracts";
import type { StrategyGenerationSource, StrategyGenerationResult } from "../application/service";
export type { Signal, StrategyCategory, CombinationMethod, Strategy, StrategyDefinition, CompositeStrategyDefinition, StrategyContext, StrategyCandle, StrategyPluginDescriptor, StrategyVisualizationOverlay, StrategyVisualizationOverlayDraft, StrategyFactory, StrategyArtifactResolver, StrategyParameterDescriptor } from "../domain/contracts";
export interface StrategyModulePublicApi {
    listStrategies(): StrategyPluginDescriptor[];
    resolveStrategy(definition: StrategyDefinition): Promise<Strategy>;
    combineSignals(definition: CompositeStrategyDefinition, signals: Array<{
        strategyDefinitionId: string;
        signal: Signal;
    }>): Signal;
    buildVisualization(definition: StrategyDefinition, contexts: import("../domain/contracts").StrategyContext[]): import("../domain/contracts").StrategyVisualizationOverlay[];
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
export declare const listStrategies: () => StrategyPluginDescriptor[];
export declare const resolveStrategy: (definition: StrategyDefinition) => Promise<Strategy>;
export declare const combineSignals: (definition: CompositeStrategyDefinition, signals: Array<{
    strategyDefinitionId: string;
    signal: Signal;
}>) => Signal;
export declare const buildVisualization: StrategyModulePublicApi["buildVisualization"];
export declare const listDefinitions: StrategyModulePublicApi["listDefinitions"];
export declare const readDefinitions: StrategyModulePublicApi["readDefinitions"];
export declare const listComposites: StrategyModulePublicApi["listComposites"];
export declare const readComposite: StrategyModulePublicApi["readComposite"];
export declare const defineStrategy: StrategyModulePublicApi["defineStrategy"];
export declare const defineComposite: StrategyModulePublicApi["defineComposite"];
export declare const generateStrategy: StrategyModulePublicApi["generateStrategy"];
