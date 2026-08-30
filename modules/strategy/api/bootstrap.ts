import type {
  CompositeStrategyDefinition,
  StrategyDefinition,
  StrategyFactory,
  StrategyModulePublicApi,
  StrategyAuthoringPort,
} from "./contracts";
import type {
  CompositeDefinitionRepository,
  StrategyDefinitionRepository,
} from "../application/ports";
import type { AuthenticatedRequestContext } from "modules/auth/api";
import type { StrategyAuthoringApplicationDependencies } from "../application/authoring";
import { createStrategyAuthoringApplication, createStrategyAuthoringFactory } from "../application/authoring";
import { createStrategyApplication } from "../application/service";
export interface StrategyModuleDependencies {
  factories: readonly StrategyFactory[];
  definitionRepository: StrategyDefinitionRepository<StrategyDefinition>;
  compositeRepository: CompositeDefinitionRepository<CompositeStrategyDefinition>;
}
export function createStrategyModule(deps: StrategyModuleDependencies): StrategyModulePublicApi {
  return createStrategyApplication(deps) as unknown as StrategyModulePublicApi;
}

export function createStrategyAuthoringPort(
  context: AuthenticatedRequestContext,
  dependencies: StrategyAuthoringApplicationDependencies,
): StrategyAuthoringPort {
  return createStrategyAuthoringApplication(context?.authenticatedUserId, dependencies) as unknown as StrategyAuthoringPort;
}

export function createStrategyAuthoringPortFactory(
  dependencies: StrategyAuthoringApplicationDependencies,
): (context: AuthenticatedRequestContext) => StrategyAuthoringPort {
  const factory = createStrategyAuthoringFactory(dependencies);
  return (context) => factory(context) as unknown as StrategyAuthoringPort;
}

export type { StrategyAuthoringApplicationDependencies } from "../application/authoring";
export type { StrategyDefinition, CompositeStrategyDefinition };
