import { describe, expect, it } from "vitest";
import {
  WYCKOFF_LITE_DESCRIPTOR,
  WYCKOFF_LITE_FACTORY,
  WYCKOFF_LITE_PHASE_CODES,
  WYCKOFF_LITE_PROFILE,
  createWyckoffLiteStrategy,
  wyckoffLiteFactory,
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

function rangeContext(current: ReturnType<typeof candle>) {
  return context([
    candle(0, 100, { open: 100, high: 110, low: 90 }),
    candle(1, 100, { open: 100, high: 110, low: 90 }),
    candle(2, 100, { open: 100, high: 110, low: 90 }),
    current,
  ]);
}

function latestPhaseCode(analysis: ReturnType<ReturnType<typeof createWyckoffLiteStrategy>["analyze"]>) {
  return analysis.visualization.findLast((point) => point.descriptorId === "wyckoff-lite-volume-phase")?.values
    .phaseCode;
}

function expectFiniteAnalysis(analysis: ReturnType<ReturnType<typeof createWyckoffLiteStrategy>["analyze"]>) {
  expect(analysis.signal).toMatch(/^(BUY|SELL|HOLD)$/);
  expect(typeof analysis.signalAt).toBe("string");
  for (const point of analysis.visualization) {
    expect(typeof point.timestamp).toBe("string");
    for (const value of Object.values(point.values)) expect(Number.isFinite(value)).toBe(true);
  }
}

describe("WYCKOFF_LITE_V1 plugin", () => {
  const parameters = {
    rangeWindow: 3,
    volumeWindow: 3,
    compressionRatio: 0.7,
    volumeMultiplier: 1.5,
    breakoutPercent: 0.5,
  };

  it("exposes a truthful Lite descriptor, fixed profile, factory, and frozen metadata", () => {
    expect(WYCKOFF_LITE_FACTORY).toBe(wyckoffLiteFactory);
    expect(WYCKOFF_LITE_DESCRIPTOR).toMatchObject({
      name: "WYCKOFF_LITE_V1",
      displayName: expect.stringContaining("Wyckoff Lite"),
      description: expect.stringMatching(/bounded deterministic Lite/i),
      category: "STRUCTURE",
      implementationVersion: "1.0.0",
      behaviorProfileId: "WYCKOFF_LITE_V1",
      extensionProfileId: "WYCKOFF_LITE_V1",
      parameters: [
        { key: "rangeWindow", defaultValue: 20, minimum: 2, maximum: 200 },
        { key: "volumeWindow", defaultValue: 20, minimum: 2, maximum: 200 },
        { key: "compressionRatio", defaultValue: 0.7, minimum: Number.MIN_VALUE, maximum: 1 },
        { key: "volumeMultiplier", defaultValue: 1.5, minimum: 1, maximum: 10 },
        { key: "breakoutPercent", defaultValue: 0.5, minimum: 0, maximum: 25 },
      ],
      visualization: [
        { id: "wyckoff-lite-range", kind: "ZONE", pane: "PRICE" },
        { id: "wyckoff-lite-volume-phase", kind: "LINE", pane: "INDICATOR" },
      ],
    });
    expect(WYCKOFF_LITE_PROFILE).toMatchObject({
      id: "WYCKOFF_LITE_V1",
      rangeRule: "FIXED_PRIOR_HIGH_LOW_WINDOW_EXCLUDING_CURRENT_CANDLE",
      volumeRule: "FIXED_PRIOR_AVERAGE_VOLUME_WINDOW_EXCLUDING_CURRENT_CANDLE",
      accumulationRule: "COMPRESSED_RANGE_LOWER_HALF_WITH_ABOVE_BASELINE_VOLUME",
      distributionRule: "COMPRESSED_RANGE_UPPER_HALF_WITH_ABOVE_BASELINE_VOLUME",
      breakoutRule: "CLOSE_OUTSIDE_FIXED_RANGE_THRESHOLD_WITH_VOLUME_CONFIRMATION",
      insufficientData: "HOLD_WITHOUT_PADDED_HISTORY",
    });
    expect(WYCKOFF_LITE_PROFILE.limitation).toMatch(/NOT_FULL_DISCRETIONARY_WYCKOFF/);
    expect(WYCKOFF_LITE_PHASE_CODES).toEqual({
      HOLD: 0,
      ACCUMULATION: 1,
      DISTRIBUTION: -1,
      BREAKOUT_UP: 2,
      BREAKOUT_DOWN: -2,
    });

    expect(Object.isFrozen(WYCKOFF_LITE_DESCRIPTOR)).toBe(true);
    expect(Object.isFrozen(WYCKOFF_LITE_DESCRIPTOR.parameters)).toBe(true);
    expect(Object.isFrozen(WYCKOFF_LITE_DESCRIPTOR.parameters[0])).toBe(true);
    expect(Object.isFrozen(WYCKOFF_LITE_DESCRIPTOR.visualization)).toBe(true);
    expect(Object.isFrozen(WYCKOFF_LITE_DESCRIPTOR.visualization[0])).toBe(true);
    expect(Object.isFrozen(WYCKOFF_LITE_DESCRIPTOR.visualization[0]!.series)).toBe(true);
    expect(Object.isFrozen(WYCKOFF_LITE_DESCRIPTOR.visualization[0]!.series[0])).toBe(true);
  });

  it.each([
    [
      "accumulation",
      candle(3, 95, { open: 94, high: 98, low: 93, volume: 20 }),
      "BUY",
      1,
    ],
    [
      "distribution",
      candle(3, 105, { open: 106, high: 107, low: 102, volume: 20 }),
      "SELL",
      -1,
    ],
    [
      "upward breakout",
      candle(3, 112, { open: 110, high: 113, low: 109, volume: 20 }),
      "BUY",
      2,
    ],
    [
      "downward breakout",
      candle(3, 88, { open: 90, high: 91, low: 87, volume: 20 }),
      "SELL",
      -2,
    ],
  ] as const)("distinguishes %s using fixed range/volume heuristics", (_name, current, signal, code) => {
    const result = createWyckoffLiteStrategy(parameters).analyze(rangeContext(current));

    expect(result.signal).toBe(signal);
    expect(latestPhaseCode(result)).toBe(code);
    expect(result.visualization).toHaveLength(2);
    expect(result.visualization[0]).toMatchObject({
      descriptorId: "wyckoff-lite-range",
      values: { rangeHigh: 110, rangeLow: 90 },
    });
    expect(result.visualization[1]).toMatchObject({
      descriptorId: "wyckoff-lite-volume-phase",
      values: { averageVolume: 10, currentVolume: 20, phaseCode: code },
    });
    expectFiniteAnalysis(result);
  });

  it("returns HOLD for midpoint/equality, missing volume confirmation, and flat ranges", () => {
    const strategy = createWyckoffLiteStrategy(parameters);
    const midpoint = strategy.analyze(rangeContext(candle(3, 100, { open: 99, high: 102, low: 98, volume: 20 })));
    const lowVolume = strategy.analyze(rangeContext(candle(3, 95, { open: 94, high: 98, low: 93, volume: 14 })));
    const flatRange = strategy.analyze(context([
      candle(0, 100, { high: 100, low: 100 }),
      candle(1, 100, { high: 100, low: 100 }),
      candle(2, 100, { high: 100, low: 100 }),
      candle(3, 95, { open: 94, high: 98, low: 93, volume: 20 }),
    ]));

    expect(midpoint.signal).toBe("HOLD");
    expect(latestPhaseCode(midpoint)).toBe(0);
    expect(lowVolume.signal).toBe("HOLD");
    expect(latestPhaseCode(lowVolume)).toBe(0);
    expect(flatRange.signal).toBe("HOLD");
    expect(latestPhaseCode(flatRange)).toBe(0);
  });

  it("excludes the current candle from the fixed range and volume baseline", () => {
    const result = createWyckoffLiteStrategy(parameters).analyze(rangeContext(
      candle(3, 112, { open: 110, high: 113, low: 109, volume: 20 }),
    ));
    const rangePoint = result.visualization[0]!;

    expect(rangePoint.values.rangeHigh).toBe(110);
    expect(rangePoint.values.rangeLow).toBe(90);
    expect(rangePoint.values.breakoutUpper).toBeCloseTo(110.55, 10);
    expect(rangePoint.values.breakoutLower).toBeCloseTo(89.55, 10);
    expect(result.visualization[1]!.values.averageVolume).toBe(10);
  });

  it("returns HOLD with no fabricated visualization during warm-up", () => {
    const strategy = createWyckoffLiteStrategy(parameters);
    const result = strategy.analyze(context([
      candle(0, 100, { high: 110, low: 90 }),
      candle(1, 100, { high: 110, low: 90 }),
      candle(2, 100, { high: 110, low: 90 }),
    ]));

    expect(result.signal).toBe("HOLD");
    expect(result.signalAt).toBe("2026-08-28T00:02:00.000Z");
    expect(result.visualization).toEqual([]);
  });

  it("rejects invalid parameters before execution", () => {
    for (const invalid of [
      null,
      { rangeWindow: 1 },
      { rangeWindow: 1.5 },
      { rangeWindow: 201 },
      { volumeWindow: Number.POSITIVE_INFINITY },
      { compressionRatio: 0 },
      { compressionRatio: 1.1 },
      { compressionRatio: Number.NaN },
      { volumeMultiplier: 0.99 },
      { volumeMultiplier: 11 },
      { breakoutPercent: -1 },
      { breakoutPercent: 26 },
      { unknown: 1 },
    ]) {
      expect(() => createWyckoffLiteStrategy(invalid as never)).toThrow("INVALID_STRATEGY_PARAMETERS");
    }
  });

  it("rejects malformed contexts and non-finite or inconsistent OHLCV", () => {
    const strategy = createWyckoffLiteStrategy(parameters);
    const valid = rangeContext(candle(3, 95, { open: 94, high: 98, low: 93, volume: 20 }));
    const invalidContexts: unknown[] = [
      null,
      { ...valid, pair: " " },
      { ...valid, timeframe: "" },
      { ...valid, candles: "not-an-array" },
      { ...valid, candles: [{ ...valid.candles[0], isClosed: false }, ...valid.candles.slice(1)] },
      { ...valid, candles: [{ ...valid.candles[0], close: Number.NaN }, ...valid.candles.slice(1)] },
      { ...valid, candles: [{ ...valid.candles[0], volume: -1 }, ...valid.candles.slice(1)] },
      { ...valid, candles: [{ ...valid.candles[0], low: -1 }, ...valid.candles.slice(1)] },
      { ...valid, candles: [{ ...valid.candles[0], high: 89 }, ...valid.candles.slice(1)] },
      {
        ...valid,
        candles: [
          valid.candles[0],
          { ...valid.candles[1], timestamp: "2026-02-30T00:01:00.000Z" },
          ...valid.candles.slice(2),
        ],
      },
      {
        ...valid,
        candles: [valid.candles[0], { ...valid.candles[1], timestamp: valid.candles[0]!.timestamp }, ...valid.candles.slice(2)],
      },
      {
        ...valid,
        candles: [valid.candles[1], { ...valid.candles[0], timestamp: "2026-08-27T23:59:00.000Z" }, ...valid.candles.slice(2)],
      },
    ];

    for (const invalid of invalidContexts) {
      expect(() => strategy.analyze(invalid as never)).toThrow("INVALID_STRATEGY_CONTEXT");
    }
  });

  it("is deterministic, pure, closed-candle-only, and finite", () => {
    const input = rangeContext(candle(3, 95, { open: 94, high: 98, low: 93, volume: 20 }));
    const before = structuredClone(input);
    const strategy = WYCKOFF_LITE_FACTORY.create(parameters);
    const first = strategy.analyze(input);
    const second = strategy.analyze(input);

    expect(first).toEqual(second);
    expect(input).toEqual(before);
    expect(first.signal).toBe("BUY");
    expectFiniteAnalysis(first);
    expect(first.visualization.every((point) => point.timestamp !== "2026-08-28T00:04:00.000Z")).toBe(true);
  });
});
