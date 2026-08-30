import {
  GENETIC_V1_DEFAULTS,
  type CandidateGenerationRequest,
  type GeneratedCandidate,
  type SearchSpaceConfig,
  type StrategyGenerator,
} from "../../../api/contracts";

export interface GeneticGeneratorOptions {
  readonly population?: number;
  readonly maximumGenerations?: number;
  readonly maxGenerations?: number;
  readonly elitePercent?: number;
  readonly eliteFraction?: number;
  readonly mutationPercent?: number;
  readonly mutationRate?: number;
}

export { GENETIC_V1_DEFAULTS } from "../../../api/contracts";

export class GeneticGeneratorError extends Error {
  public readonly name = "GeneticGeneratorError";

  public constructor(
    public readonly code:
      | "INVALID_SEARCH_SPACE"
      | "INVALID_GENERATION_REQUEST"
      | "INVALID_CONFIGURATION"
      | "SEARCH_SPACE_EXHAUSTED",
    message: string,
  ) {
    super(message);
  }
}

interface GeneticConfiguration {
  readonly population: number;
  readonly maximumGenerations: number;
  readonly elitePercent: number;
  readonly mutationPercent: number;
}

function validateConfiguration(options: GeneticGeneratorOptions): GeneticConfiguration {
  const configuration = {
    population: options.population ?? GENETIC_V1_DEFAULTS.population,
    maximumGenerations:
      options.maximumGenerations ?? options.maxGenerations ?? GENETIC_V1_DEFAULTS.maximumGenerations,
    elitePercent: options.elitePercent ?? options.eliteFraction ?? GENETIC_V1_DEFAULTS.elitePercent,
    mutationPercent: options.mutationPercent ?? options.mutationRate ?? GENETIC_V1_DEFAULTS.mutationPercent,
  };
  if (
    !Number.isInteger(configuration.population) ||
    configuration.population < 1 ||
    configuration.population > GENETIC_V1_DEFAULTS.candidateBudget ||
    !Number.isInteger(configuration.maximumGenerations) ||
    configuration.maximumGenerations < 1 ||
    configuration.maximumGenerations > GENETIC_V1_DEFAULTS.maximumGenerations ||
    !Number.isFinite(configuration.elitePercent) ||
    configuration.elitePercent <= 0 ||
    configuration.elitePercent > 1 ||
    !Number.isFinite(configuration.mutationPercent) ||
    configuration.mutationPercent < 0 ||
    configuration.mutationPercent > 1
  ) {
    throw new GeneticGeneratorError(
      "INVALID_CONFIGURATION",
      "Genetic configuration must remain within the bounded V1 limits",
    );
  }
  return Object.freeze(configuration);
}

function assertSearchSpace(searchSpace: SearchSpaceConfig): string[] {
  if (
    !searchSpace ||
    !Array.isArray(searchSpace.availableStrategyDefinitionIds) ||
    searchSpace.availableStrategyDefinitionIds.length < 2 ||
    searchSpace.requireDistinctComponents !== true
  ) {
    throw new GeneticGeneratorError(
      "INVALID_SEARCH_SPACE",
      "search space must contain at least two distinct strategies",
    );
  }
  const ids = [...searchSpace.availableStrategyDefinitionIds];
  if (
    ids.some((id) => typeof id !== "string" || id.trim().length === 0) ||
    new Set(ids).size !== ids.length
  ) {
    throw new GeneticGeneratorError(
      "INVALID_SEARCH_SPACE",
      "search strategy identifiers must be non-empty and unique",
    );
  }
  const { minimum, maximum } = searchSpace.componentCount ?? {};
  if (
    !Number.isInteger(minimum) ||
    !Number.isInteger(maximum) ||
    minimum < 2 ||
    maximum < minimum ||
    maximum > ids.length
  ) {
    throw new GeneticGeneratorError(
      "INVALID_SEARCH_SPACE",
      "component count must be a bounded range of distinct strategies",
    );
  }
  return ids.sort((left, right) => left.localeCompare(right));
}

function assertRequest(request: CandidateGenerationRequest): void {
  if (
    !request ||
    typeof request.randomSeed !== "string" ||
    request.randomSeed.length === 0 ||
    !Number.isInteger(request.iterationNumber) ||
    request.iterationNumber < 1 ||
    !Array.isArray(request.previouslyGeneratedCandidateKeys)
  ) {
    throw new GeneticGeneratorError(
      "INVALID_GENERATION_REQUEST",
      "invalid Genetic generation request",
    );
  }
}

