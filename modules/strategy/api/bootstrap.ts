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
import type {
  StrategyAuthoringApplicationDependencies,
  StrategyAuthoringPortShape,
} from "../application/authoring";
import { createStrategyAuthoringApplication, createStrategyAuthoringFactory } from "../application/authoring";
import { createStrategyApplication } from "../application/service";

export type StrategyAuthoringModuleDependencies = Omit<
  StrategyAuthoringApplicationDependencies,
  "factories" | "definitionRepository"
>;

export interface StrategyModuleWithAuthoring extends StrategyModulePublicApi {
  createAuthoringPort(context: AuthenticatedRequestContext): StrategyAuthoringPort;
}

export interface StrategyModuleDependencies {
  factories: readonly StrategyFactory[];
  definitionRepository: StrategyDefinitionRepository<StrategyDefinition>;
  compositeRepository: CompositeDefinitionRepository<CompositeStrategyDefinition>;
  authoring?: StrategyAuthoringModuleDependencies;
}

export function createStrategyModule(
  deps: StrategyModuleDependencies & { readonly authoring: StrategyAuthoringModuleDependencies },
): StrategyModuleWithAuthoring;
export function createStrategyModule(deps: StrategyModuleDependencies): StrategyModulePublicApi;
export function createStrategyModule(
  deps: StrategyModuleDependencies,
): StrategyModulePublicApi | StrategyModuleWithAuthoring {
  const core = createStrategyApplication(deps) as unknown as StrategyModulePublicApi;
  if (!deps.authoring) return core;

  const authoringDependencies: StrategyAuthoringApplicationDependencies = {
    ...deps.authoring,
    factories: deps.factories,
    definitionRepository: deps.definitionRepository,
  };
  const authoringFactory = createStrategyAuthoringFactory(authoringDependencies);
  return {
    ...core,
    createAuthoringPort: (context) => authoringFactory(context) as unknown as StrategyAuthoringPort,
  };
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
export type { StrategyAuthoringPortShape } from "../application/authoring";
export type { StrategyDefinition, CompositeStrategyDefinition };

export {
  createPostgresStrategyDependencies,
  type PostgresPool,
  type PostgresQueryResult,
  type PostgresStrategyDependencies,
  type PostgresStrategyOptions,
} from "../infrastructure/postgres";
export {
  createOpenAiCompatibleAuthoringProvider,
  StrategyAuthoringProviderError,
} from "../infrastructure/openai-compatible";
export type {
  AuthoringProviderErrorCode,
  OpenAiCompatibleAuthoringOptions,
  OpenAiCompatibleAuthoringProvider,
  OpenAiCompatibleFetch,
  OpenAiCompatibleRequestInit,
  OpenAiCompatibleResponse,
} from "../infrastructure/openai-compatible";
