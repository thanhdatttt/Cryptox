import type { SearchApplicationDependencies } from "../application/ports";
import type {
  CandidateGenerationRequest,
  GeneratedCandidate,
  SearchModulePublicApi,
  SearchRunStatus,
} from "./contracts";
import {
  createSearchApplication,
  type SearchApplicationOptions,
} from "../application/service";
export type SearchModuleDependencies = SearchApplicationDependencies<
  SearchRunStatus,
  CandidateGenerationRequest,
  GeneratedCandidate
>;
export function createSearchModule(
  _deps: SearchModuleDependencies,
  options: SearchApplicationOptions = {},
): SearchModulePublicApi {
  return createSearchApplication(_deps, options);
}

export {
  createSearchGeneratorRegistry,
  type SearchGeneratorAlgorithmConfiguration,
  type SearchGeneratorInstance,
  type SearchGeneratorRegistration,
  type SearchGeneratorRegistry,
  type SearchGeneratorRegistryOptions,
  type DomainGuidedGeneratorOptions,
  type GeneticGeneratorOptions,
} from "./registry";

export { createPostgresSearchRunRepository, PostgresSearchRunRepository } from "../infrastructure/postgres";
export type {
  PostgresPool,
  PostgresQueryResult,
  PostgresSearchRunOptions,
} from "../infrastructure/postgres";
