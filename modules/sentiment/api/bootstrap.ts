export type {
  Clock,
  SentimentModuleDependencies,
  SentimentObservability,
  SentimentProvider,
  SentimentProviderResult,
  SentimentResultRepository,
} from "../application/ports";
import type { SentimentModuleDependencies } from "../application/ports";
import type { SentimentModulePublicApi } from "./index";
import { analyze, readLatestForNews } from "./index";
export function createSentimentModule(
  _deps: SentimentModuleDependencies,
): SentimentModulePublicApi {
  return { analyze, readLatestForNews };
}
