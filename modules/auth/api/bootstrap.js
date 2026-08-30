"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthModule = createAuthModule;
exports.createPostgresAuthModule = createPostgresAuthModule;
exports.createConfiguredAuthModule = createConfiguredAuthModule;
const service_1 = require("../application/service");
const pg_1 = require("pg");
const postgres_user_repository_1 = require("../infrastructure/postgres-user-repository");
function createAuthModule(deps) { return (0, service_1.createAuthModule)(deps); }
function createPostgresAuthModule(input) {
    const pool = input.pool ?? new pg_1.Pool({ connectionString: input.connectionString });
    return (0, service_1.createAuthModule)({ userRepository: new postgres_user_repository_1.PostgresUserRepository(pool), jwtSecret: input.jwtSecret });
}
function createConfiguredAuthModule(input = {}) {
    const profile = input.profile ?? (process.env.NODE_ENV?.toLowerCase() === "test" ? "TEST" : "DEVELOPMENT");
    const databaseUrl = input.databaseUrl ?? process.env.DATABASE_URL?.trim();
    const jwtSecret = input.jwtSecret ?? process.env.JWT_SECRET?.trim();
    if (profile === "DEVELOPMENT" || profile === "PRODUCTION") {
        if (!databaseUrl)
            throw new Error("MISSING_CONFIGURATION:DATABASE_URL");
        if (!jwtSecret)
            throw new Error("MISSING_CONFIGURATION:JWT_SECRET");
        return createPostgresAuthModule({ connectionString: databaseUrl, jwtSecret });
    }
    return (0, service_1.createAuthModule)((0, service_1.createInMemoryAuthDependencies)({ jwtSecret: jwtSecret ?? "cryptox-test-profile-secret" }));
}
