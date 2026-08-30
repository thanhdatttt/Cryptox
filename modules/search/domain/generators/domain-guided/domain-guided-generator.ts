import type {
  CandidateGenerationRequest,
  GeneratedCandidate,
  SearchSpaceConfig,
  StrategyGenerator,
} from "../../random-generator";

export type DomainGuidedCategoryMembers = Readonly<Record<string, readonly string[]>>;

export interface DomainGuidedGeneratorOptions {
  /** The category names are the only categories this generator may use. */
  readonly categories?: readonly string[];
  readonly declaredCategories?: readonly string[];
  /** Explicit category-to-definition membership. */
  readonly categoryMembers?: DomainGuidedCategoryMembers;
  readonly strategyDefinitionsByCategory?: DomainGuidedCategoryMembers;
  readonly categoryStrategyDefinitionIds?: DomainGuidedCategoryMembers;
}

export class DomainGuidedGeneratorError extends Error {
  public readonly name = "DomainGuidedGeneratorError";

  public constructor(
    public readonly code:
      | "INVALID_SEARCH_SPACE"
      | "INVALID_GENERATION_REQUEST"
      | "INVALID_CATEGORY_CONFIGURATION"
      | "SEARCH_SPACE_EXHAUSTED",
    message: string,
  ) {
    super(message);
  }
}

interface NormalizedDomainGuidedConfiguration {
  readonly categories: readonly string[];
  readonly categoryMembers: Readonly<Record<string, readonly string[]>>;
}

function assertSearchSpace(searchSpace: SearchSpaceConfig): string[] {
  if (
    !searchSpace ||
    !Array.isArray(searchSpace.availableStrategyDefinitionIds) ||
    searchSpace.availableStrategyDefinitionIds.length < 2 ||
    searchSpace.requireDistinctComponents !== true
  ) {
    throw new DomainGuidedGeneratorError(
      "INVALID_SEARCH_SPACE",
      "search space must contain at least two distinct strategies",
    );
  }

  const ids = [...searchSpace.availableStrategyDefinitionIds];
  if (
    ids.some((id) => typeof id !== "string" || id.trim().length === 0) ||
    new Set(ids).size !== ids.length
  ) {
    throw new DomainGuidedGeneratorError(
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
    throw new DomainGuidedGeneratorError(
      "INVALID_SEARCH_SPACE",
      "component count must be a bounded range of distinct strategies",
    );
  }

  return ids.sort((left, right) => left.localeCompare(right));
}

function normalizeCategories(options: DomainGuidedGeneratorOptions): NormalizedDomainGuidedConfiguration {
  const configuredMembers =
    options.categoryMembers ??
    options.strategyDefinitionsByCategory ??
    options.categoryStrategyDefinitionIds ??
    {};
  const configuredCategories =
    options.categories ??
    options.declaredCategories ??
    Object.keys(configuredMembers);
  if (!Array.isArray(configuredCategories) || configuredCategories.length === 0) {
    throw new DomainGuidedGeneratorError(
      "INVALID_CATEGORY_CONFIGURATION",
      "Domain-guided generation requires explicitly declared categories",
    );
  }

  const categories = [...configuredCategories];
  if (
    categories.some((category) => typeof category !== "string" || category.trim().length === 0) ||
    new Set(categories).size !== categories.length
  ) {
    throw new DomainGuidedGeneratorError(
      "INVALID_CATEGORY_CONFIGURATION",
      "declared Domain-guided categories must be non-empty and unique",
    );
  }

  const sortedCategories = categories.sort((left, right) => left.localeCompare(right));
  const categoryMembers: Record<string, readonly string[]> = {};
  for (const category of sortedCategories) {
    const members = configuredMembers[category] ?? [category];
    if (
      !Array.isArray(members) ||
      members.length === 0 ||
      members.some((id) => typeof id !== "string" || id.trim().length === 0) ||
      new Set(members).size !== members.length
    ) {
      throw new DomainGuidedGeneratorError(
        "INVALID_CATEGORY_CONFIGURATION",
        `category ${category} must declare one or more unique strategy definitions`,
      );
    }
    categoryMembers[category] = Object.freeze(
      [...members].sort((left, right) => left.localeCompare(right)),
    );
  }

  return {
    categories: Object.freeze(sortedCategories),
    categoryMembers: Object.freeze(categoryMembers),
  };
}

function assertRequest(
  request: CandidateGenerationRequest,
  sortedIds: readonly string[],
): void {
  if (
    !request ||
    typeof request.randomSeed !== "string" ||
    request.randomSeed.length === 0 ||
    !Number.isInteger(request.iterationNumber) ||
    request.iterationNumber < 1 ||
    !Array.isArray(request.previouslyGeneratedCandidateKeys)
  ) {
    throw new DomainGuidedGeneratorError(
      "INVALID_GENERATION_REQUEST",
      "invalid Domain-guided generation request",
    );
  }

  const { minimum, maximum } = request.searchSpace.componentCount;
  if (minimum > sortedIds.length || maximum > sortedIds.length) {
    throw new DomainGuidedGeneratorError(
      "INVALID_SEARCH_SPACE",
      "component count exceeds the available strategy definitions",
    );
  }
}

function configurationFingerprint(configuration: NormalizedDomainGuidedConfiguration): string {
  return JSON.stringify(
    configuration.categories.map((category) => [category, configuration.categoryMembers[category]]),
  );
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

function shuffle<T>(values: readonly T[], state: { value: number }): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom(state) * (index + 1));
    const value = result[index]!;
    result[index] = result[swapIndex]!;
    result[swapIndex] = value;
  }
  return result;
}

