import argon2 from "argon2";
import type { PasswordHashPort } from "../application/ports";

export const argon2idPasswordHash: PasswordHashPort = {
  hash: (password) => argon2.hash(password, { type: argon2.argon2id }),
  verify: (passwordHash, password) => argon2.verify(passwordHash, password),
};
