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
function createConfiguredAuthModule() {
    return process.env.DATABASE_URL ? createPostgresAuthModule({ connectionString: process.env.DATABASE_URL, jwtSecret: process.env.JWT_SECRET }) : (0, service_1.createAuthModule)();
}
