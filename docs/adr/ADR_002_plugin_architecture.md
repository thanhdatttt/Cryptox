# ADR-002: Use Plugin and Registry Architecture for Strategies

## Status

Accepted — 2026-08-13

## Context

The assignment explicitly tests whether a new strategy such as MACD can be added without changing the Backtester, Evaluator, Leaderboard, frontend core, or a chain of identity-based conditionals. Strategy algorithms and parameter schemas are expected to evolve more frequently than the experiment pipeline.

## Decision

- Every strategy implements the pure `Strategy.analyze(StrategyContext)` contract.
- A `StrategyFactory` declares its stable name, category, serializable parameter schema, immutable implementation version/hash, and creation behavior.
- Factories register with `StrategyRegistry` during application/worker bootstrap.
- Strategy and composite configurations are immutable versioned definitions; an edit creates a new ID/version. Every Strategy Definition copies the exact plugin implementation hash.
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
