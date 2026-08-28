import { AuthDuplicateEmailError, type AuthApplicationDependencies, type AuthSessionRecord, type AuthUserCredentialRecord } from "../application/ports";
import type { AuthenticatedUserId } from "../api/contracts";
import { createHash, randomBytes } from "node:crypto";
import { argon2idPasswordHash } from "./argon2id";

export interface PostgresQueryResult<Row extends Record<string, unknown> = Record<string, unknown>> {
  readonly rows: Row[];
  readonly rowCount?: number | null;
}

/** Minimal pool surface keeps the adapter testable without coupling the port to pg. */
export interface PostgresPool {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<PostgresQueryResult<Row>>;
  end(): Promise<void>;
}

export interface PostgresAuthDependencies
  extends AuthApplicationDependencies<AuthenticatedUserId> {
  readonly pool: PostgresPool;
  close(): Promise<void>;
}

export interface PostgresAuthOptions {
  readonly connectionString: string;
  readonly pool?: PostgresPool;
  readonly maxConnections?: number;
}

interface UserRow extends Record<string, unknown> {
  id: string;
  normalized_email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

interface SessionRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  token_digest: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

interface PostgresErrorLike {
  readonly code?: unknown;
  readonly constraint?: unknown;
}

function timestamp(value: unknown, field: string): string {
  const parsed = new Date(String(value));
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`invalid ${field} returned by auth persistence`);
  }
  return parsed.toISOString();
}

function userFromRow(row: UserRow): AuthUserCredentialRecord<AuthenticatedUserId> {
  return {
    id: row.id as AuthenticatedUserId,
    normalizedEmail: row.normalized_email,
    passwordHash: row.password_hash,
    createdAt: timestamp(row.created_at, "created_at"),
    updatedAt: timestamp(row.updated_at, "updated_at"),
  };
}

function sessionFromRow(row: SessionRow): AuthSessionRecord<AuthenticatedUserId> {
  return {
    id: row.id,
    userId: row.user_id as AuthenticatedUserId,
    tokenDigest: row.token_digest,
    createdAt: timestamp(row.created_at, "created_at"),
    expiresAt: timestamp(row.expires_at, "expires_at"),
    ...(row.revoked_at === null
      ? {}
      : { revokedAt: timestamp(row.revoked_at, "revoked_at") }),
  };
}

function isDuplicateEmail(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const postgresError = error as PostgresErrorLike;
  return (
    postgresError.code === "23505" &&
    postgresError.constraint === "users_normalized_email_unique"
  );
}

function poolFromOptions(options: PostgresAuthOptions): PostgresPool {
  if (options.pool) return options.pool;

  // Keep pg behind this infrastructure adapter; callers use the Auth
  // bootstrap seam and never depend on the driver directly.
  const { Pool } = require("pg") as {
    Pool: new (config: {
      connectionString: string;
      max: number;
      application_name: string;
    }) => PostgresPool;
  };
  return new Pool({
    connectionString: options.connectionString,
    max: options.maxConnections ?? 5,
    application_name: "cryptox-auth",
  });
}

export function createPostgresAuthDependencies(
  options: PostgresAuthOptions,
): PostgresAuthDependencies {
  if (!options.connectionString.trim()) {
    throw new Error("Auth PostgreSQL connection string is required");
  }

  const pool = poolFromOptions(options);
  let closed = false;

  const users = {
    insert: async (input: {
      id: AuthenticatedUserId;
      normalizedEmail: string;
      passwordHash: string;
      createdAt: string;
    }): Promise<AuthUserCredentialRecord<AuthenticatedUserId>> => {
      try {
        const result = await pool.query<UserRow>(
          `
            INSERT INTO users (id, normalized_email, password_hash, created_at, updated_at)
            VALUES ($1::uuid, $2, $3, $4::timestamptz, $4::timestamptz)
            RETURNING id::text, normalized_email, password_hash,
              created_at::text, updated_at::text
          `,
          [input.id, input.normalizedEmail, input.passwordHash, input.createdAt],
        );
        const row = result.rows[0];
        if (!row) throw new Error("auth user insert returned no row");
        return userFromRow(row);
      } catch (error) {
        if (isDuplicateEmail(error)) throw new AuthDuplicateEmailError();
        throw error;
      }
    },

    getByNormalizedEmail: async (
      normalizedEmail: string,
    ): Promise<AuthUserCredentialRecord<AuthenticatedUserId> | undefined> => {
      const result = await pool.query<UserRow>(
        `
          SELECT id::text, normalized_email, password_hash,
            created_at::text, updated_at::text
          FROM users
          WHERE normalized_email = $1
          LIMIT 1
        `,
        [normalizedEmail],
      );
      return result.rows[0] ? userFromRow(result.rows[0]) : undefined;
    },

    getById: async (
      id: AuthenticatedUserId,
    ): Promise<AuthUserCredentialRecord<AuthenticatedUserId> | undefined> => {
      const result = await pool.query<UserRow>(
        `
          SELECT id::text, normalized_email, password_hash,
            created_at::text, updated_at::text
          FROM users
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [id],
      );
      return result.rows[0] ? userFromRow(result.rows[0]) : undefined;
    },
  };

  const sessions = {
    insert: async (
      session: AuthSessionRecord<AuthenticatedUserId>,
    ): Promise<AuthSessionRecord<AuthenticatedUserId>> => {
      const result = await pool.query<SessionRow>(
        `
          INSERT INTO auth_sessions
            (id, user_id, token_digest, created_at, expires_at, revoked_at)
          VALUES ($1::uuid, $2::uuid, $3, $4::timestamptz, $5::timestamptz, $6::timestamptz)
          RETURNING id::text, user_id::text, token_digest,
            created_at::text, expires_at::text, revoked_at::text
        `,
        [
          session.id,
          session.userId,
          session.tokenDigest,
          session.createdAt,
          session.expiresAt,
          session.revokedAt ?? null,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("auth session insert returned no row");
      return sessionFromRow(row);
    },

    getActiveByTokenDigest: async (
      tokenDigest: string,
      now: string,
    ): Promise<AuthSessionRecord<AuthenticatedUserId> | undefined> => {
      const result = await pool.query<SessionRow>(
        `
          SELECT id::text, user_id::text, token_digest,
            created_at::text, expires_at::text, revoked_at::text
          FROM auth_sessions
          WHERE token_digest = $1
            AND revoked_at IS NULL
            AND expires_at > $2::timestamptz
          LIMIT 1
        `,
        [tokenDigest, now],
      );
      return result.rows[0] ? sessionFromRow(result.rows[0]) : undefined;
    },

    revokeByTokenDigest: async (tokenDigest: string, revokedAt: string): Promise<void> => {
      await pool.query(
        `
          UPDATE auth_sessions
          SET revoked_at = COALESCE(revoked_at, $2::timestamptz)
          WHERE token_digest = $1
        `,
        [tokenDigest, revokedAt],
      );
    },
  };

  return {
    users,
    sessions,
    passwordHash: argon2idPasswordHash,
    sessionTokens: {
      generate: () => randomBytes(32).toString("base64url"),
      digest: (opaqueToken: string) =>
        createHash("sha256").update(opaqueToken, "utf8").digest("hex"),
    },
    clock: { now: () => new Date().toISOString() },
    pool,
    close: async () => {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}
