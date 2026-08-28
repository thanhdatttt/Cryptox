export interface AuthUserCredentialRecord<TUserId extends string = string> {
  id: TUserId;
  normalizedEmail: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionRecord<TUserId extends string = string> {
  id: string;
  userId: TUserId;
  tokenDigest: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface AuthUserRepository<TUserId extends string = string> {
  insert(input: {
    id: TUserId;
    normalizedEmail: string;
    passwordHash: string;
    createdAt: string;
  }): Promise<AuthUserCredentialRecord<TUserId>>;
  getByNormalizedEmail(
    normalizedEmail: string,
  ): Promise<AuthUserCredentialRecord<TUserId> | undefined>;
  getById(id: TUserId): Promise<AuthUserCredentialRecord<TUserId> | undefined>;
}

export interface AuthSessionRepository<TUserId extends string = string> {
  insert(session: AuthSessionRecord<TUserId>): Promise<AuthSessionRecord<TUserId>>;
  getActiveByTokenDigest(
    tokenDigest: string,
    now: string,
  ): Promise<AuthSessionRecord<TUserId> | undefined>;
  revokeByTokenDigest(tokenDigest: string, revokedAt: string): Promise<void>;
}

export interface PasswordHashPort {
  hash(password: string): Promise<string>;
  verify(passwordHash: string, password: string): Promise<boolean>;
}

export interface OpaqueSessionTokenPort {
  generate(): string;
  digest(opaqueToken: string): string;
}

export interface AuthClock {
  now(): string;
}

export interface AuthApplicationDependencies<TUserId extends string = string> {
  users: AuthUserRepository<TUserId>;
  sessions: AuthSessionRepository<TUserId>;
  passwordHash: PasswordHashPort;
  sessionTokens: OpaqueSessionTokenPort;
  clock: AuthClock;
}
