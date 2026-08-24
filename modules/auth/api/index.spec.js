"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const vitest_1 = require("vitest");
const index_1 = require("./index");
(0, vitest_1.describe)("auth runtime", () => {
    (0, vitest_1.it)("stores only a bcrypt hash and issues a one-hour HS256 JWT with the user subject", async () => {
        const dependencies = (0, index_1.createInMemoryAuthDependencies)();
        dependencies.jwtSecret = "test-signing-secret";
        const runtime = (0, index_1.createAuthModule)(dependencies);
        await runtime.register("Student@Example.com", "correct-horse-battery-staple");
        const user = await dependencies.userRepository.findByEmail("student@example.com");
        const { token } = await runtime.login("student@example.com", "correct-horse-battery-staple");
        const payload = jsonwebtoken_1.default.verify(token, "test-signing-secret", { algorithms: ["HS256"] });
        (0, vitest_1.expect)(user).toMatchObject({ email: "student@example.com", passwordHash: vitest_1.expect.stringMatching(/^\$2[aby]\$/) });
        (0, vitest_1.expect)(user?.passwordHash).not.toContain("correct-horse-battery-staple");
        (0, vitest_1.expect)(payload).toMatchObject({ sub: user?.id });
        (0, vitest_1.expect)(typeof payload === "string" ? undefined : payload.exp - payload.iat).toBe(3_600);
        await (0, vitest_1.expect)(runtime.verify(token)).resolves.toEqual({ userId: user.id });
    });
    (0, vitest_1.it)("rejects duplicate emails and invalid credentials without exposing which check failed", async () => {
        const runtime = (0, index_1.createAuthModule)((0, index_1.createInMemoryAuthDependencies)());
        await runtime.register("student@example.com", "correct-horse-battery-staple");
        await (0, vitest_1.expect)(runtime.register("student@example.com", "another-correct-password")).rejects.toMatchObject({ code: "EMAIL_ALREADY_EXISTS" });
        await (0, vitest_1.expect)(runtime.login("student@example.com", "wrong-password")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
        await (0, vitest_1.expect)(runtime.login("missing@example.com", "correct-horse-battery-staple")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    });
    (0, vitest_1.it)("rejects invalid, expired, and unsigned JWTs", async () => {
        const runtime = (0, index_1.createAuthModule)({ ...(0, index_1.createInMemoryAuthDependencies)(), jwtSecret: "test-signing-secret" });
        const expired = jsonwebtoken_1.default.sign({ sub: "user-1" }, "test-signing-secret", { algorithm: "HS256", expiresIn: -1 });
        const wrongSecret = jsonwebtoken_1.default.sign({ sub: "user-1" }, "another-secret", { algorithm: "HS256", expiresIn: "1h" });
        await (0, vitest_1.expect)(runtime.verify("")).rejects.toMatchObject({ code: "INVALID_TOKEN" });
        await (0, vitest_1.expect)(runtime.verify(expired)).rejects.toMatchObject({ code: "INVALID_TOKEN" });
        await (0, vitest_1.expect)(runtime.verify(wrongSecret)).rejects.toMatchObject({ code: "INVALID_TOKEN" });
    });
});
