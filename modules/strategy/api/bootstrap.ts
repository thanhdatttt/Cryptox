import type {
  StrategyArtifactResolver,
  StrategyDefinition,
  CompositeStrategyDefinition,
} from "../domain/contracts";
import type {
  StrategyDefinitionRepository,
  CompositeDefinitionRepository,
} from "../application/ports";
export interface StrategyModuleDependencies {
  artifactResolver: StrategyArtifactResolver;
  definitionRepository: StrategyDefinitionRepository;
  compositeRepository: CompositeDefinitionRepository;
}
import type { StrategyModulePublicApi } from "./index";
import { combineSignals, listStrategies, resolveStrategy } from "./index";
import type { CombinationMethod } from "../domain/contracts";
export function createStrategyModule(_deps: StrategyModuleDependencies): StrategyModulePublicApi & {
  defineStrategy(
    strategyName: string,
    parameters: Record<string, number | string>,
  ): Promise<StrategyDefinition>;
  defineComposite(command: {
    method: CombinationMethod;
    components: Array<{ strategyDefinitionId: string; weight: number }>;
    thresholds?: { buy: number; sell: number };
  }): Promise<CompositeStrategyDefinition>;
} {
  return {
    listStrategies,
    resolveStrategy,
    combineSignals,
    defineStrategy: async () => {
      throw new Error("NOT_IMPLEMENTED");
    },
    defineComposite: async () => {
      throw new Error("NOT_IMPLEMENTED");
    },
  };
}
export type { StrategyDefinition, CompositeStrategyDefinition };
