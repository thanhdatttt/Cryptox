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
export type StrategyVisualizationOverlay = {
    id: string;
    strategyDefinitionId: string;
    kind: "LINE";
    label: string;
    points: Array<{
        time: string;
        value: number;
    }>;
} | {
    id: string;
    strategyDefinitionId: string;
    kind: "ZONE";
    label: string;
    points: Array<{
        time: string;
        low: number;
        high: number;
    }>;
} | {
    id: string;
    strategyDefinitionId: string;
    kind: "SIGNAL";
    label: string;
    points: Array<{
        time: string;
        value: number;
        signal: Signal;
    }>;
};
export type StrategyVisualizationOverlayDraft = {
    id: string;
    strategyDefinitionId?: string;
    kind: "LINE";
    label: string;
    points: Array<{
        time: string;
        value: number;
    }>;
} | {
    id: string;
    strategyDefinitionId?: string;
    kind: "ZONE";
    label: string;
    points: Array<{
        time: string;
        low: number;
        high: number;
    }>;
} | {
    id: string;
    strategyDefinitionId?: string;
    kind: "SIGNAL";
    label: string;
    points: Array<{
        time: string;
        value: number;
        signal: Signal;
    }>;
};
export interface Strategy {
    readonly name: string;
    readonly category: StrategyCategory;
    analyze(context: StrategyContext): Signal;
    buildVisualization?(contexts: readonly StrategyContext[]): StrategyVisualizationOverlayDraft[];
}
export interface StrategyDefinition {
    id: string;
    userId: string;
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
    userId: string;
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
    readonly minimumHistoryCandles: number;
    readonly parameters: readonly StrategyParameterDescriptor[];
}
export interface StrategyFactory {
    descriptor: StrategyPluginDescriptor;
    create(parameters: Record<string, number | string>): Strategy;
    validateParameters?(parameters: Record<string, number | string>): void;
}
export interface StrategyArtifactResolver {
    resolve(strategyName: string, implementationSha256: string): Promise<StrategyFactory>;
    resolveSync?(strategyName: string, implementationSha256: string): StrategyFactory | undefined;
}