function hashSeed(seed: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function nextRandom(state: { value: number }): number {
  state.value = (state.value + 0x6d2b79f5) | 0;
  let value = Math.imul(state.value ^ (state.value >>> 15), 1 | state.value);
  value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
  return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
}

function candidateKey(ids: readonly string[]): string {
  return JSON.stringify(["MAJORITY_VOTE_V1", ...ids]);
}

function isCandidateKey(value: string, allowedIds: ReadonlySet<string>, searchSpace: SearchSpaceConfig): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return false;
  }
  if (!Array.isArray(parsed) || parsed[0] !== "MAJORITY_VOTE_V1") return false;
  const ids = parsed.slice(1);
  if (
    ids.length < searchSpace.componentCount.minimum ||
    ids.length > searchSpace.componentCount.maximum ||
    ids.some((id) => typeof id !== "string" || !allowedIds.has(id)) ||
    new Set(ids).size !== ids.length
  ) {
    return false;
  }
  const sorted = [...ids].sort((left, right) => left.localeCompare(right));
  return candidateKey(sorted) === value;
}

function combinations(n: number, k: number): bigint {
  const normalizedK = Math.min(k, n - k);
  let result = 1n;
  for (let index = 1; index <= normalizedK; index += 1) {
    result = (result * BigInt(n - normalizedK + index)) / BigInt(index);
  }
  return result;
}

function totalCandidateCount(searchSpace: SearchSpaceConfig, strategyCount: number): bigint {
  let total = 0n;
  for (let count = searchSpace.componentCount.minimum; count <= searchSpace.componentCount.maximum; count += 1) {
    total += combinations(strategyCount, count);
  }
  return total;
}

function unrankCombination(ids: readonly string[], count: number, rank: bigint): string[] {
  const result: string[] = [];
  let nextIndex = 0;
  let remaining = count;
  let remainingRank = rank;
  while (remaining > 0) {
    for (let index = nextIndex; index <= ids.length - remaining; index += 1) {
      const choicesAfter = combinations(ids.length - index - 1, remaining - 1);
      if (remainingRank < choicesAfter) {
        result.push(ids[index]!);
        nextIndex = index + 1;
        remaining -= 1;
        break;
      }
      remainingRank -= choicesAfter;
    }
  }
  return result;
}

function mutate(
  parent: readonly string[],
  sortedIds: readonly string[],
  searchSpace: SearchSpaceConfig,
  state: { value: number },
): string[] {
  const genes = new Set(parent);
  const operation = nextRandom(state);
  if (operation < 0.34 && genes.size > searchSpace.componentCount.minimum) {
    const values = [...genes];
    genes.delete(values[Math.floor(nextRandom(state) * values.length)]!);
  } else if (operation < 0.67 && genes.size < searchSpace.componentCount.maximum) {
    const available = sortedIds.filter((id) => !genes.has(id));
    if (available.length > 0) genes.add(available[Math.floor(nextRandom(state) * available.length)]!);
  } else {
    const values = [...genes];
    const available = sortedIds.filter((id) => !genes.has(id));
    if (values.length > 0 && available.length > 0) {
      genes.delete(values[Math.floor(nextRandom(state) * values.length)]!);
      genes.add(available[Math.floor(nextRandom(state) * available.length)]!);
    }
  }
  return [...genes].sort((left, right) => left.localeCompare(right));
}

function baseIndividual(
  sortedIds: readonly string[],
  searchSpace: SearchSpaceConfig,
  state: { value: number },
): string[] {
  const count =
    searchSpace.componentCount.minimum +
    Math.floor(nextRandom(state) * (searchSpace.componentCount.maximum - searchSpace.componentCount.minimum + 1));
  const shuffled = [...sortedIds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom(state) * (index + 1));
    const value = shuffled[index]!;
    shuffled[index] = shuffled[swapIndex]!;
    shuffled[swapIndex] = value;
  }
  return shuffled.slice(0, count).sort((left, right) => left.localeCompare(right));
}

