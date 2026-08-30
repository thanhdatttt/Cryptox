import type { CompositeStrategyDefinition, StrategyDefinition } from "modules/strategy/api";
import type { GeneratedCandidate, GeneratorType, SearchSpaceConfig, StrategyCategory, StrategyGenerator } from "./contracts";

type OwnedDefinition = StrategyDefinition & { userId: string };

const ownerOf = (definition: StrategyDefinition): string | undefined => (definition as OwnedDefinition).userId;
const categories = new Set<StrategyCategory>(["TREND", "MOMENTUM", "VOLATILITY", "STRUCTURE", "INFORMATION"]);
const ordered = (space: SearchSpaceConfig): StrategyDefinition[] => [...space.availableStrategies].sort((left, right) => left.id.localeCompare(right.id));
const maxComponents = (space: SearchSpaceConfig, count: number): number => Math.max(1, Math.min(space.maxComponents ?? count, count));
const assertSameOwner = (selected: StrategyDefinition[]): string => {
  const userId = ownerOf(selected[0]!);
  if (!userId || selected.some((definition) => ownerOf(definition) !== userId)) throw new Error("INVALID_SEARCH_CONFIG");
  return userId;
};
const strategyCategory = (definition: StrategyDefinition): StrategyCategory | undefined => {
  const category = (definition as StrategyDefinition & { category?: unknown }).category;
  return typeof category === "string" && categories.has(category as StrategyCategory) ? category as StrategyCategory : undefined;
};
const composite = (type: GeneratorType, selected: StrategyDefinition[], sequence: number, userId: string): CompositeStrategyDefinition & { userId: string } => ({
  id: `generated-${type.toLowerCase()}-${sequence}-${selected.map((definition) => definition.id).join("-")}`,
  userId,
  logicalFamilyKey: `generated:${type.toLowerCase()}`,
  version: 1,
  method: "MAJORITY_VOTE",
  components: selected.map((definition) => ({ strategyDefinitionId: definition.id, weight: 0 })),
  createdAt: new Date().toISOString(),
});
const candidate = (type: GeneratorType, selected: StrategyDefinition[], sequence: number): GeneratedCandidate => ({
  generatedBy: type,
  strategyDefinitions: selected,
  compositeDefinition: composite(type, selected, sequence, assertSameOwner(selected)),
  executionPolicyIntent: { mode: "TWO_SIDED_ONE_X_V1" },
});

const randomGenerator = (): StrategyGenerator => {
  let sequence = 0;
  return { type: "RANDOM", generate: (space) => {
    const available = ordered(space);
    if (available.length === 0) throw new Error("EMPTY_SEARCH_SPACE");
    const seed = sequence++;
    const count = 1 + (seed % maxComponents(space, available.length));
    const start = (seed * 7 + 3) % available.length;
    const selected = Array.from({ length: count }, (_unused, index) => available[(start + index * 3) % available.length]!);
    return candidate("RANDOM", selected, seed);
  } };
};

const domainGuidedGenerator = (): StrategyGenerator => {
  let sequence = 0;
  return { type: "DOMAIN_GUIDED", generate: (space) => {
    const available = ordered(space);
    if (available.length === 0) throw new Error("EMPTY_SEARCH_SPACE");
    const required = [...new Set(space.domainRules?.requiredCategories ?? [])];
    const selected = required.map((category) => available.find((definition) => strategyCategory(definition) === category));
    if (selected.some((definition) => !definition)) throw new Error("DOMAIN_RULE_UNSATISFIABLE");
    const unique = selected.filter((definition): definition is StrategyDefinition => Boolean(definition));
    const limit = maxComponents(space, available.length);
    for (const definition of available) if (unique.length < limit && !unique.some((item) => item.id === definition.id)) unique.push(definition);
    if (unique.length === 0) throw new Error("EMPTY_SEARCH_SPACE");
    const result = candidate("DOMAIN_GUIDED", unique, sequence++);
    return result;
  } };
};

const geneticGenerator = (): StrategyGenerator => {
  let sequence = 0;
  return { type: "GENETIC", generate: (space) => {
    const available = ordered(space);
    if (available.length === 0) throw new Error("EMPTY_SEARCH_SPACE");
    const seed = sequence++;
    const limit = maxComponents(space, available.length);
    const parentA = available[seed % available.length]!;
    const parentB = available[(seed + 1) % available.length]!;
    const selected: StrategyDefinition[] = [parentA];
    if (limit > 1 && parentB.id !== parentA.id) selected.push(parentB);
    for (let index = 2; index < limit; index += 1) {
      const mutation = available[(seed + index * 5) % available.length]!;
      if (!selected.some((definition) => definition.id === mutation.id)) selected.push(mutation);
    }
    return candidate("GENETIC", selected, seed);
  } };
};

export const createDefaultStrategyGenerators = (): Record<GeneratorType, StrategyGenerator> => ({ RANDOM: randomGenerator(), DOMAIN_GUIDED: domainGuidedGenerator(), GENETIC: geneticGenerator() });
