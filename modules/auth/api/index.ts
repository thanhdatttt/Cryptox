import { createAuthModule, createInMemoryAuthDependencies } from "../application/service";
export type { User, UserRepository } from "../domain/contracts";
export { AuthException } from "../domain/errors";
export interface AuthModulePublicApi { register(email: string, password: string): Promise<void>; login(email: string, password: string): Promise<{ token: string }>; verify(token: string): Promise<{ userId: string }>; }
const defaultService = createAuthModule(createInMemoryAuthDependencies());
export const register: AuthModulePublicApi["register"] = (email, password) => defaultService.register(email, password);
export const login: AuthModulePublicApi["login"] = (email, password) => defaultService.login(email, password);
export const verify: AuthModulePublicApi["verify"] = (token) => defaultService.verify(token);
export { createAuthModule, createInMemoryAuthDependencies } from "../application/service";
