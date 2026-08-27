# Restructure Cryptox as a Module-First Layered Modular Monolith

## Why

The current target structure names backend capabilities under `services/`, but it mixes several different concepts: bounded contexts, pure domain algorithms, orchestration components, and the asynchronous backtesting process boundary. The design documents already describe a synchronous Modular Monolith, but the target tree does not make module ownership, layer direction, or public module boundaries explicit.

The repository is still documentation-first, so this is the right point to establish the structure before implementation creates import and ownership drift.

## What changes

- Add a `modules/` namespace for business modules while keeping `apps/`, `packages/`, `infra/`, `docs/`, and `openspec/` at repository root.
- Define four logical layers inside each module: `api`, `application`, `domain`, and `infrastructure`.
- Merge `strategy-engine` and `composite-strategy` into `modules/strategy`.
- Merge `search-engine` and `continuous-loop` into `modules/search`.
- Keep `market-data`, `backtesting`, `evaluation`, `leaderboard`, `news`, and `sentiment` as separate modules.
- Make `apps/backend` and `apps/backtest-worker` composition roots rather than business-logic containers.
- Restrict `packages/contracts` to transport/shared protocol contracts; make `packages/contracts/queue` the canonical serialized Backtest wire schema and keep the BullMQ queue client/adapter under `modules/backtesting/infrastructure/queue`.
- Make `modules/backtesting` the owner of Candidate lifecycle/persistence and Candidate projections; keep Search responsible for Search Run orchestration only.
- Make `modules/news` own NewsItem persistence and `modules/sentiment` own SentimentResult/snapshot persistence, with neutral `SentimentInput` and `StrategyCandle` boundary contracts.
- Allow deployable apps to compose modules only through allowlisted runtime/bootstrap facades.
- Document module public APIs, dependency direction, ownership, and architecture-test expectations.
- Keep Search behind Backtesting Candidate facades for summaries, submission, and cancellation; keep queue wire payloads self-contained/versioned and independent from in-process API types.
- Make strategy/composite family-version allocation, sentiment snapshot alignment, Search error terminalization, and completion/Leaderboard transaction scope explicit before implementation.

## Scope

This change covers the target structure, boundary rules, contract ownership, documentation, OpenSpec context, and a staged migration plan. It does not implement the modules or change runtime behavior.

## Non-goals

- No new product feature.
- No General Event Bus.
- No change to REST, market-only WebSocket, BullMQ, retry, fencing, or reconciliation semantics.
- No database schema or migration change in this planning change.
- No implementation of the planned applications or modules.

## Expected outcome

The architecture clearly separates business modules from deployable processes, shared protocols, and operational infrastructure. A future implementation can enforce that modules communicate through public application APIs and that domain code remains free from infrastructure dependencies.
