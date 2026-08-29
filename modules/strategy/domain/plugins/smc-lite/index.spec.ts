import { describe, expect, it } from "vitest";
import {
  SMC_LITE_DESCRIPTOR,
  SMC_LITE_FACTORY,
  SMC_LITE_PROFILE,
  createSmcLiteStrategy,
  smcLiteFactory,
} from ".";

type CandleOverrides = Partial<{
  open: number;
  high: number;
  low: number;
  volume: number;
  isClosed: true;
}>;

function candle(index: number, close: number, overrides: CandleOverrides = {}) {
  const open = overrides.open ?? close;
  const high = overrides.high ?? Math.max(open, close);
  const low = overrides.low ?? Math.min(open, close);
  return {
    timestamp: new Date(Date.UTC(2026, 7, 28, 0, index)).toISOString(),
    open,
    high,
    low,
    close,
    volume: overrides.volume ?? 10,
    isClosed: overrides.isClosed ?? (true as const),
  };
}

function context(candles: readonly ReturnType<typeof candle>[]) {
  return { pair: "BTCUSDT", timeframe: "1h", candles };
}

function expectFiniteAnalysis(analysis: ReturnType<ReturnType<typeof createSmcLiteStrategy>["analyze"]>) {
  expect(analysis.signal).toMatch(/^(BUY|SELL|HOLD)$/);
  expect(typeof analysis.signalAt).toBe("string");
  for (const point of analysis.visualization) {
    expect(typeof point.timestamp).toBe("string");
    for (const value of Object.values(point.values)) expect(Number.isFinite(value)).toBe(true);
  }
}

