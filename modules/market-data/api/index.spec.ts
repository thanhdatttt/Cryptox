import { describe, expect, it } from "vitest";
import { readCandles } from "./index";
describe("market-data skeleton", () => { it("has a typed not-implemented facade", async () => { await expect(readCandles({ pair: "BTCUSDT", timeframe: "1h" })).rejects.toThrow("NOT_IMPLEMENTED"); }); });
