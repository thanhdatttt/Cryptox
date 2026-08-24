import type { StrategyArtifactResolver, StrategyCategory, StrategyDefinition, CompositeStrategyDefinition, Strategy, Signal, StrategyPluginDescriptor, CombinationMethod } from "../domain/contracts";
export type { Signal, StrategyCategory, CombinationMethod, Strategy, StrategyDefinition, CompositeStrategyDefinition, StrategyContext, StrategyCandle, StrategyPluginDescriptor, StrategyFactory, StrategyArtifactResolver, StrategyParameterDescriptor } from "../domain/contracts";
export interface StrategyModulePublicApi { listStrategies(): StrategyPluginDescriptor[]; resolveStrategy(definition: StrategyDefinition): Promise<Strategy>; combineSignals(definition: CompositeStrategyDefinition, signals: Array<{ strategyDefinitionId: string; signal: Signal }>): Signal; }
const notImplemented = (): never => { throw new Error("NOT_IMPLEMENTED"); };
export const listStrategies = (): StrategyPluginDescriptor[] => notImplemented();
export const resolveStrategy = async (_definition: StrategyDefinition): Promise<Strategy> => notImplemented();
export const combineSignals = (_definition: CompositeStrategyDefinition, _signals: Array<{ strategyDefinitionId: string; signal: Signal }>): Signal => notImplemented();
