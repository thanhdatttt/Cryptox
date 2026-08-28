import { describe, expect, it } from "vitest";
import { argon2idPasswordHash } from "./argon2id";

describe("Argon2id password adapter", () => {
  it("hashes and verifies without exposing the password", async () => {
    const password = "secret-password";
    const hash = await argon2idPasswordHash.hash(password);
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain(password);
    await expect(argon2idPasswordHash.verify(hash, password)).resolves.toBe(true);
    await expect(argon2idPasswordHash.verify(hash, "wrong-password")).resolves.toBe(false);
  });
});
