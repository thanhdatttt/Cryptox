export type { NewsModuleDependencies } from "../application/ports";
import type { NewsModuleDependencies } from "../application/ports";
import type { NewsModulePublicApi } from "./index";
export declare function createNewsModule(deps?: Partial<NewsModuleDependencies>): NewsModulePublicApi;
