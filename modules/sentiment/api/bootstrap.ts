export type { SentimentModuleDependencies } from "../application/ports";
import type { SentimentModuleDependencies } from "../application/ports";
import type { SentimentModulePublicApi } from "./index";
import { createSentimentModule as createRuntime } from "../application/service";
export function createSentimentModule(deps?: Partial<SentimentModuleDependencies>): SentimentModulePublicApi { return createRuntime(deps); }
