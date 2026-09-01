import { createHash } from "node:crypto";
import type { CompositeStrategyDefinition, StrategyDefinition, StrategyParameterDescriptor } from "modules/strategy/api";
import type { CandidateLineage, GeneratedCandidate, GeneratorContext, SearchSpaceConfig, SearchStrategyDefinition, StrategyGenerator } from "./contracts";

type OwnedDefinition = SearchStrategyDefinition & { userId: string; parameterDescriptors?: readonly StrategyParameterDescriptor[]; descriptor?: { parameters?: unknown } };
type NumericDescriptor = StrategyParameterDescriptor & { type: "INTEGER" | "NUMBER" };
const ownerOf = (definition: StrategyDefinition): string | undefined => (definition as OwnedDefinition).userId;
const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
};
const fingerprintFor = (selected: readonly SearchStrategyDefinition[]): string => createHash("sha256").update(stable({ generatedBy: "GENETIC", ownerUserId: ownerOf(selected[0]!), strategyDefinitions: selected.map((definition) => ({ id: definition.id, strategyName: definition.strategyName, implementationVersion: definition.implementationVersion, implementationSha256: definition.implementationSha256, parameters: definition.parameters })).sort((left, right) => left.id.localeCompare(right.id)), executionPolicy: "TWO_SIDED_ONE_X_V1", method: "MAJORITY_VOTE" }), "utf8").digest("hex");
const rngFor = (context: GeneratorContext): (() => number) => {
  let state = Number.parseInt(createHash("sha256").update(`${context.searchRunId}:${context.iterationNumber}`, "utf8").digest("hex").slice(0, 8), 16) || 1;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000; };
};
const descriptorList = (definition: SearchStrategyDefinition): readonly StrategyParameterDescriptor[] | undefined => {
  const value = (definition as OwnedDefinition).parameterDescriptors ?? (definition as OwnedDefinition).descriptor?.parameters;
  return Array.isArray(value) ? value as readonly StrategyParameterDescriptor[] : undefined;
};
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isDescriptor = (value: unknown): value is StrategyParameterDescriptor => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const descriptor = value as Partial<StrategyParameterDescriptor>;
  if (typeof descriptor.key !== "string" || !descriptor.key.trim() || !["INTEGER", "NUMBER", "ENUM"].includes(descriptor.type ?? "") || typeof descriptor.required !== "boolean") return false;
  if (descriptor.type === "ENUM") return typeof descriptor.defaultValue === "string" && Array.isArray(descriptor.options) && descriptor.options.length > 0 && descriptor.options.every((option) => typeof option === "string") && new Set(descriptor.options).size === descriptor.options.length && descriptor.options.includes(descriptor.defaultValue);
  if (!isFiniteNumber(descriptor.defaultValue)) return false;
  if (descriptor.minimum !== undefined && (!isFiniteNumber(descriptor.minimum) || descriptor.maximum !== undefined && descriptor.minimum > descriptor.maximum)) return false;
  if (descriptor.maximum !== undefined && !isFiniteNumber(descriptor.maximum)) return false;
  return descriptor.step === undefined || (isFiniteNumber(descriptor.step) && descriptor.step > 0);
};
const descriptorsFor = (definition: SearchStrategyDefinition): readonly StrategyParameterDescriptor[] => {
  const supplied = descriptorList(definition);
  if (supplied === undefined) return Object.entries(definition.parameters ?? {}).map(([key, value]) => ({ key, label: key, type: typeof value === "number" && Number.isInteger(value) ? "INTEGER" : typeof value === "number" ? "NUMBER" : "ENUM", required: false, defaultValue: value, ...(typeof value === "number" ? { step: Number.isInteger(value) ? 1 : 0.1 } : { options: [value as string] }) }));
  if (supplied.some((descriptor) => !isDescriptor(descriptor)) || new Set(supplied.map((descriptor) => descriptor.key)).size !== supplied.length) throw new Error("INVALID_SEARCH_CONFIG");
  return supplied;
};
const aligned = (value: number, descriptor: NumericDescriptor): boolean => {
  if (descriptor.minimum !== undefined && value < descriptor.minimum - 1e-9) return false;
  if (descriptor.maximum !== undefined && value > descriptor.maximum + 1e-9) return false;
  if (descriptor.type === "INTEGER" && !Number.isInteger(value)) return false;
  if (descriptor.step !== undefined) {
    const origin = descriptor.minimum ?? 0;
    if (Math.abs((value - origin) / descriptor.step - Math.round((value - origin) / descriptor.step)) > 1e-7) return false;
  }
  return true;
};
const validValue = (value: unknown, descriptor: StrategyParameterDescriptor): boolean => descriptor.type === "ENUM" ? typeof value === "string" && descriptor.options?.includes(value) === true : isFiniteNumber(value) && aligned(value, descriptor as NumericDescriptor);
const normalize = (definition: SearchStrategyDefinition): { definition: SearchStrategyDefinition; descriptors: readonly StrategyParameterDescriptor[] } => {
  const descriptors = descriptorsFor(definition); const sourceParameters = definition.parameters ?? {}; const keys = new Set(descriptors.map((descriptor) => descriptor.key));
  if (Object.keys(sourceParameters).some((key) => !keys.has(key))) throw new Error("INVALID_SEARCH_CONFIG");
  const parameters: Record<string, number | string> = {};
  for (const descriptor of descriptors) {
    const value = sourceParameters[descriptor.key] ?? descriptor.defaultValue;
    if (value === undefined) { if (descriptor.required) throw new Error("INVALID_SEARCH_CONFIG"); continue; }
    if (!validValue(value, descriptor)) throw new Error("INVALID_SEARCH_CONFIG");
    parameters[descriptor.key] = value;
  }
  return { definition: { ...definition, parameters }, descriptors };
};
const round = (value: number): number => Number(value.toFixed(12));
const numericValues = (descriptor: NumericDescriptor, current: number): number[] => {
  const step = descriptor.step ?? (descriptor.type === "INTEGER" ? 1 : Math.max(0.01, Math.abs((descriptor.maximum ?? current + 8) - (descriptor.minimum ?? current - 8)) / 100));
  const minimum = descriptor.minimum ?? current - step * 8; const maximum = descriptor.maximum ?? current + step * 8;
  const count = Math.min(10_000, Math.floor((maximum - minimum) / step + 1e-9) + 1); const values: number[] = [];
  for (let index = 0; index < count; index += 1) { const value = round(minimum + index * step); if (aligned(value, descriptor) && !values.includes(value)) values.push(value); }
  return values;
};
const legalValues = (descriptor: StrategyParameterDescriptor, current: number | string): Array<number | string> => descriptor.type === "ENUM" ? [...(descriptor.options ?? [])] : numericValues(descriptor as NumericDescriptor, typeof current === "number" ? current : Number(descriptor.defaultValue));
const mutateValue = (descriptor: StrategyParameterDescriptor, current: number | string, random: () => number): number | string => {
  const choices = legalValues(descriptor, current).filter((value) => value !== current); return choices.length === 0 ? current : choices[Math.floor(random() * choices.length)]!;
};
const parameterKey = (parameters: Record<string, number | string>, name: string): string | undefined => Object.keys(parameters).find((key) => key.toLowerCase() === name);
const satisfies = (left: number, right: number, operator: "<" | ">"): boolean => operator === "<" ? left < right : left > right;
const repairRelationships = (definition: SearchStrategyDefinition, descriptors: readonly StrategyParameterDescriptor[], parameters: Record<string, number | string>, random: () => number): string[] => {
  const descriptorByKey = new Map(descriptors.map((descriptor) => [descriptor.key, descriptor]));
  const fastPeriod = parameterKey(parameters, "fastperiod");
  const slowPeriod = parameterKey(parameters, "slowperiod");
  const buyThreshold = parameterKey(parameters, "buythreshold");
  const sellThreshold = parameterKey(parameters, "sellthreshold");
  const relationships: Array<{ left: string; right: string; operator: "<" | ">" }> = [];
  if (fastPeriod && slowPeriod) relationships.push({ left: fastPeriod, right: slowPeriod, operator: "<" });
  if (buyThreshold && sellThreshold) relationships.push({ left: buyThreshold, right: sellThreshold, operator: definition.strategyName.toUpperCase() === "SENTIMENT" ? ">" : "<" });
  const changed: string[] = [];
  for (const relationship of relationships) {
    const leftDescriptor = descriptorByKey.get(relationship.left);
    const rightDescriptor = descriptorByKey.get(relationship.right);
    const left = parameters[relationship.left];
    const right = parameters[relationship.right];
    if (typeof left !== "number" || typeof right !== "number" || !leftDescriptor || !rightDescriptor || leftDescriptor.type === "ENUM" || rightDescriptor.type === "ENUM") continue;
    if (satisfies(left, right, relationship.operator)) continue;
    const leftValues = legalValues(leftDescriptor, left).filter((value): value is number => typeof value === "number");
    const rightValues = legalValues(rightDescriptor, right).filter((value): value is number => typeof value === "number");
    const pairs = leftValues.flatMap((leftValue) => rightValues.filter((rightValue) => satisfies(leftValue, rightValue, relationship.operator)).map((rightValue) => ({ left: leftValue, right: rightValue })));
    if (pairs.length === 0) throw new Error("GENETIC_SEARCH_SPACE_UNSATISFIABLE");
    const pair = pairs[Math.floor(random() * pairs.length)]!;
    if (parameters[relationship.left] !== pair.left) changed.push(relationship.left);
    if (parameters[relationship.right] !== pair.right) changed.push(relationship.right);
    parameters[relationship.left] = pair.left;
    parameters[relationship.right] = pair.right;
  }
  return changed;
};
export const mutateSearchStrategyDefinition = (definition: SearchStrategyDefinition, random: () => number, force = false): { definition: SearchStrategyDefinition; keys: string[] } => {
  const normalized = normalize(definition); const parameters = { ...normalized.definition.parameters }; const keys: string[] = [];
  for (const descriptor of normalized.descriptors) if (random() < 0.55) {
    const current = parameters[descriptor.key]; if (current === undefined) continue; const next = mutateValue(descriptor, current, random);
    if (next !== current) { parameters[descriptor.key] = next; keys.push(descriptor.key); }
  }
  if (force && keys.length === 0) for (const descriptor of normalized.descriptors) {
    const current = parameters[descriptor.key]; if (current === undefined) continue; const next = mutateValue(descriptor, current, random);
    if (next !== current) { parameters[descriptor.key] = next; keys.push(descriptor.key); break; }
  }
  keys.push(...repairRelationships(normalized.definition, normalized.descriptors, parameters, random));
  return { definition: { ...normalized.definition, parameters }, keys: [...new Set(keys)] };
};
const unique = (items: SearchStrategyDefinition[]): SearchStrategyDefinition[] => items.filter((item, index) => items.findIndex((candidate) => candidate.id === item.id) === index);
const shuffled = (items: readonly SearchStrategyDefinition[], random: () => number): SearchStrategyDefinition[] => items.map((item) => ({ item, sort: random() })).sort((left, right) => left.sort - right.sort).map(({ item }) => item);
const crossover = (first: SearchStrategyDefinition[], second: SearchStrategyDefinition[], limit: number, random: () => number): { child: SearchStrategyDefinition[]; point: number } => {
  const point = first.length === 0 ? 0 : Math.floor(random() * (Math.min(first.length, second.length) + 1)); const child = unique([...first.slice(0, point), ...second.slice(point)]);
  for (const definition of [...first, ...second]) if (child.length < limit && !child.some((item) => item.id === definition.id)) child.push(definition);
  return { child: child.slice(0, limit), point };
};
const candidate = (selected: SearchStrategyDefinition[], lineage: CandidateLineage): GeneratedCandidate => {
  if (selected.length === 0) throw new Error("INVALID_SEARCH_CONFIG"); const userId = ownerOf(selected[0]);
  if (!userId || selected.some((definition) => ownerOf(definition) !== userId)) throw new Error("INVALID_SEARCH_CONFIG");
  const fingerprint = fingerprintFor(selected); const composite: CompositeStrategyDefinition & { userId: string } = { id: `generated-genetic-${fingerprint}`, userId, logicalFamilyKey: "generated:genetic", version: 1, method: "MAJORITY_VOTE", components: selected.map((definition) => ({ strategyDefinitionId: definition.id, weight: 0 })), createdAt: new Date().toISOString() };
  return { generatedBy: "GENETIC", strategyDefinitions: selected, compositeDefinition: composite, executionPolicyIntent: { mode: "TWO_SIDED_ONE_X_V1" }, fingerprint, lineage };
};
export const geneticGenerator = (): StrategyGenerator => ({ type: "GENETIC", generate: (space, context) => {
  const available = [...space.availableStrategies].sort((left, right) => left.id.localeCompare(right.id)); if (available.length === 0) throw new Error("EMPTY_SEARCH_SPACE");
  if (space.maxComponents !== undefined && (!Number.isInteger(space.maxComponents) || space.maxComponents < 1)) throw new Error("INVALID_SEARCH_CONFIG");
  const limit = Math.min(space.maxComponents ?? available.length, available.length); const base = context ?? { searchRunId: "default", iterationNumber: 0 }; const prior = new Set(space.generatedFingerprints ?? []);
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const random = rngFor({ searchRunId: `${base.searchRunId}:genetic:${attempt}`, iterationNumber: base.iterationNumber }); const parentA = shuffled(available, random).slice(0, 1 + Math.floor(random() * limit)); const parentB = shuffled(available, random).slice(0, 1 + Math.floor(random() * limit)); const crossed = crossover(parentA, parentB, limit, random); let child = crossed.child;
    let selectionMutation: CandidateLineage["selectionMutation"];
    if (available.length > child.length && child.length > 0 && random() < 0.65) {
      const replacements = available.filter((definition) => !child.some((item) => item.id === definition.id)); const replacement = replacements[Math.floor(random() * replacements.length)];
      if (replacement) { const index = Math.floor(random() * child.length); const replaced = child[index]!; child = [...child.slice(0, index), replacement, ...child.slice(index + 1)]; selectionMutation = { replacedStrategyId: replaced.id, replacementStrategyId: replacement.id }; }
    }
    if (child.length === 0) child = [available[Math.floor(random() * available.length)]!];
    const mutations = child.map((definition, index) => mutateSearchStrategyDefinition(definition, random, attempt === 0 && index === 0)); const mutated = mutations.map((result) => result.definition); const mutatedParameterKeys = mutations.flatMap((result, index) => result.keys.map((key) => `${child[index]!.id}.${key}`));
    const lineage: CandidateLineage = { parentFingerprints: [fingerprintFor(parentA), fingerprintFor(parentB)], crossoverPoint: crossed.point, mutatedParameterKeys, ...(selectionMutation ? { selectionMutation } : {}) }; const generated = candidate(mutated, lineage);
    if (!prior.has(generated.fingerprint)) return generated;
  }
  throw new Error("GENETIC_SEARCH_SPACE_UNSATISFIABLE");
  }});
