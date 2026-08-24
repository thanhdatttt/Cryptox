export type { AuthModuleDependencies } from "../application/ports";
import type { AuthModuleDependencies } from "../application/ports";
import type { AuthModulePublicApi } from "./index";
import { createAuthModule as createRuntime } from "../application/service";
export function createAuthModule(deps?: Partial<AuthModuleDependencies>): AuthModulePublicApi { return createRuntime(deps); }
