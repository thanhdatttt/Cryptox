import { describe, expect, it } from "vitest";
import { HttpException } from "@nestjs/common";
import type {
  AuthModulePublicApi,
  AuthSessionGrant,
  AuthenticatedUserId,
} from "@cryptox/auth";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_SECONDS,
  AuthController,
  mapAuthError,
  secureCookieFor,
} from "./auth.controller";
import type { BackendAuthRuntime } from "./auth.runtime";

const user = {
  id: "00000000-0000-4000-8000-000000000001" as AuthenticatedUserId,
  email: "person@example.test",
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:00.000Z",
};
const grant: AuthSessionGrant = {
  user,
  opaqueToken: "opaque-token-for-cookie-only",
  expiresAt: "2026-08-29T00:00:00.000Z",
};

function runtime(overrides: Partial<AuthModulePublicApi> = {}): BackendAuthRuntime {
  const auth: AuthModulePublicApi = {
    register: async () => grant,
    login: async () => grant,
    resolveSession: async () => ({
      sessionId: "session-1",
      expiresAt: grant.expiresAt,
      authenticatedUserId: user.id,
    }),
    currentUser: async () => user,
    logout: async () => undefined,
    ...overrides,
  };
  return { auth, configured: true, close: async () => undefined };
}

function responseRecorder() {
  const headers = new Map<string, string>();
  return {
    headers,
    setHeader(name: string, value: string): void {
      headers.set(name, value);
    },
  };
}

describe("Auth REST controller", () => {
  it("maps register/login to canonical DTOs and sets a host-only HttpOnly cookie", async () => {
    const controller = new AuthController(runtime());
    const response = responseRecorder();
    const result = await controller.register(
      { schemaVersion: 1, email: "person@example.test", password: "secret" },
      { headers: { host: "localhost" } },
      response,
    );

    expect(result).toEqual({ schemaVersion: 1, user, expiresAt: grant.expiresAt });
    expect(result).not.toHaveProperty("opaqueToken");
    expect(response.headers.get("Set-Cookie")).toContain(`${AUTH_SESSION_COOKIE}=${grant.opaqueToken}`);
    expect(response.headers.get("Set-Cookie")).toContain("HttpOnly");
    expect(response.headers.get("Set-Cookie")).toContain("SameSite=Lax");
    expect(response.headers.get("Set-Cookie")).toContain("Path=/");
    expect(response.headers.get("Set-Cookie")).toContain(`Max-Age=${AUTH_SESSION_MAX_AGE_SECONDS}`);
    expect(response.headers.get("Set-Cookie")).not.toContain("Domain=");
    expect(response.headers.get("Set-Cookie")).not.toContain("Secure");
  });

  it("requires a valid session for current-user and passes trusted identity separately", async () => {
    let resolvedContext: unknown;
    const controller = new AuthController(
      runtime({
        currentUser: async (context) => {
          resolvedContext = context;
          return user;
        },
      }),
    );

    await expect(controller.currentUser({ headers: {} })).rejects.toMatchObject({
      status: 401,
    });
    await expect(controller.currentUser({ headers: { cookie: `${AUTH_SESSION_COOKIE}=${grant.opaqueToken}` } })).resolves.toEqual({
      schemaVersion: 1,
      user,
    });
    expect(resolvedContext).toEqual({ authenticatedUserId: user.id });
  });

  it("makes logout idempotent and clears the cookie", async () => {
    let logoutCalls = 0;
    const controller = new AuthController(
      runtime({ logout: async () => { logoutCalls += 1; } }),
    );
    const response = responseRecorder();
    await expect(controller.logout({ headers: {} }, response)).resolves.toEqual({
      schemaVersion: 1,
      authenticated: false,
    });
    await controller.logout(
      { headers: { cookie: `${AUTH_SESSION_COOKIE}=${grant.opaqueToken}` } },
      response,
    );
    expect(logoutCalls).toBe(1);
    expect(response.headers.get("Set-Cookie")).toContain(`${AUTH_SESSION_COOKIE}=`);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  it("does not expose persistence errors, credentials, or session secrets", () => {
    const secretError = new Error(
      "password=secret email=person@example.test token=opaque-token-for-cookie-only",
    );
    const mapped = mapAuthError(secretError);
    expect(mapped).toBeInstanceOf(HttpException);
    const response = JSON.stringify(mapped.getResponse());
    expect(response).not.toContain("secret");
    expect(response).not.toContain("person@example.test");
    expect(response).not.toContain("opaque-token-for-cookie-only");
    expect(mapped.getStatus()).toBe(503);
  });

  it("uses Secure for HTTPS/deployed requests but permits localhost HTTP", () => {
    const previous = process.env.AUTH_COOKIE_SECURE;
    const previousNodeEnv = process.env.NODE_ENV;
    delete process.env.AUTH_COOKIE_SECURE;
    delete process.env.NODE_ENV;
    try {
      expect(secureCookieFor({ headers: { host: "localhost" } })).toBe(false);
      expect(secureCookieFor({ protocol: "https", headers: { host: "app.example.test" } })).toBe(true);
      process.env.AUTH_COOKIE_SECURE = "false";
      expect(secureCookieFor({ protocol: "https", headers: { host: "app.example.test" } })).toBe(true);
      expect(secureCookieFor({ headers: { host: "app.example.test" } })).toBe(true);
      process.env.NODE_ENV = "production";
      expect(secureCookieFor({ headers: { host: "localhost" } })).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.AUTH_COOKIE_SECURE;
      else process.env.AUTH_COOKIE_SECURE = previous;
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
