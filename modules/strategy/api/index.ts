import type { StrategyArtifactResolver, StrategyCategory, StrategyDefinition, CompositeStrategyDefinition, Strategy, Signal, StrategyPluginDescriptor, CombinationMethod } from "../domain/contracts";
import { builtInFactories } from "../domain/plugins";
export type { Signal, StrategyCategory, CombinationMethod, Strategy, StrategyDefinition, CompositeStrategyDefinition, StrategyContext, StrategyCandle, StrategyPluginDescriptor, StrategyFactory, StrategyArtifactResolver, StrategyParameterDescriptor } from "../domain/contracts";
export interface StrategyModulePublicApi { listStrategies(): StrategyPluginDescriptor[]; resolveStrategy(definition: StrategyDefinition): Promise<Strategy>; combineSignals(definition: CompositeStrategyDefinition, signals: Array<{ strategyDefinitionId: string; signal: Signal }>): Signal; readDefinitions(userId: string, ids: string[]): Promise<StrategyDefinition[]>; readComposite(userId: string, id: string): Promise<CompositeStrategyDefinition>; }
const factories = new Map(builtInFactories.map((factory) => [factory.descriptor.name, factory]));
export const listStrategies = (): StrategyPluginDescriptor[] => builtInFactories.map((factory) => factory.descriptor);
export const resolveStrategy = async (definition: StrategyDefinition): Promise<Strategy> => {
  const factory = factories.get(definition.strategyName);
  if (!factory || factory.descriptor.implementationSha256 !== definition.implementationSha256) throw new Error("STRATEGY_ARTIFACT_NOT_FOUND");
  return factory.create(definition.parameters);
};
export const combineSignals = (definition: CompositeStrategyDefinition, signals: Array<{ strategyDefinitionId: string; signal: Signal }>): Signal => {
  const selected = definition.components.map((component) => ({ component, signal: signals.find((item) => item.strategyDefinitionId === component.strategyDefinitionId)?.signal ?? "HOLD" as Signal }));
  if (selected.length === 0) return "HOLD";
  if (definition.method === "MAJORITY_VOTE") {
    const counts = { BUY: 0, SELL: 0, HOLD: 0 };
    selected.forEach(({ signal }) => { counts[signal] += 1; });
    if (counts.BUY > counts.SELL && counts.BUY > counts.HOLD) return "BUY";
    if (counts.SELL > counts.BUY && counts.SELL > counts.HOLD) return "SELL";
    return "HOLD";
  }
  const score = selected.reduce((sum, { component, signal }) => sum + component.weight * (signal === "BUY" ? 1 : signal === "SELL" ? -1 : 0), 0);
  const thresholds = definition.thresholds ?? { buy: 0.3, sell: -0.3 };
  if (score > thresholds.buy) return "BUY";
  if (score < thresholds.sell) return "SELL";
  return "HOLD";
};
