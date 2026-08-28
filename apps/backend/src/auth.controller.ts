import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import {
  REST_SCHEMA_VERSION,
  RestContractValidationError,
  parseLoginRequest,
  parseRegisterRequest,
} from "@cryptox/contracts/rest";
import type { AuthModulePublicApi } from "@cryptox/auth";
import { AUTH_RUNTIME_TOKEN, type BackendAuthRuntime } from "./auth.runtime";

export const AUTH_SESSION_COOKIE = "cryptox_session";
export const AUTH_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

interface AuthRequest {
  readonly headers?: Record<string, string | string[] | undefined>;
  readonly protocol?: string;
  readonly secure?: boolean;
}

interface AuthResponse {
  setHeader(name: string, value: string): void;
}

interface RestErrorBody {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  error: { code: string; message: string };
}

function firstHeader(request: AuthRequest, name: string): string | undefined {
  const value = request.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

function sessionToken(request: AuthRequest): string | undefined {
  const header = firstHeader(request, "cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== AUTH_SESSION_COOKIE) continue;
    const value = part.slice(separator + 1).trim();
    return value || undefined;
  }
  return undefined;
}

function isLocalHost(host: string | undefined): boolean {
  const hostname = (host ?? "").split(":", 1)[0].toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function secureCookieFor(request: AuthRequest): boolean {
  const configured = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  const https =
    request.secure === true ||
    request.protocol === "https" ||
    firstHeader(request, "x-forwarded-proto")?.split(",", 1)[0].trim() === "https";
  const localHost = isLocalHost(firstHeader(request, "host"));

  // Secure is mandatory for HTTPS, production, and any non-local deployment.
  // The only permitted opt-out is localhost HTTP development.
  if (https || process.env.NODE_ENV === "production" || !localHost) return true;
  return configured === "true" ? true : false;
}

function sessionCookieHeader(
  request: AuthRequest,
  token: string | undefined,
  expiresAt: string | undefined,
): string {
  const attributes = [
    `${AUTH_SESSION_COOKIE}=${token ?? ""}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
  ];
  if (token && expiresAt) {
    attributes.push(
      `Max-Age=${AUTH_SESSION_MAX_AGE_SECONDS}`,
      `Expires=${new Date(expiresAt).toUTCString()}`,
    );
  } else {
    attributes.push("Max-Age=0", "Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  }
  if (secureCookieFor(request)) attributes.push("Secure");
  return attributes.join("; ");
}

function setSessionCookie(
  response: AuthResponse,
  request: AuthRequest,
  token: string | undefined,
  expiresAt: string | undefined,
): void {
  response.setHeader("Set-Cookie", sessionCookieHeader(request, token, expiresAt));
}

function restError(code: string, message: string): RestErrorBody {
  return { schemaVersion: REST_SCHEMA_VERSION, error: { code, message } };
}

function httpError(status: number, code: string, message: string): HttpException {
  return new HttpException(restError(code, message), status);
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

export function mapAuthError(error: unknown): HttpException {
  if (error instanceof RestContractValidationError) {
    return httpError(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "Invalid authentication request.");
  }
  const code = errorCode(error);
  if (code) {
    switch (code) {
      case "EMAIL_ALREADY_REGISTERED":
        return httpError(HttpStatus.CONFLICT, code, "That email is already registered.");
      case "INVALID_CREDENTIALS":
        return httpError(HttpStatus.UNAUTHORIZED, code, "Unable to sign in with those credentials.");
      case "INVALID_AUTH_INPUT":
        return httpError(HttpStatus.BAD_REQUEST, code, "Invalid authentication request.");
      case "UNAUTHENTICATED":
        return httpError(HttpStatus.UNAUTHORIZED, code, "Authentication is required.");
      case "NOT_FOUND":
        return httpError(HttpStatus.NOT_FOUND, code, "Authenticated user was not found.");
      default:
        break;
    }
  }
  return httpError(
    HttpStatus.SERVICE_UNAVAILABLE,
    "AUTH_UNAVAILABLE",
    "Authentication is temporarily unavailable.",
  );
}

function authenticatedError(): HttpException {
  return httpError(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Authentication is required.");
}

@Controller("auth")
export class AuthController {
  public constructor(
    @Inject(AUTH_RUNTIME_TOKEN) private readonly runtime: BackendAuthRuntime,
  ) {}

  @Post("register")
  @HttpCode(HttpStatus.OK)
  async register(
    @Body() body: unknown,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: AuthResponse,
  ) {
    try {
      const input = parseRegisterRequest(body);
      const grant = await this.runtime.auth.register(input);
      setSessionCookie(response, request, grant.opaqueToken, grant.expiresAt);
      return { schemaVersion: REST_SCHEMA_VERSION, user: grant.user, expiresAt: grant.expiresAt };
    } catch (error) {
      throw mapAuthError(error);
    }
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: AuthResponse,
  ) {
    try {
      const input = parseLoginRequest(body);
      const grant = await this.runtime.auth.login(input);
      setSessionCookie(response, request, grant.opaqueToken, grant.expiresAt);
      return { schemaVersion: REST_SCHEMA_VERSION, user: grant.user, expiresAt: grant.expiresAt };
    } catch (error) {
      throw mapAuthError(error);
    }
  }

  @Get("current-user")
  async currentUser(@Req() request: AuthRequest) {
    try {
      const opaqueToken = sessionToken(request);
      if (!opaqueToken) throw authenticatedError();
      const identity = await this.runtime.auth.resolveSession(opaqueToken);
      if (!identity) throw authenticatedError();
      const user = await this.runtime.auth.currentUser({
        authenticatedUserId: identity.authenticatedUserId,
      });
      return { schemaVersion: REST_SCHEMA_VERSION, user };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw mapAuthError(error);
    }
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: AuthResponse,
  ) {
    try {
      const opaqueToken = sessionToken(request);
      if (opaqueToken) await this.runtime.auth.logout(opaqueToken);
      setSessionCookie(response, request, undefined, undefined);
      return { schemaVersion: REST_SCHEMA_VERSION, authenticated: false as const };
    } catch (error) {
      throw mapAuthError(error);
    }
  }
}
