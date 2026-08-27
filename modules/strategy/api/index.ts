import type {
  CompositeStrategyDefinition,
  DefineCompositeCommand,
  DefineStrategyCommand,
  Signal,
  Strategy,
  StrategyDefinition,
  StrategyModulePublicApi,
  StrategyPluginDescriptor,
} from "./contracts";

export * from "./contracts";

const notImplemented = (): never => {
  throw new Error("NOT_IMPLEMENTED");
};

export const listStrategies = (): readonly StrategyPluginDescriptor[] => notImplemented();
export const defineStrategy = async (
  _command: DefineStrategyCommand,
): Promise<StrategyDefinition> => notImplemented();
export const defineComposite = async (
  _command: DefineCompositeCommand,
): Promise<CompositeStrategyDefinition> => notImplemented();
export const resolveStrategy = async (_definition: StrategyDefinition): Promise<Strategy> =>
  notImplemented();
export const combineSignals = (
  _definition: CompositeStrategyDefinition,
  _signals: ReadonlyArray<{ strategyDefinitionId: string; signal: Signal }>,
): Signal => notImplemented();

export type _StrategyApiShape = StrategyModulePublicApi;
