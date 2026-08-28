import type { AuthApplicationDependencies } from "../application/ports";
import type { AuthenticatedUserId, AuthModulePublicApi } from "./contracts";
import { createAuthApplication } from "../application/service";

export type AuthModuleDependencies = AuthApplicationDependencies<AuthenticatedUserId>;

export function createAuthModule(dependencies: AuthModuleDependencies): AuthModulePublicApi {
  return createAuthApplication(dependencies) as unknown as AuthModulePublicApi;
}
