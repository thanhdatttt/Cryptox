import { describe, expect, it } from "vitest";
import { guardRoute, parseLocation, routeHash } from "./navigation";

describe("protected navigation", () => {
  it("redirects anonymous users to login while preserving the private destination", () => {
    const location = parseLocation("#strategies");

    expect(guardRoute(location.name, "anonymous")).toEqual({ kind: "redirect", returnTo: "strategies" });
    expect(routeHash("login", "strategies")).toBe("#login?returnTo=strategies");
    expect(routeHash("register", "strategies")).toBe("#register?returnTo=strategies");
    expect(parseLocation("#login?returnTo=strategies")).toEqual({ name: "login", returnTo: "strategies" });
  });

  it("allows authenticated private routes and waits during session restoration", () => {
    expect(guardRoute("experiments", "authenticated")).toEqual({ kind: "allow" });
    expect(guardRoute("experiments", "restoring")).toEqual({ kind: "restore" });
  });
});