function individualAt(
  generation: number,
  index: number,
  seed: string,
  sortedIds: readonly string[],
  searchSpace: SearchSpaceConfig,
  configuration: GeneticConfiguration,
): string[] {
  const state = { value: hashSeed(`${seed}\u0000${generation}\u0000${index}`) };
  if (generation === 0) return baseIndividual(sortedIds, searchSpace, state);

  const eliteCount = Math.max(1, Math.ceil(configuration.population * configuration.elitePercent));
  const parentIndex = Math.floor(nextRandom(state) * eliteCount) % configuration.population;
  const parent = individualAt(
    generation - 1,
    parentIndex,
    seed,
    sortedIds,
    searchSpace,
    configuration,
  );
  if (nextRandom(state) >= configuration.mutationPercent) return parent;
  return mutate(parent, sortedIds, searchSpace, state);
}

function candidateFromIds(ids: readonly string[]): GeneratedCandidate {
  const key = candidateKey(ids);
  return {
    candidateKey: key,
    compositeLogicalFamilyKey: key,
    strategyDefinitionIds: ids,
    combinationProfileId: "MAJORITY_VOTE_V1",
    generatedBy: "GENETIC",
  };
}

/**
 * Stateless bounded genetic-style discovery. Population members are derived
 * from the persisted seed and iteration, so no mutable population is needed
 * to reproduce a SearchRun after restart.
 */
export class GeneticStrategyGenerator implements StrategyGenerator {
  public readonly type = "GENETIC" as const;
  public readonly profileId = "GENETIC_V1" as const;
  public readonly algorithmConfiguration: Readonly<Record<string, number>>;

  private readonly configuration: GeneticConfiguration;

  public constructor(options: GeneticGeneratorOptions = {}) {
    this.configuration = validateConfiguration(options);
    this.algorithmConfiguration = Object.freeze({
      population: this.configuration.population,
      maximumGenerations: this.configuration.maximumGenerations,
      elitePercent: this.configuration.elitePercent,
      mutationPercent: this.configuration.mutationPercent,
    });
  }

  public generate(request: CandidateGenerationRequest): GeneratedCandidate {
    const sortedIds = assertSearchSpace(request.searchSpace);
    assertRequest(request);
    const availableIds = new Set(sortedIds);
    const total = totalCandidateCount(request.searchSpace, sortedIds.length);
    const used = new Set(
      request.previouslyGeneratedCandidateKeys.filter((key) =>
        isCandidateKey(key, availableIds, request.searchSpace),
      ),
    );
    if (BigInt(used.size) >= total) {
      throw new GeneticGeneratorError("SEARCH_SPACE_EXHAUSTED", "Genetic search space is exhausted");
    }

    const slot = request.iterationNumber - 1;
    const generation = Math.min(
      this.configuration.maximumGenerations - 1,
      Math.floor(slot / this.configuration.population),
    );
    const populationIndex = slot % this.configuration.population;
    for (let attempt = 0; attempt < 2_048; attempt += 1) {
      const candidateIds = individualAt(
        generation,
        (populationIndex + attempt) % this.configuration.population,
        `${request.randomSeed}\u0000${attempt}`,
        sortedIds,
        request.searchSpace,
        this.configuration,
      );
      const candidate = candidateFromIds(candidateIds);
      if (!used.has(candidate.candidateKey)) return candidate;
    }

    const fallbackSeed = hashSeed(
      `${request.randomSeed}\u0000${this.configuration.population}\u0000${this.configuration.maximumGenerations}\u0000${this.configuration.elitePercent}\u0000${this.configuration.mutationPercent}\u0000${request.iterationNumber}`,
    );
    for (let offset = 0n; offset < total && offset < 4_096n; offset += 1n) {
      const rank = (BigInt(fallbackSeed) + offset) % total;
      let remainingRank = rank;
      for (
        let count = request.searchSpace.componentCount.minimum;
        count <= request.searchSpace.componentCount.maximum;
        count += 1
      ) {
        const countSize = combinations(sortedIds.length, count);
        if (remainingRank < countSize) {
          const candidate = candidateFromIds(unrankCombination(sortedIds, count, remainingRank));
          if (!used.has(candidate.candidateKey)) return candidate;
          break;
        }
        remainingRank -= countSize;
      }
    }

    throw new GeneticGeneratorError("SEARCH_SPACE_EXHAUSTED", "Genetic search space is exhausted");
  }
}

export const GeneticGenerator = GeneticStrategyGenerator;
