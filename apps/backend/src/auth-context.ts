import { HttpException, HttpStatus } from "@nestjs/common";
import type {
  AuthModulePublicApi,
  AuthenticatedRequestContext,
} from "@cryptox/auth";
import { REST_SCHEMA_VERSION } from "@cryptox/contracts/rest";

export const AUTH_SESSION_COOKIE = "cryptox_session" as const;

export interface BackendRequest {
  readonly headers?: Record<string, string | string[] | undefined>;
  readonly protocol?: string;
  readonly secure?: boolean;
}

function firstHeader(request: BackendRequest, name: string): string | undefined {
  const value = request.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

export function readSessionToken(request: BackendRequest): string | undefined {
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

export function unauthenticatedHttpError(): HttpException {
  return new HttpException(
    {
      schemaVersion: REST_SCHEMA_VERSION,
      error: { code: "UNAUTHENTICATED", message: "Authentication is required." },
    },
    HttpStatus.UNAUTHORIZED,
  );
}

/** Resolve the HttpOnly opaque session at the server boundary. */
export async function authenticatedContext(
  request: BackendRequest,
  auth: Pick<AuthModulePublicApi, "resolveSession">,
): Promise<AuthenticatedRequestContext> {
  const token = readSessionToken(request);
  if (!token) throw unauthenticatedHttpError();
  const identity = await auth.resolveSession(token);
  if (!identity) throw unauthenticatedHttpError();
  return { authenticatedUserId: identity.authenticatedUserId };
}

export function headerValue(request: BackendRequest, name: string): string | undefined {
  return firstHeader(request, name);
}
