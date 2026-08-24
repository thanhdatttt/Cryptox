import type { StrategyDefinition, CompositeStrategyDefinition, Strategy, Signal, StrategyPluginDescriptor } from "../domain/contracts";
export type { Signal, StrategyCategory, CombinationMethod, Strategy, StrategyDefinition, CompositeStrategyDefinition, StrategyContext, StrategyCandle, StrategyPluginDescriptor, StrategyFactory, StrategyArtifactResolver, StrategyParameterDescriptor } from "../domain/contracts";
export interface StrategyModulePublicApi {
    listStrategies(): StrategyPluginDescriptor[];
    resolveStrategy(definition: StrategyDefinition): Promise<Strategy>;
    combineSignals(definition: CompositeStrategyDefinition, signals: Array<{
        strategyDefinitionId: string;
        signal: Signal;
    }>): Signal;
}
export declare const listStrategies: () => StrategyPluginDescriptor[];
export declare const resolveStrategy: (definition: StrategyDefinition) => Promise<Strategy>;
export declare const combineSignals: (definition: CompositeStrategyDefinition, signals: Array<{
    strategyDefinitionId: string;
    signal: Signal;
}>) => Signal;
