export type Signal = "BUY" | "SELL" | "HOLD";
export type StrategyCategory = "TREND" | "MOMENTUM" | "VOLATILITY" | "STRUCTURE" | "INFORMATION";
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
  candles: StrategyCandle[];
  currentPrice: number;
  indicators: Record<string, number | number[]>;
  sentiment?: {
    label: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
    averageScore: number;
  };
}
export interface Strategy {
  readonly name: string;
  readonly category: StrategyCategory;
  analyze(context: StrategyContext): Signal;
}
export interface StrategyDefinition {
  id: string;
  logicalFamilyKey: string;
  familyName?: string;
  strategyName: string;
  implementationVersion: string;
  implementationSha256: string;
  version: number;
  parameters: Record<string, number | string>;
  createdAt: string;
}
export interface CompositeStrategyDefinition {
  id: string;
  logicalFamilyKey: string;
  version: number;
  method: CombinationMethod;
  components: Array<{
    strategyDefinitionId: string;
    weight: number;
  }>;
  thresholds?: {
    buy: number;
    sell: number;
  };
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
  options?: string[];
}
export interface StrategyPluginDescriptor {
  name: string;
  displayName: string;
  description: string;
  category: StrategyCategory;
  implementationVersion: string;
  implementationSha256: string;
  parameters: StrategyParameterDescriptor[];
}
export interface StrategyFactory {
  descriptor: StrategyPluginDescriptor;
  create(parameters: Record<string, number | string>): Strategy;
}
export interface StrategyArtifactResolver {
  resolve(strategyName: string, implementationSha256: string): Promise<StrategyFactory>;
}
