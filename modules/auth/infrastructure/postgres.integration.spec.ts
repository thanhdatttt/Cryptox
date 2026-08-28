import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuthModule } from "../api/bootstrap";
import type { AuthModulePublicApi } from "../api/contracts";
import {
  createPostgresAuthDependencies,
  type PostgresAuthDependencies,
} from "./postgres";

const databaseUrl = process.env.DATABASE_URL;
const postgresDescribe = databaseUrl ? describe : describe.skip;

type SecretRow = Record<string, unknown> & {
  password_hash: string;
  normalized_email: string;
};
type DigestRow = Record<string, unknown> & {
  token_digest: string;
  created_at: string;
  expires_at: string;
};

postgresDescribe("AU-01 PostgreSQL Auth persistence", () => {
  let dependencies: PostgresAuthDependencies;
  let auth: AuthModulePublicApi;
  const uniqueEmail = `au01_${Date.now()}_${Math.random().toString(16).slice(2)}@example.test`;
  const concurrentEmail = `au01_concurrent_${Date.now()}_${Math.random().toString(16).slice(2)}@example.test`;
  const password = "AU01-db-password-not-for-logs";

  beforeAll(async () => {
    dependencies = createPostgresAuthDependencies({ connectionString: databaseUrl! });
    await dependencies.pool.query("SELECT 1");
    auth = createAuthModule(dependencies);
  });

  afterAll(async () => {
    if (!dependencies) return;
    await dependencies.pool.query(
      `
        DELETE FROM auth_sessions
        WHERE user_id IN (SELECT id FROM users WHERE normalized_email IN ($1, $2))
      `,
      [uniqueEmail, concurrentEmail],
    );
    await dependencies.pool.query(
      "DELETE FROM users WHERE normalized_email IN ($1, $2)",
      [uniqueEmail, concurrentEmail],
    );
    await dependencies.close();
  });

  it("persists normalized credentials and only a digest, then resolves and revokes sessions", async () => {
    const grant = await auth.register({ email: ` ${uniqueEmail.toUpperCase()} `, password });

    expect(grant.user.email).toBe(uniqueEmail);
    expect(grant).not.toHaveProperty("token");

    const userRows = await dependencies.pool.query<SecretRow>(
      "SELECT normalized_email, password_hash FROM users WHERE id = $1::uuid",
      [grant.user.id],
    );
    expect(userRows.rows[0]).toMatchObject({ normalized_email: uniqueEmail });
    expect(userRows.rows[0]?.password_hash).toMatch(/^\$argon2id\$/);
    expect(userRows.rows[0]?.password_hash).not.toContain(password);

    const digest = dependencies.sessionTokens.digest(grant.opaqueToken);
    const sessionRows = await dependencies.pool.query<DigestRow>(
      "SELECT token_digest, created_at::text, expires_at::text FROM auth_sessions WHERE user_id = $1::uuid",
      [grant.user.id],
    );
    expect(sessionRows.rows).toHaveLength(1);
    expect(sessionRows.rows[0]?.token_digest).toBe(digest);
    expect(sessionRows.rows[0]?.token_digest).not.toBe(grant.opaqueToken);
    expect(sessionRows.rows[0]?.token_digest).toMatch(/^[0-9a-f]{64}$/);
    expect(Date.parse(sessionRows.rows[0]!.expires_at) - Date.parse(sessionRows.rows[0]!.created_at)).toBe(
      24 * 60 * 60 * 1000,
    );

    await expect(auth.resolveSession(grant.opaqueToken)).resolves.toMatchObject({
      authenticatedUserId: grant.user.id,
      expiresAt: grant.expiresAt,
    });
    await expect(auth.currentUser({ authenticatedUserId: grant.user.id })).resolves.toMatchObject({
      id: grant.user.id,
      email: uniqueEmail,
    });

    await auth.logout(grant.opaqueToken);
    await auth.logout(grant.opaqueToken);
    await expect(auth.resolveSession(grant.opaqueToken)).resolves.toBeUndefined();
  });

  it("keeps duplicate and invalid login outcomes generic and enforces the exact expiry boundary", async () => {
    await expect(auth.register({ email: uniqueEmail, password: "another-password" })).rejects.toMatchObject({
      code: "EMAIL_ALREADY_REGISTERED",
    });

    const grant = await auth.login({ email: uniqueEmail, password });
    const digest = dependencies.sessionTokens.digest(grant.opaqueToken);
    const wrongPassword = await auth.login({ email: uniqueEmail, password: "wrong-password" }).catch((error: unknown) => error);
    const missingEmail = await auth.login({ email: "missing-au01@example.test", password }).catch((error: unknown) => error);
    expect(wrongPassword).toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(missingEmail).toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect((wrongPassword as Error).message).toBe((missingEmail as Error).message);

    await dependencies.pool.query(
      "UPDATE auth_sessions SET expires_at = $2::timestamptz WHERE token_digest = $1",
      [digest, grant.expiresAt],
    );
    await expect(
      dependencies.sessions.getActiveByTokenDigest(digest, grant.expiresAt),
    ).resolves.toBeUndefined();
  });

  it("serializes concurrent normalized duplicate registration to one success and one conflict", async () => {
    const results = await Promise.allSettled([
      auth.register({ email: ` ${concurrentEmail.toUpperCase()} `, password: "first-password" }),
      auth.register({ email: concurrentEmail, password: "second-password" }),
    ]);
    const successes = results.filter(
      (result): result is PromiseFulfilledResult<unknown> => result.status === "fulfilled",
    );
    const conflicts = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.reason).toMatchObject({ code: "EMAIL_ALREADY_REGISTERED" });

    const users = await dependencies.pool.query<Record<string, unknown> & { count: string }>(
      "SELECT count(*)::text AS count FROM users WHERE normalized_email = $1",
      [concurrentEmail],
    );
    expect(users.rows[0]?.count).toBe("1");
  });
});
