# Crypto Strategy Lab MVP Implementation

## Why

The reconciled repository now has approved structural boundaries but not working
MVP capabilities. The instructor-required flow from normalized market data through
Strategy, Backtesting, Evaluation, Leaderboard, visualization, News, and Sentiment
must be implemented through one traceable, dependency-aware program.

## What changes

- Implement every REQUIRED requirement in `docs/requirements.md` through the
  approved synchronous modular-monolith boundaries.
- Stabilize shared executable and transport contracts before capability fan-out.
- Add only the approved MVP persistence entities from `docs/data-model.md`.
- Add simple local email/password Authentication with PostgreSQL-backed opaque
  sessions and enforce per-user ownership for private Strategy, Search,
  Backtesting, and Leaderboard resources.
- Implement pure strategies, deterministic simulation, independent Evaluation,
  configurable ranking, bounded deterministic Random/Domain-guided/Genetic
  discovery, provider-neutral Market Data and News, isolated Sentiment, required
  frontend flows, and the minimum demo.
- Implement only the approved academic functional-extension profiles: ephemeral
  market observability; controlled LLM Strategy drafts and safe URL import;
  versioned extraction templates with human-approved refinement; weighted voting
  and deterministic Lite SMC/Wyckoff plugins; and synthetic Long/Short paper
  backtesting with documented OHLC SL/TP, fee, slippage, decimal accounting, and
  provenance.
- Maintain durable execution state in `docs/implementation/` so a fresh Manager can
  resume without conversation context.
- Prove final/demo operation with real Binance historical/realtime data, a real
  configured News source, real PostgreSQL application/Auth state, and
  application-generated Backtest/Leaderboard results while retaining deterministic
  fixtures for development and testing.

## Governance

The complete dependency graph, task packets, approved behavior decisions, mutable
task state, and current checkpoint are owned by:

- `docs/implementation/MVP_PLAN.md`
- `docs/implementation/TASKS.md`
- `docs/implementation/HANDOFF.md`

This OpenSpec change records approval and acceptance scope. It is not a duplicate
task board.

## Non-goals

No RBAC, organization/team or tenant hierarchy, OAuth/SSO, 2FA, external identity
provider, password-reset system, enterprise IAM, live exchange orders, leverage,
margin, funding, liquidation, portfolio/risk optimization, autonomous LLM actions,
unconfigured LLM providers, arbitrary user URL fetching, automatic template
promotion, full discretionary SMC/Wyckoff, unbounded or ML/agent-based search,
distributed execution, microservices, general Event Bus, CQRS, Event Sourcing, or
production artifact repository is introduced.
