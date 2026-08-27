# Design: Module-First Layered Structure

## 1. Target repository layout

```text
cryptox/
├── modules/
│   ├── market-data/
│   ├── strategy/
│   ├── search/
│   ├── backtesting/
│   ├── evaluation/
│   ├── leaderboard/
│   ├── news/
│   └── sentiment/
│
├── apps/
│   ├── backend/
│   ├── backtest-worker/
│   └── frontend/
│
├── packages/
│   └── contracts/
│       ├── rest/
│       ├── websocket/
│       └── queue/
│
├── infra/
│   ├── docker-compose.yml
│   └── db/migrations/
│
├── docs/
└── openspec/
```

`modules/` is an organizational namespace, not a process boundary. The modules are composed together inside `apps/backend`; only backtesting has a second process in `apps/backtest-worker`.

## 2. Layer responsibilities

Every module may contain the following logical layers:

```text
api → application → domain

infrastructure → implements application ports
```

### `api`

Inbound adapters and the module's public facade. This includes REST controllers, market WebSocket adapters, and typed interfaces exposed to other modules. It must translate external/module input into application commands or queries and remain thin.

### `application`

Use cases, orchestration within the module, transactions, and inbound/outbound ports. It may depend on the module's domain and on public APIs of other modules, but not on concrete infrastructure implementations.

### `domain`

Entities, value objects, policies, pure domain services, invariants, and plugin/runtime logic. It must not depend on HTTP, PostgreSQL, Redis, BullMQ, exchange SDKs, framework code, or UI code.

### `infrastructure`

Concrete adapters for the module's ports: repositories, exchange clients, Redis adapters, model adapters, queue adapters, and runtime artifact resolution. Other modules must not import this layer directly.

Not every module needs all four directories. Empty layer directories must not be created merely for visual symmetry.

## 3. Module ownership

| Module | Owns | Important boundary |
|---|---|---|
| `market-data` | live candles, market ticks, dataset snapshots, exchange normalization | raw exchange payloads stop at its infrastructure adapter |
| `strategy` | Strategy Definitions, registry, plugin descriptors/artifacts, Composite Definitions and combination policies | strategy domain remains pure; composite logic sees normalized signals only |
| `search` | Search Runs, generator policies, stop conditions, slot reservation, pause/resume/cancel | submits work through `backtesting/api`, never through BullMQ |
| `backtesting` | benchmark-scope composition, Candidates, Attempts, Trades, queue boundary, worker simulation/completion lifecycle | owns Candidate APIs and is the only module allowed to own `infrastructure/queue` and BullMQ integration; Search never writes Candidate persistence directly |
| `evaluation` | metric calculation and finite/edge-case policy | pure evaluator; no strategy or infrastructure dependency |
| `leaderboard` | score formulas, benchmark scopes, Top-10 admission and ranking reads | owns scope locking and ranking invariants |
| `news` | providers, normalized News Items, NewsItem persistence and collection workflow | invokes Sentiment through neutral input; sentiment failure must not discard collected news |
| `sentiment` | neutral input/result API, SentimentResult persistence, model provenance, sentiment snapshots | owns sentiment tables/snapshots and is called through a typed interface with timeout/error isolation |

`ExperimentResult` and the Completion Processor remain in `backtesting` for the MVP. This keeps the completion transaction near the async boundary while allowing Evaluation and Leaderboard to expose pure/public services. A later dedicated `experiment` module remains an explicit extension point if the aggregate grows beyond this responsibility.

## 4. Module dependency rules

Allowed examples:

```text
search/application
  → backtesting/api

backtesting/application
  → strategy/api
  → evaluation/api
  → leaderboard/api
  → market-data/api (snapshot read contract)

news/application
  → sentiment/api
```

Forbidden examples:

```text
search → backtesting/infrastructure
leaderboard → evaluation/infrastructure
any domain → PostgreSQL/Redis/BullMQ/HTTP
apps/backend → module internal implementation files
```

Each module exposes an allowlisted runtime facade and, where a deployable must wire infrastructure, an allowlisted `api/bootstrap` facade. Consumers import those facades or approved API contracts, never deep paths into another module. Architecture tests should enforce these rules once implementation begins. `apps/backend` and `apps/backtest-worker` are allowed to compose through bootstrap facades, but not to import `modules/*/infrastructure/*` or `modules/*/domain/*` directly.

## 5. Apps, packages, and infra

### `apps/`

Deployable process composition only:

- `apps/backend` starts HTTP/WebSocket, wires modules, and starts reconciliation.
- `apps/backtest-worker` wires the worker handler, pure Strategy/Composite runtime, and Backtesting infrastructure.
- `apps/frontend` renders UI and talks to Backend through REST/market WebSocket.

### `packages/`

Only reusable code without business ownership belongs here. `packages/contracts` contains REST, WebSocket, and queue protocol types. Domain entities remain in their owning module. The canonical serialized queue schema belongs under `packages/contracts/queue`; the BullMQ adapter belongs under `modules/backtesting/infrastructure/queue`.

### `infra/`

Repository-level environment and operations: Docker Compose, PostgreSQL migrations, seeds, deployment configuration, and observability setup. Runtime repositories/adapters remain under each module's `infrastructure` layer.

## 6. Composition and process boundaries

```text
apps/backend
  ├── compose market-data
  ├── compose strategy
  ├── compose search
  ├── compose backtesting coordinator/completion
  ├── compose evaluation
  ├── compose leaderboard
  ├── compose news/sentiment
  └── expose REST + market WebSocket

apps/backtest-worker
  ├── compose backtesting worker handler
  ├── compose strategy/composite pure runtime
  └── consume BullMQ jobs
```

The runtime semantics remain unchanged: REST handles commands/queries, the market WebSocket handles market realtime only, BullMQ is the only asynchronous backend boundary, and PostgreSQL remains authoritative.

## 7. Contract placement

Contracts are classified before implementation:

1. **Module domain types** stay in their owning module.
2. **Public in-process module APIs** live in the owning module's `api` layer.
3. **Cross-process/wire contracts** live in `packages/contracts` under `rest`, `websocket`, or `queue`.
4. **Technical reusable libraries** may live in `packages/`, but must not own business invariants.

For the agreed boundary inputs, `StrategyCandle` belongs to the Strategy public API and `SentimentInput` belongs to the Sentiment public API. News and Market Data adapters map their own domain records into those neutral shapes. `CandidateProgress` is a Backtesting-owned public projection consumed by Search. Search maps its `GeneratedCandidate` into a Backtesting-owned submission DTO; it does not make Backtesting import Search contracts. Queue wire types are self-contained under `packages/contracts/queue` and use `schemaVersion`; they never extend Backtesting API types. Search cancellation uses a process-level application unit of work and Backtesting cancellation facade, while Search ERROR is terminal `FAILED` with `lastError`/`endedAt`.

This avoids turning `packages/contracts` into a global domain model and preserves the Sync Modular Monolith's module boundaries.

## 8. Migration strategy

This documentation-only apply establishes structure and boundary rules without changing behavior. A later implementation change can establish structure and boundary checks, then implement or migrate modules in dependency order: Strategy/Market Data foundations, Evaluation/Leaderboard policies, Backtesting, Search, News/Sentiment, and finally application composition/integration wiring. Each stage must preserve the existing transport and persistence semantics.
