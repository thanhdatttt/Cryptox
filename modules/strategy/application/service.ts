import { createHash, randomUUID } from "node:crypto";
import type { CombinationMethod, CompositeStrategyDefinition, Signal, Strategy, StrategyContext, StrategyDefinition, StrategyFactory, StrategyPluginDescriptor, StrategyVisualizationOverlay, StrategyVisualizationOverlayDraft } from "../domain/contracts";
import { createStrategyRegistry } from "../domain/plugins";
import { createPublicStrategySourceLoader } from "../infrastructure/public-source-loader";
import type { CompositeDefinitionRepository, GeneratedStrategyProposal, StrategyDefinitionRepository, StrategyGenerationAdapter, StrategyGenerationRequest, StrategyGenerationSource, StrategyGenerationUnitOfWork, StrategySourceLoader } from "./ports";

export interface StrategyModuleDependencies {
  artifactResolver: import("../domain/contracts").StrategyArtifactResolver;
  definitionRepository: StrategyDefinitionRepository;
  compositeRepository: CompositeDefinitionRepository;
  generationAdapter?: StrategyGenerationAdapter;
  sourceLoader?: StrategySourceLoader;
  generationUnitOfWork?: StrategyGenerationUnitOfWork;
  modelName?: string;
  modelVersion?: string;
  promptVersion?: string;
  modelTimeoutMs?: number;
  registry?: import("../domain/contracts").StrategyRegistry;
}
export type { GeneratedStrategyProposal, StrategyGenerationAdapter, StrategyGenerationSource, StrategySourceLoader } from "./ports";
export interface StrategyGenerationResult {
  generationId: string;
  kind: "SINGLE" | "COMPOSITE";
  strategyDefinition?: StrategyDefinition;
  compositeStrategyDefinition?: CompositeStrategyDefinition;
  modelName: string;
  modelVersion: string;
  promptVersion: string;
}

export interface StrategyModuleRuntime {
  listStrategies(): StrategyPluginDescriptor[];
  resolveStrategy(definition: StrategyDefinition): Promise<Strategy>;
  combineSignals(definition: CompositeStrategyDefinition, signals: Array<{ strategyDefinitionId: string; signal: Signal }>): Signal;
  buildVisualization(definition: StrategyDefinition, contexts: StrategyContext[]): StrategyVisualizationOverlay[];
  listDefinitions(userId: string): Promise<StrategyDefinition[]>;
  readDefinitions(userId: string, ids: string[]): Promise<StrategyDefinition[]>;
  listComposites(userId: string): Promise<CompositeStrategyDefinition[]>;
  readComposite(userId: string, id: string): Promise<CompositeStrategyDefinition>;
  defineStrategy(userId: string, strategyName: string, parameters: Record<string, number | string>): Promise<StrategyDefinition>;
  defineComposite(userId: string, command: { method: CombinationMethod; components: Array<{ strategyDefinitionId: string; weight: number }>; thresholds?: { buy: number; sell: number } }): Promise<CompositeStrategyDefinition>;
  generateStrategy(userId: string, source: StrategyGenerationSource): Promise<StrategyGenerationResult>;
}

const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right))) : item);
const digest = (value: unknown): string => createHash("sha256").update(stable(value)).digest("hex");
const isPlainRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const invalid = (code: string): never => { throw new Error(code); };
const keysAre = (value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean => required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) && Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const parameterRecord = (value: unknown): value is Record<string, number | string> => isPlainRecord(value) && Object.values(value).every((item) => typeof item === "string" || finite(item));
const validateHttpUrl = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error("VALIDATION_ERROR");
  const text = value.trim();
  let url: URL;
  try { url = new URL(text); } catch { throw new Error("VALIDATION_ERROR"); }
  if (url.protocol !== "http:" && url.protocol !== "https:") invalid("VALIDATION_ERROR");
  return text;
};

const runtimeList = (registry: import("../domain/contracts").StrategyRegistry): StrategyPluginDescriptor[] => registry.list();
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

