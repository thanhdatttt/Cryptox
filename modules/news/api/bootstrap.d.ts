export type { NewsModuleDependencies } from "../application/ports";
import type { NewsModuleDependencies } from "../application/ports";
import type { NewsModulePublicApi } from "./index";
export declare function createNewsModule(deps?: Partial<NewsModuleDependencies>): NewsModulePublicApi;
export { PostgresNewsRepository } from "../infrastructure/postgres-repository";
export type { NewsSqlClient } from "../infrastructure/postgres-repository";
export { createConfiguredNewsProviders, createDemoNewsProvider } from "../infrastructure/demo-provider";
