export type {
  Clock,
  SentimentModuleDependencies,
  SentimentObservability,
  SentimentProvider,
  SentimentProviderResult,
  SentimentResultRepository,
  NewsExtractionProvenanceInput,
  SentimentNewsProvenanceJoin,
} from "../application/ports";
import type { SentimentModuleDependencies } from "../application/ports";
import type { SentimentModulePublicApi } from "./contracts";
import { createSentimentApplication, type SentimentApplication } from "../application/service";
export function createSentimentModule(
  deps: SentimentModuleDependencies,
): SentimentApplication & SentimentModulePublicApi {
  return createSentimentApplication(deps) as SentimentApplication & SentimentModulePublicApi;
}

export {
  joinNewsSentimentProvenance,
  type SentimentApplication,
} from "../application/service";
