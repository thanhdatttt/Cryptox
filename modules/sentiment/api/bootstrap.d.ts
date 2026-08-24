export type { SentimentModuleDependencies } from "../application/ports";
import type { SentimentModuleDependencies } from "../application/ports";
import type { SentimentModulePublicApi } from "./index";
export declare function createSentimentModule(deps?: Partial<SentimentModuleDependencies>): SentimentModulePublicApi;
