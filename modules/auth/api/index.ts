import type {
  AuthModulePublicApi,
  AuthSessionGrant,
  AuthUser,
  AuthenticatedRequestContext,
  AuthenticatedSessionIdentity,
  LoginCommand,
  RegisterCommand,
} from "./contracts";

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

const notImplemented = (): never => {
  throw new Error("NOT_IMPLEMENTED");
};

export const register = async (_command: RegisterCommand): Promise<AuthSessionGrant> =>
  notImplemented();
export const login = async (_command: LoginCommand): Promise<AuthSessionGrant> => notImplemented();
export const resolveSession = async (
  _opaqueToken: string,
): Promise<AuthenticatedSessionIdentity | undefined> => notImplemented();
export const currentUser = async (_context: AuthenticatedRequestContext): Promise<AuthUser> =>
  notImplemented();
export const logout = async (_opaqueToken: string): Promise<void> => notImplemented();

export type _AuthApiShape = AuthModulePublicApi;
