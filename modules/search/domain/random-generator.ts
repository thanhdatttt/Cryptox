export type GeneratorType = "RANDOM" | "DOMAIN_GUIDED" | "GENETIC";

export interface GeneratedCandidate {
  candidateKey: string;
  compositeLogicalFamilyKey: string;
  strategyDefinitionIds: readonly string[];
  combinationProfileId: "MAJORITY_VOTE_V1";
  generatedBy: GeneratorType;
}

export interface SearchSpaceConfig {
  availableStrategyDefinitionIds: readonly string[];
  componentCount: {
    minimum: number;
    maximum: number;
  };
  requireDistinctComponents: true;
}

export interface CandidateGenerationRequest {
  searchSpace: SearchSpaceConfig;
  randomSeed: string;
  iterationNumber: number;
  previouslyGeneratedCandidateKeys: readonly string[];
}

export interface StrategyGenerator {
  readonly type: GeneratorType;
  generate(request: CandidateGenerationRequest): GeneratedCandidate;
}

export class RandomGeneratorError extends Error {
  public readonly name = "RandomGeneratorError";

  public constructor(
    public readonly code: "INVALID_SEARCH_SPACE" | "INVALID_GENERATION_REQUEST" | "SEARCH_SPACE_EXHAUSTED",
    message: string,
  ) {
    super(message);
  }
}

function assertValidSearchSpace(searchSpace: SearchSpaceConfig): string[] {
  if (
    !searchSpace ||
    !Array.isArray(searchSpace.availableStrategyDefinitionIds) ||
    searchSpace.availableStrategyDefinitionIds.length < 2 ||
    searchSpace.requireDistinctComponents !== true
  ) {
    throw new RandomGeneratorError("INVALID_SEARCH_SPACE", "search space must contain at least two distinct strategies");
  }

  const ids = [...searchSpace.availableStrategyDefinitionIds];
  if (
    ids.some((id) => typeof id !== "string" || id.trim().length === 0) ||
    new Set(ids).size !== ids.length
  ) {
    throw new RandomGeneratorError("INVALID_SEARCH_SPACE", "search strategy identifiers must be non-empty and unique");
  }

  const { minimum, maximum } = searchSpace.componentCount;
  if (
    !Number.isInteger(minimum) ||
    !Number.isInteger(maximum) ||
    minimum < 2 ||
    maximum < minimum ||
    maximum > ids.length
  ) {
    throw new RandomGeneratorError("INVALID_SEARCH_SPACE", "component count must be a bounded range of distinct strategies");
  }

  return ids.sort((left, right) => left.localeCompare(right));
}

function assertValidRequest(request: CandidateGenerationRequest): string[] {
  if (
    !request ||
    typeof request.randomSeed !== "string" ||
    request.randomSeed.length === 0 ||
    !Number.isInteger(request.iterationNumber) ||
    request.iterationNumber < 1 ||
    !Array.isArray(request.previouslyGeneratedCandidateKeys)
  ) {
    throw new RandomGeneratorError("INVALID_GENERATION_REQUEST", "invalid Random generation request");
  }

  return assertValidSearchSpace(request.searchSpace);
}

function hashSeed(seed: string, iterationNumber: number): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  hash ^= iterationNumber;
  hash = Math.imul(hash, 16_777_619);
  return hash >>> 0;
}

