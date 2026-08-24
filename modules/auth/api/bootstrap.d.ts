export type { AuthModuleDependencies } from "../application/ports";
import type { AuthModuleDependencies } from "../application/ports";
import type { AuthModulePublicApi } from "./index";
export declare function createAuthModule(deps?: Partial<AuthModuleDependencies>): AuthModulePublicApi;
