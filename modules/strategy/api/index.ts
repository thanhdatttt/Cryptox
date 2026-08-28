import type {
  CompositeStrategyDefinition,
  DefineCompositeCommand,
  DefineStrategyCommand,
  Signal,
  Strategy,
  StrategyDefinition,
  StrategyModulePublicApi,
  StrategyPluginDescriptor,
  StrategyDefinitionPage,
  StrategyDefinitionPageRequest,
} from "./contracts";
import type { AuthenticatedRequestContext } from "modules/auth/api";
import { createStrategyApplication } from "../application/service";
import { createInMemoryStrategyDependencies } from "../application/memory";

export * from "./contracts";

const defaultStrategyApplication = createStrategyApplication(createInMemoryStrategyDependencies());

export const listStrategies = (): readonly StrategyPluginDescriptor[] =>
  defaultStrategyApplication.listStrategies() as readonly StrategyPluginDescriptor[];
export const defineStrategy = (
  context: AuthenticatedRequestContext,
  command: DefineStrategyCommand,
): Promise<StrategyDefinition> =>
  defaultStrategyApplication.defineStrategy(context, command) as Promise<StrategyDefinition>;
export const defineComposite = (
  context: AuthenticatedRequestContext,
  command: DefineCompositeCommand,
): Promise<CompositeStrategyDefinition> =>
  defaultStrategyApplication.defineComposite(context, command) as Promise<CompositeStrategyDefinition>;
export const readStrategyDefinition = (
  context: AuthenticatedRequestContext,
  id: string,
): Promise<StrategyDefinition> =>
  defaultStrategyApplication.readStrategyDefinition(context, id) as Promise<StrategyDefinition>;
export const readCompositeDefinition = (
  context: AuthenticatedRequestContext,
  id: string,
): Promise<CompositeStrategyDefinition> =>
  defaultStrategyApplication.readCompositeDefinition(context, id) as Promise<CompositeStrategyDefinition>;
export const listStrategyDefinitions = (
  context: AuthenticatedRequestContext,
  page: StrategyDefinitionPageRequest,
): Promise<StrategyDefinitionPage<StrategyDefinition>> =>
  defaultStrategyApplication.listStrategyDefinitions(context, page) as Promise<
    StrategyDefinitionPage<StrategyDefinition>
  >;
export const listCompositeDefinitions = (
  context: AuthenticatedRequestContext,
  page: StrategyDefinitionPageRequest,
): Promise<StrategyDefinitionPage<CompositeStrategyDefinition>> =>
  defaultStrategyApplication.listCompositeDefinitions(context, page) as Promise<
    StrategyDefinitionPage<CompositeStrategyDefinition>
  >;
export const resolveStrategy = (definition: StrategyDefinition): Promise<Strategy> =>
  defaultStrategyApplication.resolveStrategy(definition) as Promise<Strategy>;
export const combineSignals = (
  definition: CompositeStrategyDefinition,
  signals: ReadonlyArray<{ strategyDefinitionId: string; signal: Signal }>,
): Signal => defaultStrategyApplication.combineSignals(definition, signals);

export type _StrategyApiShape = StrategyModulePublicApi;
