export type {
  Clock,
  SentimentModuleDependencies,
  SentimentObservability,
  SentimentProvider,
  SentimentProviderResult,
  SentimentResultRepository,
} from "../application/ports";
import type { SentimentModuleDependencies } from "../application/ports";
import type { SentimentModulePublicApi } from "./contracts";
import { createSentimentApplication } from "../application/service";
export function createSentimentModule(
  deps: SentimentModuleDependencies,
): SentimentModulePublicApi {
  return createSentimentApplication(deps) as unknown as SentimentModulePublicApi;
}
