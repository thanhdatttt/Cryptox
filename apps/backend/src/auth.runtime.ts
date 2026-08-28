import type { AuthModulePublicApi } from "@cryptox/auth";
import {
  createAuthModule,
  createPostgresAuthDependencies,
  type PostgresAuthDependencies,
} from "@cryptox/auth/bootstrap";

export const AUTH_RUNTIME_TOKEN = "CRYPT0X_AUTH_RUNTIME";

export class AuthPersistenceUnavailableError extends Error {
  public readonly code = "AUTH_PERSISTENCE_UNAVAILABLE" as const;

  public constructor() {
    super("auth persistence is unavailable");
    this.name = "AuthPersistenceUnavailableError";
  }
}

export interface BackendAuthRuntime {
  readonly auth: AuthModulePublicApi;
  readonly configured: boolean;
  close(): Promise<void>;
}

function unavailableAuth(): AuthModulePublicApi {
  const unavailable = async (): Promise<never> => {
    throw new AuthPersistenceUnavailableError();
  };
  return {
    register: unavailable,
    login: unavailable,
    resolveSession: unavailable,
    currentUser: unavailable,
    logout: unavailable,
  };
}

export function createBackendAuthRuntime(
  databaseUrl = process.env.DATABASE_URL,
): BackendAuthRuntime {
  if (!databaseUrl?.trim()) {
    return {
      auth: unavailableAuth(),
      configured: false,
      close: async () => undefined,
    };
  }

  const dependencies: PostgresAuthDependencies = createPostgresAuthDependencies({
    connectionString: databaseUrl,
  });
  return {
    auth: createAuthModule(dependencies),
    configured: true,
    close: dependencies.close,
  };
}
