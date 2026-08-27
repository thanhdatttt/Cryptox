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
- Implement pure strategies, deterministic simulation, independent Evaluation,
  configurable ranking, bounded Random Search, provider-neutral Market Data and
  News, isolated Sentiment, required frontend flows, and the minimum demo.
- Maintain durable execution state in `docs/implementation/` so a fresh Manager can
  resume without conversation context.

## Governance

The complete dependency graph, task packets, approved behavior decisions, mutable
task state, and current checkpoint are owned by:

- `docs/implementation/MVP_PLAN.md`
- `docs/implementation/TASKS.md`
- `docs/implementation/HANDOFF.md`

This OpenSpec change records approval and acceptance scope. It is not a duplicate
task board.

## Non-goals

No authentication, users, ownership, multi-tenancy, generalized risk, advanced or
AI search, AI strategy authoring, mandatory LLM crawling, distributed execution,
microservices, general Event Bus, CQRS, Event Sourcing, or production artifact
repository is introduced.
