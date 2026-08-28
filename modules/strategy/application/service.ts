import type { AuthenticatedUserId } from "modules/auth/api";
import type {
  CompositeDefinitionRecord,
  StrategyApplicationApi,
  StrategyApplicationDependencies,
  StrategyDefinitionRecord,
  StrategyFactoryPort,
  StrategyParameterDescriptorPort,
  StrategyParameterValue,
  StrategyPluginDescriptorPort,
  StrategyRuntimePort,
  StrategySignal,
} from "./ports";

const SIGNALS = new Set<StrategySignal>(["BUY", "SELL", "HOLD"]);

export class StrategyApplicationError extends Error {
  constructor(readonly code: string, message = code) {
    super(message);
    this.name = "StrategyApplicationError";
  }
}

function assertContext(context: { authenticatedUserId: AuthenticatedUserId }): AuthenticatedUserId {
  if (!context || typeof context.authenticatedUserId !== "string" || !context.authenticatedUserId) {
    throw new StrategyApplicationError("UNAUTHENTICATED");
  }
  return context.authenticatedUserId;
}

function nonEmpty(value: string, code = "INVALID_STRATEGY_INPUT"): string {
  if (typeof value !== "string" || !value.trim()) throw new StrategyApplicationError(code);
  return value.trim();
}

function normalizeParameters(
  input: Readonly<Record<string, StrategyParameterValue>>,
  descriptors: readonly StrategyParameterDescriptorPort[],
): Readonly<Record<string, StrategyParameterValue>> {
  const descriptorByKey = new Map(descriptors.map((descriptor) => [descriptor.key, descriptor]));
  for (const key of Object.keys(input)) {
    if (!descriptorByKey.has(key)) throw new StrategyApplicationError("INVALID_STRATEGY_PARAMETERS");
  }
  const result: Record<string, StrategyParameterValue> = {};
  for (const descriptor of descriptors) {
    const present = Object.prototype.hasOwnProperty.call(input, descriptor.key);
    if (!present) {
      if (descriptor.required) throw new StrategyApplicationError("INVALID_STRATEGY_PARAMETERS");
      result[descriptor.key] = descriptor.defaultValue;
      continue;
    }
    const value = input[descriptor.key];
    if (descriptor.type === "ENUM") {
      if (typeof value !== "string" || !value || !descriptor.options?.includes(value)) {
        throw new StrategyApplicationError("INVALID_STRATEGY_PARAMETERS");
      }
    } else if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      (descriptor.type === "INTEGER" && !Number.isInteger(value)) ||
      (descriptor.minimum !== undefined && value < descriptor.minimum) ||
      (descriptor.maximum !== undefined && value > descriptor.maximum)
    ) {
      throw new StrategyApplicationError("INVALID_STRATEGY_PARAMETERS");
    }
    result[descriptor.key] = value;
  }
  return Object.freeze(
    Object.fromEntries(Object.keys(result).sort().map((key) => [key, result[key]])),
  );
}

function findFactory(factories: readonly StrategyFactoryPort[], name: string): StrategyFactoryPort {
  const factory = factories.find((candidate) => candidate.descriptor.name === name);
  if (!factory) throw new StrategyApplicationError("STRATEGY_NOT_AVAILABLE");
  return factory;
}

function validatePage(page: { limit: number; cursor?: string }): void {
  if (!page || !Number.isInteger(page.limit) || page.limit < 1 || page.limit > 100) {
    throw new StrategyApplicationError("INVALID_PAGE");
  }
}