const validateParameters = (factory: StrategyFactory, parameters: unknown): Record<string, number | string> => {
  const values = parameterRecord(parameters) ? parameters : invalid("INVALID_STRATEGY_PARAMETERS") as Record<string, number | string>;
  const declared = new Map(factory.descriptor.parameters.map((descriptor) => [descriptor.key, descriptor]));
  if (Object.keys(values).some((key) => !declared.has(key))) invalid("INVALID_STRATEGY_PARAMETERS");
  const normalized: Record<string, number | string> = {};
  for (const descriptor of factory.descriptor.parameters) {
    const value = values[descriptor.key] ?? descriptor.defaultValue;
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
  try { factory.validateParameters?.(normalized); } catch { invalid("INVALID_STRATEGY_PARAMETERS"); }
  return normalized;
};

const MAX_VISUALIZATION_POINTS = 5_000;
const MAX_VISUALIZATION_OVERLAYS = 32;
const validSignal = (value: unknown): value is Signal => value === "BUY" || value === "SELL" || value === "HOLD";
const normalizeVisualization = (definition: StrategyDefinition, overlays: readonly StrategyVisualizationOverlayDraft[] | undefined): StrategyVisualizationOverlay[] => {
  if (!Array.isArray(overlays)) return [];
  return overlays.slice(0, MAX_VISUALIZATION_OVERLAYS).flatMap((overlay, overlayIndex): StrategyVisualizationOverlay[] => {
    if (!isPlainRecord(overlay) || (overlay.kind !== "LINE" && overlay.kind !== "ZONE" && overlay.kind !== "SIGNAL")) return [];
    const label = typeof overlay.label === "string" && overlay.label.trim() ? overlay.label : `${overlay.kind} overlay`;
    const localId = typeof overlay.id === "string" && overlay.id.trim() ? overlay.id.trim() : `overlay-${overlayIndex + 1}`;
    const points = Array.isArray(overlay.points) ? overlay.points.slice(-MAX_VISUALIZATION_POINTS) : [];
    if (overlay.kind === "LINE") {
      const normalized = points.flatMap((point) => isPlainRecord(point) && typeof point.time === "string" && finite(point.value) ? [{ time: point.time, value: point.value }] : []);
      return normalized.length > 0 ? [{ id: `${definition.id}:${localId}`, strategyDefinitionId: definition.id, kind: "LINE" as const, label, points: normalized }] : [];
    }
    if (overlay.kind === "ZONE") {
      const normalized = points.flatMap((point) => {
        if (!isPlainRecord(point) || typeof point.time !== "string" || !finite(point.low) || !finite(point.high)) return [];
        return [{ time: point.time, low: Math.min(point.low, point.high), high: Math.max(point.low, point.high) }];
      });
      return normalized.length > 0 ? [{ id: `${definition.id}:${localId}`, strategyDefinitionId: definition.id, kind: "ZONE" as const, label, points: normalized }] : [];
    }
    const normalized = points.flatMap((point) => isPlainRecord(point) && typeof point.time === "string" && finite(point.value) && validSignal(point.signal) ? [{ time: point.time, value: point.value, signal: point.signal }] : []);
    return normalized.length > 0 ? [{ id: `${definition.id}:${localId}`, strategyDefinitionId: definition.id, kind: "SIGNAL" as const, label, points: normalized }] : [];
  });
};

export function createInMemoryStrategyDependencies(): StrategyModuleDependencies {
  const definitions = new Map<string, { ownerUserId: string; value: StrategyDefinition }>();
  const composites = new Map<string, { ownerUserId: string; value: CompositeStrategyDefinition }>();
  const generations = new Map<string, StrategyGenerationRequest>();
  const registry = createStrategyRegistry();
  const factories = new Map(registry.list().map((descriptor) => [`${descriptor.name}:${descriptor.implementationSha256}`, registry.get(descriptor.name, descriptor.implementationSha256)!]));
  const generationUnitOfWork: StrategyGenerationUnitOfWork = {
    commit: async ({ ownerUserId, definitions: generatedDefinitions, composite, audit }) => {
      const definitionSnapshot = new Map(definitions);
      const compositeSnapshot = new Map(composites);
      const generationSnapshot = new Map(generations);
      try {
        for (const definition of generatedDefinitions) definitions.set(definition.id, { ownerUserId, value: { ...definition, userId: ownerUserId } });
        if (composite) composites.set(composite.id, { ownerUserId, value: { ...composite, userId: ownerUserId } });
        generations.set(audit.id, { ...audit });
      } catch (error) {
        definitions.clear();
        definitionSnapshot.forEach((value, key) => definitions.set(key, value));
        composites.clear();
        compositeSnapshot.forEach((value, key) => composites.set(key, value));
        generations.clear();
        generationSnapshot.forEach((value, key) => generations.set(key, value));
        throw error;
      }
    },
  };
  return {
    artifactResolver: {
      resolve: async (name, sha) => { const factory = factories.get(`${name}:${sha}`); if (!factory) throw new Error("IMPLEMENTATION_ARTIFACT_UNAVAILABLE"); return factory; },
      resolveSync: (name, sha) => factories.get(`${name}:${sha}`),
    },
    definitionRepository: {
      insert: async (ownerUserId, definition) => { const value = { ...definition, userId: ownerUserId }; definitions.set(definition.id, { ownerUserId, value }); return value; },
      list: async (ownerUserId) => [...definitions.values()].filter((item) => item.ownerUserId === ownerUserId).map((item) => item.value).sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)),
      listByIds: async (ownerUserId, ids) => ids.flatMap((id) => { const definition = definitions.get(id); return definition?.ownerUserId === ownerUserId ? [definition.value] : []; }),
      listByLogicalFamily: async (ownerUserId, logicalFamilyKey) => [...definitions.values()].filter((item) => item.ownerUserId === ownerUserId && item.value.logicalFamilyKey === logicalFamilyKey).map((item) => item.value),
      exists: async (id) => definitions.has(id),
    },
    compositeRepository: {
      insert: async (ownerUserId, composite) => { const value = { ...composite, userId: ownerUserId }; composites.set(composite.id, { ownerUserId, value }); return value; },
      list: async (ownerUserId) => [...composites.values()].filter((item) => item.ownerUserId === ownerUserId).map((item) => item.value).sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)),
      get: async (ownerUserId, id) => { const composite = composites.get(id); return composite?.ownerUserId === ownerUserId ? composite.value : undefined; },
      listByLogicalFamily: async (ownerUserId, logicalFamilyKey) => [...composites.values()].filter((item) => item.ownerUserId === ownerUserId && item.value.logicalFamilyKey === logicalFamilyKey).map((item) => item.value),
    },
    generationAdapter: {
      modelName: "LOCAL_DETERMINISTIC",
      modelVersion: "1.0.0",
      generate: async () => { throw new Error("STRATEGY_MODEL_UNAVAILABLE"); },
    },
    sourceLoader: createPublicStrategySourceLoader(),
    generationUnitOfWork,
    modelName: "LOCAL_DETERMINISTIC",
    modelVersion: "1.0.0",
    promptVersion: "1",
  };
}

