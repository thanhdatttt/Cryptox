import { describe, expect, it } from "vitest";
import { status } from "./index";
describe("backtesting skeleton", () => { it("stubs the rich log API", async () => { await expect(status("candidate")).rejects.toThrow("NOT_IMPLEMENTED"); }); });
