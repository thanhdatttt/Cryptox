import { createHash } from "node:crypto";
import type { CompositeStrategyDefinition, StrategyDefinition } from "modules/strategy/api";
import type { GeneratedCandidate, GeneratorContext, GeneratorType, SearchSpaceConfig, StrategyCategory, StrategyGenerator } from "./contracts";
import { geneticGenerator, mutateSearchStrategyDefinition } from "./genetic";

type OwnedDefinition = StrategyDefinition & { userId: string; category?: unknown };
const categories = new Set<StrategyCategory>(["TREND", "MOMENTUM", "VOLATILITY", "STRUCTURE", "INFORMATION"]);
const ownerOf = (definition: StrategyDefinition): string | undefined => (definition as OwnedDefinition).userId;
const strategyCategory = (definition: StrategyDefinition): StrategyCategory | undefined => {
  const value = (definition as OwnedDefinition).category;
  return typeof value === "string" && categories.has(value as StrategyCategory) ? value as StrategyCategory : undefined;
};
const ordered = (space: SearchSpaceConfig): StrategyDefinition[] => [...space.availableStrategies].sort((left, right) => left.id.localeCompare(right.id));
const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
};
const hash = (input: string): string => createHash("sha256").update(input, "utf8").digest("hex");
const rngFor = (context: GeneratorContext): (() => number) => {
  let state = Number.parseInt(hash(`${context.searchRunId}:${context.iterationNumber}`).slice(0, 8), 16) || 1;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000; };
};
const maxComponents = (space: SearchSpaceConfig, count: number): number => Math.max(1, Math.min(space.maxComponents ?? count, count));
const variant = (definition: StrategyDefinition, random: () => number): StrategyDefinition => mutateSearchStrategyDefinition(definition as import("./contracts").SearchStrategyDefinition, random, true).definition;
const fingerprintFor = (type: GeneratorType, selected: StrategyDefinition[]): string => hash(stable({ generatedBy: type, ownerUserId: ownerOf(selected[0]!), strategyDefinitions: selected.map((definition) => ({ id: definition.id, strategyName: definition.strategyName, implementationVersion: definition.implementationVersion, implementationSha256: definition.implementationSha256, parameters: definition.parameters })).sort((left, right) => left.id.localeCompare(right.id)), executionPolicy: "TWO_SIDED_ONE_X_V1", method: "MAJORITY_VOTE" }));
const composite = (type: GeneratorType, selected: StrategyDefinition[], fingerprint: string, userId: string): CompositeStrategyDefinition & { userId: string } => ({
  id: `generated-${type.toLowerCase()}-${fingerprint}`,
  userId,
  logicalFamilyKey: `generated:${type.toLowerCase()}`,
  version: 1,
  method: "MAJORITY_VOTE",
  components: selected.map((definition) => ({ strategyDefinitionId: definition.id, weight: 0 })),
  createdAt: new Date().toISOString(),
});
const candidate = (type: GeneratorType, selected: StrategyDefinition[]): GeneratedCandidate => {
  const userId = selected.length === 0 ? undefined : ownerOf(selected[0]!);
  if (!userId || selected.some((definition) => ownerOf(definition) !== userId)) throw new Error("INVALID_SEARCH_CONFIG");
  const fingerprint = fingerprintFor(type, selected);
  return { generatedBy: type, strategyDefinitions: selected, compositeDefinition: composite(type, selected, fingerprint, userId), executionPolicyIntent: { mode: "TWO_SIDED_ONE_X_V1" }, fingerprint };
};
const contextOrDefault = (context?: GeneratorContext): GeneratorContext => context ?? { searchRunId: "default", iterationNumber: 0 };

const randomGenerator = (): StrategyGenerator => ({ type: "RANDOM", generate: (space, context) => {
  const available = ordered(space);
  if (available.length === 0) throw new Error("EMPTY_SEARCH_SPACE");
  const random = rngFor(contextOrDefault(context));
  const count = 1 + Math.floor(random() * maxComponents(space, available.length));
  const shuffled = available.map((item) => ({ item, sort: random() })).sort((left, right) => left.sort - right.sort).map(({ item }) => item);
  return candidate("RANDOM", shuffled.slice(0, count).map((definition) => variant(definition, random)));
} });

const domainGuidedGenerator = (): StrategyGenerator => ({ type: "DOMAIN_GUIDED", generate: (space, context) => {
  const rules = space.domainRules ?? {};
  const required = [...new Set(rules.requiredCategories ?? [])];
  const allowed = rules.allowedCategories ? new Set(rules.allowedCategories) : undefined;
  const forbidden = new Set(rules.forbiddenCategories ?? []);
  if (required.some((category) => (allowed && !allowed.has(category)) || forbidden.has(category))) throw new Error("DOMAIN_RULE_UNSATISFIABLE");
  const available = ordered(space).filter((definition) => { const category = strategyCategory(definition); return (!allowed || (category !== undefined && allowed.has(category))) && (!category || !forbidden.has(category)); });
  const selected: StrategyDefinition[] = [];
  for (const category of required) {
    const definition = available.find((item) => strategyCategory(item) === category);
    if (!definition) throw new Error("DOMAIN_RULE_UNSATISFIABLE");
    if (!selected.some((item) => item.id === definition.id)) selected.push(definition);
  }
  const limit = maxComponents(space, available.length);
  if (selected.length > limit) throw new Error("DOMAIN_RULE_UNSATISFIABLE");
  const random = rngFor(contextOrDefault(context));
  for (const definition of available) if (selected.length < limit && !selected.some((item) => item.id === definition.id)) selected.push(definition);
  if (selected.length === 0) throw new Error("EMPTY_SEARCH_SPACE");
  return candidate("DOMAIN_GUIDED", selected.map((definition) => variant(definition, random)));
} });

export const createDefaultStrategyGenerators = (): Record<GeneratorType, StrategyGenerator> => ({ RANDOM: randomGenerator(), DOMAIN_GUIDED: domainGuidedGenerator(), GENETIC: geneticGenerator() });
