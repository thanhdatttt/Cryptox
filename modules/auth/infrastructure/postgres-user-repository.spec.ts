import { describe, expect, it } from "vitest";
import { PostgresUserRepository } from "./postgres-user-repository";

describe("PostgresUserRepository", () => {
  it("uses parameterized queries and maps storage names without exposing a plain password", async () => {
    const calls: Array<{ text: string; values: unknown[] }> = [];
    const repository = new PostgresUserRepository({
      query: async <Row>(text: string, values: unknown[]) => {
        calls.push({ text, values });
        return { rows: text.startsWith("SELECT") ? [{ id: "user-1", email: "student@example.com", password_hash: "$2b$12$hash", created_at: "2025-01-01T00:00:00.000Z" }] as Row[] : [] };
      },
    });

    await repository.insert({ id: "user-1", email: "student@example.com", passwordHash: "$2b$12$hash", createdAt: "2025-01-01T00:00:00.000Z" });
    await expect(repository.findByEmail("student@example.com")).resolves.toEqual({ id: "user-1", email: "student@example.com", passwordHash: "$2b$12$hash", createdAt: "2025-01-01T00:00:00.000Z" });

    expect(calls[0]).toEqual({ text: "INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, $3, $4)", values: ["user-1", "student@example.com", "$2b$12$hash", "2025-01-01T00:00:00.000Z"] });
    expect(calls[1]).toEqual({ text: "SELECT id, email, password_hash, created_at FROM users WHERE email = $1 LIMIT 1", values: ["student@example.com"] });
  });
});
