import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { User, UserRepository } from "../domain/contracts";
import { AuthException } from "../domain/errors";
import { normalizeEmail, validatePassword, validateToken } from "../domain/rules";
import type { AuthModuleDependencies, PasswordHasher, TokenCodec } from "./ports";

type InternalDependencies = Partial<AuthModuleDependencies>;
const now = (): string => new Date().toISOString();

class MemoryUserRepository implements UserRepository {
  private readonly usersByEmail = new Map<string, User>();
  private readonly usersById = new Map<string, User>();

  async insert(user: User): Promise<void> {
    if (this.usersByEmail.has(user.email)) throw new AuthException("EMAIL_ALREADY_EXISTS", "Email is already registered.");
    const stored = { ...user };
    this.usersByEmail.set(stored.email, stored);
    this.usersById.set(stored.id, stored);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const user = this.usersByEmail.get(email);
    return user ? { ...user } : undefined;
  }

  async findById(id: string): Promise<User | undefined> {
    const user = this.usersById.get(id);
    return user ? { ...user } : undefined;
  }
}

const bcryptHasher: PasswordHasher = {
  hash: (password) => bcrypt.hash(password, 12),
  verify: (password, passwordHash) => bcrypt.compare(password, passwordHash),
};

class Hs256JwtCodec implements TokenCodec {
  constructor(private readonly secret: string) { }

  sign(input: { userId: string }): string {
    return jwt.sign({ sub: input.userId }, this.secret, { algorithm: "HS256", expiresIn: "1h" });
  }

  verify(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, this.secret, { algorithms: ["HS256"] });
      if (typeof payload === "string" || typeof payload.sub !== "string" || payload.sub.length === 0) throw new Error("JWT subject is missing");
      return { userId: payload.sub };
    } catch {
      throw new AuthException("INVALID_TOKEN", "JWT is invalid or expired.");
    }
  }
}

const isDuplicateError = (error: unknown): boolean => error instanceof AuthException && error.code === "EMAIL_ALREADY_EXISTS" || typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "23505";

export interface AuthModuleRuntime {
  register(email: string, password: string): Promise<void>;
  login(email: string, password: string): Promise<{ token: string }>;
  verify(token: string): Promise<{ userId: string }>;
}

export function createInMemoryAuthDependencies(options: { jwtSecret?: string } = {}): AuthModuleDependencies {
  const jwtSecret = options.jwtSecret?.trim() ?? (process.env.NODE_ENV?.toLowerCase() === "test" ? "cryptox-test-only-secret" : undefined);
  if (!jwtSecret) throw new AuthException("CONFIGURATION_ERROR", "JWT secret is required for an in-memory Auth runtime.");
  return { userRepository: new MemoryUserRepository(), jwtSecret, clock: { now }, passwordHasher: bcryptHasher, idGenerator: randomUUID };
}

export function createAuthModule(dependencies?: InternalDependencies): AuthModuleRuntime {
  const provided = dependencies ?? {};
  const repository = provided.userRepository ?? new MemoryUserRepository();
  const jwtSecret = provided.jwtSecret?.trim() ?? (process.env.NODE_ENV?.toLowerCase() === "test" ? "cryptox-test-only-secret" : undefined);
  if (!jwtSecret) throw new AuthException("CONFIGURATION_ERROR", "JWT secret is required.");
  const clock = provided.clock ?? { now };
  const passwordHasher = provided.passwordHasher ?? bcryptHasher;
  const tokenCodec = provided.tokenCodec ?? new Hs256JwtCodec(jwtSecret);
  const idGenerator = provided.idGenerator ?? randomUUID;

  return {
    async register(email, password) {
      const normalizedEmail = normalizeEmail(email);
      const normalizedPassword = validatePassword(password);
      if (await repository.findByEmail(normalizedEmail)) throw new AuthException("EMAIL_ALREADY_EXISTS", "Email is already registered.");
      const user: User = { id: idGenerator(), email: normalizedEmail, passwordHash: await passwordHasher.hash(normalizedPassword), createdAt: clock.now() };
      try {
        await repository.insert(user);
      } catch (error) {
        if (isDuplicateError(error)) throw new AuthException("EMAIL_ALREADY_EXISTS", "Email is already registered.");
        throw error;
      }
    },

    async login(email, password) {
      const user = await repository.findByEmail(normalizeEmail(email));
      if (!user || !await passwordHasher.verify(validatePassword(password), user.passwordHash)) {
        throw new AuthException("INVALID_CREDENTIALS", "Email or password is incorrect.");
      }
      return { token: tokenCodec.sign({ userId: user.id }) };
    },

    async verify(token) {
      return tokenCodec.verify(validateToken(token));
    },
  };
}
