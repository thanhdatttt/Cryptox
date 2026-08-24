import type { StrategyDefinition, CompositeStrategyDefinition, Strategy, Signal, StrategyPluginDescriptor, CombinationMethod } from "../domain/contracts";
import type { StrategyModuleDependencies } from "./bootstrap";
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
export declare const resolveStrategy: (_definition: StrategyDefinition) => Promise<Strategy>;
export declare const combineSignals: (_definition: CompositeStrategyDefinition, _signals: Array<{
    strategyDefinitionId: string;
    signal: Signal;
}>) => Signal;
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
