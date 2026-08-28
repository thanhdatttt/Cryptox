import type {
  AuthModulePublicApi,
  AuthSessionGrant,
  AuthUser,
  AuthenticatedRequestContext,
  AuthenticatedSessionIdentity,
  AuthenticatedUserId,
  LoginCommand,
  RegisterCommand,
} from "./contracts";
import { createAuthApplication } from "../application/service";
import { createInMemoryAuthDependencies } from "../application/memory";

export * from "./contracts";
export type {
  AuthApplicationDependencies,
  AuthClock,
  AuthSessionRecord,
  AuthSessionRepository,
  AuthUserCredentialRecord,
  AuthUserRepository,
  OpaqueSessionTokenPort,
  PasswordHashPort,
} from "../application/ports";

const defaultAuthApplication = createAuthApplication(
  createInMemoryAuthDependencies<AuthenticatedUserId>(),
);

export const register = (command: RegisterCommand): Promise<AuthSessionGrant> =>
  defaultAuthApplication.register(command);
export const login = (command: LoginCommand): Promise<AuthSessionGrant> =>
  defaultAuthApplication.login(command);
export const resolveSession = (
  opaqueToken: string,
): Promise<AuthenticatedSessionIdentity | undefined> =>
  defaultAuthApplication.resolveSession(opaqueToken);
export const currentUser = (context: AuthenticatedRequestContext): Promise<AuthUser> =>
  defaultAuthApplication.currentUser(context);
export const logout = (opaqueToken: string): Promise<void> => defaultAuthApplication.logout(opaqueToken);

export type _AuthApiShape = AuthModulePublicApi;
