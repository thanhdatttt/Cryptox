import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { createInMemoryAuthDependencies, createAuthModule } from "./index";

describe("auth runtime", () => {
  it("stores only a bcrypt hash and issues a one-hour HS256 JWT with the user subject", async () => {
    const dependencies = createInMemoryAuthDependencies();
    dependencies.jwtSecret = "test-signing-secret";
    const runtime = createAuthModule(dependencies);

    await runtime.register("Student@Example.com", "correct-horse-battery-staple");
    const user = await dependencies.userRepository.findByEmail("student@example.com");
    const { token } = await runtime.login("student@example.com", "correct-horse-battery-staple");
    const payload = jwt.verify(token, "test-signing-secret", { algorithms: ["HS256"] });

    expect(user).toMatchObject({ email: "student@example.com", passwordHash: expect.stringMatching(/^\$2[aby]\$/) });
    expect(user?.passwordHash).not.toContain("correct-horse-battery-staple");
    expect(payload).toMatchObject({ sub: user?.id });
    expect(typeof payload === "string" ? undefined : payload.exp! - payload.iat!).toBe(3_600);
    await expect(runtime.verify(token)).resolves.toEqual({ userId: user!.id });
  });

  it("rejects duplicate emails and invalid credentials without exposing which check failed", async () => {
    const runtime = createAuthModule(createInMemoryAuthDependencies());
    await runtime.register("student@example.com", "correct-horse-battery-staple");

    await expect(runtime.register("student@example.com", "another-correct-password")).rejects.toMatchObject({ code: "EMAIL_ALREADY_EXISTS" });
    await expect(runtime.login("student@example.com", "wrong-password")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await expect(runtime.login("missing@example.com", "correct-horse-battery-staple")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("rejects invalid, expired, and unsigned JWTs", async () => {
    const runtime = createAuthModule({ ...createInMemoryAuthDependencies(), jwtSecret: "test-signing-secret" });
    const expired = jwt.sign({ sub: "user-1" }, "test-signing-secret", { algorithm: "HS256", expiresIn: -1 });
    const wrongSecret = jwt.sign({ sub: "user-1" }, "another-secret", { algorithm: "HS256", expiresIn: "1h" });

    await expect(runtime.verify("")).rejects.toMatchObject({ code: "INVALID_TOKEN" });
    await expect(runtime.verify(expired)).rejects.toMatchObject({ code: "INVALID_TOKEN" });
    await expect(runtime.verify(wrongSecret)).rejects.toMatchObject({ code: "INVALID_TOKEN" });
  });
});
