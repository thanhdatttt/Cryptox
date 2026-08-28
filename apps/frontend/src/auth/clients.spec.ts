import { describe, expect, it } from "vitest";
import { REST_SCHEMA_VERSION } from "@cryptox/contracts/rest";
import { AuthClientError, AUTH_ENDPOINTS, RestAuthClient } from "./clients";

const user = {
  id: "user-1",
  email: "user@example.test",
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:00.000Z",
};

function response(value: unknown, status = 200): Pick<Response, "ok" | "status" | "json"> {
  return { ok: status >= 200 && status < 300, status, json: async () => value };
}

describe("RestAuthClient", () => {
  it("normalizes credentials and models the HttpOnly cookie boundary", async () => {
    let request: { input: string; init?: RequestInit } | undefined;
    const client = new RestAuthClient("/api/", async (input, init) => {
      request = { input, init };
      return response({ schemaVersion: REST_SCHEMA_VERSION, user, expiresAt: "2026-08-29T00:00:00.000Z" });
    });

    const result = await client.register({ email: " User@Example.Test ", password: "secret" });

    expect(result.user).toEqual(user);
    expect(request?.input).toBe(`/api${AUTH_ENDPOINTS.register}`);
    expect(request?.init?.credentials).toBe("include");
    const body = JSON.parse(String(request?.init?.body)) as Record<string, unknown>;
    expect(body).toEqual({ schemaVersion: REST_SCHEMA_VERSION, email: "user@example.test", password: "secret" });
    expect(body).not.toHaveProperty("userId");
    expect(body).not.toHaveProperty("ownerUserId");
    expect(result).not.toHaveProperty("opaqueToken");
  });

  it("surfaces a typed 401 for session restoration and treats logout 401 as idempotent", async () => {
    let currentCall = false;
    const client = new RestAuthClient("/api", async (_input, init) => {
      if (init?.method === "GET") {
        currentCall = true;
        return response(undefined, 401);
      }
      return response(undefined, 401);
    });

    const currentUserError = await client.currentUser().catch((error: unknown) => error);
    expect(currentUserError).toBeInstanceOf(AuthClientError);
    expect(currentUserError).toMatchObject({ status: 401 });
    expect(currentCall).toBe(true);
    await expect(client.logout()).resolves.toEqual({ schemaVersion: REST_SCHEMA_VERSION, authenticated: false });
  });
});
