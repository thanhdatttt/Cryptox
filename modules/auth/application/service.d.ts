import type { AuthModuleDependencies } from "./ports";
type InternalDependencies = Partial<AuthModuleDependencies>;
export interface AuthModuleRuntime {
    register(email: string, password: string): Promise<void>;
    login(email: string, password: string): Promise<{
        token: string;
    }>;
    verify(token: string): Promise<{
        userId: string;
    }>;
}
export declare function createInMemoryAuthDependencies(): AuthModuleDependencies;
export declare function createAuthModule(dependencies?: InternalDependencies): AuthModuleRuntime;
export {};
