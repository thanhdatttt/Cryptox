import type { SearchApplicationApi } from "../application/ports";

export type {
  SearchCandidateTemplate,
  SearchRunPage,
  SearchRunPageRequest,
  SearchRunState,
  SearchRunStatus,
  SearchRunStopReason,
  SeededDiscoveryProvenance,
  StartSearchCommand,
  StopCondition,
} from "../application/ports";

export type {
  CandidateGenerationRequest,
  GeneratedCandidate,
  GeneratorType,
  SearchSpaceConfig,
  SeededDiscoveryProfileId,
  StrategyGenerator,
} from "../domain/random-generator";

export { GENETIC_V1_DEFAULTS } from "../domain/generators/genetic";

export const SEARCH_GENERATOR_TYPES = ["RANDOM", "DOMAIN_GUIDED", "GENETIC"] as const;
export const SEEDED_DISCOVERY_PROFILE_IDS = ["RANDOM_V1", "DOMAIN_GUIDED_V1", "GENETIC_V1"] as const;

export const SEARCH_CANDIDATE_IDENTITY_V1 = {
  id: "SEARCH_CANDIDATE_IDENTITY_V1",
  strategyDefinitionOrder: "ID_ASCENDING",
  candidateKeyEncoding: "JSON_ARRAY_OF_COMBINATION_PROFILE_AND_ORDERED_DEFINITION_IDS",
  compositeLogicalFamilyKey: "EQUAL_TO_CANDIDATE_KEY",
} as const;

export interface SearchModulePublicApi extends SearchApplicationApi {}
