import type { AuthenticatedUserId } from "modules/auth/api";

export type StrategySignal = "BUY" | "SELL" | "HOLD";
export type StrategyParameterValue = number | string;
export type StrategyCategory =
  | "TREND"
  | "MOMENTUM"
  | "VOLATILITY"
  | "STRUCTURE"
  | "INFORMATION";

export interface StrategyCandlePort {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: true;
}

export interface StrategyContextPort {
  pair: string;
  timeframe: string;
  candles: readonly StrategyCandlePort[];
}

export interface StrategyAnalysisPort {
  signal: StrategySignal;
  signalAt: string;
  visualization: readonly StrategyVisualizationPointPort[];
}

export type VisualizationKindPort = "LINE" | "BAND" | "ZONE";
export type VisualizationPanePort = "PRICE" | "INDICATOR";
export interface StrategyVisualizationPointPort {
  descriptorId: string;
  timestamp: string;
  values: Readonly<Record<string, number>>;
}
export interface StrategyVisualizationDescriptorPort {
  id: string;
  label: string;
  kind: VisualizationKindPort;
  pane: VisualizationPanePort;
  series: readonly { key: string; label: string }[];
}

export interface StrategyRuntimePort {
  readonly name: string;
  readonly category: StrategyCategory;
  analyze(context: StrategyContextPort): StrategyAnalysisPort;
}

export interface StrategyParameterDescriptorPort {
  key: string;
  label: string;
  type: "INTEGER" | "NUMBER" | "ENUM";
  required: boolean;
  defaultValue: StrategyParameterValue;
  minimum?: number;
  maximum?: number;
  step?: number;
  options?: readonly string[];
}

export interface StrategyPluginDescriptorPort {
  name: string;
  displayName: string;
  description: string;
  category: StrategyCategory;
  implementationVersion: string;
  behaviorProfileId: string;
  parameters: readonly StrategyParameterDescriptorPort[];
  visualization: readonly StrategyVisualizationDescriptorPort[];
}

export interface StrategyFactoryPort {
  readonly descriptor: StrategyPluginDescriptorPort;
  create(parameters: Readonly<Record<string, StrategyParameterValue>>): StrategyRuntimePort;
}

export interface StrategyDefinitionRecord {
  id: string;
  ownerUserId: AuthenticatedUserId;
  logicalFamilyKey: string;
  strategyName: string;
  implementationVersion: string;
  behaviorProfileId: string;
  version: number;
  parameters: Readonly<Record<string, StrategyParameterValue>>;
  createdAt: string;
}

export interface CompositeComponentRecord {
  strategyDefinitionId: string;
  strategyDefinitionVersion: number;
}

export interface CompositeDefinitionRecord {
  id: string;
  ownerUserId: AuthenticatedUserId;
  logicalFamilyKey: string;
  version: number;
  method: "MAJORITY_VOTE";
  combinationProfileId: "MAJORITY_VOTE_V1";
  components: readonly CompositeComponentRecord[];
  createdAt: string;
}

export interface StrategyApplicationApi {
  listStrategies(): readonly StrategyPluginDescriptorPort[];
  defineStrategy(
    context: { authenticatedUserId: AuthenticatedUserId },
    command: {
      logicalFamilyKey: string;
      strategyName: string;
      parameters: Readonly<Record<string, StrategyParameterValue>>;
    },
  ): Promise<StrategyDefinitionRecord>;
  defineComposite(
    context: { authenticatedUserId: AuthenticatedUserId },
    command: {
      logicalFamilyKey: string;
      combinationProfileId: "MAJORITY_VOTE_V1";
      strategyDefinitionIds: readonly string[];
    },
  ): Promise<CompositeDefinitionRecord>;
  readStrategyDefinition(
    context: { authenticatedUserId: AuthenticatedUserId },
    id: string,
  ): Promise<StrategyDefinitionRecord>;
  readCompositeDefinition(
    context: { authenticatedUserId: AuthenticatedUserId },
    id: string,
  ): Promise<CompositeDefinitionRecord>;
  listStrategyDefinitions(
    context: { authenticatedUserId: AuthenticatedUserId },
    page: { limit: number; cursor?: string },
  ): Promise<{ items: readonly StrategyDefinitionRecord[]; nextCursor?: string }>;
  listCompositeDefinitions(
    context: { authenticatedUserId: AuthenticatedUserId },
    page: { limit: number; cursor?: string },
  ): Promise<{ items: readonly CompositeDefinitionRecord[]; nextCursor?: string }>;
  resolveStrategy(definition: StrategyDefinitionRecord): Promise<StrategyRuntimePort>;
  combineSignals(
    definition: CompositeDefinitionRecord,
    signals: ReadonlyArray<{ strategyDefinitionId: string; signal: StrategySignal }>,
  ): StrategySignal;
}

export interface StrategyDefinitionRepository<TDefinition> {
  allocateNextVersion(ownerUserId: AuthenticatedUserId, logicalFamilyKey: string): Promise<number>;
  insert(ownerUserId: AuthenticatedUserId, definition: TDefinition): Promise<TDefinition>;
  getByOwnerAndId(
    ownerUserId: AuthenticatedUserId,
    id: string,
  ): Promise<TDefinition | undefined>;
  listByOwner(
    ownerUserId: AuthenticatedUserId,
    page: { limit: number; cursor?: string },
  ): Promise<{ items: readonly TDefinition[]; nextCursor?: string }>;
}
export interface CompositeDefinitionRepository<TDefinition> {
  allocateNextVersion(ownerUserId: AuthenticatedUserId, logicalFamilyKey: string): Promise<number>;
  insert(ownerUserId: AuthenticatedUserId, definition: TDefinition): Promise<TDefinition>;
  getByOwnerAndId(
    ownerUserId: AuthenticatedUserId,
    id: string,
  ): Promise<TDefinition | undefined>;
  listByOwner(
    ownerUserId: AuthenticatedUserId,
    page: { limit: number; cursor?: string },
  ): Promise<{ items: readonly TDefinition[]; nextCursor?: string }>;
}

export interface StrategyApplicationDependencies {
  factories: readonly StrategyFactoryPort[];
  definitionRepository: StrategyDefinitionRepository<StrategyDefinitionRecord>;
  compositeRepository: CompositeDefinitionRepository<CompositeDefinitionRecord>;
}
