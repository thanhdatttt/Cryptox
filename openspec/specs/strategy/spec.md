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
- Parameter validation MUST occur before a strategy is resolved or executed.
- A composite MUST contain at least one component and reference immutable definitions.
- Weighted configurations MUST use finite values and a documented normalization/threshold policy.
- Strategy runtime code MUST remain infrastructure-independent.

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
