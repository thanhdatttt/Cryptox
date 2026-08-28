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
    await expect(authApi.login({ email: "user@example.test", password: "secret" })).rejects.toThrow(
      "NOT_IMPLEMENTED",
    );
  });
});
