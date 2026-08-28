import {
  REST_SCHEMA_VERSION,
  type AuthSessionResponseDto,
  type AuthUserDto,
  type CurrentUserResponseDto,
  type LogoutResponseDto,
} from "@cryptox/contracts/rest";
import type { AuthClient, AuthCredentials } from "./types";

export interface AuthFetchLike {
  (
    input: string,
    init?: RequestInit,
  ): Promise<Pick<Response, "ok" | "status" | "json">>;
}

export class AuthClientError extends Error {
  public constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AuthClientError";
  }
}

export const AUTH_ENDPOINTS = {
  register: "/auth/register",
  login: "/auth/login",
  currentUser: "/auth/current-user",
  logout: "/auth/logout",
} as const;

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function normalizeCredentials(credentials: AuthCredentials): AuthCredentials {
  return { email: credentials.email.trim().toLowerCase(), password: credentials.password };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function authUser(value: unknown): AuthUserDto {
  if (!isRecord(value)) throw new Error("Invalid authenticated user response");
  if (
    typeof value.id !== "string" ||
    value.id.length === 0 ||
    typeof value.email !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    throw new Error("Invalid authenticated user response");
  }
  return {
    id: value.id,
    email: value.email,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function sessionResponse(value: unknown): AuthSessionResponseDto {
  if (!isRecord(value) || value.schemaVersion !== REST_SCHEMA_VERSION) {
    throw new Error("Invalid auth session response");
  }
  if (typeof value.expiresAt !== "string" || !Number.isFinite(Date.parse(value.expiresAt))) {
    throw new Error("Invalid auth session expiry");
  }
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    user: authUser(value.user),
    expiresAt: value.expiresAt,
  };
}

function currentUserResponse(value: unknown): CurrentUserResponseDto {
  if (!isRecord(value) || value.schemaVersion !== REST_SCHEMA_VERSION) {
    throw new Error("Invalid current-user response");
  }
  return { schemaVersion: REST_SCHEMA_VERSION, user: authUser(value.user) };
}

function logoutResponse(value: unknown): LogoutResponseDto {
  if (
    !isRecord(value) ||
    value.schemaVersion !== REST_SCHEMA_VERSION ||
    value.authenticated !== false
  ) {
    throw new Error("Invalid logout response");
  }
  return { schemaVersion: REST_SCHEMA_VERSION, authenticated: false };
}

function failureMessage(status: number, operation: "register" | "login" | "currentUser" | "logout"):
  string {
  if (status === 401 && operation === "login") return "Unable to sign in with those credentials.";
  if (status === 401 && operation === "currentUser") return "Your session is no longer valid.";
  if (status === 401) return "Authentication is required.";
  if (status === 409 && operation === "register") return "That email is already registered.";
  return `Authentication request failed with status ${status}.`;
}

export class RestAuthClient implements AuthClient {
  public constructor(
    private readonly baseUrl: string,
    private readonly fetcher: AuthFetchLike = fetch,
  ) {}

  public register(credentials: AuthCredentials): Promise<AuthSessionResponseDto> {
    return this.credentialsRequest("register", credentials, sessionResponse);
  }

  public login(credentials: AuthCredentials): Promise<AuthSessionResponseDto> {
    return this.credentialsRequest("login", credentials, sessionResponse);
  }

  public currentUser(): Promise<CurrentUserResponseDto> {
    return this.request(AUTH_ENDPOINTS.currentUser, { method: "GET" }, "currentUser", currentUserResponse);
  }

  public async logout(): Promise<LogoutResponseDto> {
    try {
      return await this.request(AUTH_ENDPOINTS.logout, { method: "POST" }, "logout", logoutResponse);
    } catch (error) {
      // Logout is idempotent from the unauthenticated end state.
      if (error instanceof AuthClientError && error.status === 401) {
        return { schemaVersion: REST_SCHEMA_VERSION, authenticated: false };
      }
      throw error;
    }
  }

  private credentialsRequest(
    operation: "register" | "login",
    credentials: AuthCredentials,
    parse: (value: unknown) => AuthSessionResponseDto,
  ): Promise<AuthSessionResponseDto> {
    const normalized = normalizeCredentials(credentials);
    return this.request(
      AUTH_ENDPOINTS[operation],
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          schemaVersion: REST_SCHEMA_VERSION,
          email: normalized.email,
          password: normalized.password,
        }),
      },
      operation,
      parse,
    );
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    operation: "register" | "login" | "currentUser" | "logout",
    parse: (value: unknown) => T,
  ): Promise<T> {
    const response = await this.fetcher(endpoint(this.baseUrl, path), {
      ...init,
      credentials: "include",
    });
    if (!response.ok) {
      throw new AuthClientError(response.status, failureMessage(response.status, operation));
    }
    try {
      return parse(await response.json());
    } catch (error) {
      if (error instanceof AuthClientError) throw error;
      throw new AuthClientError(502, "Authentication returned an invalid response.");
    }
  }
}

export interface ProtectedRequestClient {
  get<T>(path: string, parse: (value: unknown) => T): Promise<T>;
}

/**
 * Typed read-only protected request seam. Credentials are sent by the browser
 * cookie boundary; callers cannot provide an owner identity or session secret.
 */
export class RestProtectedRequestClient implements ProtectedRequestClient {
  public constructor(
    private readonly baseUrl: string,
    private readonly fetcher: AuthFetchLike = fetch,
    private readonly onUnauthorized: () => void = () => undefined,
  ) {}

  public async get<T>(path: string, parse: (value: unknown) => T): Promise<T> {
    const response = await this.fetcher(endpoint(this.baseUrl, path), {
      method: "GET",
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (response.status === 401) {
      this.onUnauthorized();
      throw new AuthClientError(401, "Your session is no longer valid.", "UNAUTHENTICATED");
    }
    if (!response.ok) {
      throw new AuthClientError(response.status, "Protected resource request failed.");
    }
    try {
      return parse(await response.json());
    } catch {
      throw new AuthClientError(502, "Protected resource returned an invalid response.");
    }
  }
}

export class UnavailableProtectedRequestClient implements ProtectedRequestClient {
  public constructor(private readonly reason: string) {}

  public get<T>(_path: string, _parse: (value: unknown) => T): Promise<T> {
    return Promise.reject(new AuthClientError(503, this.reason));
  }
}

export class UnavailableAuthClient implements AuthClient {
  public constructor(private readonly reason: string) {}

  public register(_credentials: AuthCredentials): Promise<AuthSessionResponseDto> {
    return Promise.reject(new AuthClientError(503, this.reason));
  }

  public login(_credentials: AuthCredentials): Promise<AuthSessionResponseDto> {
    return Promise.reject(new AuthClientError(503, this.reason));
  }

  public currentUser(): Promise<CurrentUserResponseDto> {
    return Promise.reject(new AuthClientError(503, this.reason));
  }

  public logout(): Promise<LogoutResponseDto> {
    return Promise.reject(new AuthClientError(503, this.reason));
  }
}
