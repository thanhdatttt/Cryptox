import type { AuthApplicationDependencies } from "../application/ports";
import type { AuthenticatedUserId, AuthModulePublicApi } from "./contracts";
import { createAuthApplication } from "../application/service";

export type AuthModuleDependencies = AuthApplicationDependencies<AuthenticatedUserId>;

export function createAuthModule(dependencies: AuthModuleDependencies): AuthModulePublicApi {
  return createAuthApplication(dependencies) as unknown as AuthModulePublicApi;
}

export interface PostgresQueryResult<
  Row extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly rows: Row[];
  readonly rowCount?: number | null;
}

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

export declare function createPostgresAuthDependencies(
  options: PostgresAuthOptions,
): PostgresAuthDependencies;
