import argon2 from "argon2";
import type { PasswordHashPort } from "../application/ports";

export const argon2idPasswordHash: PasswordHashPort = {
  hash: (password) => argon2.hash(password, { type: argon2.argon2id }),
  verify: (passwordHash, password) => argon2.verify(passwordHash, password),
  // A valid, non-secret hash keeps a missing-user login on the same verifier
  // path without ever persisting or returning a credential.
  dummyHash:
    "$argon2id$v=19$m=65536,t=3,p=4$5DhOKFjQLufNKPw3ttaU1g$H/vnQRjq8nHgvBEfHTS2dYpC4I3W0d87eSfSN64zU5M",
};
