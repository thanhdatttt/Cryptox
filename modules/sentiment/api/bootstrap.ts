export type { SentimentModuleDependencies } from "../application/ports";
import type { SentimentModuleDependencies } from "../application/ports";
import type { SentimentModulePublicApi } from "./index";
import { analyze, createSnapshot, readLatestForNews, readSnapshot } from "./index";
export function createSentimentModule(_deps: SentimentModuleDependencies): SentimentModulePublicApi { return { analyze, readLatestForNews, createSnapshot, readSnapshot }; }
