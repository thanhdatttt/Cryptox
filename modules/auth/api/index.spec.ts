import { describe, expect, it } from "vitest";
import * as authApi from "./index";

describe("Auth public entrypoint", () => {
  it("allowlists the V1 session facade and contract constants", async () => {
    expect(Object.keys(authApi).sort()).toEqual(
      [
        "AUTH_SESSION_V1",
        "PRIVATE_RESOURCE_FAILURES",
        "PER_USER_OWNERSHIP_V1",
        "currentUser",
        "login",
        "logout",
        "register",
        "resolveSession",
      ].sort(),
    );
    const registered = await authApi.register({
      email: " User@Example.Test ",
      password: "secret-password",
    });
    expect(registered.user.email).toBe("user@example.test");
    expect(await authApi.resolveSession(registered.opaqueToken)).toMatchObject({
      authenticatedUserId: registered.user.id,
      expiresAt: registered.expiresAt,
    });
  });
});
