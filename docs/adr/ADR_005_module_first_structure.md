# ADR-005: Module-First Layered Project Structure

- **Status:** Accepted
- **Date:** 2026-08-14
- **Decision owners:** Cryptox team
- **Relationship:** Amends the boundary/ownership context of ADR-003 and ADR-004 and records the implementation-boundary clarification for ADR-002; it does not supersede the underlying plugin, BullMQ-only, or internal News/Sentiment isolation decisions.

## Context

Cryptox is designed as a synchronous Modular Monolith with a dedicated asynchronous Backtest Worker Pool. The previous target layout grouped code under `services/`, but that name blurred several different concepts:

- business bounded contexts such as Market Data, Strategy, Search, and Leaderboard;
- deployable process composition such as the backend and backtest worker;
- reusable transport contracts and technical libraries; and
- infrastructure/operations such as PostgreSQL migrations and Docker setup.

The previous layout also split closely related capabilities into `strategy-engine`/`composite-strategy` and `search-engine`/`continuous-loop`, even though their boundaries are clearer when treated as cohesive business modules. This is an architecture/documentation decision only; the repository currently contains design and OpenSpec documents rather than an implementation to migrate.

## Decision

Use a module-first structure with a `modules/` namespace:

```text
modules/
├── market-data/
├── strategy/       # strategy-engine + composite-strategy
├── search/         # search-engine + continuous-loop
├── backtesting/
├── evaluation/
├── leaderboard/
├── news/           # news-ingestion
└── sentiment/
```

Each module may contain these logical layers when needed:

```text
api → application → domain

infrastructure → implements application ports
```

- `api` contains thin inbound adapters and the public module facade/contracts.
- `application` contains use cases, orchestration, transactions, and ports.
- `domain` contains entities, value objects, policies, invariants, plugins, and pure calculations.
- `infrastructure` contains concrete repositories and external-system adapters.

The layers are logical responsibilities, not a requirement to create empty directories. A module's public API is the boundary: consumers may call it, but may not deep-import another module's `domain` or `infrastructure`.

Keep the surrounding repository responsibilities separate:

- `apps/` contains deployable composition roots. `apps/backend` composes the backend modules; `apps/backtest-worker` composes the Backtesting worker side; neither owns business use cases.
- `packages/` contains reusable transport/shared protocol contracts and technical libraries without business ownership. `packages/contracts` is limited to REST, market WebSocket, and queue boundary shapes.
- `infra/` contains Docker, PostgreSQL migrations/seeds, deployment, and operational configuration.
- `docs/` and `openspec/` remain the architecture and behavior planning sources of truth.

The Backtest queue adapter belongs to `modules/backtesting/infrastructure/queue`, because BullMQ is a Backtesting-specific asynchronous boundary. The MVP `ExperimentResult` aggregate and Completion Processor remain in `modules/backtesting`; Evaluation and Leaderboard expose the policies used by completion processing. A future extraction of an `experiment` module requires a separate decision based on real growth or ownership pressure.

The Backtesting module also owns Candidate lifecycle, persistence, and the `CandidateProgress` projection; Search owns only Search Run/generator/slot orchestration. News owns `NewsItem` persistence, while Sentiment owns `SentimentResult` and sentiment snapshot persistence. Cross-module inputs use neutral contracts such as `StrategyCandle` and `SentimentInput`.

Each module exposes an allowlisted runtime facade and, when needed by a deployable process, an allowlisted `api/bootstrap` composition facade. Apps may import these facades and canonical transport contracts, but never another module's infrastructure or domain internals directly. `packages/contracts/queue` is the canonical serialized Backtest wire schema; the Backtesting infrastructure adapter maps it to and from BullMQ.

## Alternatives considered

### Keep a flat `services/` directory

Rejected. It makes the name look like a deployable service boundary and does not communicate the layer rules or the fact that the core is one process.

### Put modules directly at repository root

Rejected for this repository. It keeps business modules visible, but makes them visually compete with `apps/`, `packages/`, `infra/`, `docs/`, and OpenSpec metadata. `modules/` is a low-cost namespace that keeps the root readable without adding a runtime boundary.

### Organize by technical layer first

Rejected. Top-level `api/`, `application/`, `domain/`, and `infrastructure/` folders would scatter one business capability across the repository and make module ownership harder to review.

### Create one deployable process per module

Rejected. That would move Cryptox toward microservices, introduce unnecessary network/event consistency concerns, and conflict with the selected synchronous Modular Monolith architecture. Only the Backtest Worker Pool is a separate process boundary.

## Consequences

### Positive

- Business ownership is visible from the first directory under `modules/`.
- Strategy and Search boundaries match their actual cohesive responsibilities.
- Layer rules make dependency direction and test seams explicit inside each module.
- Deployables, reusable packages, and operations cannot be mistaken for business modules.
- The structure preserves synchronous in-process collaboration and the focused BullMQ boundary.

### Negative / trade-offs

- Some existing design terminology must be updated from service names to module names.
- Public entrypoints and architecture tests will be needed when implementation begins; folder naming alone is not sufficient enforcement.
- Shared-looking domain types may need small transport projections instead of being placed in one global contract package.
- A single PostgreSQL database still contains tables owned by multiple modules, so schema ownership must be documented and migration discipline must be maintained.

## Scope and non-goals

This ADR changes the planned documentation and implementation structure. It does not change REST routes, the market-only WebSocket, BullMQ semantics, retry/fencing/reconciliation rules, PostgreSQL schema, deployment topology, or runtime behavior. Implementation migration is intentionally a later change.

## Evidence and acceptance criteria

- The ownership matrix, component contracts, data model, data flow, README, OpenSpec config, and active change artifacts use the same `modules/` ownership language.
- Candidate lifecycle is owned by Backtesting; Search consumes the public Candidate projection.
- News and Sentiment persistence ownership is separate and explicit.
- Queue wire contracts have one canonical location under `packages/contracts/queue`.
- Search consumes Backtesting Candidate summaries/submission/cancellation facades and never accesses Candidate persistence directly; queue wire types are self-contained and versioned.
- Strategy/Composite version allocation, sentiment snapshot as-of alignment, Search `ERROR` terminalization, and the Completion Processor unit-of-work boundary are explicit in the active contracts.
- Deployable composition uses allowlisted module bootstrap facades rather than direct infrastructure/domain imports.
- A future implementation must add architecture tests for these import rules and contract tests for Backend/Worker queue compatibility before this ADR is treated as implementation-verified.
