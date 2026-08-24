import { describe, expect, it } from "vitest";
import { readCandles } from "./index";
describe("market-data runtime", () => { it("rejects an empty historical page with a typed error", async () => { await expect(readCandles({ pair: "BTCUSDT", timeframe: "1h" })).rejects.toMatchObject({ code: "NO_DATA" }); }); });
