import { createHash, randomBytes } from "node:crypto";
import {
  AuthDuplicateEmailError,
  type AuthApplicationDependencies,
  type AuthSessionRecord,
  type AuthUserCredentialRecord,
} from "./ports";

export class InMemoryAuthDependencies<TUserId extends string = string>
  implements AuthApplicationDependencies<TUserId> {
  constructor(
    readonly passwordHash = {
      hash: async (password: string) => `test-hash:${createHash("sha256").update(password).digest("hex")}`,
      verify: async (passwordHash: string, password: string) =>
        passwordHash === `test-hash:${createHash("sha256").update(password).digest("hex")}`,
    },
  ) {}
  readonly usersById = new Map<string, AuthUserCredentialRecord<TUserId>>();
  readonly usersByEmail = new Map<string, AuthUserCredentialRecord<TUserId>>();
  readonly sessionsByDigest = new Map<string, AuthSessionRecord<TUserId>>();

  readonly users = {
    insert: async (input: {
      id: TUserId;
      normalizedEmail: string;
      passwordHash: string;
      createdAt: string;
    }) => {
      if (this.usersByEmail.has(input.normalizedEmail)) {
        throw new AuthDuplicateEmailError();
      }
      const user = { ...input, updatedAt: input.createdAt };
      this.usersById.set(user.id, user);
      this.usersByEmail.set(user.normalizedEmail, user);
      return user;
    },
    getByNormalizedEmail: async (email: string) => this.usersByEmail.get(email),
    getById: async (id: TUserId) => this.usersById.get(id),
  };

  readonly sessions = {
    insert: async (session: AuthSessionRecord<TUserId>) => {
      this.sessionsByDigest.set(session.tokenDigest, { ...session });
      return session;
    },
    getActiveByTokenDigest: async (digest: string, now: string) => {
      const session = this.sessionsByDigest.get(digest);
      if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.parse(now)) {
        return undefined;
      }
      return session;
    },
    revokeByTokenDigest: async (digest: string, revokedAt: string) => {
      const session = this.sessionsByDigest.get(digest);
      if (session && !session.revokedAt) session.revokedAt = revokedAt;
    },
  };

  readonly sessionTokens = {
    generate: () => randomBytes(32).toString("base64url"),
    digest: (opaqueToken: string) => createHash("sha256").update(opaqueToken).digest("hex"),
  };

  readonly clock = { now: () => new Date().toISOString() };
}

export function createInMemoryAuthDependencies<TUserId extends string = string>(): InMemoryAuthDependencies<TUserId> {
  return new InMemoryAuthDependencies<TUserId>();
}
