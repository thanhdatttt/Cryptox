import { describe, expect, it } from "vitest";
import { formatMarketQuantity, recentMarketTicks, tickEmptyState } from "./market";
import type { MarketTick } from "./api";

const tick = (pair: string, timestamp: string, price: number, side: "BUY" | "SELL" = "BUY"): MarketTick => ({ pair, timestamp, price, quantity: 0.25, side });

describe("Market tick presentation", () => {
  it("keeps small real trade quantities visible instead of rounding them to zero", () => {
    expect(formatMarketQuantity(0.00007)).toBe("0.00007");
  });

  it("filters to the selected top pair, orders newest first, and bounds live rows", () => {
    const ticks = Array.from({ length: 10 }, (_, index) => tick("BTCUSDT", `2025-01-01T00:00:${String(index).padStart(2, "0")}.000Z`, index + 100)).concat(tick("ETHUSDT", "2025-01-01T00:01:00.000Z", 200));
    const rows = recentMarketTicks(ticks, "BTCUSDT", 8);
    expect(rows).toHaveLength(8);
    expect(rows[0]?.price).toBe(109);
    expect(rows.every((item) => item.pair === "BTCUSDT")).toBe(true);
  });

  it("reports honest empty states for paused, unavailable, and connected streams", () => {
    expect(tickEmptyState({ tone: "paused", label: "No active charts" }, { loading: false })).toContain("Select a chart");
    expect(tickEmptyState({ tone: "paused", label: "Realtime paused" }, { loading: false })).toContain("paused");
    expect(tickEmptyState({ tone: "error", label: "Connection error" }, { loading: false })).toContain("unavailable");
    expect(tickEmptyState({ tone: "connected", label: "Receiving data" }, { loading: false })).toContain("waiting");
  });
});
