export type { AuthModuleDependencies } from "../application/ports";
import type { AuthModuleDependencies } from "../application/ports";
import type { AuthModulePublicApi } from "./index";
import { Pool } from "pg";
export declare function createAuthModule(deps?: Partial<AuthModuleDependencies>): AuthModulePublicApi;
export declare function createPostgresAuthModule(input: {
    connectionString: string;
    jwtSecret?: string;
    pool?: Pool;
}): AuthModulePublicApi;
export declare function createConfiguredAuthModule(): AuthModulePublicApi;