describe("SMC_LITE_V1 plugin", () => {
  it("exposes a truthful Lite descriptor, profile, factory, and frozen metadata", () => {
    expect(SMC_LITE_FACTORY).toBe(smcLiteFactory);
    expect(SMC_LITE_DESCRIPTOR).toMatchObject({
      name: "SMC_LITE_V1",
      displayName: expect.stringContaining("SMC Lite"),
      description: expect.stringMatching(/bounded deterministic Lite/i),
      category: "STRUCTURE",
      implementationVersion: "1.0.0",
      behaviorProfileId: "SMC_LITE_V1",
      extensionProfileId: "SMC_LITE_V1",
      parameters: [
        { key: "leftWindow", defaultValue: 2, minimum: 1, maximum: 50 },
        { key: "rightWindow", defaultValue: 2, minimum: 1, maximum: 50 },
      ],
      visualization: [
        { id: "smc-lite-pivots", kind: "ZONE", pane: "PRICE" },
        { id: "smc-lite-bos", kind: "LINE", pane: "PRICE" },
      ],
    });
    expect(SMC_LITE_PROFILE).toMatchObject({
      id: "SMC_LITE_V1",
      confirmationRule: "PIVOT_IS_USABLE_ONLY_AFTER_RIGHT_WINDOW_EXISTS",
      bosRule: "LATEST_CLOSED_CLOSE_CROSSES_LATEST_CONFIRMED_SWING_LEVEL",
      insufficientData: "HOLD_WITH_NO_UNCONFIRMED_PIVOTS",
    });
    expect(SMC_LITE_PROFILE.limitation).toMatch(/NOT_FULL_DISCRETIONARY_SMC/);
    expect(Object.isFrozen(SMC_LITE_PROFILE)).toBe(true);
    expect(Object.isFrozen(SMC_LITE_PROFILE.signals)).toBe(true);

    const pivotParameter = SMC_LITE_DESCRIPTOR.parameters[0]!;
    const pivotVisualization = SMC_LITE_DESCRIPTOR.visualization[0]!;
    expect(Object.isFrozen(SMC_LITE_DESCRIPTOR)).toBe(true);
    expect(Object.isFrozen(SMC_LITE_DESCRIPTOR.parameters)).toBe(true);
    expect(Object.isFrozen(pivotParameter)).toBe(true);
    expect(Object.isFrozen(SMC_LITE_DESCRIPTOR.visualization)).toBe(true);
    expect(Object.isFrozen(pivotVisualization)).toBe(true);
    expect(Object.isFrozen(pivotVisualization.series)).toBe(true);
    expect(Object.isFrozen(pivotVisualization.series[0])).toBe(true);
  });

  it("confirms strict pivot windows only after all right-side candles exist", () => {
    const strategy = createSmcLiteStrategy({ leftWindow: 1, rightWindow: 2 });
    const firstThree = context([
      candle(0, 9, { high: 10, low: 8 }),
      candle(1, 12, { high: 15, low: 10 }),
      candle(2, 11, { high: 13, low: 9 }),
    ]);
    const firstFour = context([
      ...firstThree.candles,
      candle(3, 10, { high: 11, low: 9.5 }),
    ]);

    const unconfirmed = strategy.analyze(firstThree);
    const confirmed = strategy.analyze(firstFour);

    expect(unconfirmed.signal).toBe("HOLD");
    expect(unconfirmed.visualization).toEqual([]);
    expect(confirmed.visualization).toEqual([
      {
        descriptorId: "smc-lite-pivots",
        timestamp: "2026-08-28T00:01:00.000Z",
        values: { swingHigh: 15 },
      },
    ]);
    expect(confirmed.visualization.some((point) => point.timestamp === firstFour.candles.at(-1)!.timestamp)).toBe(
      false,
    );
  });

  it("emits BUY only for a close cross above the latest confirmed swing high", () => {
    const strategy = createSmcLiteStrategy({ leftWindow: 1, rightWindow: 1 });
    const result = strategy.analyze(context([
      candle(0, 9, { high: 10, low: 8 }),
      candle(1, 12, { high: 15, low: 10 }),
      candle(2, 11, { high: 13, low: 9 }),
      candle(3, 16, { high: 17, low: 10 }),
    ]));

    expect(result.signal).toBe("BUY");
    expect(result.visualization.at(-1)).toEqual({
      descriptorId: "smc-lite-bos",
      timestamp: "2026-08-28T00:03:00.000Z",
      values: { level: 15, direction: 1 },
    });
    expect(result.visualization.some((point) => point.descriptorId === "smc-lite-bos")).toBe(true);
    expectFiniteAnalysis(result);
  });

  it("emits SELL only for a close cross below the latest confirmed swing low", () => {
    const strategy = createSmcLiteStrategy({ leftWindow: 1, rightWindow: 1 });
    const result = strategy.analyze(context([
      candle(0, 10, { high: 12, low: 8 }),
      candle(1, 8, { high: 11, low: 5 }),
      candle(2, 9, { high: 10, low: 7 }),
      candle(3, 4, { high: 9, low: 3 }),
    ]));

    expect(result.signal).toBe("SELL");
    expect(result.visualization.at(-1)).toEqual({
      descriptorId: "smc-lite-bos",
      timestamp: "2026-08-28T00:03:00.000Z",
      values: { level: 5, direction: -1 },
    });
    expectFiniteAnalysis(result);
  });

  it("returns HOLD for equality, no cross, and insufficient history", () => {
    const strategy = createSmcLiteStrategy({ leftWindow: 1, rightWindow: 1 });
    const candles = [
      candle(0, 9, { high: 10, low: 8 }),
      candle(1, 12, { high: 15, low: 10 }),
      candle(2, 11, { high: 13, low: 9 }),
    ];

    expect(strategy.analyze(context(candles)).signal).toBe("HOLD");
    expect(strategy.analyze(context([
      ...candles,
      candle(3, 15, { high: 15, low: 10 }),
    ])).signal).toBe("HOLD");
    expect(strategy.analyze(context([
      ...candles,
      candle(3, 14, { high: 15, low: 10 }),
    ])).signal).toBe("HOLD");
  });

  it("does not use the current candle as an unconfirmed pivot or use future candles", () => {
    const strategy = createSmcLiteStrategy({ leftWindow: 1, rightWindow: 2 });
    const candles = [
      candle(0, 9, { high: 10, low: 8 }),
      candle(1, 12, { high: 15, low: 10 }),
      candle(2, 11, { high: 13, low: 9 }),
      candle(3, 10, { high: 11, low: 9.5 }),
      candle(4, 16, { high: 17, low: 10 }),
    ];

    const result = strategy.analyze(context(candles));
    expect(result.signal).toBe("BUY");
    expect(result.visualization.filter((point) => point.descriptorId === "smc-lite-pivots")).not.toContainEqual(
      expect.objectContaining({ timestamp: candles.at(-1)!.timestamp }),
    );
    expect(result.visualization.at(-1)?.descriptorId).toBe("smc-lite-bos");
  });

  it("rejects invalid parameters before a strategy can run", () => {
    for (const parameters of [
      null,
      { leftWindow: 0 },
      { leftWindow: 1.5 },
      { rightWindow: Number.NaN },
      { rightWindow: Number.POSITIVE_INFINITY },
      { rightWindow: 51 },
      { unknown: 1 },
    ]) {
      expect(() => createSmcLiteStrategy(parameters as never)).toThrow("INVALID_STRATEGY_PARAMETERS");
    }
  });

  it("rejects malformed contexts and non-finite or inconsistent OHLCV", () => {
    const strategy = createSmcLiteStrategy({ leftWindow: 1, rightWindow: 1 });
    const valid = context([candle(0, 10), candle(1, 11)]);
    const invalidContexts: unknown[] = [
      null,
      { ...valid, pair: " " },
      { ...valid, timeframe: "" },
      { ...valid, candles: "not-an-array" },
      { ...valid, candles: [{ ...valid.candles[0], isClosed: false }, valid.candles[1]] },
      { ...valid, candles: [{ ...valid.candles[0], close: Number.NaN }, valid.candles[1]] },
      { ...valid, candles: [{ ...valid.candles[0], volume: -1 }, valid.candles[1]] },
      { ...valid, candles: [{ ...valid.candles[0], low: -1 }, valid.candles[1]] },
      { ...valid, candles: [{ ...valid.candles[0], high: 9 }, valid.candles[1]] },
      {
        ...valid,
        candles: [
          valid.candles[0],
          { ...valid.candles[1], timestamp: "2026-02-30T00:01:00.000Z" },
        ],
      },
      {
        ...valid,
        candles: [valid.candles[0], { ...valid.candles[1], timestamp: valid.candles[0]!.timestamp }],
      },
      {
        ...valid,
        candles: [valid.candles[1], { ...valid.candles[0], timestamp: "2026-08-27T23:59:00.000Z" }],
      },
    ];

    for (const invalid of invalidContexts) {
      expect(() => strategy.analyze(invalid as never)).toThrow("INVALID_STRATEGY_CONTEXT");
    }
  });

  it("is deterministic, pure, and finite for repeated analysis", () => {
    const input = context([
      candle(0, 9, { high: 10, low: 8 }),
      candle(1, 12, { high: 15, low: 10 }),
      candle(2, 11, { high: 13, low: 9 }),
      candle(3, 16, { high: 17, low: 10 }),
    ]);
    const before = structuredClone(input);
    const strategy = SMC_LITE_FACTORY.create({ leftWindow: 1, rightWindow: 1 });
    const first = strategy.analyze(input);
    const second = strategy.analyze(input);

    expect(first).toEqual(second);
    expect(input).toEqual(before);
    expectFiniteAnalysis(first);
  });
});
