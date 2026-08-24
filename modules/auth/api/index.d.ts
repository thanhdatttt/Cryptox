import type { AuthModuleDependencies } from "./bootstrap";
export type { User, UserRepository } from "../domain/contracts";
export interface AuthModulePublicApi {
  register(email: string, password: string): Promise<void>;
  login(
    email: string,
    password: string,
  ): Promise<{
    token: string;
  }>;
  verify(token: string): Promise<{
    userId: string;
  }>;
}
export declare const register: AuthModulePublicApi["register"];
export declare const login: AuthModulePublicApi["login"];
export declare const verify: AuthModulePublicApi["verify"];
export declare function createAuthModule(_deps: AuthModuleDependencies): AuthModulePublicApi;
