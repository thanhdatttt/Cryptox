# ADR-002: Use Plugin and Registry Architecture for Strategies

## Status

Accepted — 2026-08-13

- **Last reviewed:** 2026-08-29
- **Partially superseded for MVP by:** [ADR-007](./ADR_007_practical_reproducibility.md)
- **Related decisions:** [ADR-005](./ADR_005_module_first_structure.md), [ADR-006](./ADR_006_local_backtest_execution.md)

### 2026-08-27 scope clarification

The plugin/registry decision, pure strategy contract, and immutable versioned definitions remain accepted. ADR-007 replaces the MVP requirement for exact implementation hashes, retained executable artifacts, and indefinite artifact availability with practical experiment provenance. A strategy definition must still identify its strategy type, definition version, and normalized parameters. Exact binary replay is promised only when the corresponding data and code artifacts were actually retained.

Boundary clarification: ADR-005 (2026-08-14) records the stable logical-family allocation and Composite validation invariants; the plugin/registry decision remains unchanged.

### 2026-08-29 controlled authoring and deterministic extension profiles

`LLM_AUTHORING_V1` places provider interaction behind a Strategy application
port; it does not place network I/O in a pure Strategy plugin. The configured
OpenAI-compatible demo adapter may make at most one 45-second request per
submission and returns a structured draft only. The application deterministically
validates the schema and domain configuration, then requires explicit user
Save/Approve before allocating a new immutable Strategy Definition version.
Unconfigured or failed authoring has no persistence side effect, and no model/API
key enters a definition, API DTO, commit, or provenance record.

`WEIGHTED_VOTE_V1` is an approved immutable composite method: enabled components
map `BUY`/`HOLD`/`SELL` to `+1`/`0`/`-1`; finite, non-negative weights normalize
to one; score at least `+0.30` is `BUY`, score at most `-0.30` is `SELL`, and all
other scores, including ties, are `HOLD`. Enabled state, weights, thresholds, and
referenced definition versions are behavior-bearing versioned configuration.

`SMC_LITE_V1` and `WYCKOFF_LITE_V1` are deterministic registry plugins, not
claims to discretionary/professional methodology. SMC Lite uses confirmed
pivot-window swing highs/lows and close-based Break of Structure. Wyckoff Lite
uses fixed range/volume accumulation/distribution and breakout heuristics. Their
profiles, parameter validation, and fixtures must be documented before execution.

## Context

The assignment explicitly tests whether a new strategy such as MACD can be added without changing the Backtester, Evaluator, Leaderboard, frontend core, or a chain of identity-based conditionals. Strategy algorithms and parameter schemas are expected to evolve more frequently than the experiment pipeline.

## Decision

- Every strategy implements the pure `Strategy.analyze(StrategyContext)` contract.
- A `StrategyFactory` declares its stable name, category, serializable parameter schema, immutable implementation version/hash, and creation behavior.
- Factories register with `StrategyRegistry` during application/worker bootstrap.
- Strategy and composite configurations are immutable versioned definitions; an edit creates a new ID/version. Every Strategy Definition copies the exact plugin implementation hash.
- Each definition carries a stable logical-family key. `modules/strategy` allocates the next version atomically per family; parameter, implementation provenance, component, weight, threshold, or method changes never reuse a version.
- Composite validation requires at least one component; weighted definitions require finite weights summing to `1` and ordered finite thresholds, while majority-vote definitions normalize unused weights/thresholds.
- Registry/artifact resolution uses `(strategyName, implementationSha256)` and never silently substitutes the latest build; unavailable retained code yields an explicit replay error.
- The same registry and pure strategy runtime are composed into the backend and Backtest Worker.
- Strategies never call PostgreSQL, Redis, Binance, HTTP, or UI code.
- The Composite Strategy consumes only normalized signals and definition weights; it never branches on a strategy's identity or internals.

## Alternatives Considered

1. **Hard-coded `if/else` by strategy name** — rejected because every addition changes multiple existing components.
2. **Store executable strategy logic in the database** — rejected because it complicates validation, security, versioning, testing, and deployment.
3. **One microservice per strategy** — rejected because the runtime/operational cost is disproportionate and does not itself improve the plugin contract.

## Consequences

- Positive: adding MACD is localized to its implementation/factory/bootstrap registration and tests.
- Positive: Backtester, Evaluator, Ranking, and Search consume stable contracts.
- Positive: strategy behavior is deterministic and testable without infrastructure.
- Negative: every plugin must provide accurate parameter validation/metadata.
- Negative: bootstrap registration and worker/backend plugin sets must be checked for consistency.
- Negative: exact replay requires retaining or reproducibly rebuilding old plugin artifacts by hash.

## Evidence

- Add a MACD plugin and verify no modifications to Backtester, Evaluator, Leaderboard, or frontend core.
- Run the same versioned definition in live analysis and backtesting and verify identical signal output for the same context.
- Attempt replay with a missing historical artifact and verify an explicit error instead of fallback to a newer plugin.
- Add an architecture test forbidding infrastructure imports from strategy plugins.
