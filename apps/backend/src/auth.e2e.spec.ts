import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NestFactory } from "@nestjs/core";
import type { INestApplication } from "@nestjs/common";
import { createPostgresAuthDependencies, type PostgresAuthDependencies } from "@cryptox/auth/bootstrap";
import { REST_SCHEMA_VERSION } from "@cryptox/contracts/rest";
import { AppModule } from "./app.module";

const databaseUrl = process.env.DATABASE_URL;
const postgresDescribe = databaseUrl ? describe : describe.skip;

interface JsonResponse {
  readonly response: Response;
  readonly body: Record<string, unknown>;
}

postgresDescribe("AU-01 backend Auth smoke", () => {
  let app: INestApplication;
  let baseUrl: string;
  let cleanup: PostgresAuthDependencies;
  const email = `au01_http_${Date.now()}_${Math.random().toString(16).slice(2)}@example.test`;
  const password = "AU01-http-password-not-for-logs";

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address() as { port: number } | string | null;
    if (!address || typeof address === "string") throw new Error("backend smoke did not bind a TCP port");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (app) await app.close();
    cleanup = createPostgresAuthDependencies({ connectionString: databaseUrl! });
    await cleanup.pool.query(
      `
        DELETE FROM auth_sessions
        WHERE user_id IN (SELECT id FROM users WHERE normalized_email = $1)
      `,
      [email],
    );
    await cleanup.pool.query("DELETE FROM users WHERE normalized_email = $1", [email]);
    await cleanup.close();
  });

  async function request(path: string, init?: RequestInit): Promise<JsonResponse> {
    const response = await fetch(`${baseUrl}${path}`, init);
    const body = (await response.json()) as Record<string, unknown>;
    return { response, body };
  }

  it("registers, restores current user, rejects invalid login, and revokes logout", async () => {
    const registered = await request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost" },
      body: JSON.stringify({ schemaVersion: REST_SCHEMA_VERSION, email: ` ${email.toUpperCase()} `, password }),
    });
    expect(registered.response.status).toBe(200);
    expect(registered.body).toHaveProperty("schemaVersion", REST_SCHEMA_VERSION);
    expect(registered.body).not.toHaveProperty("opaqueToken");
    const registeredUser = registered.body.user as Record<string, unknown>;
    expect(registeredUser.email).toBe(email);

    const setCookie = registered.response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=86400");
    expect(setCookie).not.toContain("Domain=");
    const cookie = setCookie.split(";", 1)[0];
    expect(cookie).toMatch(/^cryptox_session=\S+$/);

    const missingSession = await request("/auth/current-user");
    expect(missingSession.response.status).toBe(401);
    expect(missingSession.body).toMatchObject({ error: { code: "UNAUTHENTICATED" } });

    const current = await request("/auth/current-user", { headers: { cookie } });
    expect(current.response.status).toBe(200);
    expect(current.body).toMatchObject({ schemaVersion: 1, user: { email } });

    const duplicate = await request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemaVersion: 1, email, password: "different" }),
    });
    expect(duplicate.response.status).toBe(409);

    const invalidExisting = await request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemaVersion: 1, email, password: "wrong" }),
    });
    const invalidMissing = await request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemaVersion: 1, email: "missing-http@example.test", password }),
    });
    expect(invalidExisting.response.status).toBe(401);
    expect(invalidMissing.response.status).toBe(401);
    expect(invalidExisting.body.error).toEqual(invalidMissing.body.error);

    const loggedOut = await request("/auth/logout", { method: "POST", headers: { cookie } });
    expect(loggedOut.response.status).toBe(200);
    expect(loggedOut.body).toEqual({ schemaVersion: 1, authenticated: false });
    expect(loggedOut.response.headers.get("set-cookie")).toContain("Max-Age=0");

    const revoked = await request("/auth/current-user", { headers: { cookie } });
    expect(revoked.response.status).toBe(401);
    const repeatedLogout = await request("/auth/logout", { method: "POST", headers: { cookie } });
    expect(repeatedLogout.response.status).toBe(200);
  });
});
