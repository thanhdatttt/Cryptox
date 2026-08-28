import type { SearchApplicationDependencies } from "../application/ports";
import type {
  CandidateGenerationRequest,
  GeneratedCandidate,
  SearchModulePublicApi,
  SearchRunStatus,
} from "./contracts";
import { createSearchApplication } from "../application/service";
export type SearchModuleDependencies = SearchApplicationDependencies<
  SearchRunStatus,
  CandidateGenerationRequest,
  GeneratedCandidate
>;
export function createSearchModule(_deps: SearchModuleDependencies): SearchModulePublicApi {
  return createSearchApplication(_deps);
}
