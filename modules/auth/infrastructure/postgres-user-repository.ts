import type { User, UserRepository } from "../domain/contracts";

export interface SqlQueryClient {
  query<Row>(text: string, values: unknown[]): Promise<{ rows: Row[] }>;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date | string;
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  passwordHash: row.password_hash,
  createdAt: new Date(row.created_at).toISOString(),
});

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: SqlQueryClient) {}

  async insert(user: User): Promise<void> {
    await this.pool.query(
      "INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, $3, $4)",
      [user.id, user.email, user.passwordHash, user.createdAt],
    );
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await this.pool.query<UserRow>(
      "SELECT id, email, password_hash, created_at FROM users WHERE email = $1 LIMIT 1",
      [email],
    );
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  }

  async findById(id: string): Promise<User | undefined> {
    const result = await this.pool.query<UserRow>(
      "SELECT id, email, password_hash, created_at FROM users WHERE id = $1 LIMIT 1",
      [id],
    );
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  }
}