function nextRandom(state: { value: number }): number {
  state.value = (state.value + 0x6d2b79f5) | 0;
  let value = Math.imul(state.value ^ (state.value >>> 15), 1 | state.value);
  value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
  return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
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

function isCandidateInSearchSpace(
  key: string,
  searchSpace: SearchSpaceConfig,
  sortedIds: readonly string[],
): boolean {
  let decoded: unknown;
  try {
    decoded = JSON.parse(key);
  } catch {
    return false;
  }
  if (!Array.isArray(decoded) || decoded.length < 3 || decoded[0] !== "MAJORITY_VOTE_V1") {
    return false;
  }
  const ids = decoded.slice(1);
  if (
    ids.some((id) => typeof id !== "string") ||
    ids.length < searchSpace.componentCount.minimum ||
    ids.length > searchSpace.componentCount.maximum ||
    new Set(ids).size !== ids.length
  ) {
    return false;
  }
  const expected = [...ids].sort((left, right) => left.localeCompare(right));
  return (
    JSON.stringify(["MAJORITY_VOTE_V1", ...expected]) === key &&
    ids.every((id) => sortedIds.includes(id))
  );
}

function unrankCombination(
  sortedIds: readonly string[],
  componentCount: number,
  rank: bigint,
): string[] {
  const result: string[] = [];
  let nextIndex = 0;
  let remaining = componentCount;
  let remainingRank = rank;

  while (remaining > 0) {
    for (let index = nextIndex; index <= sortedIds.length - remaining; index += 1) {
      const choicesAfter = combinations(sortedIds.length - index - 1, remaining - 1);
      if (remainingRank < choicesAfter) {
        result.push(sortedIds[index]!);
        nextIndex = index + 1;
        remaining -= 1;
        break;
      }
      remainingRank -= choicesAfter;
    }
  }

  return result;
}

function candidateAtRank(
  searchSpace: SearchSpaceConfig,
  sortedIds: readonly string[],
  rank: bigint,
): GeneratedCandidate {
  let remainingRank = rank;
  let componentCount = searchSpace.componentCount.minimum;
  while (componentCount <= searchSpace.componentCount.maximum) {
    const count = combinations(sortedIds.length, componentCount);
    if (remainingRank < count) {
      const strategyDefinitionIds = unrankCombination(sortedIds, componentCount, remainingRank);
      const candidateKey = JSON.stringify(["MAJORITY_VOTE_V1", ...strategyDefinitionIds]);
      return {
        candidateKey,
        compositeLogicalFamilyKey: candidateKey,
        strategyDefinitionIds,
        combinationProfileId: "MAJORITY_VOTE_V1",
        generatedBy: "RANDOM",
      };
    }
    remainingRank -= count;
    componentCount += 1;
  }

  throw new RandomGeneratorError("SEARCH_SPACE_EXHAUSTED", "search space is exhausted");
}

/**
 * Generates canonical, distinct component combinations from a reproducible
 * seed. The generator is stateless: the iteration and previously generated
 * keys supplied by Search determine the next member of the deterministic
 * pseudo-random permutation.
 */
export class SeededRandomStrategyGenerator implements StrategyGenerator {
  public readonly type = "RANDOM" as const;

  public generate(request: CandidateGenerationRequest): GeneratedCandidate {
    const sortedIds = assertValidRequest(request);
    const total = totalCandidateCount(request.searchSpace, sortedIds.length);
    const used = new Set(
      request.previouslyGeneratedCandidateKeys.filter((key) =>
        isCandidateInSearchSpace(key, request.searchSpace, sortedIds),
      ),
    );
    if (BigInt(used.size) >= total) {
      throw new RandomGeneratorError("SEARCH_SPACE_EXHAUSTED", "search space is exhausted");
    }

    const random = { value: hashSeed(request.randomSeed, request.iterationNumber) };
    const initialRank = BigInt(Math.floor(nextRandom(random) * 4_294_967_296)) % total;
    for (let offset = 0n; offset <= BigInt(used.size); offset += 1n) {
      const candidate = candidateAtRank(
        request.searchSpace,
        sortedIds,
        (initialRank + offset) % total,
      );
      if (!used.has(candidate.candidateKey)) {
        return candidate;
      }
    }

    throw new RandomGeneratorError("SEARCH_SPACE_EXHAUSTED", "search space is exhausted");
  }
}

export const RandomStrategyGenerator = SeededRandomStrategyGenerator;
