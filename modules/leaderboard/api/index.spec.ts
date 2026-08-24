import { describe, expect, it } from "vitest";
import { score } from "./index";
describe("leaderboard skeleton", () => { it("stubs score", () => { expect(() => score("scope", {} as never)).toThrow("NOT_IMPLEMENTED"); }); });
