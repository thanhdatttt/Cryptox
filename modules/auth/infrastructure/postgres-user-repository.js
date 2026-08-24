"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresUserRepository = void 0;
const toUser = (row) => ({
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: new Date(row.created_at).toISOString(),
});
class PostgresUserRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async insert(user) {
        await this.pool.query("INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, $3, $4)", [user.id, user.email, user.passwordHash, user.createdAt]);
    }
    async findByEmail(email) {
        const result = await this.pool.query("SELECT id, email, password_hash, created_at FROM users WHERE email = $1 LIMIT 1", [email]);
        return result.rows[0] ? toUser(result.rows[0]) : undefined;
    }
    async findById(id) {
        const result = await this.pool.query("SELECT id, email, password_hash, created_at FROM users WHERE id = $1 LIMIT 1", [id]);
        return result.rows[0] ? toUser(result.rows[0]) : undefined;
    }
}
exports.PostgresUserRepository = PostgresUserRepository;
