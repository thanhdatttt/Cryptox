export type { SentimentModuleDependencies } from "../application/ports";
import type { SentimentModuleDependencies } from "../application/ports";
import type { SentimentModulePublicApi } from "./index";
import { createSentimentModule as createRuntime } from "../application/service";
export function createSentimentModule(deps?: Partial<SentimentModuleDependencies>): SentimentModulePublicApi { return createRuntime(deps); }
export { createDeterministicSentimentAdapter, LOCAL_SENTIMENT_MODEL_NAME, LOCAL_SENTIMENT_MODEL_SHA256, LOCAL_SENTIMENT_MODEL_VERSION } from "../infrastructure/deterministic-adapter";
export { PostgresSentimentResultRepository, PostgresSentimentSnapshotRepository } from "../infrastructure/postgres-repositories";
export type { SentimentSqlClient } from "../infrastructure/postgres-repositories";
