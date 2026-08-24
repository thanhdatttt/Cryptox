"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const postgres_user_repository_1 = require("./postgres-user-repository");
(0, vitest_1.describe)("PostgresUserRepository", () => {
    (0, vitest_1.it)("uses parameterized queries and maps storage names without exposing a plain password", async () => {
        const calls = [];
        const repository = new postgres_user_repository_1.PostgresUserRepository({
            query: async (text, values) => {
                calls.push({ text, values });
                return { rows: text.startsWith("SELECT") ? [{ id: "user-1", email: "student@example.com", password_hash: "$2b$12$hash", created_at: "2025-01-01T00:00:00.000Z" }] : [] };
            },
        });
        await repository.insert({ id: "user-1", email: "student@example.com", passwordHash: "$2b$12$hash", createdAt: "2025-01-01T00:00:00.000Z" });
        await (0, vitest_1.expect)(repository.findByEmail("student@example.com")).resolves.toEqual({ id: "user-1", email: "student@example.com", passwordHash: "$2b$12$hash", createdAt: "2025-01-01T00:00:00.000Z" });
        (0, vitest_1.expect)(calls[0]).toEqual({ text: "INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, $3, $4)", values: ["user-1", "student@example.com", "$2b$12$hash", "2025-01-01T00:00:00.000Z"] });
        (0, vitest_1.expect)(calls[1]).toEqual({ text: "SELECT id, email, password_hash, created_at FROM users WHERE email = $1 LIMIT 1", values: ["student@example.com"] });
    });
});
