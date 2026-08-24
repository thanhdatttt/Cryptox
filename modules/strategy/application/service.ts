import { createHash } from "node:crypto";
import type { CombinationMethod, CompositeStrategyDefinition, Signal, Strategy, StrategyDefinition, StrategyFactory, StrategyPluginDescriptor } from "../domain/contracts";
import { builtInFactories } from "../domain/plugins";
import type { CompositeDefinitionRepository, StrategyDefinitionRepository } from "./ports";

export interface StrategyModuleDependencies { artifactResolver: import("../domain/contracts").StrategyArtifactResolver; definitionRepository: StrategyDefinitionRepository; compositeRepository: CompositeDefinitionRepository; }

export interface StrategyModuleRuntime {
  listStrategies(): StrategyPluginDescriptor[];
  resolveStrategy(definition: StrategyDefinition): Promise<Strategy>;
  combineSignals(definition: CompositeStrategyDefinition, signals: Array<{ strategyDefinitionId: string; signal: Signal }>): Signal;
  readDefinitions(userId: string, ids: string[]): Promise<StrategyDefinition[]>;
  readComposite(userId: string, id: string): Promise<CompositeStrategyDefinition>;
  defineStrategy(userId: string, strategyName: string, parameters: Record<string, number | string>): Promise<StrategyDefinition>;
  defineComposite(userId: string, command: { method: CombinationMethod; components: Array<{ strategyDefinitionId: string; weight: number }>; thresholds?: { buy: number; sell: number } }): Promise<CompositeStrategyDefinition>;
  buildVisualization(definition: StrategyDefinition): [];
}

interface Stored<T> { ownerUserId: string; value: T; }

const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right))) : item);
const digest = (value: unknown): string => createHash("sha256").update(stable(value)).digest("hex");
const isPlainRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const invalid = (code: string): never => { throw new Error(code); };

const runtimeList = (): StrategyPluginDescriptor[] => builtInFactories.map((factory) => factory.descriptor);
const runtimeResolve = async (definition: StrategyDefinition): Promise<Strategy> => {
  const factory = builtInFactories.find((candidate) => candidate.descriptor.name === definition.strategyName && candidate.descriptor.implementationSha256 === definition.implementationSha256);
  if (!factory) invalid("STRATEGY_ARTIFACT_NOT_FOUND");
  return factory!.create(definition.parameters);
};
const runtimeCombine = (definition: CompositeStrategyDefinition, signals: Array<{ strategyDefinitionId: string; signal: Signal }>): Signal => {
  const selected = definition.components.map((component) => ({ component, signal: signals.find((item) => item.strategyDefinitionId === component.strategyDefinitionId)?.signal ?? "HOLD" as Signal }));
  if (selected.length === 0) return "HOLD";
  if (definition.method === "MAJORITY_VOTE") {
    const counts = { BUY: 0, SELL: 0, HOLD: 0 };
    selected.forEach(({ signal }) => { counts[signal] += 1; });
    if (counts.BUY > counts.SELL && counts.BUY > counts.HOLD) return "BUY";
    return counts.SELL > counts.BUY && counts.SELL > counts.HOLD ? "SELL" : "HOLD";
  }
  const score = selected.reduce((sum, { component, signal }) => sum + component.weight * (signal === "BUY" ? 1 : signal === "SELL" ? -1 : 0), 0);
  const thresholds = definition.thresholds ?? { buy: 0.3, sell: -0.3 };
  return score > thresholds.buy ? "BUY" : score < thresholds.sell ? "SELL" : "HOLD";
};

const validateParameters = (factory: StrategyFactory, parameters: Record<string, number | string>): Record<string, number | string> => {
  if (!isPlainRecord(parameters)) invalid("INVALID_STRATEGY_PARAMETERS");
  const declared = new Map(factory.descriptor.parameters.map((descriptor) => [descriptor.key, descriptor]));
  if (Object.keys(parameters).some((key) => !declared.has(key))) invalid("INVALID_STRATEGY_PARAMETERS");
  const normalized: Record<string, number | string> = {};
  for (const descriptor of factory.descriptor.parameters) {
    const value = parameters[descriptor.key] ?? descriptor.defaultValue;
    if (value === undefined && descriptor.required) invalid("INVALID_STRATEGY_PARAMETERS");
    if (descriptor.type === "ENUM") {
      if (typeof value !== "string" || !descriptor.options?.includes(value)) invalid("INVALID_STRATEGY_PARAMETERS");
    } else {
      if (typeof value !== "number" || !Number.isFinite(value) || (descriptor.type === "INTEGER" && !Number.isInteger(value))) invalid("INVALID_STRATEGY_PARAMETERS");
      const numericValue = value as number;
      if (descriptor.minimum !== undefined && numericValue < descriptor.minimum) invalid("INVALID_STRATEGY_PARAMETERS");
      if (descriptor.maximum !== undefined && numericValue > descriptor.maximum) invalid("INVALID_STRATEGY_PARAMETERS");
    }
    normalized[descriptor.key] = value;
  }
  if (factory.descriptor.name === "MA" && Number(normalized.fastPeriod) >= Number(normalized.slowPeriod)) invalid("INVALID_STRATEGY_PARAMETERS");
  if (factory.descriptor.name === "RSI" && Number(normalized.buyThreshold) >= Number(normalized.sellThreshold)) invalid("INVALID_STRATEGY_PARAMETERS");
  return normalized;
};