function candidateKey(strategyDefinitionIds: readonly string[]): string {
  return JSON.stringify(["MAJORITY_VOTE_V1", ...strategyDefinitionIds]);
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

function combinations<T>(values: readonly T[], count: number): T[][] {
  const result: T[][] = [];
  const current: T[] = [];
  const visit = (start: number): void => {
    if (current.length === count) {
      result.push([...current]);
      return;
    }
    for (let index = start; index <= values.length - (count - current.length); index += 1) {
      current.push(values[index]!);
      visit(index + 1);
      current.pop();
    }
  };
  visit(0);
  return result;
}

function chooseCategorySubset(
  categories: readonly string[],
  count: number,
  state: { value: number },
): string[] {
  if (count >= categories.length) return [...categories];
  return shuffle(categories, state).slice(0, count).sort((left, right) => left.localeCompare(right));
}

function makeCandidate(
  sortedIds: readonly string[],
  searchSpace: SearchSpaceConfig,
  configuration: NormalizedDomainGuidedConfiguration,
  seed: string,
  iterationNumber: number,
  attempt: number,
): GeneratedCandidate | undefined {
  const componentRange = searchSpace.componentCount.maximum - searchSpace.componentCount.minimum + 1;
  const componentCount =
    searchSpace.componentCount.minimum + ((iterationNumber - 1 + attempt) % componentRange);
  const state = {
    value: hashSeed(
      `${seed}\u0000${configurationFingerprint(configuration)}\u0000${iterationNumber}\u0000${attempt}`,
    ),
  };
  const categoryCount = Math.min(componentCount, configuration.categories.length);
  const selectedCategories = chooseCategorySubset(configuration.categories, categoryCount, state);
  const selectedMembers = new Set<string>();
  for (const category of selectedCategories) {
    const available = configuration.categoryMembers[category]!.filter((id) => sortedIds.includes(id));
    if (available.length === 0) return undefined;
    selectedMembers.add(available[Math.floor(nextRandom(state) * available.length)]!);
  }

  const fillPool = shuffle(
    selectedCategories.flatMap((category) => configuration.categoryMembers[category]!)
      .filter((id, index, values) => values.indexOf(id) === index)
      .filter((id) => sortedIds.includes(id)),
    state,
  );
  for (const id of fillPool) {
    if (selectedMembers.size >= componentCount) break;
    selectedMembers.add(id);
  }
  if (selectedMembers.size < componentCount) {
    const allDeclaredMembers = configuration.categories.flatMap(
      (category) => configuration.categoryMembers[category]!,
    );
    for (const id of shuffle(allDeclaredMembers, state)) {
      if (!sortedIds.includes(id)) continue;
      if (selectedMembers.size >= componentCount) break;
      selectedMembers.add(id);
    }
  }
  if (selectedMembers.size !== componentCount) return undefined;
  const ids = [...selectedMembers].sort((left, right) => left.localeCompare(right));
  return {
    candidateKey: candidateKey(ids),
    compositeLogicalFamilyKey: candidateKey(ids),
    strategyDefinitionIds: ids,
    combinationProfileId: "MAJORITY_VOTE_V1",
    generatedBy: "DOMAIN_GUIDED",
  };
}

/**
 * Selects deterministic combinations from explicitly configured category
 * membership. The generator never infers a category from a strategy name.
 */
export class DomainGuidedStrategyGenerator implements StrategyGenerator {
  public readonly type = "DOMAIN_GUIDED" as const;
  public readonly profileId = "DOMAIN_GUIDED_V1" as const;
  public readonly algorithmConfiguration: Readonly<Record<string, readonly string[]>>;

  private readonly configuration: NormalizedDomainGuidedConfiguration;

  public constructor(options: DomainGuidedGeneratorOptions = {}) {
    this.configuration = normalizeCategories(options);
    const categoryMembers = this.configuration.categories.flatMap((category) =>
      this.configuration.categoryMembers[category]!.map((id) => `${category}=${id}`),
    );
    this.algorithmConfiguration = Object.freeze({
      categories: this.configuration.categories,
      categoryMembers: Object.freeze(categoryMembers),
    });
  }

  public generate(request: CandidateGenerationRequest): GeneratedCandidate {
    const sortedIds = assertSearchSpace(request.searchSpace);
    assertRequest(request, sortedIds);
    const availableIds = new Set(sortedIds);
    for (const category of this.configuration.categories) {
      const members = this.configuration.categoryMembers[category]!;
      if (members.every((id) => !availableIds.has(id))) {
        throw new DomainGuidedGeneratorError(
          "INVALID_CATEGORY_CONFIGURATION",
          `declared category ${category} has no strategy definition in the search space`,
        );
      }
    }
    const declaredIds = new Set(
      this.configuration.categories.flatMap((category) => this.configuration.categoryMembers[category]!),
    );
    const usableDeclaredIds = new Set([...declaredIds].filter((id) => availableIds.has(id)));
    if (usableDeclaredIds.size < request.searchSpace.componentCount.minimum) {
      throw new DomainGuidedGeneratorError(
        "INVALID_CATEGORY_CONFIGURATION",
        "declared categories do not provide enough available strategy definitions",
      );
    }

    const used = new Set(
      request.previouslyGeneratedCandidateKeys.filter((key) =>
        isCandidateKey(key, availableIds, request.searchSpace),
      ),
    );
    const attempts = Math.min(2_048, Math.max(64, usableDeclaredIds.size * 16));
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const candidate = makeCandidate(
        sortedIds,
        request.searchSpace,
        this.configuration,
        request.randomSeed,
        request.iterationNumber,
        attempt,
      );
      if (candidate && !used.has(candidate.candidateKey)) return candidate;
    }

    // For small finite spaces, complete the deterministic search without
    // making a large-space run enumerate an unbounded Cartesian product.
    if (usableDeclaredIds.size <= 24) {
      const ids = [...usableDeclaredIds].sort((left, right) => left.localeCompare(right));
      for (
        let count = request.searchSpace.componentCount.minimum;
        count <= Math.min(request.searchSpace.componentCount.maximum, ids.length);
        count += 1
      ) {
        for (const combination of combinations(ids, count)) {
          const key = candidateKey(combination);
          if (used.has(key)) continue;
          return {
            candidateKey: key,
            compositeLogicalFamilyKey: key,
            strategyDefinitionIds: combination,
            combinationProfileId: "MAJORITY_VOTE_V1",
            generatedBy: "DOMAIN_GUIDED",
          };
        }
      }
    }

    throw new DomainGuidedGeneratorError("SEARCH_SPACE_EXHAUSTED", "Domain-guided search space is exhausted");
  }
}

export const DomainGuidedGenerator = DomainGuidedStrategyGenerator;
