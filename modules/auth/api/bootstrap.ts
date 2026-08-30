export type { AuthModuleDependencies } from "../application/ports";
import type { AuthModuleDependencies } from "../application/ports";
import type { AuthModulePublicApi } from "./index";
import { createAuthModule as createRuntime, createInMemoryAuthDependencies } from "../application/service";
import { Pool } from "pg";
import { PostgresUserRepository } from "../infrastructure/postgres-user-repository";
export function createAuthModule(deps?: Partial<AuthModuleDependencies>): AuthModulePublicApi { return createRuntime(deps); }
export function createPostgresAuthModule(input: { connectionString: string; jwtSecret?: string; pool?: Pool }): AuthModulePublicApi {
  const pool = input.pool ?? new Pool({ connectionString: input.connectionString });
  return createRuntime({ userRepository: new PostgresUserRepository(pool), jwtSecret: input.jwtSecret });
}
export function createConfiguredAuthModule(input: { profile?: "TEST" | "DEMO" | "DEVELOPMENT" | "PRODUCTION"; databaseUrl?: string; jwtSecret?: string } = {}): AuthModulePublicApi {
  const profile = input.profile ?? (process.env.NODE_ENV?.toLowerCase() === "test" ? "TEST" : "DEVELOPMENT");
  const databaseUrl = input.databaseUrl ?? process.env.DATABASE_URL?.trim();
  const jwtSecret = input.jwtSecret ?? process.env.JWT_SECRET?.trim();
  if (profile === "DEVELOPMENT" || profile === "PRODUCTION") {
    if (!databaseUrl) throw new Error("MISSING_CONFIGURATION:DATABASE_URL");
    if (!jwtSecret) throw new Error("MISSING_CONFIGURATION:JWT_SECRET");
    return createPostgresAuthModule({ connectionString: databaseUrl, jwtSecret });
  }
  return createRuntime(createInMemoryAuthDependencies({ jwtSecret: jwtSecret ?? "cryptox-test-profile-secret" }));
}
