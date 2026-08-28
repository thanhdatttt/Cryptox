import { describe, expect, it } from "vitest";
import {
  SUPPORT_RESISTANCE_DESCRIPTOR,
  SUPPORT_RESISTANCE_FACTORY,
  createSupportResistanceStrategy,
  supportResistanceFactory,
} from ".";

type CandleOverrides = Partial<{
  open: number;
  high: number;
  low: number;
  close: number;
}>;

function candle(index: number, close: number, overrides: CandleOverrides = {}) {
  return {
    timestamp: `2026-08-28T00:${String(index).padStart(2, "0")}:00.000Z`,
    open: overrides.open ?? close,
    high: overrides.high ?? close,
    low: overrides.low ?? close,
    close: overrides.close ?? close,
    volume: 1,
    isClosed: true as const,
  };
}

function context(candles: readonly ReturnType<typeof candle>[]) {
  return { pair: "BTCUSDT", timeframe: "1h", candles };
}

function contextWithTimestamps(timestamps: readonly string[]) {
  return context(timestamps.map((timestamp, index) => ({
    ...candle(index, index + 1),
    timestamp,
  })));
}

describe("Support/Resistance plugin", () => {
  it("exposes the approved descriptor, factory, and price-zone overlay", () => {
    expect(SUPPORT_RESISTANCE_FACTORY).toBe(supportResistanceFactory);
    expect(SUPPORT_RESISTANCE_DESCRIPTOR).toMatchObject({
      name: "SUPPORT_RESISTANCE",
      category: "STRUCTURE",
      implementationVersion: "1.0.0",
      behaviorProfileId: "TECHNICAL_PROFILES_V1",
      parameters: [
        { key: "window", defaultValue: 20, required: false },
        { key: "proximityPercent", defaultValue: 0.5, required: false },
      ],
      visualization: [
        {
          id: "support-resistance",
          kind: "ZONE",
          pane: "PRICE",
          series: [
            { key: "support", label: "Support" },
            { key: "resistance", label: "Resistance" },
          ],
        },
      ],
    });
  });

  it("uses rolling extrema from the previous candles and excludes the current candle", () => {
    const strategy = createSupportResistanceStrategy({ window: 2, proximityPercent: 0.5 });
    const result = strategy.analyze(context([
      candle(0, 15, { low: 10, high: 20 }),
      candle(1, 16, { low: 12, high: 22 }),
      candle(2, 15, { low: 1, high: 100 }),
    ]));

    expect(result.visualization).toEqual([
      {
        descriptorId: "support-resistance",
        timestamp: "2026-08-28T00:02:00.000Z",
        values: { support: 10, resistance: 22 },
      },
    ]);
    expect(result.signal).toBe("HOLD");
  });

  it("emits BUY and SELL only for confirmed proximity bounces", () => {
    const previous = [
      candle(0, 110, { low: 100, high: 120 }),
      candle(1, 110, { low: 105, high: 115 }),
    ];
    const strategy = createSupportResistanceStrategy({ window: 2, proximityPercent: 0.5 });

    const buy = strategy.analyze(context([
      ...previous,
      candle(2, 101, { open: 99, low: 100.4, high: 110 }),
    ]));
    const sell = strategy.analyze(context([
      ...previous,
      candle(2, 119, { open: 121, low: 110, high: 119.5 }),
    ]));

    expect(buy.signal).toBe("BUY");
    expect(sell.signal).toBe("SELL");
  });

  it("returns HOLD for ties, overlapping zones, and breakouts", () => {
    const tieStrategy = createSupportResistanceStrategy({ window: 2, proximityPercent: 0.5 });
    expect(tieStrategy.analyze(context([
      candle(0, 100),
      candle(1, 100),
      candle(2, 100, { open: 99, low: 99, high: 101 }),
    ])).signal).toBe("HOLD");

    const overlapStrategy = createSupportResistanceStrategy({ window: 2, proximityPercent: 1 });
    expect(overlapStrategy.analyze(context([
      candle(0, 100, { low: 100, high: 101 }),
      candle(1, 100.5, { low: 100, high: 101 }),
      candle(2, 100.5, { open: 99, low: 100, high: 101 }),
    ])).signal).toBe("HOLD");

    const breakout = createSupportResistanceStrategy({ window: 2, proximityPercent: 0.5 });
    expect(breakout.analyze(context([
      candle(0, 100, { low: 100, high: 120 }),
      candle(1, 110, { low: 105, high: 115 }),
      candle(2, 99, { open: 100, low: 98, high: 101 }),
    ])).signal).toBe("HOLD");
    expect(breakout.analyze(context([
      candle(0, 100, { low: 100, high: 120 }),
      candle(1, 110, { low: 105, high: 115 }),
      candle(2, 121, { open: 120, low: 119, high: 122 }),
    ])).signal).toBe("HOLD");

    const bothZones = createSupportResistanceStrategy({ window: 2, proximityPercent: 0.5 });
    expect(bothZones.analyze(context([
      candle(0, 110, { low: 100, high: 120 }),
      candle(1, 110, { low: 105, high: 115 }),
      candle(2, 110, { open: 109, low: 100, high: 120 }),
    ])).signal).toBe("HOLD");
  });

  it("requires a full previous window before producing levels", () => {
    const strategy = createSupportResistanceStrategy({ window: 2, proximityPercent: 0.5 });
    const warmup = strategy.analyze(context([
      candle(0, 100),
      candle(1, 101),
    ]));
    const ready = strategy.analyze(context([
      candle(0, 100),
      candle(1, 101),
      candle(2, 102),
    ]));

    expect(warmup.signal).toBe("HOLD");
    expect(warmup.visualization).toEqual([]);
    expect(ready.visualization).toHaveLength(1);
    expect(ready.visualization[0]?.values).toEqual({ support: 100, resistance: 101 });
  });

  it.each([
    ["invalid", ["2026-08-28T00:00:00.000Z", "not-a-timestamp"]],
    ["duplicate", ["2026-08-28T00:00:00.000Z", "2026-08-28T00:00:00.000Z"]],
    ["decreasing", ["2026-08-28T00:01:00.000Z", "2026-08-28T00:00:00.000Z"]],
  ] as const)("rejects %s candle timestamps", (_case, timestamps) => {
    const strategy = createSupportResistanceStrategy({ window: 2, proximityPercent: 0.5 });

    expect(() => strategy.analyze(contextWithTimestamps(timestamps))).toThrow(
      "INVALID_STRATEGY_CONTEXT",
    );
  });

  it("deep-freezes the descriptor metadata graph", () => {
    const parameter = SUPPORT_RESISTANCE_DESCRIPTOR.parameters[0]!;
    const visualization = SUPPORT_RESISTANCE_DESCRIPTOR.visualization[0]!;
    const series = visualization.series[0]!;

    expect(Object.isFrozen(SUPPORT_RESISTANCE_DESCRIPTOR)).toBe(true);
    expect(Object.isFrozen(SUPPORT_RESISTANCE_DESCRIPTOR.parameters)).toBe(true);
    expect(Object.isFrozen(parameter)).toBe(true);
    expect(Object.isFrozen(SUPPORT_RESISTANCE_DESCRIPTOR.visualization)).toBe(true);
    expect(Object.isFrozen(visualization)).toBe(true);
    expect(Object.isFrozen(visualization.series)).toBe(true);
    expect(Object.isFrozen(series)).toBe(true);
  });

  it("rejects invalid parameters and remains deterministic and pure", () => {
    expect(() => createSupportResistanceStrategy({ window: 0 })).toThrow("INVALID_STRATEGY_PARAMETERS");
    expect(() => createSupportResistanceStrategy({ window: 1.2 })).toThrow("INVALID_STRATEGY_PARAMETERS");
    expect(() => createSupportResistanceStrategy({ proximityPercent: 0 })).toThrow(
      "INVALID_STRATEGY_PARAMETERS",
    );
    expect(() => createSupportResistanceStrategy({ proximityPercent: Number.NaN })).toThrow(
      "INVALID_STRATEGY_PARAMETERS",
    );
    expect(() => createSupportResistanceStrategy({ other: 1 })).toThrow("INVALID_STRATEGY_PARAMETERS");

    const input = context([
      candle(0, 100, { low: 95, high: 105 }),
      candle(1, 102, { low: 99, high: 110 }),
      candle(2, 103, { open: 101, low: 102, high: 104 }),
    ]);
    const before = structuredClone(input);
    const strategy = createSupportResistanceStrategy({ window: 2, proximityPercent: 0.5 });
    const first = strategy.analyze(input);
    const second = strategy.analyze(input);

    expect(first).toEqual(second);
    expect(input).toEqual(before);
  });
});
