# ADR-002: Use a Plugin and Registry architecture for strategies

## Status

Accepted — implemented.

## Context

Strategy algorithms and parameter schemas evolve more often than the backtest, evaluation, ranking, and UI pipelines. Hard-coding strategy names in these consumers would make each addition cross-cut the codebase and make historical replay ambiguous.

## Decision

- A strategy factory supplies a descriptor, parameter validation, creation behavior, and implementation provenance.
- `StrategyRegistry` registers and resolves factories by strategy name and implementation hash.
- Definitions are versioned; a composite consumes normalized signals and never branches on plugin identity.
- Plugins remain pure: no database, queue, exchange, HTTP, or UI access.
- The backend and worker compose the same registry/runtime contract.

The current built-in factories are MA, RSI, Bollinger Bands, Support/Resistance, and Sentiment. MACD is a future extension example, not a currently registered plugin.

## Alternatives considered

1. `if/else` by strategy name — rejected because additions change unrelated pipelines.
2. Store executable logic in the database — rejected because validation, security, testing, and replay become harder.
3. One deployable service per strategy — rejected because deployment boundaries do not improve the plugin contract.

## Consequences

- Adding a plugin is localized to its factory/registration/tests.
- Plugin metadata and backend/worker registration must remain consistent.
- Exact replay depends on retaining or reproducibly resolving the recorded artifact.

## Evidence and verification

- [`modules/strategy/domain/plugins.ts`](../../modules/strategy/domain/plugins.ts) defines `builtInFactories` and `InMemoryStrategyRegistry`.
- [`modules/strategy/domain/contracts.ts`](../../modules/strategy/domain/contracts.ts) defines strategy and registry contracts.
- Verification: add a new test plugin and prove Backtesting, Evaluation, Leaderboard, and frontend core require no identity-specific change.
