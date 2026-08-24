export type { AuthModuleDependencies } from "../application/ports";
import type { AuthModuleDependencies } from "../application/ports";
import type { AuthModulePublicApi } from "./index";
import { createAuthModule as createRuntime } from "../application/service";
import { Pool } from "pg";
import { PostgresUserRepository } from "../infrastructure/postgres-user-repository";
export function createAuthModule(deps?: Partial<AuthModuleDependencies>): AuthModulePublicApi { return createRuntime(deps); }
export function createPostgresAuthModule(input: { connectionString: string; jwtSecret?: string; pool?: Pool }): AuthModulePublicApi {
  const pool = input.pool ?? new Pool({ connectionString: input.connectionString });
  return createRuntime({ userRepository: new PostgresUserRepository(pool), jwtSecret: input.jwtSecret });
}
export function createConfiguredAuthModule(): AuthModulePublicApi {
  return process.env.DATABASE_URL ? createPostgresAuthModule({ connectionString: process.env.DATABASE_URL, jwtSecret: process.env.JWT_SECRET }) : createRuntime();
}
