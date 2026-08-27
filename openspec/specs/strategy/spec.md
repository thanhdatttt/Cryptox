# Strategy Capability

## Purpose and boundary

Strategy owns pure signal analysis, plugin registration and descriptors, immutable versioned Strategy Definitions, Composite Definitions, and signal-combination policy. Strategy code consumes only supplied context and performs no exchange, persistence, network, rendering, or notification I/O.

## Requirements

### Requirement: Pure extensible strategies

The capability MUST expose a stable Strategy abstraction and registry seam with MA, RSI, Bollinger Bands, and Support/Resistance available for the MVP. A plugin MUST describe its stable name, category, validated serializable parameters, and implementation provenance. Consumers MUST NOT branch on strategy identity.

Traceability: `CSL-R-ST-01`, `CSL-R-AR-01`; ADR-002 and ADR-005.

### Requirement: Localized addition

Adding a strategy such as MACD MUST be localized to its implementation, descriptor/registration, and tests. It MUST NOT require redesign of Backtesting, Evaluation, Leaderboard, or frontend core behavior.

Traceability: `CSL-R-ST-02`.

### Requirement: Composite strategies

The capability MUST compose exact Strategy Definition versions and resolve conflicting `BUY`, `SELL`, and `HOLD` signals through an explicitly recorded policy. Majority vote or finite weighted scoring are suggested policies; whichever is selected MUST validate and normalize its configuration.

Traceability: `CSL-R-ST-03`, `CSL-S-01`.

### Requirement: Immutable definitions and provenance

Changing behavior-bearing parameters, components, weights, thresholds, combination method, or implementation provenance MUST create a new definition/version. Historical results MUST continue to identify the exact definition used. Missing historical code or data MUST NOT be silently replaced and described as exact replay.

Traceability: `CSL-R-ST-04`, `CSL-R-RP-01`; ADR-007.

## Approved behavior and invariants

- Strategy analysis MUST be deterministic for the same definition and context.
- If fewer than a built-in's required candles are supplied, analysis MUST return `HOLD` without padding, throwing, or using future data.
- Parameter validation MUST occur before a strategy is resolved or executed.
- A composite MUST contain at least one component and reference immutable definitions.
- Weighted configurations MUST use finite values and a documented normalization/threshold policy.
- Strategy runtime code MUST remain infrastructure-independent.

## MVP built-in behavior

The four required built-ins use the following deterministic profiles. Parameter
ranges are validation limits, not search-space requirements.

| Built-in | Parameters (default; allowed range) | Signal and minimum history |
|---|---|---|
| Moving Average (`MA`) | `fastPeriod` (20; 2–200), `slowPeriod` (50; 3–400), `maType` (`SMA`; `SMA` or `EMA`); require `fastPeriod < slowPeriod` | `BUY` when fast crosses above slow, `SELL` when it crosses below, otherwise `HOLD`; minimum `slowPeriod + 1` candles. |
| RSI | `period` (14; 2–100), `buyThreshold` (30; 0–100), `sellThreshold` (70; 0–100); require buy threshold below sell threshold | Wilder-smoothed RSI below buy threshold is `BUY`, above sell threshold is `SELL`, otherwise `HOLD`; minimum `period + 1` candles. |
| Bollinger Bands (`BOLLINGER`) | `period` (20; 2–200), `stdDevMultiplier` (2; 0.1–5) | Close below the lower population-standard-deviation band is `BUY`, above the upper band is `SELL`, otherwise `HOLD`; minimum `period` candles. |
| Support/Resistance (`SR`) | `lookbackPeriod` (50; 10–500), `swingWindow` (2; 1–10), `minTouches` (2; 1–10), `proximityPercent` (0.5; 0.01–5) | A confirmed reaction upward near qualified support is `BUY`; a confirmed reaction downward near qualified resistance is `SELL`; otherwise `HOLD`; minimum `lookbackPeriod + 1` candles. |

Moving-average crossover compares the final two valid points: cross-up means the
fast series was at or below the slow series and is now above it; cross-down is the
inverse. SMA is the period mean. EMA uses `2 / (period + 1)` and is seeded with the
first valid SMA.

RSI uses Wilder smoothing. If average loss is zero and gain is positive, RSI is
`100`; if both are zero, RSI is `50`. Bollinger Bands use the period SMA plus or
minus `stdDevMultiplier` times population standard deviation.

Support/Resistance detects swing highs/lows inside the completed lookback window,
requiring `swingWindow` neighbors on each side. Points are sorted by price then
timestamp and clustered against a fixed first-point anchor within
`proximityPercent`; a level is the cluster mean and requires `minTouches`. The
nearest level on the correct side of current close qualifies only within the same
proximity. A `BUY` additionally requires current close above prior close; `SELL`
requires it below. No qualified level yields `HOLD`.

## Executable public API and status

The current executable public surface is [`modules/strategy/api/index.ts`](../../../modules/strategy/api/index.ts). It exposes `listStrategies`, `resolveStrategy`, and `combineSignals`, and re-exports current strategy types from the barrel. These operations currently throw `NOT_IMPLEMENTED`; their exact TypeScript definitions remain source-owned and are not copied here.

## Failure expectations

- Unknown strategy names, unavailable implementations, invalid parameters, and invalid composite references fail explicitly.
- A missing historical implementation reports the available traceability guarantee and never falls back silently to the latest plugin.
- A strategy exception is contained by its caller and becomes an observable failed execution; it does not corrupt another experiment.
- Invalid or non-finite composite configuration is rejected before signal combination.

## Acceptance scenarios

#### Scenario: Built-in strategy is pure

- **Given** a valid immutable built-in Strategy Definition and the same analysis context
- **When** the strategy is evaluated twice
- **Then** it returns the same signal and performs no infrastructure I/O

#### Scenario: Built-in formula fixtures are reproducible

- **Given** hand-calculated candle fixtures for MA, RSI, Bollinger, and Support/Resistance
- **When** each valid built-in definition analyzes its fixture
- **Then** its signal matches the documented formula, and insufficient history returns `HOLD`

#### Scenario: MACD is added locally

- **Given** a conforming MACD plugin and descriptor
- **When** it is registered
- **Then** it can be listed and resolved without changing Backtesting, Evaluation, Leaderboard, or frontend core logic

#### Scenario: Composite conflict is resolved

- **Given** component signals that disagree and a valid recorded combination policy
- **When** the composite combines them
- **Then** it returns one deterministic normalized signal according to that policy

#### Scenario: Definition edit preserves history

- **Given** a definition referenced by a completed experiment
- **When** a behavior-bearing parameter changes
- **Then** a new version is created and the completed experiment still references the prior version