export function createStrategyApplication(
  dependencies: StrategyApplicationDependencies,
): StrategyApplicationApi {
  const listStrategies = (): readonly StrategyPluginDescriptorPort[] =>
    dependencies.factories.map((factory) => factory.descriptor);

  const defineStrategy = async (
    context: { authenticatedUserId: AuthenticatedUserId },
    command: {
      logicalFamilyKey: string;
      strategyName: string;
      parameters: Readonly<Record<string, StrategyParameterValue>>;
    },
  ): Promise<StrategyDefinitionRecord> => {
    const ownerUserId = assertContext(context);
    const logicalFamilyKey = nonEmpty(command.logicalFamilyKey);
    const strategyName = nonEmpty(command.strategyName);
    const factory = findFactory(dependencies.factories, strategyName);
    const definition: StrategyDefinitionRecord = {
      id: crypto.randomUUID(),
      ownerUserId,
      logicalFamilyKey,
      strategyName,
      implementationVersion: factory.descriptor.implementationVersion,
      behaviorProfileId: factory.descriptor.behaviorProfileId,
      version: await dependencies.definitionRepository.allocateNextVersion(ownerUserId, logicalFamilyKey),
      parameters: normalizeParameters(command.parameters ?? {}, factory.descriptor.parameters),
      createdAt: new Date().toISOString(),
    };
    return dependencies.definitionRepository.insert(ownerUserId, Object.freeze(definition));
  };

  const defineComposite = async (
    context: { authenticatedUserId: AuthenticatedUserId },
    command: {
      logicalFamilyKey: string;
      combinationProfileId: "MAJORITY_VOTE_V1";
      strategyDefinitionIds: readonly string[];
    },
  ): Promise<CompositeDefinitionRecord> => {
    const ownerUserId = assertContext(context);
    const logicalFamilyKey = nonEmpty(command.logicalFamilyKey);
    if (command.combinationProfileId !== "MAJORITY_VOTE_V1") {
      throw new StrategyApplicationError("INVALID_COMBINATION_PROFILE");
    }
    const ids = [...new Set(command.strategyDefinitionIds ?? [])].sort();
    if (ids.length < 2 || ids.length !== (command.strategyDefinitionIds ?? []).length) {
      throw new StrategyApplicationError("INVALID_COMPOSITE_COMPONENTS");
    }
    const components = [] as Array<{ strategyDefinitionId: string; strategyDefinitionVersion: number }>;
    for (const id of ids) {
      const definition = await dependencies.definitionRepository.getByOwnerAndId(ownerUserId, id);
      if (!definition) throw new StrategyApplicationError("NOT_FOUND");
      components.push({ strategyDefinitionId: definition.id, strategyDefinitionVersion: definition.version });
    }
    const definition: CompositeDefinitionRecord = {
      id: crypto.randomUUID(),
      ownerUserId,
      logicalFamilyKey,
      version: await dependencies.compositeRepository.allocateNextVersion(ownerUserId, logicalFamilyKey),
      method: "MAJORITY_VOTE",
      combinationProfileId: "MAJORITY_VOTE_V1",
      components: Object.freeze(components),
      createdAt: new Date().toISOString(),
    };
    return dependencies.compositeRepository.insert(ownerUserId, Object.freeze(definition));
  };

  const readStrategyDefinition = async (
    context: { authenticatedUserId: AuthenticatedUserId },
    id: string,
  ): Promise<StrategyDefinitionRecord> => {
    const definition = await dependencies.definitionRepository.getByOwnerAndId(assertContext(context), id);
    if (!definition) throw new StrategyApplicationError("NOT_FOUND");
    return definition;
  };

  const readCompositeDefinition = async (
    context: { authenticatedUserId: AuthenticatedUserId },
    id: string,
  ): Promise<CompositeDefinitionRecord> => {
    const definition = await dependencies.compositeRepository.getByOwnerAndId(assertContext(context), id);
    if (!definition) throw new StrategyApplicationError("NOT_FOUND");
    return definition;
  };

  const listStrategyDefinitions = async (
    context: { authenticatedUserId: AuthenticatedUserId },
    page: { limit: number; cursor?: string },
  ) => {
    validatePage(page);
    return dependencies.definitionRepository.listByOwner(assertContext(context), page);
  };

  const listCompositeDefinitions = async (
    context: { authenticatedUserId: AuthenticatedUserId },
    page: { limit: number; cursor?: string },
  ) => {
    validatePage(page);
    return dependencies.compositeRepository.listByOwner(assertContext(context), page);
  };

  const resolveStrategy = async (definition: StrategyDefinitionRecord): Promise<StrategyRuntimePort> => {
    const factory = findFactory(dependencies.factories, definition.strategyName);
    if (
      factory.descriptor.implementationVersion !== definition.implementationVersion ||
      factory.descriptor.behaviorProfileId !== definition.behaviorProfileId
    ) {
      throw new StrategyApplicationError("STRATEGY_IMPLEMENTATION_UNAVAILABLE");
    }
    return factory.create(normalizeParameters(definition.parameters, factory.descriptor.parameters));
  };

  const combineSignals = (
    definition: CompositeDefinitionRecord,
    signals: ReadonlyArray<{ strategyDefinitionId: string; signal: StrategySignal }>,
  ): StrategySignal => {
    if (definition.method !== "MAJORITY_VOTE" || definition.combinationProfileId !== "MAJORITY_VOTE_V1") {
      throw new StrategyApplicationError("INVALID_COMBINATION_PROFILE");
    }
    const componentIds = definition.components.map((component) => component.strategyDefinitionId);
    if (componentIds.length < 2 || new Set(componentIds).size !== componentIds.length) {
      throw new StrategyApplicationError("INVALID_COMPOSITE_COMPONENTS");
    }
    const expected = new Set(componentIds);
    if (signals.length !== componentIds.length || new Set(signals.map((entry) => entry.strategyDefinitionId)).size !== signals.length) {
      throw new StrategyApplicationError("INVALID_COMPOSITE_SIGNALS");
    }
    const counts: Record<StrategySignal, number> = { BUY: 0, SELL: 0, HOLD: 0 };
    for (const entry of signals) {
      if (!expected.has(entry.strategyDefinitionId) || !SIGNALS.has(entry.signal)) {
        throw new StrategyApplicationError("INVALID_COMPOSITE_SIGNALS");
      }
      counts[entry.signal] += 1;
    }
    const maximum = Math.max(counts.BUY, counts.SELL, counts.HOLD);
    const winners = (["BUY", "SELL", "HOLD"] as const).filter((signal) => counts[signal] === maximum);
    return winners.length === 1 ? winners[0] : "HOLD";
  };

  return {
    listStrategies,
    defineStrategy,
    defineComposite,
    readStrategyDefinition,
    readCompositeDefinition,
    listStrategyDefinitions,
    listCompositeDefinitions,
    resolveStrategy,
    combineSignals,
  };
}
