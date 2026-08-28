import type {
  AuthApplicationDependencies,
  AuthUserCredentialRecord,
} from "./ports";

const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;

export class AuthApplicationError extends Error {
  constructor(readonly code: string, message = code) {
    super(message);
    this.name = "AuthApplicationError";
  }
}

function normalizeEmail(email: string): string {
  if (typeof email !== "string") {
    throw new AuthApplicationError("INVALID_AUTH_INPUT");
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > 320 || !/^\S+@\S+\.\S+$/.test(normalized)) {
    throw new AuthApplicationError("INVALID_AUTH_INPUT");
  }
  return normalized;
}

function validatePassword(password: string): void {
  if (typeof password !== "string" || password.length === 0) {
    throw new AuthApplicationError("INVALID_AUTH_INPUT");
  }
}

export interface AuthApplicationUser<TUserId extends string> {
  id: TUserId;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthApplicationApi<TUserId extends string> {
  register(command: { email: string; password: string }): Promise<{
    user: AuthApplicationUser<TUserId>;
    opaqueToken: string;
    expiresAt: string;
  }>;
  login(command: { email: string; password: string }): Promise<{
    user: AuthApplicationUser<TUserId>;
    opaqueToken: string;
    expiresAt: string;
  }>;
  resolveSession(opaqueToken: string): Promise<
    | { sessionId: string; expiresAt: string; authenticatedUserId: TUserId }
    | undefined
  >;
  currentUser(context: { authenticatedUserId: TUserId }): Promise<AuthApplicationUser<TUserId>>;
  logout(opaqueToken: string): Promise<void>;
}

function toPublicUser<TUserId extends string>(
  user: AuthUserCredentialRecord<TUserId>,
): AuthApplicationUser<TUserId> {
  return {
    id: user.id,
    email: user.normalizedEmail,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function assertAuthenticated<TUserId extends string>(context: { authenticatedUserId: TUserId }): void {
  if (!context || typeof context.authenticatedUserId !== "string" || !context.authenticatedUserId) {
    throw new AuthApplicationError("UNAUTHENTICATED");
  }
}

function expiresAt(createdAt: string): string {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) {
    throw new AuthApplicationError("INVALID_AUTH_CLOCK");
  }
  return new Date(created + SESSION_LIFETIME_MS).toISOString();
}

export function createAuthApplication<TUserId extends string>(
  dependencies: AuthApplicationDependencies<TUserId>,
): AuthApplicationApi<TUserId>;
export function createAuthApplication<TUserId extends string>(
  dependencies: AuthApplicationDependencies<TUserId>,
): AuthApplicationApi<TUserId> {
  async function grantForUser(
    user: AuthUserCredentialRecord<TUserId>,
  ): Promise<{
    user: AuthApplicationUser<TUserId>;
    opaqueToken: string;
    expiresAt: string;
  }> {
    const opaqueToken = dependencies.sessionTokens.generate();
    const createdAt = dependencies.clock.now();
    const session = await dependencies.sessions.insert({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenDigest: dependencies.sessionTokens.digest(opaqueToken),
      createdAt,
      expiresAt: expiresAt(createdAt),
    });
    return { user: toPublicUser(user), opaqueToken, expiresAt: session.expiresAt };
  }

  async function register(command: { email: string; password: string }) {
    const normalizedEmail = normalizeEmail(command.email);
    validatePassword(command.password);
    if (await dependencies.users.getByNormalizedEmail(normalizedEmail)) {
      throw new AuthApplicationError("EMAIL_ALREADY_REGISTERED");
    }
    const createdAt = dependencies.clock.now();
    const user = await dependencies.users.insert({
      id: crypto.randomUUID() as TUserId,
      normalizedEmail,
      passwordHash: await dependencies.passwordHash.hash(command.password),
      createdAt,
    });
    return grantForUser(user);
  }

  async function login(command: { email: string; password: string }) {
    const normalizedEmail = normalizeEmail(command.email);
    validatePassword(command.password);
    const user = await dependencies.users.getByNormalizedEmail(normalizedEmail);
    if (!user || !(await dependencies.passwordHash.verify(user.passwordHash, command.password))) {
      throw new AuthApplicationError("INVALID_CREDENTIALS");
    }
    return grantForUser(user);
  }

  async function resolveSession(
    opaqueToken: string,
  ): Promise<
    | { sessionId: string; expiresAt: string; authenticatedUserId: TUserId }
    | undefined
  > {
    if (typeof opaqueToken !== "string" || !opaqueToken) return undefined;
    const now = dependencies.clock.now();
    const session = await dependencies.sessions.getActiveByTokenDigest(
      dependencies.sessionTokens.digest(opaqueToken),
      now,
    );
    if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.parse(now)) {
      return undefined;
    }
    if (!(await dependencies.users.getById(session.userId))) return undefined;
    return {
      sessionId: session.id,
      expiresAt: session.expiresAt,
      authenticatedUserId: session.userId,
    };
  }

  async function currentUser(context: { authenticatedUserId: TUserId }) {
    assertAuthenticated(context);
    const user = await dependencies.users.getById(context.authenticatedUserId);
    if (!user) throw new AuthApplicationError("NOT_FOUND");
    return toPublicUser(user);
  }

  async function logout(opaqueToken: string): Promise<void> {
    if (typeof opaqueToken !== "string" || !opaqueToken) return;
    await dependencies.sessions.revokeByTokenDigest(
      dependencies.sessionTokens.digest(opaqueToken),
      dependencies.clock.now(),
    );
  }

  return { register, login, resolveSession, currentUser, logout };
}
