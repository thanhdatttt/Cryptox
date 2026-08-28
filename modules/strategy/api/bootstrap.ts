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
import { createStrategyApplication } from "../application/service";
export interface StrategyModuleDependencies {
  factories: readonly StrategyFactory[];
  definitionRepository: StrategyDefinitionRepository<StrategyDefinition>;
  compositeRepository: CompositeDefinitionRepository<CompositeStrategyDefinition>;
}
export function createStrategyModule(deps: StrategyModuleDependencies): StrategyModulePublicApi {
  return createStrategyApplication(deps) as unknown as StrategyModulePublicApi;
}
export type { StrategyDefinition, CompositeStrategyDefinition };
