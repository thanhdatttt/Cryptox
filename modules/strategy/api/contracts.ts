export const STRATEGY_SIGNALS = ["BUY", "SELL", "HOLD"] as const;
export type Signal = (typeof STRATEGY_SIGNALS)[number];

export type StrategyCategory =
  | "TREND"
  | "MOMENTUM"
  | "VOLATILITY"
  | "STRUCTURE"
  | "INFORMATION";
export type CombinationMethod = "MAJORITY_VOTE" | "WEIGHTED_SCORE";

export interface StrategyCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StrategyContext {
  pair: string;
  timeframe: "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
  candles: readonly StrategyCandle[];
  currentPrice: number;
  indicators: Readonly<Record<string, number | readonly number[]>>;
  sentiment?: { label: "POSITIVE" | "NEUTRAL" | "NEGATIVE"; averageScore: number };
}

export interface Strategy {
  readonly name: string;
  readonly category: StrategyCategory;
  analyze(context: StrategyContext): Signal;
}

export interface StrategyDefinition {
  id: string;
  logicalFamilyKey: string;
  strategyName: string;
  implementationVersion: string;
  version: number;
  parameters: Readonly<Record<string, number | string>>;
  createdAt: string;
}

export interface CompositeStrategyDefinition {
  id: string;
  logicalFamilyKey: string;
  version: number;
  method: CombinationMethod;
  components: ReadonlyArray<{ strategyDefinitionId: string; weight?: number }>;
  thresholds?: { buy: number; sell: number };
  createdAt: string;
}

export interface StrategyParameterDescriptor {
  key: string;
  label: string;
  type: "INTEGER" | "NUMBER" | "ENUM";
  required: boolean;
  defaultValue: number | string;
  minimum?: number;
  maximum?: number;
  step?: number;
  options?: readonly string[];
}

export interface StrategyPluginDescriptor {
  name: string;
  displayName: string;
  description: string;
  category: StrategyCategory;
  implementationVersion: string;
  parameters: readonly StrategyParameterDescriptor[];
}

export interface StrategyFactory {
  readonly descriptor: StrategyPluginDescriptor;
  create(parameters: Readonly<Record<string, number | string>>): Strategy;
}

export interface DefineStrategyCommand {
  strategyName: string;
  parameters: Readonly<Record<string, number | string>>;
}

export interface DefineCompositeCommand {
  method: CombinationMethod;
  components: ReadonlyArray<{ strategyDefinitionId: string; weight?: number }>;
  thresholds?: { buy: number; sell: number };
}

export interface StrategyModulePublicApi {
  listStrategies(): readonly StrategyPluginDescriptor[];
  defineStrategy(command: DefineStrategyCommand): Promise<StrategyDefinition>;
  defineComposite(command: DefineCompositeCommand): Promise<CompositeStrategyDefinition>;
  resolveStrategy(definition: StrategyDefinition): Promise<Strategy>;
  combineSignals(
    definition: CompositeStrategyDefinition,
    signals: ReadonlyArray<{ strategyDefinitionId: string; signal: Signal }>,
  ): Signal;
}
