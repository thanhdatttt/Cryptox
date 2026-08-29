import {
  REST_SCHEMA_VERSION,
  type AuthSessionResponseDto,
  type AuthUserDto,
  type CurrentUserResponseDto,
  type LogoutResponseDto,
} from "@cryptox/contracts/rest";
import { AuthClientError, type ProtectedRequestClient } from "./clients";
import type { AuthClient, AuthCredentials } from "./types";

const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;

interface FixtureUserRecord {
  readonly user: AuthUserDto;
  readonly credentialProof: string;
}

interface FixtureSessionRecord {
  readonly userId: string;
  readonly expiresAt: string;
  revoked: boolean;
}

export interface FixtureAuthClientOptions {
  readonly now?: () => string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function credentialProof(password: string): string {
  // This is a deterministic, non-secret fixture proof only. The real client
  // never persists credentials and the real server owns Argon2id hashing.
  let hash = 2166136261;
  for (let index = 0; index < password.length; index += 1) {
    hash ^= password.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function validateCredentials(credentials: AuthCredentials): AuthCredentials {
  const email = normalizeEmail(credentials.email);
  if (!/^\S+@\S+\.\S+$/.test(email) || credentials.password.length === 0) {
    throw new AuthClientError(400, "Enter a valid email and password.");
  }
  return { email, password: credentials.password };
}

/**
 * Development-only Auth implementation. Its private session cookie models an
 * HttpOnly cookie: callers can send credentials, but cannot read or receive the
 * opaque cookie value.
 */
export class FixtureAuthClient implements AuthClient {
  private readonly users = new Map<string, FixtureUserRecord>();
  private readonly sessions = new Map<string, FixtureSessionRecord>();
  private readonly now: () => string;
  private sessionCookie?: string;
  private nextUserId = 1;
  private nextCookieId = 1;

  public constructor(options: FixtureAuthClientOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  public async register(credentials: AuthCredentials): Promise<AuthSessionResponseDto> {
    const valid = validateCredentials(credentials);
    if (this.users.has(valid.email)) {
      throw new AuthClientError(409, "That email is already registered.");
    }
    const createdAt = this.currentTime();
    const user: AuthUserDto = {
      id: `fixture-user-${this.nextUserId++}`,
      email: valid.email,
      createdAt,
      updatedAt: createdAt,
    };
    this.users.set(valid.email, { user, credentialProof: credentialProof(valid.password) });
    return this.startSession(user);
  }

  public async login(credentials: AuthCredentials): Promise<AuthSessionResponseDto> {
    const valid = validateCredentials(credentials);
    const record = this.users.get(valid.email);
    if (!record || record.credentialProof !== credentialProof(valid.password)) {
      throw new AuthClientError(401, "Unable to sign in with those credentials.");
    }
    return this.startSession(record.user);
  }

  public async currentUser(): Promise<CurrentUserResponseDto> {
    const session = this.activeSession();
    if (!session) {
      throw new AuthClientError(401, "Your session is no longer valid.");
    }
    const user = [...this.users.values()].find((record) => record.user.id === session.userId)?.user;
    if (!user) {
      this.sessionCookie = undefined;
      throw new AuthClientError(401, "Your session is no longer valid.");
    }
    return { schemaVersion: REST_SCHEMA_VERSION, user };
  }

  public async logout(): Promise<LogoutResponseDto> {
    if (this.sessionCookie) {
      const session = this.sessions.get(this.sessionCookie);
      if (session) session.revoked = true;
    }
    this.sessionCookie = undefined;
    return { schemaVersion: REST_SCHEMA_VERSION, authenticated: false };
  }

  private startSession(user: AuthUserDto): AuthSessionResponseDto {
    const expiresAt = new Date(Date.parse(this.currentTime()) + SESSION_LIFETIME_MS).toISOString();
    const cookie = `fixture-cookie-${this.nextCookieId++}`;
    this.sessions.set(cookie, { userId: user.id, expiresAt, revoked: false });
    this.sessionCookie = cookie;
    return { schemaVersion: REST_SCHEMA_VERSION, user, expiresAt };
  }

  private activeSession(): FixtureSessionRecord | undefined {
    if (!this.sessionCookie) return undefined;
    const session = this.sessions.get(this.sessionCookie);
    if (!session || session.revoked || Date.parse(session.expiresAt) <= Date.parse(this.currentTime())) {
      if (session) session.revoked = true;
      this.sessionCookie = undefined;
      return undefined;
    }
    return session;
  }

  private currentTime(): string {
    const value = this.now();
    if (!Number.isFinite(Date.parse(value))) throw new Error("Fixture clock returned an invalid time");
    return value;
  }
}

/** Development-only protected resource seam used by the guarded placeholder. */
export class FixtureProtectedRequestClient implements ProtectedRequestClient {
  public constructor(
    private readonly onUnauthorized: () => void = () => undefined,
    private readonly rejectUnauthorized = false,
  ) {}

  public async get<T>(_path: string, parse: (value: unknown) => T): Promise<T> {
    if (this.rejectUnauthorized) {
      this.onUnauthorized();
      throw new AuthClientError(401, "Your session is no longer valid.", "UNAUTHENTICATED");
    }
    return parse({ status: "ready" });
  }
}
