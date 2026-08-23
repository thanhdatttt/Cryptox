# Catalog: Built-in Strategy Plugins (`modules/strategy/domain/plugins`)

## 0. Purpose and relationship to `strategy-spec.md`

`strategy-spec.md` defines how the **Strategy Engine, Registry, and Composite**
work — how a plugin is registered, versioned, and executed. It deliberately
does not define what any *specific* plugin computes, because that is a
per-plugin business rule, not an engine rule (`architecture.md` §1.2: adding a
plugin must never require engine changes).

This document is that missing per-plugin layer. It exists so that:

- **Reproducibility** (brief §36) is possible — a `StrategyDefinition` with
  `strategyName = "RSI"` and `parameters = { period: 14, ... }` must always
  produce the same `Signal` for the same candles, and that requires a fixed,
  written formula, not "whatever RSI usually means."
- **Acceptance criteria are testable** — a reviewer/grader can hand-compute
  the expected `BUY | SELL | HOLD` for a fixture candle series and compare.
- **Cross-field validation** that the generic `StrategyParameterDescriptor`
  schema (`minimum`/`maximum`/`options` per field, from
  `component-contracts.md` §3)
  cannot express — e.g. "`fastPeriod` must be less than `slowPeriod`" — is
  documented once per plugin instead of being invented ad hoc.

This catalog does **not** introduce new module boundaries, new tables, or new
public API shapes. Every plugin below is just a concrete implementation of the
existing `Strategy` interface (`strategy-spec.md` §4.2):

```typescript
export interface Strategy {
  readonly name: string;
  readonly category: StrategyCategory;
  analyze(context: StrategyContext): Signal;
}
```

`BUY`, `SELL`, and `HOLD` are calculation outputs only. They are consumed by
the deterministic backtest simulator to calculate hypothetical Trades and
evaluation results. A plugin never places an exchange order, accesses an
exchange account or wallet, transfers funds, or performs live-money trading.
Those capabilities are outside the project scope (`openspec/config.yaml` and
`frontend-spec.md` §1).

## 1. Global rules that apply to every plugin in this catalog

These rules are **engine-level conventions**, restated here so every plugin
below follows them identically instead of each plugin inventing its own
edge-case behavior. If `modules/strategy` is implemented, FR/business rules
1.1–1.3 should also be copied into `strategy-spec.md` §2.2 as a cross-reference
so the rule has one canonical home.

### 1.1 Insufficient-data policy (normative for all plugins)

