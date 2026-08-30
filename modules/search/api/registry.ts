import type {
  CandidateGenerationRequest,
  GeneratedCandidate,
  GeneratorType,
  SeededDiscoveryProfileId,
  SeededDiscoveryProvenance,
  StrategyGenerator,
} from "./contracts";
import type { StrategyGeneratorRegistry } from "../application/ports";
import {
  DomainGuidedStrategyGenerator,
  type DomainGuidedGeneratorOptions,
} from "../domain/generators/domain-guided";
import {
  GeneticStrategyGenerator,
  type GeneticGeneratorOptions,
} from "../domain/generators/genetic";
import { SeededRandomStrategyGenerator } from "../domain/random-generator";

export type SearchGeneratorAlgorithmConfiguration =
  SeededDiscoveryProvenance["algorithmConfiguration"];

/**
 * The metadata carried by a public Search generator registration. Keeping the
 * profile and normalized configuration beside the generator makes provenance
 * explicit without exposing a Search domain module to composition roots.
 */
export type SearchGeneratorInstance<TProfile extends SeededDiscoveryProfileId> = StrategyGenerator & {
  readonly profileId: TProfile;
  readonly algorithmConfiguration: SearchGeneratorAlgorithmConfiguration;
};

export interface SearchGeneratorRegistration<
  TProfile extends SeededDiscoveryProfileId = SeededDiscoveryProfileId,
> {
  readonly profileId: TProfile;
  readonly generatorType: GeneratorType;
  readonly algorithmConfiguration: SearchGeneratorAlgorithmConfiguration;
  readonly generator: SearchGeneratorInstance<TProfile>;
}

export interface SearchGeneratorRegistry
  extends StrategyGeneratorRegistry<CandidateGenerationRequest, GeneratedCandidate> {
  readonly RANDOM: SearchGeneratorInstance<"RANDOM_V1">;
  readonly DOMAIN_GUIDED: SearchGeneratorInstance<"DOMAIN_GUIDED_V1">;
  readonly GENETIC: SearchGeneratorInstance<"GENETIC_V1">;
  readonly registrations: readonly SearchGeneratorRegistration[];
}

export interface SearchGeneratorRegistryOptions {
  /**
   * Domain-guided generation has no safe universal default: its categories
   * and definition membership must be declared by the composition root.
   */
  readonly domainGuided: DomainGuidedGeneratorOptions;
  readonly genetic?: GeneticGeneratorOptions;
}

export type { DomainGuidedGeneratorOptions, GeneticGeneratorOptions };

function addRandomProfile(
  generator: SeededRandomStrategyGenerator,
): SearchGeneratorInstance<"RANDOM_V1"> {
  const random = generator as SeededRandomStrategyGenerator & {
    profileId: "RANDOM_V1";
    algorithmConfiguration: SearchGeneratorAlgorithmConfiguration;
  };
  Object.defineProperties(random, {
    profileId: {
      configurable: false,
      enumerable: true,
      value: "RANDOM_V1",
      writable: false,
    },
    algorithmConfiguration: {
      configurable: false,
      enumerable: true,
      value: Object.freeze({}),
      writable: false,
    },
  });
  return Object.freeze(random);
}

function registration<TProfile extends SeededDiscoveryProfileId>(
  profileId: TProfile,
  generatorType: GeneratorType,
  generator: SearchGeneratorInstance<TProfile>,
): SearchGeneratorRegistration<TProfile> {
  return Object.freeze({
    profileId,
    generatorType,
    algorithmConfiguration: generator.algorithmConfiguration,
    generator,
  });
}

/**
 * Composes the approved deterministic Search profiles from their existing
 * implementations. The returned value is directly assignable to the
 * `generators` dependency accepted by `createSearchModule`.
 */
export function createSearchGeneratorRegistry(
  options: SearchGeneratorRegistryOptions,
): SearchGeneratorRegistry {
  const random = addRandomProfile(new SeededRandomStrategyGenerator());
  const domainGuided = Object.freeze(new DomainGuidedStrategyGenerator(options.domainGuided)) as SearchGeneratorInstance<
    "DOMAIN_GUIDED_V1"
  >;
  const genetic = Object.freeze(
    new GeneticStrategyGenerator(options.genetic),
  ) as SearchGeneratorInstance<"GENETIC_V1">;
  const registrations = Object.freeze([
    registration("RANDOM_V1", "RANDOM", random),
    registration("DOMAIN_GUIDED_V1", "DOMAIN_GUIDED", domainGuided),
    registration("GENETIC_V1", "GENETIC", genetic),
  ]);

  return Object.freeze({
    RANDOM: random,
    DOMAIN_GUIDED: domainGuided,
    GENETIC: genetic,
    registrations,
  });
}
