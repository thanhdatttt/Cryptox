import type { AuthApplicationDependencies } from "../application/ports";
import type { AuthenticatedUserId, AuthModulePublicApi } from "./contracts";
import { currentUser, login, logout, register, resolveSession } from "./index";

export type AuthModuleDependencies = AuthApplicationDependencies<AuthenticatedUserId>;

export function createAuthModule(_dependencies: AuthModuleDependencies): AuthModulePublicApi {
  return { register, login, resolveSession, currentUser, logout };
}
