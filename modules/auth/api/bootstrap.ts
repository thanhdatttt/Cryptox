export type { AuthModuleDependencies } from "../application/ports";
import type { AuthModuleDependencies } from "../application/ports";
import type { AuthModulePublicApi } from "./index";
import { login, register, verify } from "./index";
export function createAuthModule(_deps: AuthModuleDependencies): AuthModulePublicApi {
  return { register, login, verify };
}