`StrategyContext.candles` is caller-supplied and caller-sized
(`component-contracts.md` §3: *"most recent N candles, N decided by the
caller, not by the strategy"*). A plugin must never assume it received enough
history for its configured parameters.

**Rule:** if `context.candles.length` is smaller than the plugin's computed
`minimumRequiredCandles` (defined per plugin below, as a function of its own
parameters), `analyze()` returns `HOLD` deterministically. It must never
throw, return `undefined`, or silently compute over a short/padded series.

This keeps `analyze()` pure and total (`strategy-spec.md` §2.2 purity rule) —
a caller can always call it safely regardless of how much history it has
assembled so far (e.g. early candles in a fresh backtest window).

### 1.2 Determinism

Every formula below is a fixed, closed-form calculation over
`context.candles` (and, for `MACD`, over a value derived from the same
series). No plugin in this catalog reads wall-clock time, randomness, or any
field outside `StrategyContext`. This satisfies the reproducibility NFR in
`strategy-spec.md` §2.3.

### 1.3 Crossover detection (shared sub-rule for MA and MACD)

"Crossover" always means comparing the **last two** points of two series, both
computed over the same `context.candles` window:

```
crossUp(a, b)   := a[t-1] <= b[t-1]  AND  a[t] > b[t]
crossDown(a, b) := a[t-1] >= b[t-1]  AND  a[t] < b[t]
```

where `t` is the index of the last candle in `context.candles` and `t-1` is
the second-to-last. This requires the underlying series to have at least 2
valid values *after* their own warmup — see each plugin's
`minimumRequiredCandles`.

### 1.4 Category → parameter schema consistency

Every plugin's `descriptor.parameters` must satisfy
`StrategyParameterDescriptor` (`component-contracts.md` §3) exactly — `type`,
`required`, `defaultValue`, and `minimum`/`maximum`/`options` as applicable.
Any **cross-field** constraint (e.g. `fastPeriod < slowPeriod`) is *not*
expressible in that schema and must be validated explicitly inside the
plugin's own parameter-construction path, returning the existing
`400 VALIDATION_ERROR` (`strategy-spec.md` §3.7) — it is not a new error code.

---

## 2. MA — Moving Average Crossover

| Field | Value |
|---|---|
| `name` | `"MA"` |
| `category` | `"TREND"` |

### 2.1 Parameters

| Key | Type | Required | Default | Min | Max |
|---|---|---|---|---|---|
| `fastPeriod` | `INTEGER` | yes | `20` | `2` | `200` |
| `slowPeriod` | `INTEGER` | yes | `50` | `3` | `400` |
| `maType` | `ENUM` (`"SMA" \| "EMA"`) | yes | `"SMA"` | — | — |

**Cross-field rule:** `fastPeriod < slowPeriod` is required at
`defineStrategy` time (see §1.4); `fastPeriod == slowPeriod` or
`fastPeriod > slowPeriod` is rejected with `400 VALIDATION_ERROR`.

### 2.2 Formula

```
fastSeries = movingAverage(closes, fastPeriod, maType)
slowSeries = movingAverage(closes, slowPeriod, maType)
```

- `SMA(closes, n)[i] = average(closes[i-n+1 .. i])`
- `EMA(closes, n)[i] = close[i] * k + EMA[i-1] * (1 - k)`, where
  `k = 2 / (n + 1)`; the EMA is seeded with `SMA(closes, n)` at its first
  valid index (standard seeding, not a 0-seeded EMA).

### 2.3 Signal rule

```
if crossUp(fastSeries, slowSeries):   BUY   (golden cross)
elif crossDown(fastSeries, slowSeries): SELL (death cross)
else:                                   HOLD
```

### 2.4 `minimumRequiredCandles`

`slowPeriod + 1` (one extra candle so the slow series itself has a `t-1` and
`t` point to compare).

---

## 3. RSI — Relative Strength Index

| Field | Value |
|---|---|
| `name` | `"RSI"` |
| `category` | `"MOMENTUM"` |

### 3.1 Parameters

| Key | Type | Required | Default | Min | Max |
|---|---|---|---|---|---|
| `period` | `INTEGER` | yes | `14` | `2` | `100` |
| `buyThreshold` | `NUMBER` | yes | `30` | `0` | `100` |
| `sellThreshold` | `NUMBER` | yes | `70` | `0` | `100` |

**Cross-field rule:** `buyThreshold < sellThreshold` is required at
`defineStrategy` time.

### 3.2 Formula (Wilder's smoothing — the canonical RSI method)

```
change[i]   = close[i] - close[i-1]
gain[i]     = max(change[i], 0)
loss[i]     = max(-change[i], 0)

avgGain[period] = average(gain[1..period])       // simple average, seed
avgLoss[period] = average(loss[1..period])       // simple average, seed

avgGain[i] = (avgGain[i-1] * (period - 1) + gain[i]) / period   // i > period
avgLoss[i] = (avgLoss[i-1] * (period - 1) + loss[i]) / period   // i > period

RS  = avgGain[i] / avgLoss[i]
RSI = 100 - (100 / (1 + RS))
```

**Edge case:** if `avgLoss[i] == 0` and `avgGain[i] > 0`, `RSI = 100`
(no division by zero — this is the standard convention, not a plugin-invented
special case). If both are `0` (flat price), `RSI = 50` (neutral).

### 3.3 Signal rule

```
if RSI < buyThreshold:   BUY   (oversold)
elif RSI > sellThreshold: SELL (overbought)
else:                      HOLD
```

### 3.4 `minimumRequiredCandles`

`period + 1` (need `period` price changes, which requires `period + 1`
closes).

---

## 4. BOLLINGER — Bollinger Bands

| Field | Value |
|---|---|
| `name` | `"BOLLINGER"` |
| `category` | `"VOLATILITY"` |

### 4.1 Parameters

| Key | Type | Required | Default | Min | Max |
|---|---|---|---|---|---|
| `period` | `INTEGER` | yes | `20` | `2` | `200` |
| `stdDevMultiplier` | `NUMBER` | yes | `2` | `0.1` | `5` |

No cross-field constraint for this plugin.

### 4.2 Formula

```
middleBand[i] = SMA(closes, period)[i]
stdDev[i]     = populationStdDev(closes[i-period+1 .. i])
upperBand[i]  = middleBand[i] + stdDevMultiplier * stdDev[i]
lowerBand[i]  = middleBand[i] - stdDevMultiplier * stdDev[i]
```

`populationStdDev` (not sample stdDev) is used, for consistency with the
Sharpe Ratio convention already fixed in `evaluation-spec.md` §2.2.

### 4.3 Signal rule

Evaluated only at the last candle `t`:

```
if close[t] < lowerBand[t]:  BUY   (price outside lower band — potential reversal up)
elif close[t] > upperBand[t]: SELL (price outside upper band — potential reversal down)
else:                          HOLD
```

### 4.4 `minimumRequiredCandles`

`period` (the band values themselves need no crossover/lookback — only the
current candle's band is evaluated).

---

## 5. SR — Support / Resistance

| Field | Value |
|---|---|
| `name` | `"SR"` |
| `category` | `"STRUCTURE"` |

### 5.1 Parameters

| Key | Type | Required | Default | Min | Max |
|---|---|---|---|---|---|
| `lookbackPeriod` | `INTEGER` | yes | `50` | `10` | `500` |
| `swingWindow` | `INTEGER` | yes | `2` | `1` | `10` |
| `minTouches` | `INTEGER` | yes | `2` | `1` | `10` |
| `proximityPercent` | `NUMBER` | yes | `0.5` | `0.01` | `5` |

No cross-field constraint for this plugin.

### 5.2 Formula

**Step 1 — Swing point detection (fractal method).** Let `t` be the current
(last) candle. Use the `lookbackPeriod` completed candles immediately before
it, `[t-lookbackPeriod .. t-1]`, as the level-formation window. Within that
window, candle `i` is a **swing high** if
`high[i] > high[i-swingWindow .. i-1]` and `high[i] > high[i+1 .. i+swingWindow]`
(strictly greater than every candle within `swingWindow` on both sides).
Symmetrically, candle `i` is a **swing low** if `low[i]` is strictly less than
every neighboring `low` within `swingWindow` on both sides. A swing point
needs `swingWindow` candles on each side **inside the formation window**, so
the first and last `swingWindow` candles in that window are ineligible.

**Step 2 — Level clustering.** Cluster swing highs and swing lows separately
with this deterministic procedure:

1. Sort the points by `(price ASC, timestamp ASC)`.
2. Start the first cluster at the first point. Its first (lowest-price) point
   is its fixed anchor.
3. Add each following point while
   `abs(point.price - anchor.price) / anchor.price * 100 <= proximityPercent`;
   otherwise start a new cluster with that point as its anchor.
4. Use the arithmetic mean of all prices in a cluster as its level.

A zone qualifies as a valid level only if it contains at least `minTouches`
distinct swing points. This fixed sort/anchor rule avoids order-dependent or
transitive clustering results.

**Step 3 — Proximity check.** At the last candle `t`:

```
nearestSupport    = closest qualified support level <= close[t]
nearestResistance = closest qualified resistance level >= close[t]

isNearSupport(level)    := abs(close[t] - level) / level * 100 <= proximityPercent
isNearResistance(level) := abs(close[t] - level) / level * 100 <= proximityPercent
```

If two eligible levels are equally close, choose the lower support or the
higher resistance. Levels on the wrong side of the current close are not
eligible for that role.

### 5.3 Signal rule

```
if nearestSupport exists AND isNearSupport(nearestSupport)
   AND close[t] > close[t-1]:                       BUY   (bounce off support)
elif nearestResistance exists AND isNearResistance(nearestResistance)
   AND close[t] < close[t-1]:                        SELL  (rejection at resistance)
else:                                                 HOLD
```

The `close[t] > close[t-1]` / `close[t] < close[t-1]` condition avoids
signaling on mere proximity — it requires the immediately preceding candle to
show a reaction *away* from the level, not just closeness to it.

### 5.4 `minimumRequiredCandles`

`lookbackPeriod + 1` (the completed level-formation window plus the current
candle `t`; `close[t-1]` is already the last candle in that window). The
effective number of *usable* swing points is reduced by `swingWindow` at each
edge — this is normal and simply yields fewer/no qualified levels, not an
error.

**No qualified level found:** if clustering produces zero levels with
`>= minTouches`, both `nearestSupport` and `nearestResistance` are absent and
the plugin returns `HOLD` — this is a normal outcome of §5.3, not a separate
error path.

---

## 6. MACD — Moving Average Convergence Divergence

| Field | Value |
|---|---|
| `name` | `"MACD"` |
| `category` | `"TREND"` |

### 6.1 Parameters

| Key | Type | Required | Default | Min | Max |
|---|---|---|---|---|---|
| `fastPeriod` | `INTEGER` | yes | `12` | `2` | `200` |
| `slowPeriod` | `INTEGER` | yes | `26` | `3` | `400` |
| `signalPeriod` | `INTEGER` | yes | `9` | `2` | `100` |

**Cross-field rule:** `fastPeriod < slowPeriod` is required at
`defineStrategy` time, same as MA (§2.1).

### 6.2 Formula

```
fastEMA   = EMA(closes, fastPeriod)          // seeded per §2.2
slowEMA   = EMA(closes, slowPeriod)          // seeded per §2.2
macdLine  = fastEMA - slowEMA                 // element-wise, aligned indices
signalLine = EMA(macdLine, signalPeriod)      // EMA applied to the MACD series itself
histogram  = macdLine - signalLine
```

### 6.3 Signal rule

Uses the same crossover rule as §1.3, applied to `macdLine` vs `signalLine`:

```
if crossUp(macdLine, signalLine):   BUY
elif crossDown(macdLine, signalLine): SELL
else:                                  HOLD
```

### 6.4 `minimumRequiredCandles`

`slowPeriod + signalPeriod` — the slow EMA's first value is produced by the
first `slowPeriod` candles. Counting that value as the first MACD point, the
signal-line EMA is seeded after `signalPeriod` MACD points; one additional
candle then provides the second valid signal-line value needed for the
`t-1`/`t` crossover check.

---

## 7. What is intentionally out of scope here

| Item | Where it actually belongs |
|---|---|
| `INFORMATION`-category `NewsSentimentStrategy` | `sentiment-specs.md` §3.6 — it reads `context.sentiment` instead of `context.indicators`; no OHLCV formula applies. |
| Where `context.indicators` values (e.g. precomputed `"MA20"`) come from | `strategy-spec.md` §4.2 — an Indicator layer computes them once per context so multiple plugins sharing an indicator don't recompute it; this catalog's formulas are the authoritative definition of *what* that layer must compute for each named indicator. |
| Composite combination (`MAJORITY_VOTE` / `WEIGHTED_SCORE`) of these plugins' signals | `strategy-spec.md` §2.2 — this catalog only defines each plugin in isolation. |
| `implementationVersion` / `implementationSha256` values for each plugin build | `component-contracts.md` §3 (`StrategyPluginDescriptor`) — assigned at build/release time, not fixed by this catalog. |
| Adding a 6th built-in plugin (e.g. Stochastic, ATR, SMC, Wyckoff) | Follow this same document's format: category, parameters table, formula, signal rule, `minimumRequiredCandles`. No engine change required (`architecture.md` §1.2). |

## 8. Acceptance criteria (per plugin)

- [ ] For each plugin, a fixture candle series + parameter set exists with a
  hand-computed expected `Signal`, and `analyze()` returns exactly that value.
- [ ] For each plugin, calling `analyze()` with `candles.length < minimumRequiredCandles`
  returns `HOLD` and does not throw.
- [ ] A strategy/plugin test verifies that `analyze()` performs no exchange,
  broker, wallet, fund-transfer, or order-placement I/O; `BUY` and `SELL`
  remain simulated signal values only.
- [ ] For MA and MACD, a fixture exists that produces `BUY` via `crossUp` and
  another that produces `SELL` via `crossDown`, using the shared crossover
  rule in §1.3.
- [ ] For MA and MACD, `defineStrategy` with `fastPeriod >= slowPeriod` is
  rejected with `400 VALIDATION_ERROR` before any row is written
  (`strategy-spec.md` §3.7 pattern).
- [ ] For RSI, a fixture with `avgLoss = 0` returns `RSI = 100` without a
  division-by-zero error.
- [ ] For BOLLINGER, `populationStdDev` (not sample stdDev) is verified
  against a fixture with a known variance.
- [ ] For SR, a fixture with no qualifying level (all clusters below
  `minTouches`) returns `HOLD` rather than an error.
- [ ] Every plugin's `analyze()` is verified to be pure (no I/O observed
  during the call), matching `strategy-spec.md`'s Resolution & execution
  acceptance criteria.
