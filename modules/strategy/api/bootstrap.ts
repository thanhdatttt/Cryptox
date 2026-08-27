import type {
  CompositeStrategyDefinition,
  StrategyDefinition,
  StrategyFactory,
  StrategyModulePublicApi,
} from "./contracts";
import type {
  CompositeDefinitionRepository,
  StrategyDefinitionRepository,
} from "../application/ports";
export interface StrategyModuleDependencies {
  factories: readonly StrategyFactory[];
  definitionRepository: StrategyDefinitionRepository<StrategyDefinition>;
  compositeRepository: CompositeDefinitionRepository<CompositeStrategyDefinition>;
}
import {
  combineSignals,
  defineComposite,
  defineStrategy,
  listStrategies,
  readCompositeDefinition,
  readStrategyDefinition,
  resolveStrategy,
} from "./index";
export function createStrategyModule(_deps: StrategyModuleDependencies): StrategyModulePublicApi {
  return {
    listStrategies,
    defineStrategy,
    defineComposite,
    readStrategyDefinition,
    readCompositeDefinition,
    resolveStrategy,
    combineSignals,
  };
}
export type { StrategyDefinition, CompositeStrategyDefinition };
