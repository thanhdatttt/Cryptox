export type { User, UserRepository } from "../domain/contracts";
export interface AuthModulePublicApi {
  register(email: string, password: string): Promise<void>;
  login(email: string, password: string): Promise<{ token: string }>;
  verify(token: string): Promise<{ userId: string }>;
}
const notImplemented = (): never => {
  throw new Error("NOT_IMPLEMENTED");
};
export const register: AuthModulePublicApi["register"] = async () => notImplemented();
export const login: AuthModulePublicApi["login"] = async () => notImplemented();
export const verify: AuthModulePublicApi["verify"] = async () => notImplemented();
