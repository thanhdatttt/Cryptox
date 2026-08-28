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

export * from "./contracts";

const notImplemented = (): never => {
  throw new Error("NOT_IMPLEMENTED");
};

export const listStrategies = (): readonly StrategyPluginDescriptor[] => notImplemented();
export const defineStrategy = async (
  _context: AuthenticatedRequestContext,
  _command: DefineStrategyCommand,
): Promise<StrategyDefinition> => notImplemented();
export const defineComposite = async (
  _context: AuthenticatedRequestContext,
  _command: DefineCompositeCommand,
): Promise<CompositeStrategyDefinition> => notImplemented();
export const readStrategyDefinition = async (
  _context: AuthenticatedRequestContext,
  _id: string,
): Promise<StrategyDefinition> => notImplemented();
export const readCompositeDefinition = async (
  _context: AuthenticatedRequestContext,
  _id: string,
): Promise<CompositeStrategyDefinition> => notImplemented();
export const listStrategyDefinitions = async (
  _context: AuthenticatedRequestContext,
  _page: StrategyDefinitionPageRequest,
): Promise<StrategyDefinitionPage<StrategyDefinition>> => notImplemented();
export const listCompositeDefinitions = async (
  _context: AuthenticatedRequestContext,
  _page: StrategyDefinitionPageRequest,
): Promise<StrategyDefinitionPage<CompositeStrategyDefinition>> => notImplemented();
export const resolveStrategy = async (_definition: StrategyDefinition): Promise<Strategy> =>
  notImplemented();
export const combineSignals = (
  _definition: CompositeStrategyDefinition,
  _signals: ReadonlyArray<{ strategyDefinitionId: string; signal: Signal }>,
): Signal => notImplemented();

export type _StrategyApiShape = StrategyModulePublicApi;