export function createStrategyModule(dependencies: StrategyModuleDependencies = createInMemoryStrategyDependencies()): StrategyModuleRuntime {
  const defaults = createInMemoryStrategyDependencies();
  const registry = dependencies.registry ?? createStrategyRegistry();
  const generationAdapter = dependencies.generationAdapter ?? defaults.generationAdapter!;
  const sourceLoader = dependencies.sourceLoader ?? defaults.sourceLoader!;
  const generationUnitOfWork = dependencies.generationUnitOfWork ?? {
    commit: async (): Promise<void> => { throw new Error("STRATEGY_GENERATION_PERSISTENCE_UNAVAILABLE"); },
  } satisfies StrategyGenerationUnitOfWork;
  const configuredModelName = dependencies.modelName?.trim();
  const configuredModelVersion = dependencies.modelVersion?.trim();
  const modelName = generationAdapter.modelName ?? configuredModelName ?? "LOCAL_DETERMINISTIC";
  const modelVersion = generationAdapter.modelVersion ?? configuredModelVersion ?? "1.0.0";
  const promptVersion = dependencies.promptVersion ?? "1";
  const modelTimeoutMs = finite(dependencies.modelTimeoutMs) && dependencies.modelTimeoutMs > 0 ? dependencies.modelTimeoutMs : 15_000;
  const factories = new Map(registry.list().map((descriptor) => [descriptor.name, registry.get(descriptor.name, descriptor.implementationSha256)!]));
  const lookupFactory = (name: string): StrategyFactory | undefined => {
    const rawClean = name.trim().toUpperCase().replace(/[\s_-]+/g, "");
    return factories.get(name) ??
      factories.get(name.toUpperCase()) ??
      Array.from(factories.entries()).find(([k]) => {
        const cleanK = k.toUpperCase().replace(/[\s_-]+/g, "");
        if (cleanK === rawClean) return true;
        if (cleanK === "BOLLINGER" && (rawClean === "BOLLINGERBANDS" || rawClean === "BOLLINGERBAND")) return true;
        if (cleanK === "MA" && (rawClean === "MOVINGAVERAGE" || rawClean === "MOVINGAVERAGECROSS" || rawClean === "MACROSS")) return true;
        if (cleanK === "SUPPORTRESISTANCE" && (rawClean === "SUPPORTANDRESISTANCE" || rawClean === "SUPPRES")) return true;
        return false;
      })?.[1] ??
      Array.from(factories.entries()).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1];
  };
  const retainedFactories = new Map<string, StrategyFactory>();
  const nextId = (kind: string): string => `${kind}-${randomUUID()}`;
  const artifactKey = (definition: StrategyDefinition): string => `${definition.strategyName}:${definition.implementationSha256}`;
  const exactFactory = (definition: StrategyDefinition, factory: StrategyFactory | undefined): StrategyFactory => {
    if (!factory || factory.descriptor.name !== definition.strategyName || factory.descriptor.implementationSha256 !== definition.implementationSha256) throw new Error("IMPLEMENTATION_ARTIFACT_UNAVAILABLE");
    return factory;
  };
  const resolveRetainedFactory = async (definition: StrategyDefinition): Promise<StrategyFactory> => {
    const key = artifactKey(definition);
    const cached = retainedFactories.get(key);
    if (cached) return cached;
    let factory: StrategyFactory;
    try {
      factory = await dependencies.artifactResolver.resolve(definition.strategyName, definition.implementationSha256);
    } catch (error) {
      if (error instanceof Error && error.message === "IMPLEMENTATION_ARTIFACT_UNAVAILABLE") throw error;
      throw new Error("IMPLEMENTATION_ARTIFACT_UNAVAILABLE");
    }
    const resolved = exactFactory(definition, factory);
    retainedFactories.set(key, resolved);
    return resolved;
  };
  const resolveRetainedFactorySync = (definition: StrategyDefinition): StrategyFactory => {
    const key = artifactKey(definition);
    const cached = retainedFactories.get(key);
    if (cached) return cached;
    const resolved = exactFactory(definition, dependencies.artifactResolver.resolveSync?.(definition.strategyName, definition.implementationSha256));
    retainedFactories.set(key, resolved);
    return resolved;
  };
  const getDefinition = async (userId: string, id: string): Promise<StrategyDefinition> => {
    const definition = (await dependencies.definitionRepository.listByIds(userId, [id]))[0];
    if (!definition) invalid("STRATEGY_DEFINITION_NOT_FOUND");
    return definition;
  };
  const prepareStrategy = async (userId: string, strategyName: string, parameters: Record<string, number | string>): Promise<{ definition: StrategyDefinition; isNew: boolean }> => {
    if (!userId.trim()) invalid("INVALID_USER");
    const factory = lookupFactory(strategyName);
    if (!factory) invalid("STRATEGY_NOT_REGISTERED");
    const registeredFactory = factory as StrategyFactory;
    const canonicalName = registeredFactory.descriptor.name;
    const normalized = validateParameters(registeredFactory, parameters);
    const logicalFamilyKey = `strategy:${canonicalName}`;
    const content = { strategyName: canonicalName, implementationSha256: registeredFactory.descriptor.implementationSha256, parameters: normalized };
    const prior = await dependencies.definitionRepository.listByLogicalFamily(userId, logicalFamilyKey);
    const existing = prior.find((definition) => digest({ strategyName: definition.strategyName, implementationSha256: definition.implementationSha256, parameters: definition.parameters }) === digest(content));
    if (existing) return { definition: existing, isNew: false };
    const definition: StrategyDefinition = { id: nextId("strategy-definition"), userId, logicalFamilyKey, familyName: registeredFactory.descriptor.displayName, strategyName: canonicalName, implementationVersion: registeredFactory.descriptor.implementationVersion, implementationSha256: registeredFactory.descriptor.implementationSha256, version: Math.max(0, ...prior.map((item) => item.version)) + 1, parameters: normalized, createdAt: new Date().toISOString() };
    return { definition, isNew: true };
  };
  const defineStrategy = async (userId: string, strategyName: string, parameters: Record<string, number | string>): Promise<StrategyDefinition> => {
    const prepared = await prepareStrategy(userId, strategyName, parameters);
    return prepared.isNew ? dependencies.definitionRepository.insert(userId, prepared.definition) : prepared.definition;
  };

  const requireOwnedDefinition = async (userId: string, id: string, knownDefinitions?: Map<string, StrategyDefinition>): Promise<void> => {
    if (knownDefinitions?.has(id)) return;
    const owned = await dependencies.definitionRepository.listByIds(userId, [id]);
    if (owned.length > 0) return;
    if (await dependencies.definitionRepository.exists?.(id)) invalid("OWNERSHIP_MISMATCH");
    invalid("UNKNOWN_STRATEGY_DEFINITION");
  };

  const prepareComposite = async (userId: string, command: { method: CombinationMethod; components: Array<{ strategyDefinitionId: string; weight: number }>; thresholds?: { buy: number; sell: number } }, knownDefinitions?: Map<string, StrategyDefinition>): Promise<{ definition: CompositeStrategyDefinition; isNew: boolean }> => {
    if (!userId.trim() || !command || !["MAJORITY_VOTE", "WEIGHTED_SCORE"].includes(command.method) || !Array.isArray(command.components) || command.components.length === 0) invalid("INVALID_COMPOSITE_STRATEGY");
    const components = command.components.map((component) => ({ strategyDefinitionId: component.strategyDefinitionId, weight: component.weight }));
    if (components.some((component) => typeof component.strategyDefinitionId !== "string" || !component.strategyDefinitionId.trim() || !finite(component.weight))) invalid("INVALID_COMPOSITE_STRATEGY");
    if (components.some((component) => component.weight < 0)) invalid("INVALID_COMPOSITE_STRATEGY");
    await Promise.all(components.map((component) => requireOwnedDefinition(userId, component.strategyDefinitionId, knownDefinitions)));
    let thresholds: { buy: number; sell: number };
    if (command.method === "MAJORITY_VOTE") {
      for (const component of components) component.weight = 0;
      thresholds = { buy: 0.3, sell: -0.3 };
    } else {
      const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
      if (components.some((component) => component.weight < 0) || Math.abs(totalWeight - 1) > 1e-4) invalid("INVALID_COMPOSITE_STRATEGY");
      thresholds = command.thresholds ?? { buy: 0.3, sell: -0.3 };
      if (!finite(thresholds.buy) || !finite(thresholds.sell) || thresholds.buy <= thresholds.sell || thresholds.buy < -1 || thresholds.buy > 1 || thresholds.sell < -1 || thresholds.sell > 1) invalid("INVALID_COMPOSITE_STRATEGY");
    }
    const logicalFamilyKey = `composite:${command.method}:${components.map((component) => component.strategyDefinitionId).sort().join(",")}`;
    const content = { method: command.method, components, thresholds };
    const prior = await dependencies.compositeRepository.listByLogicalFamily(userId, logicalFamilyKey);
    const existing = prior.find((composite) => digest({ method: composite.method, components: composite.components, thresholds: composite.thresholds }) === digest(content));
    if (existing) return { definition: existing, isNew: false };
    return { definition: { id: nextId("composite-strategy"), userId, logicalFamilyKey, version: Math.max(0, ...prior.map((item) => item.version)) + 1, method: command.method, components, thresholds, createdAt: new Date().toISOString() }, isNew: true };
  };

  const defineComposite = async (userId: string, command: { method: CombinationMethod; components: Array<{ strategyDefinitionId: string; weight: number }>; thresholds?: { buy: number; sell: number } }): Promise<CompositeStrategyDefinition> => {
    const prepared = await prepareComposite(userId, command);
    return prepared.isNew ? dependencies.compositeRepository.insert(userId, prepared.definition) : prepared.definition;
  };

  const withTimeout = async <T>(work: Promise<T>, timeoutMs: number, errorCode: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([work, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(errorCode)), timeoutMs); })]);
    } finally { if (timer) clearTimeout(timer); }
  };

  const proposal = (value: unknown): GeneratedStrategyProposal => {
    if (!isPlainRecord(value)) invalid("STRATEGY_MODEL_SCHEMA_INVALID");
    const record = value as Record<string, unknown>;
    if (record.kind !== "SINGLE" && record.kind !== "COMPOSITE") invalid("STRATEGY_MODEL_SCHEMA_INVALID");
    if (record.kind === "SINGLE" && !keysAre(record, ["kind", "strategyName", "parameters"], ["thresholds", "components", "method"])) invalid("STRATEGY_MODEL_SCHEMA_INVALID");
    if (record.kind === "COMPOSITE" && !keysAre(record, ["kind", "components", "method"], ["thresholds", "strategyName", "parameters"])) invalid("STRATEGY_MODEL_SCHEMA_INVALID");
    if (record.kind === "SINGLE") {
      const parameters = parameterRecord(record.parameters) ? record.parameters : invalid("STRATEGY_MODEL_SCHEMA_INVALID") as Record<string, number | string>;
      if (typeof record.strategyName !== "string") invalid("STRATEGY_MODEL_SCHEMA_INVALID");
      return { kind: "SINGLE", strategyName: record.strategyName as string, parameters };
    }
    if (!Array.isArray(record.components) || record.components.length === 0 || !["MAJORITY_VOTE", "WEIGHTED_SCORE"].includes(record.method as string)) invalid("STRATEGY_MODEL_SCHEMA_INVALID");
    const method: CombinationMethod = record.method as CombinationMethod;
    let buy = 0.3;
    let sell = -0.3;
    if (isPlainRecord(record.thresholds)) {
      const t = record.thresholds as Record<string, unknown>;
      if (!keysAre(t, ["buy", "sell"])) invalid("STRATEGY_MODEL_SCHEMA_INVALID");
      if (finite(t.buy)) buy = t.buy as number;
      if (finite(t.sell)) sell = t.sell as number;
    }
    if (buy <= sell) {
      if (buy > 0 && sell > 0) {
        sell = -buy;
      } else {
        buy = 0.3;
        sell = -0.3;
      }
    }
    const rawComponents = (record.components as unknown[]).map((component: unknown) => {
      if (!isPlainRecord(component) || !keysAre(component, ["strategyName", "parameters", "weight"]) || typeof component.strategyName !== "string" || !parameterRecord(component.parameters) || !finite(component.weight)) invalid("STRATEGY_MODEL_SCHEMA_INVALID");
      const item = component as Record<string, unknown>;
      const parameters = parameterRecord(item.parameters) ? item.parameters : invalid("STRATEGY_MODEL_SCHEMA_INVALID") as Record<string, number | string>;
      return { strategyName: item.strategyName as string, parameters, weight: item.weight as number };
    });
    let components = rawComponents;
    if (method === "WEIGHTED_SCORE") {
      const sum = rawComponents.reduce((acc, c) => acc + c.weight, 0);
      if (sum > 0 && Math.abs(sum - 1) > 1e-4 && rawComponents.every((c) => c.weight >= 0)) {
        components = rawComponents.map((c) => ({ ...c, weight: Number((c.weight / sum).toFixed(4)) }));
      }
    }
    return { kind: "COMPOSITE", components, method, thresholds: { buy, sell } };
  };

  return {
    listStrategies: () => runtimeList(registry),
    resolveStrategy: async (definition) => (await resolveRetainedFactory(definition)).create(definition.parameters),
    combineSignals: runtimeCombine,
    buildVisualization: (definition, contexts) => normalizeVisualization(definition, resolveRetainedFactorySync(definition).create(definition.parameters).buildVisualization?.(contexts.slice(-MAX_VISUALIZATION_POINTS))),
    listDefinitions: async (userId) => dependencies.definitionRepository.list(userId),
    readDefinitions: async (userId, ids) => Promise.all(ids.map((id) => getDefinition(userId, id))),
    listComposites: async (userId) => dependencies.compositeRepository.list(userId),
    readComposite: async (userId, id) => {
      const composite = await dependencies.compositeRepository.get(userId, id);
      if (!composite) invalid("COMPOSITE_STRATEGY_NOT_FOUND");
      return composite!;
    },
    defineStrategy,
    defineComposite,
    generateStrategy: async (userId, source) => {
      if (!userId.trim() || !isPlainRecord(source) || (source.sourceType !== "TEXT" && source.sourceType !== "URL")) invalid("VALIDATION_ERROR");
      const sourceType = source.sourceType;
      const allowedSourceKeys = sourceType === "TEXT" ? ["sourceType", "text"] : ["sourceType", "url"];
      if (!keysAre(source, allowedSourceKeys)) invalid("VALIDATION_ERROR");
      const value = sourceType === "TEXT" ? source.text : source.url;
      if (typeof value !== "string" || !value.trim() || value.trim().length > 100_000) invalid("VALIDATION_ERROR");
      let sourceText: string;
      if (sourceType === "TEXT") {
        sourceText = value.trim();
      } else {
        let loaded: { sourceText: string; canonicalUrl: string };
        const validatedUrl = validateHttpUrl(value);
        try {
          loaded = await sourceLoader.load(validatedUrl);
        } catch (error) {
          if (error instanceof Error && error.message.startsWith("STRATEGY_SOURCE_")) throw error;
          throw new Error("STRATEGY_SOURCE_UNAVAILABLE");
        }
        if (typeof loaded?.sourceText !== "string") invalid("STRATEGY_SOURCE_UNUSABLE");
        sourceText = loaded.sourceText.trim();
      }
      if (!sourceText) invalid("STRATEGY_SOURCE_UNUSABLE");
      let generated: GeneratedStrategyProposal;
      try {
        generated = proposal(await withTimeout(generationAdapter.generate({ sourceText, strategies: runtimeList(registry), promptVersion }), modelTimeoutMs, "STRATEGY_MODEL_TIMEOUT"));
      } catch (error) {
        if (error instanceof Error && ["STRATEGY_MODEL_TIMEOUT", "STRATEGY_MODEL_UNAVAILABLE", "STRATEGY_MODEL_AUTHENTICATION_FAILED", "STRATEGY_MODEL_RATE_LIMITED", "STRATEGY_MODEL_SCHEMA_INVALID", "STRATEGY_MODEL_ERROR"].includes(error.message)) throw error;
        throw new Error("STRATEGY_MODEL_UNAVAILABLE");
      }
      const generatedDefinitions: StrategyDefinition[] = [];
      let strategyDefinition: StrategyDefinition | undefined;
      let compositeStrategyDefinition: CompositeStrategyDefinition | undefined;
      if (generated.kind === "SINGLE") {
        const prepared = await prepareStrategy(userId, generated.strategyName, generated.parameters);
        strategyDefinition = prepared.definition;
        if (prepared.isNew) generatedDefinitions.push(prepared.definition);
      } else {
        const componentDefinitions = [] as Array<{ strategyDefinitionId: string; weight: number }>;
        for (const component of generated.components) {
          const prepared = await prepareStrategy(userId, component.strategyName, component.parameters);
          if (prepared.isNew) generatedDefinitions.push(prepared.definition);
          componentDefinitions.push({ strategyDefinitionId: prepared.definition.id, weight: component.weight });
        }
        const knownDefinitions = new Map(generatedDefinitions.map((definition) => [definition.id, definition]));
        const preparedComposite = await prepareComposite(userId, { method: generated.method, components: componentDefinitions, thresholds: generated.thresholds }, knownDefinitions);
        compositeStrategyDefinition = preparedComposite.definition;
      }
      const generationId = nextId("strategy-generation");
      const audit: StrategyGenerationRequest = { id: generationId, ownerUserId: userId, sourceType, ...(sourceType === "TEXT" ? { sourceText: value.trim() } : { sourceUrl: value.trim() }), modelName, modelVersion, promptVersion, outputKind: generated.kind, ...(strategyDefinition ? { strategyDefinitionId: strategyDefinition.id } : { compositeDefinitionId: compositeStrategyDefinition!.id }), createdAt: new Date().toISOString() };
      await generationUnitOfWork.commit({ ownerUserId: userId, definitions: generatedDefinitions, composite: compositeStrategyDefinition, audit });
      return { generationId, kind: generated.kind, ...(strategyDefinition ? { strategyDefinition } : { compositeStrategyDefinition }), modelName, modelVersion, promptVersion };
    },
  };
}
