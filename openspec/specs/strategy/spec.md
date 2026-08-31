# Strategy Capability

## Purpose

Strategy owns pure signal analysis, plugin registration and descriptors, immutable versioned Strategy Definitions, Composite Definitions, and signal-combination policy. Strategy code consumes only supplied context and performs no exchange, persistence, network, rendering, or notification I/O.

## Requirements

### Requirement: Pure extensible strategies

The capability MUST expose a stable Strategy abstraction and registry seam with MA, RSI, Bollinger Bands, and Support/Resistance available for the MVP. A plugin MUST describe its stable name, category, validated serializable parameters, and implementation provenance. Consumers MUST NOT branch on strategy identity.

Traceability: `CSL-R-ST-01`, `CSL-R-AR-01`, `CSL-R-AR-02`, `CSL-R-AR-03`, `CSL-R-DM-01`; ADR-002 and ADR-005.

#### Scenario: Built-in strategy is pure

- **Given** a valid immutable built-in Strategy Definition and the same analysis context
- **When** the strategy is evaluated twice
- **Then** it returns the same signal and performs no infrastructure I/O

#### Scenario: Approved built-in profile is reproducible

- **Given** a separately reviewed, versioned behavior profile and deterministic fixtures for a required built-in
- **When** a valid definition analyzes those fixtures
- **Then** its signals and insufficient-data behavior match that approved profile

### Requirement: Localized addition

Adding a strategy such as MACD MUST be localized to its implementation, descriptor/registration, and tests. It MUST NOT require redesign of Backtesting, Evaluation, Leaderboard, or frontend core behavior.

Traceability: `CSL-R-ST-02`.

#### Scenario: MACD is added locally

- **Given** a conforming MACD plugin and descriptor
- **When** it is registered
- **Then** it can be listed and resolved without changing Backtesting, Evaluation, Leaderboard, or frontend core logic

### Requirement: Composite strategies

The capability MUST compose exact Strategy Definition versions and resolve conflicting `BUY`, `SELL`, and `HOLD` signals through an explicitly recorded policy. `WEIGHTED_VOTE_V1` MUST include only enabled components, map those signals to `+1`, `0`, and `-1`, normalize finite non-negative weights to one, and return BUY at score `>= +0.30`, SELL at `<= -0.30`, otherwise HOLD, including ties. Its enabled state, weights, thresholds, and referenced versions are immutable configuration.

Traceability: `CSL-R-ST-03`, `CSL-R-ST-06`, `CSL-S-01`.

#### Scenario: Composite conflict is resolved

- **Given** component signals that disagree and a valid recorded combination policy
- **When** the composite combines them
- **Then** it returns one deterministic normalized signal according to that policy

#### Scenario: Weighted vote is deterministic

- **Given** enabled MA, RSI, and Support/Resistance components with weights
  `0.40`, `0.30`, and `0.30`
- **When** their normalized signals are combined under `WEIGHTED_VOTE_V1`
- **Then** the configured score and thresholds produce one documented BUY, SELL,
  or HOLD result, with a tie represented as HOLD

### Requirement: Controlled draft authoring

`LLM_AUTHORING_V1` MUST use a provider-neutral application boundary and MAY use a
configured OpenAI-compatible demo adapter. One prompt/URL submission makes at most
one request with a 45-second timeout and produces a structured draft only.
Deterministic schema/domain validation and explicit user Save/Approve MUST precede
new immutable Strategy Definition persistence. No configured provider, timeout,
provider error, or invalid draft may create a persistence side effect.

Traceability: `CSL-R-ST-05`, `CSL-R-RP-02`; ADR-002 and ADR-009.

#### Scenario: LLM draft requires approval

- **Given** a configured provider returns a schema-valid structured draft
- **When** the user has not explicitly saved/approved it
- **Then** no Strategy Definition version exists; after validation and explicit
  approval, exactly one immutable version is created

### Requirement: Deterministic extension plugins

