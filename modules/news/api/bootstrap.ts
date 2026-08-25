export type { NewsModuleDependencies } from "../application/ports";
import type { NewsModuleDependencies } from "../application/ports";
import type { NewsModulePublicApi } from "./index";
import { createNewsModule as createRuntime } from "../application/service";
export function createNewsModule(deps?: Partial<NewsModuleDependencies>): NewsModulePublicApi { return createRuntime(deps); }
export { PostgresNewsRepository } from "../infrastructure/postgres-repository";
export type { NewsSqlClient } from "../infrastructure/postgres-repository";
export { createConfiguredNewsProviders, createDemoNewsProvider } from "../infrastructure/demo-provider";