export function createInMemoryStrategyDependencies(): StrategyModuleDependencies {
  const definitions = new Map<string, StrategyDefinition>();
  const composites = new Map<string, CompositeStrategyDefinition>();
  const factories = new Map(builtInFactories.map((factory) => [`${factory.descriptor.name}:${factory.descriptor.implementationSha256}`, factory]));
  return {
    artifactResolver: { resolve: async (name, sha) => { const factory = factories.get(`${name}:${sha}`); if (!factory) throw new Error("STRATEGY_ARTIFACT_NOT_FOUND"); return factory; } },
    definitionRepository: { insert: async (definition) => { definitions.set(definition.id, definition); return definition; }, listByIds: async (ids) => ids.flatMap((id) => { const definition = definitions.get(id); return definition ? [definition] : []; }) },
    compositeRepository: { insert: async (composite) => { composites.set(composite.id, composite); return composite; }, get: async (id) => composites.get(id) },
  };
}

export function createStrategyModule(dependencies: StrategyModuleDependencies = createInMemoryStrategyDependencies()): StrategyModuleRuntime {
  const definitions = new Map<string, Stored<StrategyDefinition>>();
  const composites = new Map<string, Stored<CompositeStrategyDefinition>>();
  const factories = new Map(builtInFactories.map((factory) => [factory.descriptor.name, factory]));
  let sequence = 0;
  const nextId = (kind: string): string => `${kind}-${++sequence}`;
  const ownedDefinitions = (userId: string): StrategyDefinition[] => [...definitions.values()].filter((item) => item.ownerUserId === userId).map((item) => item.value);
  const ownedComposites = (userId: string): CompositeStrategyDefinition[] => [...composites.values()].filter((item) => item.ownerUserId === userId).map((item) => item.value);
  const getDefinition = async (userId: string, id: string): Promise<StrategyDefinition> => {
    const stored = definitions.get(id);
    if (!stored || stored.ownerUserId !== userId) invalid("STRATEGY_DEFINITION_NOT_FOUND");
    return stored!.value;
  };

  return {
    listStrategies: runtimeList,
    resolveStrategy: async (definition) => {
      await dependencies.artifactResolver.resolve(definition.strategyName, definition.implementationSha256);
      return runtimeResolve(definition);
    },
    combineSignals: runtimeCombine,
    readDefinitions: async (userId, ids) => Promise.all(ids.map((id) => getDefinition(userId, id))),
    readComposite: async (userId, id) => {
      const stored = composites.get(id);
      if (!stored || stored.ownerUserId !== userId) invalid("COMPOSITE_STRATEGY_NOT_FOUND");
      return stored!.value;
    },
    defineStrategy: async (userId, strategyName, parameters) => {
      if (!userId.trim()) invalid("INVALID_USER");
      const factory = factories.get(strategyName);
      if (!factory) invalid("STRATEGY_NOT_REGISTERED");
      const normalized = validateParameters(factory!, parameters);
      const logicalFamilyKey = `strategy:${strategyName}`;
      const content = { strategyName, implementationSha256: factory!.descriptor.implementationSha256, parameters: normalized };
      const prior = ownedDefinitions(userId).filter((definition) => definition.logicalFamilyKey === logicalFamilyKey);
      const existing = prior.find((definition) => digest({ strategyName: definition.strategyName, implementationSha256: definition.implementationSha256, parameters: definition.parameters }) === digest(content));
      if (existing) return existing;
      const definition: StrategyDefinition = { id: nextId("strategy-definition"), logicalFamilyKey, familyName: factory!.descriptor.displayName, strategyName, implementationVersion: factory!.descriptor.implementationVersion, implementationSha256: factory!.descriptor.implementationSha256, version: Math.max(0, ...prior.map((item) => item.version)) + 1, parameters: normalized, createdAt: new Date().toISOString() };
      const saved = await dependencies.definitionRepository.insert(definition);
      definitions.set(saved.id, { ownerUserId: userId, value: saved });
      return saved;
    },
    defineComposite: async (userId, command) => {
      if (!userId.trim() || !command || !["MAJORITY_VOTE", "WEIGHTED_SCORE"].includes(command.method) || command.components.length === 0) invalid("INVALID_COMPOSITE_STRATEGY");
      const components = command.components.map((component) => ({ strategyDefinitionId: component.strategyDefinitionId, weight: component.weight }));
      await Promise.all(components.map((component) => getDefinition(userId, component.strategyDefinitionId)));
      let thresholds: { buy: number; sell: number };
      if (command.method === "MAJORITY_VOTE") {
        for (const component of components) component.weight = 0;
        thresholds = { buy: 0.3, sell: -0.3 };
      } else {
        const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
        if (components.some((component) => !Number.isFinite(component.weight)) || Math.abs(totalWeight - 1) > 1e-9) invalid("INVALID_COMPOSITE_STRATEGY");
        thresholds = command.thresholds ?? { buy: 0.3, sell: -0.3 };
        if (![thresholds.buy, thresholds.sell].every(Number.isFinite) || thresholds.buy <= thresholds.sell) invalid("INVALID_COMPOSITE_STRATEGY");
      }
      const logicalFamilyKey = `composite:${command.method}:${components.map((component) => component.strategyDefinitionId).sort().join(",")}`;
      const content = { method: command.method, components, thresholds };
      const prior = ownedComposites(userId).filter((composite) => composite.logicalFamilyKey === logicalFamilyKey);
      const existing = prior.find((composite) => digest({ method: composite.method, components: composite.components, thresholds: composite.thresholds }) === digest(content));
      if (existing) return existing;
      const composite: CompositeStrategyDefinition = { id: nextId("composite-strategy"), logicalFamilyKey, version: Math.max(0, ...prior.map((item) => item.version)) + 1, method: command.method, components, thresholds, createdAt: new Date().toISOString() };
      const saved = await dependencies.compositeRepository.insert(composite);
      composites.set(saved.id, { ownerUserId: userId, value: saved });
      return saved;
    },
    buildVisualization: () => [],
  };
}