The registry MUST expose documented `SMC_LITE_V1` and `WYCKOFF_LITE_V1` profiles.
SMC Lite uses confirmed pivot-window swings and close-based Break of Structure.
Wyckoff Lite uses fixed range/volume heuristics for accumulation/distribution and
breakout. Neither profile may be represented as a complete professional or
discretionary methodology.

Traceability: `CSL-R-ST-07`; ADR-002.

#### Scenario: Lite plugin stays bounded

- **Given** fixtures for an SMC Lite or Wyckoff Lite profile
- **When** its registered pure strategy analyzes the fixtures
- **Then** it follows its documented deterministic rule without infrastructure I/O

### Requirement: Immutable definitions and provenance

Changing behavior-bearing parameters, components, weights, thresholds, combination method, or implementation provenance MUST create a new definition/version. Historical results MUST continue to identify the exact definition used. Missing historical code or data MUST NOT be silently replaced and described as exact replay.

Traceability: `CSL-R-ST-04`, `CSL-R-RP-01`; ADR-007.

#### Scenario: Definition edit preserves history

- **Given** a definition referenced by a completed experiment
- **When** a behavior-bearing parameter changes
- **Then** a new version is created and the completed experiment still references the prior version

### Requirement: User-owned definitions

Strategy Definitions and Composite Definitions MUST be direct user-owned roots.
Definition commands and repositories MUST use trusted authenticated identity;
Composite components MUST reference same-owner Strategy Definitions. Pure Strategy
analysis and plugin descriptors remain user-agnostic/shared.

Traceability: `CSL-R-OW-01`; ADR-008.

#### Scenario: Definitions are isolated by owner

- **Given** two authenticated users with separate Strategy Definitions
- **When** either user lists or reads definitions
- **Then** only that user's definitions are returned and a guessed cross-user ID is not found
## Approved behavior and invariants

- Strategy analysis MUST be deterministic for the same definition and context.
- Each built-in MUST document and test its own insufficient-data behavior without padding or future-data leakage; the assignment does not prescribe one universal signal or error policy.
- Parameter validation MUST occur before a strategy is resolved or executed.
- A composite MUST contain at least one component and reference immutable definitions.
- Weighted configurations MUST use finite values and a documented normalization/threshold policy.
- The default `WEIGHTED_VOTE_V1` example is MA `0.40`, RSI `0.30`, and
  Support/Resistance `0.30`; a definition records actual values rather than
  relying on a frontend default.
- LLM providers, URL retrieval, and persistence are application/infrastructure
  concerns. Pure strategy implementations never perform them.
- Strategy runtime code MUST remain infrastructure-independent.
- Client-supplied identity MUST NOT authorize definition access. Authenticated cross-user definition reads/mutations return the same not-found outcome as an absent definition.

## Built-in behavior approval rule

The assignment requires the four built-in strategy families but presents concrete
formulas, parameter names, defaults, ranges, thresholds, signal rules, and warm-up
behavior as examples rather than approved MVP requirements. Before implementation,
each built-in MUST receive a separately reviewed, versioned behavior profile that
defines those choices, validation, insufficient-data behavior, and deterministic
fixtures. This specification intentionally does not promote an instructor example
into normative product behavior.

## Executable public API and status

The current executable public surface is [`modules/strategy/api/index.ts`](../../../modules/strategy/api/index.ts). It exposes `listStrategies`, definition operations, `resolveStrategy`, and `combineSignals`, and re-exports current strategy types from the barrel. These operations currently throw `NOT_IMPLEMENTED` and predate the later ownership requirement. C-01A must extend owned definition/application/repository contracts before S-01 begins; pure execution contracts remain frozen.

## Failure expectations

- Unknown strategy names, unavailable implementations, invalid parameters, and invalid composite references fail explicitly.
- A missing historical implementation reports the available traceability guarantee and never falls back silently to the latest plugin.
- A strategy exception is contained by its caller and becomes an observable failed execution; it does not corrupt another experiment.
- Invalid or non-finite composite configuration is rejected before signal combination.
