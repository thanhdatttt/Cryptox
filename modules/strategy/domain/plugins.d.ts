import type { StrategyFactory, StrategyPluginDescriptor, StrategyRegistry } from "./contracts";
export declare const builtInFactories: readonly StrategyFactory[];
export declare class InMemoryStrategyRegistry implements StrategyRegistry {
    private readonly factories;
    constructor(factories?: readonly StrategyFactory[]);
    register(factory: StrategyFactory): void;
    get(name: string, implementationSha256: string): StrategyFactory | undefined;
    list(): StrategyPluginDescriptor[];
}
export declare const createStrategyRegistry: (factories?: readonly StrategyFactory[]) => StrategyRegistry;
